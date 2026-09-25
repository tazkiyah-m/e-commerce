package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"ggswell-backend/config"
)

type AnalyticsResponse struct {
	TotalOmset      float64     `json:"total_omset"`
	TotalHPP        float64     `json:"total_hpp"`
	Profit          float64     `json:"profit"`
	RecentOrders    int         `json:"recent_orders"`
	ChartData       []ChartItem `json:"chart_data"`
	Message         string      `json:"message,omitempty"`
}

type ChartItem struct {
	Name   string  `json:"name"`
	Omset  float64 `json:"omset"`
	Profit float64 `json:"profit"`
}

func GetAnalytics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var omset float64
	err := config.DB.QueryRow("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'paid'").Scan(&omset)
	if err != nil {
		omset = 0
	}

	// Calculate HPP based on actual ordered items
	var hpp float64
	err = config.DB.QueryRow(`
		SELECT COALESCE(SUM(oi.quantity * mi.hpp), 0)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN menu_items mi ON mi.id = oi.menu_item_id
		WHERE o.status = 'paid'
	`).Scan(&hpp)
	if err != nil {
		// Fallback if schema doesn't have hpp yet or data is null
		hpp = omset * 0.4
	}

	// If HPP is 0 and Omset > 0, probably missing data, fallback to 40%
	if hpp == 0 && omset > 0 {
		hpp = omset * 0.4
	}

	var recentOrders int
	err = config.DB.QueryRow("SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'paid'").Scan(&recentOrders)
	if err != nil {
		recentOrders = 0
	}

	profit := omset - hpp

	// Dummy chart data for now, ideally queried grouped by date
	chartData := []ChartItem{
		{"Senin", omset * 0.1, (omset * 0.1) * 0.6},
		{"Selasa", omset * 0.15, (omset * 0.15) * 0.6},
		{"Rabu", omset * 0.2, (omset * 0.2) * 0.6},
		{"Kamis", omset * 0.1, (omset * 0.1) * 0.6},
		{"Jumat", omset * 0.25, (omset * 0.25) * 0.6},
		{"Sabtu", omset * 0.1, (omset * 0.1) * 0.6},
		{"Minggu", omset * 0.1, (omset * 0.1) * 0.6},
	}

	resp := AnalyticsResponse{
		TotalOmset:   omset,
		TotalHPP:     hpp,
		Profit:       profit,
		RecentOrders: recentOrders,
		ChartData:    chartData,
	}

	json.NewEncoder(w).Encode(resp)
}

