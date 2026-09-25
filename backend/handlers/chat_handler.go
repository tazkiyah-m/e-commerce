package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"ggswell-backend/config"
	"ggswell-backend/models"
)

// GetChatMessages fetches chat history by session_id or user_id
func GetChatMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	sessionID := r.URL.Query().Get("session_id")
	userIDStr := r.URL.Query().Get("user_id")

	if sessionID == "" && userIDStr == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id or user_id is required"})
		return
	}

	userID, _ := strconv.Atoi(userIDStr)

	rows, err := config.DB.Query(`
		SELECT id, user_id, COALESCE(session_id, ''), COALESCE(user_name, 'Pelanggan'), sender_role, message, is_read, created_at
		FROM chat_messages
		WHERE session_id = $1 OR (user_id = $2 AND $2 > 0)
		ORDER BY created_at ASC
	`, sessionID, userID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var messages []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		var createdAt time.Time
		if err := rows.Scan(&m.ID, &m.UserID, &m.SessionID, &m.UserName, &m.SenderRole, &m.Message, &m.IsRead, &createdAt); err == nil {
			m.CreatedAt = createdAt
			messages = append(messages, m)
		}
	}

	if messages == nil {
		messages = []models.ChatMessage{}
	}

	// Mark user's messages as read if requested by admin
	if r.URL.Query().Get("mark_read") == "true" {
		config.DB.Exec("UPDATE chat_messages SET is_read = true WHERE (session_id = $1 OR (user_id = $2 AND $2 > 0)) AND sender_role = 'user'", sessionID, userID)
	}

	json.NewEncoder(w).Encode(messages)
}

// SendChatMessage saves and broadcasts a chat message
func SendChatMessage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		UserID     int    `json:"user_id"`
		SessionID  string `json:"session_id"`
		UserName   string `json:"user_name"`
		SenderRole string `json:"sender_role"` // "user" or "admin"
		Message    string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if req.Message == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "message is required"})
		return
	}

	if req.SessionID == "" {
		if req.UserID > 0 {
			req.SessionID = "user_" + strconv.Itoa(req.UserID)
		} else {
			req.SessionID = "guest_default"
		}
	}

	if req.UserName == "" {
		if req.UserID > 0 {
			config.DB.QueryRow("SELECT COALESCE(full_name, 'Pelanggan') FROM users WHERE id = $1", req.UserID).Scan(&req.UserName)
		}
		if req.UserName == "" {
			req.UserName = "Pelanggan (" + req.SessionID[:min(8, len(req.SessionID))] + ")"
		}
	}

	if req.SenderRole == "" {
		req.SenderRole = "user"
	}

	var msgID int
	var createdAt time.Time
	err := config.DB.QueryRow(`
		INSERT INTO chat_messages (user_id, session_id, user_name, sender_role, message)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`, req.UserID, req.SessionID, req.UserName, req.SenderRole, req.Message).Scan(&msgID, &createdAt)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to send message: " + err.Error()})
		return
	}

	msgPayload := models.ChatMessage{
		ID:         msgID,
		UserID:     req.UserID,
		SessionID:  req.SessionID,
		UserName:   req.UserName,
		SenderRole: req.SenderRole,
		Message:    req.Message,
		IsRead:     false,
		CreatedAt:  createdAt,
	}

	// Broadcast via WebSocket to all connected clients
	BroadcastMessage(map[string]interface{}{
		"type":         "CHAT_MESSAGE",
		"chat_message": msgPayload,
	})

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msgPayload)
}

// GetAdminChatConversations lists all active conversation threads grouped by session_id
func GetAdminChatConversations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := config.DB.Query(`
		SELECT 
			session_id,
			MAX(user_name) as user_name,
			COALESCE(MAX(user_id), 0) as user_id,
			COALESCE((SELECT message FROM chat_messages c2 WHERE c2.session_id = c1.session_id ORDER BY created_at DESC LIMIT 1), '') as last_message,
			MAX(created_at) as last_time,
			COUNT(CASE WHEN sender_role = 'user' AND is_read = false THEN 1 END) as unread_count
		FROM chat_messages c1
		WHERE session_id != ''
		GROUP BY session_id
		ORDER BY last_time DESC
	`)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Conversation struct {
		SessionID   string    `json:"session_id"`
		UserName    string    `json:"user_name"`
		UserID      int       `json:"user_id"`
		LastMessage string    `json:"last_message"`
		LastTime    time.Time `json:"last_time"`
		UnreadCount int       `json:"unread_count"`
	}

	var conversations []Conversation
	for rows.Next() {
		var c Conversation
		if err := rows.Scan(&c.SessionID, &c.UserName, &c.UserID, &c.LastMessage, &c.LastTime, &c.UnreadCount); err == nil {
			conversations = append(conversations, c)
		}
	}

	if conversations == nil {
		conversations = []Conversation{}
	}

	json.NewEncoder(w).Encode(conversations)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
