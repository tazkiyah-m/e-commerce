package handlers

import (
	"encoding/json"
	"net/http"

	"ggswell-backend/config"
)

type CartRequest struct {
	UserID     int `json:"user_id"`
	MenuItemID int `json:"menu_item_id"`
	Quantity   int `json:"quantity"`
}

type CartResponseItem struct {
	ID         int     `json:"id"`
	MenuItemID int     `json:"menu_item_id"`
	Name       string  `json:"name"`
	Price      float64 `json:"price"`
	Quantity   int     `json:"quantity"`
	Stock      int     `json:"stock"`
	ImageURL   string  `json:"image_url"`
}

func GetCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = "1" // Default for demo
	}

	// Ensure cart exists
	var cartID int
	err := config.DB.QueryRow("SELECT id FROM carts WHERE user_id = $1", userID).Scan(&cartID)
	if err != nil {
		// Create cart
		err = config.DB.QueryRow("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", userID).Scan(&cartID)
		if err != nil {
			http.Error(w, "Error creating cart", http.StatusInternalServerError)
			return
		}
	}

	rows, err := config.DB.Query(`
		SELECT ci.id, ci.menu_item_id, ci.quantity, m.name, m.price, m.image_url, m.stock 
		FROM cart_items ci
		JOIN menu_items m ON ci.menu_item_id = m.id
		WHERE ci.cart_id = $1
	`, cartID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []CartResponseItem
	for rows.Next() {
		var i CartResponseItem
		if err := rows.Scan(&i.ID, &i.MenuItemID, &i.Quantity, &i.Name, &i.Price, &i.ImageURL, &i.Stock); err == nil {
			items = append(items, i)
		}
	}

	if items == nil {
		items = []CartResponseItem{}
	}

	json.NewEncoder(w).Encode(items)
}

func AddToCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req CartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if req.UserID == 0 {
		req.UserID = 1 // Default
	}

	var cartID int
	err := config.DB.QueryRow("SELECT id FROM carts WHERE user_id = $1", req.UserID).Scan(&cartID)
	if err != nil {
		config.DB.QueryRow("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", req.UserID).Scan(&cartID)
	}

	var stock int
	var isAvailable bool
	err = config.DB.QueryRow("SELECT stock, is_available FROM menu_items WHERE id = $1", req.MenuItemID).Scan(&stock, &isAvailable)
	if err != nil || !isAvailable || stock <= 0 {
		http.Error(w, "Item is unavailable or out of stock", http.StatusBadRequest)
		return
	}

	// Insert or update, clamping to max stock
	_, err = config.DB.Exec(`
		INSERT INTO cart_items (cart_id, menu_item_id, quantity) 
		VALUES ($1, $2, LEAST($3::integer, $4::integer))
		ON CONFLICT (cart_id, menu_item_id) 
		DO UPDATE SET quantity = LEAST(cart_items.quantity + $3::integer, $4::integer)
	`, cartID, req.MenuItemID, req.Quantity, stock)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Added to cart"})
}

func UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req CartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.UserID == 0 {
		req.UserID = 1 // Default
	}

	var cartID int
	err := config.DB.QueryRow("SELECT id FROM carts WHERE user_id = $1", req.UserID).Scan(&cartID)
	if err != nil {
		http.Error(w, "Cart not found", http.StatusNotFound)
		return
	}

	if req.Quantity <= 0 {
		// Delete
		config.DB.Exec("DELETE FROM cart_items WHERE menu_item_id = $1 AND cart_id = $2", req.MenuItemID, cartID)
	} else {
		var stock int
		var isAvailable bool
		err := config.DB.QueryRow("SELECT stock, is_available FROM menu_items WHERE id = $1", req.MenuItemID).Scan(&stock, &isAvailable)
		if err == nil && isAvailable {
			if req.Quantity > stock {
				req.Quantity = stock
			}
			config.DB.Exec("UPDATE cart_items SET quantity = $1 WHERE menu_item_id = $2 AND cart_id = $3", req.Quantity, req.MenuItemID, cartID)
		}
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Updated"})
}

type ReorderRequest struct {
	UserID  int `json:"user_id"`
	OrderID int `json:"order_id"`
}

func Reorder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req ReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.UserID == 0 {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	// 1. Get user cart
	var cartID int
	err := config.DB.QueryRow("SELECT id FROM carts WHERE user_id = $1", req.UserID).Scan(&cartID)
	if err != nil {
		config.DB.QueryRow("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", req.UserID).Scan(&cartID)
	}

	// 2. Clear current cart
	config.DB.Exec("DELETE FROM cart_items WHERE cart_id = $1", cartID)

	// 3. Get items from order
	rows, err := config.DB.Query("SELECT menu_item_id, quantity FROM order_items WHERE order_id = $1", req.OrderID)
	if err != nil {
		http.Error(w, "Failed to fetch order items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// 4. Insert into cart
	for rows.Next() {
		var menuID, qty int
		if err := rows.Scan(&menuID, &qty); err == nil {
			config.DB.Exec("INSERT INTO cart_items (cart_id, menu_item_id, quantity) VALUES ($1, $2, $3)", cartID, menuID, qty)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Cart updated from order"})
}
