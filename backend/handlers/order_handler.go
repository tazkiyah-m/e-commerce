package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"time"

	"ggswell-backend/config"
	"ggswell-backend/models"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

type CheckoutRequest struct {
	UserID         int                `json:"user_id"`
	Subtotal       float64            `json:"subtotal"`
	DiscountAmount float64            `json:"discount_amount"`
	ShippingFee    float64            `json:"shipping_fee"`
	TotalAmount    float64            `json:"total_amount"`
	PaymentMethod  string             `json:"payment_method"`
	Items          []models.OrderItem `json:"items"`
}

func CreateOrder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Begin Transaction
	tx, err := config.DB.Begin()
	if err != nil {
		http.Error(w, "Transaction failed", http.StatusInternalServerError)
		return
	}

	var orderID int
	// Inserting payment_method as part of status for now since column doesn't exist. Let's insert with status 'pending'
	err = tx.QueryRow(
		`INSERT INTO orders (user_id, subtotal, shipping_fee, discount_amount, total_amount, status) 
		 VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
		req.UserID, req.Subtotal, req.ShippingFee, req.DiscountAmount, req.TotalAmount,
	).Scan(&orderID)

	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to insert order", http.StatusInternalServerError)
		return
	}

	for _, item := range req.Items {
		// 1. Lock Inventory Row (Pessimistic Locking - FOR UPDATE)
		var currentStock int
		var isAvailable bool
		err = tx.QueryRow("SELECT stock, is_available FROM menu_items WHERE id = $1 FOR UPDATE", item.MenuItemID).Scan(&currentStock, &isAvailable)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Menu item not found or lock failed", http.StatusInternalServerError)
			return
		}

		// 1b. Cek ketersediaan
		if !isAvailable {
			tx.Rollback()
			http.Error(w, "Menu item is currently unavailable", http.StatusBadRequest)
			return
		}

		// 2. Cek stok (Get stock)
		if currentStock < item.Quantity {
			tx.Rollback()
			http.Error(w, "Stok tidak mencukupi atau telah habis", http.StatusBadRequest)
			return
		}

		// 3. Kurangi stok (Update)
		_, err = tx.Exec("UPDATE menu_items SET stock = stock - $1 WHERE id = $2", item.Quantity, item.MenuItemID)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to update stock", http.StatusInternalServerError)
			return
		}

		_, err = tx.Exec(
			"INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)",
			orderID, item.MenuItemID, item.Quantity, item.Price,
		)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to insert order items", http.StatusInternalServerError)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)

	// Midtrans Integration
	midtrans.ServerKey = os.Getenv("MIDTRANS_SERVER_KEY")
	midtrans.Environment = midtrans.Sandbox

	reqSnap := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  strconv.Itoa(orderID) + "-" + strconv.FormatInt(time.Now().Unix(), 10),
			GrossAmt: int64(req.TotalAmount),
		},
		CreditCard: &snap.CreditCardDetails{
			Secure: true,
		},
		Callbacks: &snap.Callbacks{
			Finish: "http://localhost:3000/orders?success=1",
		},
	}

	snapResp, errSnap := snap.CreateTransaction(reqSnap)
	if errSnap != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":  "Order created but failed to get snap token",
			"order_id": orderID,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "Order created successfully",
		"order_id":     orderID,
		"snap_token":   snapResp.Token,
		"redirect_url": snapResp.RedirectURL,
	})
}

func PaymentNotification(w http.ResponseWriter, r *http.Request) {
	var notificationPayload map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&notificationPayload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	orderIDStr, exists := notificationPayload["order_id"].(string)
	if !exists {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	// orderIDStr might have a timestamp attached, e.g. "5-1678901234". We just extract the ID part.
	var actualOrderID string
	for i, c := range orderIDStr {
		if c == '-' {
			actualOrderID = orderIDStr[:i]
			break
		}
	}
	if actualOrderID == "" {
		actualOrderID = orderIDStr
	}

	transactionStatus, _ := notificationPayload["transaction_status"].(string)

	if transactionStatus == "settlement" || transactionStatus == "capture" {
		config.DB.Exec("UPDATE orders SET status = 'paid' WHERE id = $1", actualOrderID)
		// Broadcast to admin dashboard
		BroadcastMessage(map[string]interface{}{
			"type": "NEW_ORDER",
			"order_id": actualOrderID,
			"message": "Pesanan baru telah dibayar!",
		})
		BroadcastMessage(map[string]interface{}{
			"type": "MENU_UPDATED",
		})
	} else if transactionStatus == "cancel" || transactionStatus == "deny" || transactionStatus == "expire" {
		config.DB.Exec("UPDATE orders SET status = 'cancelled' WHERE id = $1", actualOrderID)
		
		// Restore stock for cancelled orders
		rows, err := config.DB.Query("SELECT menu_item_id, quantity FROM order_items WHERE order_id = $1", actualOrderID)
		if err == nil {
			for rows.Next() {
				var menuID, qty int
				if err := rows.Scan(&menuID, &qty); err == nil {
					config.DB.Exec("UPDATE menu_items SET stock = stock + $1 WHERE id = $2", qty, menuID)
				}
			}
			rows.Close()
			BroadcastMessage(map[string]interface{}{"type": "MENU_UPDATED"})
		}
	}

	w.WriteHeader(http.StatusOK)
}

type OrderHistoryResponse struct {
	ID             int                `json:"id"`
	UserID         int                `json:"user_id"`
	Subtotal       float64            `json:"subtotal"`
	ShippingFee    float64            `json:"shipping_fee"`
	DiscountAmount float64            `json:"discount_amount"`
	TotalAmount    float64            `json:"total_amount"`
	Status         string             `json:"status"`
	CreatedAt      string             `json:"created_at"`
	Items          []OrderHistoryItem `json:"items"`
}

type OrderHistoryItem struct {
	MenuItemID int     `json:"menu_item_id"`
	Name       string  `json:"name"`
	ImageURL   string  `json:"image_url"`
	Quantity   int     `json:"quantity"`
	Price      float64 `json:"price"`
}

func GetOrders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	rows, err := config.DB.Query(`
		SELECT id, user_id, subtotal, shipping_fee, discount_amount, total_amount, status, created_at 
		FROM orders 
		WHERE user_id = $1 
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var orders []OrderHistoryResponse
	for rows.Next() {
		var o OrderHistoryResponse
		if err := rows.Scan(&o.ID, &o.UserID, &o.Subtotal, &o.ShippingFee, &o.DiscountAmount, &o.TotalAmount, &o.Status, &o.CreatedAt); err == nil {
			// Fetch items for this order
			itemRows, err := config.DB.Query(`
				SELECT oi.menu_item_id, oi.quantity, oi.price, m.name, m.image_url 
				FROM order_items oi
				JOIN menu_items m ON oi.menu_item_id = m.id
				WHERE oi.order_id = $1
			`, o.ID)
			
			var items []OrderHistoryItem
			if err == nil {
				for itemRows.Next() {
					var item OrderHistoryItem
					if err := itemRows.Scan(&item.MenuItemID, &item.Quantity, &item.Price, &item.Name, &item.ImageURL); err == nil {
						items = append(items, item)
					}
				}
				itemRows.Close()
			}
			o.Items = items
			orders = append(orders, o)
		}
	}

	if orders == nil {
		orders = []OrderHistoryResponse{}
	}

	json.NewEncoder(w).Encode(orders)
}

