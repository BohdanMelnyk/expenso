package main

import (
	"database/sql"
	"log"
	"net/http"

	"expenso-backend/infrastructure/http/handlers"
	"expenso-backend/infrastructure/persistence/repositories"
	"expenso-backend/usecases/interactors/expense"
	"expenso-backend/usecases/interactors/vendor"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	_ "github.com/lib/pq"
)

func main() {
	// Database connection
	db, err := sql.Open("postgres", "postgres://postgres:password@localhost:5432/expenso?sslmode=disable")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	// Repository layer (implements interfaces from use case layer)
	expenseRepo := repositories.NewExpenseRepository(db)
	vendorRepo := repositories.NewVendorRepository(db)

	// Use case layer (interactors)
	createExpenseUC := expense.NewCreateExpenseInteractor(expenseRepo, vendorRepo)
	getExpensesUC := expense.NewGetExpensesInteractor(expenseRepo)
	getExpenseUC := expense.NewGetExpenseInteractor(expenseRepo)
	updateExpenseUC := expense.NewUpdateExpenseInteractor(expenseRepo, vendorRepo)
	deleteExpenseUC := expense.NewDeleteExpenseInteractor(expenseRepo)

	createVendorUC := vendor.NewCreateVendorInteractor(vendorRepo)
	getVendorsUC := vendor.NewGetVendorsInteractor(vendorRepo)
	getVendorUC := vendor.NewGetVendorInteractor(vendorRepo)
	getVendorsByTypeUC := vendor.NewGetVendorsByTypeInteractor(vendorRepo)

	// Interface layer (HTTP handlers)
	expenseHandler := handlers.NewExpenseHandler(
		createExpenseUC,
		getExpensesUC,
		getExpenseUC,
		updateExpenseUC,
		deleteExpenseUC,
	)

	vendorHandler := handlers.NewVendorHandler(
		createVendorUC,
		getVendorsUC,
		getVendorUC,
		getVendorsByTypeUC,
	)

	// HTTP Router
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// Expense routes
	api.HandleFunc("/expenses", expenseHandler.GetExpenses).Methods("GET")
	api.HandleFunc("/expenses", expenseHandler.CreateExpense).Methods("POST")
	api.HandleFunc("/expenses/{id}", expenseHandler.GetExpense).Methods("GET")
	api.HandleFunc("/expenses/{id}", expenseHandler.UpdateExpense).Methods("PUT")
	api.HandleFunc("/expenses/{id}", expenseHandler.DeleteExpense).Methods("DELETE")

	// Vendor routes
	api.HandleFunc("/vendors", vendorHandler.GetVendors).Methods("GET")
	api.HandleFunc("/vendors", vendorHandler.CreateVendor).Methods("POST")
	api.HandleFunc("/vendors/{id}", vendorHandler.GetVendor).Methods("GET")
	api.HandleFunc("/vendors/type/{type}", vendorHandler.GetVendorsByType).Methods("GET")

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK - Clean Architecture"))
	}).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	log.Printf("Clean Architecture server starting on port 8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}