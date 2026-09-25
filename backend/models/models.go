package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Category struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Icon      string    `json:"icon"`
	CreatedAt time.Time `json:"created_at"`
}

type MenuItem struct {
	ID              int       `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Price           float64   `json:"price"`
	ImageURL        string    `json:"image_url"`
	CategoryID      int       `json:"category_id"`
	PrepTime        string    `json:"prep_time"`
	Rating          float64   `json:"rating"`
	IsPopular       bool      `json:"is_popular"`
	IsAvailable     bool      `json:"is_available"`
	Stock           int       `json:"stock"`
	DiscountPercent int       `json:"discount_percent"`
	CreatedAt       time.Time `json:"created_at"`
}

type Order struct {
	ID              int         `json:"id"`
	UserID          int         `json:"user_id"`
	TotalAmount     float64     `json:"total_amount"`
	Status          string      `json:"status"`
	PaymentMethod   string      `json:"payment_method"`
	ShippingAddress string      `json:"shipping_address"`
	ShippingFee     float64     `json:"shipping_fee"`
	CreatedAt       time.Time   `json:"created_at"`
	Items           []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID         int     `json:"id"`
	OrderID    int     `json:"order_id"`
	MenuItemID int     `json:"menu_item_id"`
	Quantity   int     `json:"quantity"`
	Price      float64 `json:"price"`
}

type ChatMessage struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	SessionID  string    `json:"session_id"`
	UserName   string    `json:"user_name"`
	SenderRole string    `json:"sender_role"` // "user" or "admin"
	Message    string    `json:"message"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}
