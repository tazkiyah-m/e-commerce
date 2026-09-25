package handlers

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for local dev
	},
}

type client struct {
	conn *websocket.Conn
}

var (
	clients   = make(map[*client]bool)
	broadcast = make(chan interface{})
	mutex     = &sync.Mutex{}
)

// InitWebSocketHub starts the broadcaster
func InitWebSocketHub() {
	go func() {
		for {
			msg := <-broadcast
			mutex.Lock()
			for client := range clients {
				err := client.conn.WriteJSON(msg)
				if err != nil {
					log.Printf("WebSocket Write Error: %v", err)
					client.conn.Close()
					delete(clients, client)
				}
			}
			mutex.Unlock()
		}
	}()
}

// ServeWs handles websocket requests
func ServeWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}

	client := &client{conn: conn}
	
	mutex.Lock()
	clients[client] = true
	mutex.Unlock()
	
	// Keep connection alive and clean up on close
	go func() {
		defer func() {
			mutex.Lock()
			delete(clients, client)
			mutex.Unlock()
			conn.Close()
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

// BroadcastMessage sends a message to all connected clients
func BroadcastMessage(msg interface{}) {
	broadcast <- msg
}
