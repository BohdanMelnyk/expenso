package main

// @title Expenso API
// @version 1.0
// @description Smart expense tracking application API
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

import (
	"database/sql"
	"log"
	"os"

	_ "expenso-backend/docs"
	"expenso-backend/infrastructure/http/handlers"
	"expenso-backend/infrastructure/migration"
	"expenso-backend/infrastructure/persistence/repositories"
	"expenso-backend/usecases/interactors/expense"
	"expenso-backend/usecases/interactors/vendors"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	// Database connection
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:password@localhost:5432/expenso?sslmode=disable"
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	// Run database migrations
	migrator := migration.NewMigrator(db, "./migrations")
	if err := migrator.Initialize(); err != nil {
		log.Fatal("Failed to initialize migrator:", err)
	}
	if err := migrator.RunMigrations(); err != nil {
		log.Fatal("Migration failed:", err)
	}

	// Repository layer (implements interfaces from use case layer)
	expenseRepo := repositories.NewExpenseRepository(db)
	vendorRepo := repositories.NewVendorRepository(db)

	// Use case layer (interactors)
	expenseInteractor := expense.NewExpenseInteractor(expenseRepo, vendorRepo)
	vendorInteractor := vendors.NewVendorInteractor(vendorRepo)

	// Interface layer (HTTP handlers)
	expenseHandler := handlers.NewExpenseHandler(expenseInteractor)
	vendorHandler := handlers.NewVendorHandler(vendorInteractor)

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
		c.JSON(200, gin.H{"status": "OK - Espenso with Gin"})
	})

	// Swagger UI
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Printf("Espenso server with Gin starting on port 8080")
	log.Printf("Swagger UI available at: http://localhost:8080/swagger/index.html")
	log.Fatal(router.Run(":8080"))
}