type AdminOrderResponse struct {
	ID             int     `json:"id"`
	OrderIDString  string  `json:"order_id_string"`
	UserName       string  `json:"user_name"`
	TotalAmount    float64 `json:"total_amount"`
	PaymentMethod  string  `json:"payment_method"`
	Status         string  `json:"status"`
	CreatedAt      string  `json:"created_at"`
}

func GetAllOrdersAdmin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	rows, err := config.DB.Query(`
		SELECT o.id, 
		  CASE 
		    WHEN o.payment_method IN ('Cash', 'QRIS') THEN COALESCE(NULLIF(o.shipping_address, ''), 'Pelanggan Offline') 
		    ELSE u.full_name 
		  END as user_name, 
		  o.total_amount, 
		  COALESCE(o.payment_method, 'Midtrans'), 
		  o.status, 
		  o.created_at 
		FROM orders o
		JOIN users u ON o.user_id = u.id
		WHERE o.status = 'paid'
		ORDER BY o.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		http.Error(w, "Failed to fetch admin orders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var orders []AdminOrderResponse
	for rows.Next() {
		var o AdminOrderResponse
		if err := rows.Scan(&o.ID, &o.UserName, &o.TotalAmount, &o.PaymentMethod, &o.Status, &o.CreatedAt); err == nil {
			o.OrderIDString = "ORD-" + strconv.Itoa(o.ID)
			orders = append(orders, o)
		}
	}

	if orders == nil {
		orders = []AdminOrderResponse{}
	}

	json.NewEncoder(w).Encode(orders)
}

type ManualOrderRequest struct {
	TotalAmount   float64            `json:"total_amount"`
	CustomerName  string             `json:"customer_name"`
	PaymentMethod string             `json:"payment_method"`
	Items         []models.OrderItem `json:"items"`
}

func CreateManualOrder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ManualOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Begin Transaction
	tx, err := config.DB.Begin()
	if err != nil {
		http.Error(w, "Transaction failed", http.StatusInternalServerError)
		return
	}

	// For manual orders, user_id is the admin (we can set to 1)
	// We store the customer name in the shipping_address column.
	var orderID int
	err = tx.QueryRow(
		`INSERT INTO orders (user_id, subtotal, shipping_fee, discount_amount, total_amount, status, payment_method, shipping_address) 
		 VALUES ($1, $2, 0, 0, $3, 'paid', $4, $5) RETURNING id`,
		1, req.TotalAmount, req.TotalAmount, req.PaymentMethod, req.CustomerName,
	).Scan(&orderID)

	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to insert order", http.StatusInternalServerError)
		return
	}

	for _, item := range req.Items {
		// 1. Lock Inventory Row (Pessimistic Locking - FOR UPDATE)
		var currentStock int
		var isAvailable bool
		err = tx.QueryRow("SELECT stock, is_available FROM menu_items WHERE id = $1 FOR UPDATE", item.MenuItemID).Scan(&currentStock, &isAvailable)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Menu item not found or lock failed", http.StatusInternalServerError)
			return
		}

		// 1b. Cek ketersediaan
		if !isAvailable {
			tx.Rollback()
			http.Error(w, "Menu item is currently unavailable", http.StatusBadRequest)
			return
		}

		// 2. Cek stok (Get stock)
		if currentStock < item.Quantity {
			tx.Rollback()
			http.Error(w, "Stok tidak mencukupi atau telah habis", http.StatusBadRequest)
			return
		}

		// 3. Kurangi stok (Update)
		_, err = tx.Exec("UPDATE menu_items SET stock = stock - $1 WHERE id = $2", item.Quantity, item.MenuItemID)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to update stock", http.StatusInternalServerError)
			return
		}

		_, err = tx.Exec(
			"INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)",
			orderID, item.MenuItemID, item.Quantity, item.Price,
		)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to insert order items", http.StatusInternalServerError)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Broadcast the new order
	BroadcastMessage(map[string]interface{}{
		"type": "NEW_ORDER",
		"order_id": strconv.Itoa(orderID),
		"message": "Pesanan Manual (Kasir) berhasil!",
	})
	BroadcastMessage(map[string]interface{}{
		"type": "MENU_UPDATED",
	})

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Manual order created successfully",
		"order_id": orderID,
	})
}