func GetFinanceReport(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	rangeParam := r.URL.Query().Get("range")
	dateParam := r.URL.Query().Get("date") // Format YYYY-MM-DD
	startDateParam := r.URL.Query().Get("start_date")
	endDateParam := r.URL.Query().Get("end_date")
	
	var timeCondition string
	var groupBy string
	var args []interface{}

	switch rangeParam {
	case "1m":
		timeCondition = "o.created_at >= NOW() - INTERVAL '30 days'"
		groupBy = "DATE(o.created_at)::text"
	case "1y":
		timeCondition = "o.created_at >= NOW() - INTERVAL '1 year'"
		groupBy = "TO_CHAR(o.created_at, 'YYYY-MM')"
	case "date":
		if dateParam == "" {
			dateParam = time.Now().Format("2006-01-02")
		}
		if _, err := time.Parse("2006-01-02", dateParam); err != nil {
			dateParam = time.Now().Format("2006-01-02")
		}
		timeCondition = "DATE(o.created_at) = $1"
		groupBy = "TO_CHAR(o.created_at, 'HH24:00')"
		args = append(args, dateParam)
	case "custom":
		if startDateParam == "" {
			startDateParam = time.Now().Format("2006-01-02")
		}
		if endDateParam == "" {
			endDateParam = time.Now().Format("2006-01-02")
		}
		if _, err := time.Parse("2006-01-02", startDateParam); err != nil {
			startDateParam = time.Now().Format("2006-01-02")
		}
		if _, err := time.Parse("2006-01-02", endDateParam); err != nil {
			endDateParam = time.Now().Format("2006-01-02")
		}
		timeCondition = "DATE(o.created_at) >= $1 AND DATE(o.created_at) <= $2"
		groupBy = "DATE(o.created_at)::text"
		args = append(args, startDateParam, endDateParam)
	default:
		timeCondition = "o.created_at >= NOW() - INTERVAL '7 days'"
		groupBy = "DATE(o.created_at)::text"
	}

	// Validate if the store age meets the requested range
	if rangeParam == "1m" || rangeParam == "1y" {
		var firstOrderDate time.Time
		err := config.DB.QueryRow("SELECT MIN(created_at) FROM orders WHERE status = 'paid'").Scan(&firstOrderDate)
		if err == nil && !firstOrderDate.IsZero() {
			if rangeParam == "1m" && time.Since(firstOrderDate) < 30*24*time.Hour {
				json.NewEncoder(w).Encode(AnalyticsResponse{Message: "Penjualan Anda belum sampai 1 bulan."})
				return
			}
			if rangeParam == "1y" && time.Since(firstOrderDate) < 365*24*time.Hour {
				json.NewEncoder(w).Encode(AnalyticsResponse{Message: "Penjualan Anda belum sampai 1 tahun."})
				return
			}
		} else {
			json.NewEncoder(w).Encode(AnalyticsResponse{Message: "Belum ada data penjualan yang mencukupi rentang waktu ini."})
			return
		}
	}

	var totalOmset, totalHPP float64
	config.DB.QueryRow("SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE status = 'paid' AND "+timeCondition, args...).Scan(&totalOmset)
	config.DB.QueryRow(`
		SELECT COALESCE(SUM(oi.quantity * COALESCE(mi.hpp, 0)), 0)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
		WHERE o.status = 'paid' AND `+timeCondition, args...).Scan(&totalHPP)

	if totalHPP == 0 && totalOmset > 0 {
		totalHPP = totalOmset * 0.4
	}
	totalProfit := totalOmset - totalHPP

	// Query 1: Daily Omset
	omsetQuery := "SELECT " + groupBy + " as period, COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.status = 'paid' AND " + timeCondition + " GROUP BY " + groupBy
	omsetRows, _ := config.DB.Query(omsetQuery, args...)
	
	chartMap := make(map[string]*ChartItem)
	
	if omsetRows != nil {
		for omsetRows.Next() {
			var period string
			var omset float64
			if err := omsetRows.Scan(&period, &omset); err == nil {
				chartMap[period] = &ChartItem{Name: period, Omset: omset}
			}
		}
		omsetRows.Close()
	}

	// Query 2: Daily HPP
	hppQuery := "SELECT " + groupBy + " as period, COALESCE(SUM(oi.quantity * COALESCE(mi.hpp, 0)), 0) FROM orders o JOIN order_items oi ON o.id = oi.order_id LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id WHERE o.status = 'paid' AND " + timeCondition + " GROUP BY " + groupBy
	hppRows, _ := config.DB.Query(hppQuery, args...)
	if hppRows != nil {
		for hppRows.Next() {
			var period string
			var hpp float64
			if err := hppRows.Scan(&period, &hpp); err == nil {
				if item, exists := chartMap[period]; exists {
					if hpp == 0 && item.Omset > 0 {
						hpp = item.Omset * 0.4
					}
					item.Profit = item.Omset - hpp
				}
			}
		}
		hppRows.Close()
	}

	// Calculate profit for items that had 0 hpp
	var chartData []ChartItem
	for _, item := range chartMap {
		if item.Profit == 0 && item.Omset > 0 {
			item.Profit = item.Omset - (item.Omset * 0.4) // Fallback HPP if completely missing
		}
		chartData = append(chartData, *item)
	}

	// Sort chartData by Name (period)
	sort.Slice(chartData, func(i, j int) bool {
		return chartData[i].Name < chartData[j].Name
	})

	if chartData == nil {
		chartData = []ChartItem{}
	}

	var recentOrders int
	config.DB.QueryRow("SELECT COUNT(*) FROM orders o WHERE o.status = 'paid' AND "+timeCondition, args...).Scan(&recentOrders)

	resp := AnalyticsResponse{
		TotalOmset:   totalOmset,
		TotalHPP:     totalHPP,
		Profit:       totalProfit,
		RecentOrders: recentOrders,
		ChartData:    chartData,
	}

	json.NewEncoder(w).Encode(resp)
}
