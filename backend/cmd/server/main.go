package main

import (
	"log"
	"net/http"

	"expenso-backend/internal/config"
	"expenso-backend/internal/database"
	"expenso-backend/internal/handlers"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	cfg := config.Load()

	db, err := database.NewConnection(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	expenseHandler := handlers.NewExpenseHandler(db)

	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()
	
	// Expense routes
	api.HandleFunc("/expenses", expenseHandler.GetExpenses).Methods("GET")
	api.HandleFunc("/expenses", expenseHandler.CreateExpense).Methods("POST")
	api.HandleFunc("/expenses/{id}", expenseHandler.GetExpense).Methods("GET")
	api.HandleFunc("/expenses/{id}", expenseHandler.UpdateExpense).Methods("PUT")
	api.HandleFunc("/expenses/{id}", expenseHandler.DeleteExpense).Methods("DELETE")

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, handler))
}