package main

import (
	"database/sql"
	"log"

	"expenso-backend/infrastructure/http/handlers"
	"expenso-backend/infrastructure/persistence/repositories"
	"expenso-backend/usecases/interactors/expense"
	"expenso-backend/usecases/interactors/vendor"

	"github.com/gin-gonic/gin"
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
	expenseInteractor := expense.NewExpenseInteractor(expenseRepo, vendorRepo)

	createVendorUC := vendor.NewCreateVendorInteractor(vendorRepo)
	getVendorsUC := vendor.NewGetVendorsInteractor(vendorRepo)
	getVendorUC := vendor.NewGetVendorInteractor(vendorRepo)
	getVendorsByTypeUC := vendor.NewGetVendorsByTypeInteractor(vendorRepo)

	// Interface layer (HTTP handlers)
	expenseHandler := handlers.NewExpenseHandler(expenseInteractor)

	vendorHandler := handlers.NewVendorHandler(
		createVendorUC,
		getVendorsUC,
		getVendorUC,
		getVendorsByTypeUC,
	)

	// Setup Gin router
	router := gin.Default()

	// CORS middleware for Gin
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "*")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API routes group
	api := router.Group("/api/v1")

	// Expense routes
	api.GET("/expenses", expenseHandler.GetExpenses)
	api.POST("/expenses", expenseHandler.CreateExpense)
	api.GET("/expenses/:id", expenseHandler.GetExpense)
	api.PUT("/expenses/:id", expenseHandler.UpdateExpense)
	api.DELETE("/expenses/:id", expenseHandler.DeleteExpense)

	// Vendor routes
	api.GET("/vendors", vendorHandler.GetVendors)
	api.POST("/vendors", vendorHandler.CreateVendor)
	api.GET("/vendors/:id", vendorHandler.GetVendor)
	api.GET("/vendors/type/:type", vendorHandler.GetVendorsByType)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK - Clean Architecture with Gin"})
	})

	log.Printf("Clean Architecture server with Gin starting on port 8080")
	log.Fatal(router.Run(":8080"))
}