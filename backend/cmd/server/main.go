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
	"fmt"
	"log"

	_ "expenso-backend/docs"
	"expenso-backend/infrastructure/config"
	"expenso-backend/infrastructure/http/handlers"
	"expenso-backend/infrastructure/migration"
	"expenso-backend/infrastructure/persistence/repositories"
	"expenso-backend/usecases/interactors/category"
	"expenso-backend/usecases/interactors/expense"
	"expenso-backend/usecases/interactors/tag"
	"expenso-backend/usecases/interactors/vendors"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfigForEnvironment()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Database connection
	databaseURL := cfg.GetDatabaseURL()
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
	categoryRepo := repositories.NewCategoryRepository(db)
	tagRepo := repositories.NewTagRepository(db)

	// Use case layer (interactors)
	expenseInteractor := expense.NewExpenseInteractor(expenseRepo, vendorRepo)
	vendorInteractor := vendors.NewVendorInteractor(vendorRepo)
	categoryInteractor := category.NewCategoryInteractor(categoryRepo)
	tagInteractor := tag.NewTagInteractor(tagRepo)

	// Interface layer (HTTP handlers)
	expenseHandler := handlers.NewExpenseHandler(expenseInteractor)
	vendorHandler := handlers.NewVendorHandler(vendorInteractor)
	categoryHandler := handlers.NewCategoryHandler(categoryInteractor)
	tagHandler := handlers.NewTagHandler(tagInteractor)

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
	api.GET("/expenses/export/csv", expenseHandler.ExportExpensesCSV)
	api.POST("/expenses/import/csv/preview", expenseHandler.ImportExpensesCSVPreview)
	api.POST("/expenses/import/csv/confirm", expenseHandler.ImportExpensesCSVConfirm)

	// Vendor routes
	api.GET("/vendors", vendorHandler.GetVendors)
	api.POST("/vendors", vendorHandler.CreateVendor)
	api.GET("/vendors/:id", vendorHandler.GetVendor)
	api.GET("/vendors/type/:type", vendorHandler.GetVendorsByType)

	// Category routes
	api.GET("/categories", categoryHandler.GetCategories)
	api.POST("/categories", categoryHandler.CreateCategory)
	api.GET("/categories/:id", categoryHandler.GetCategory)
	api.PUT("/categories/:id", categoryHandler.UpdateCategory)
	api.DELETE("/categories/:id", categoryHandler.DeleteCategory)

	// Tag routes
	api.GET("/tags", tagHandler.GetTags)
	api.POST("/tags", tagHandler.CreateTag)
	api.GET("/tags/:id", tagHandler.GetTag)
	api.PUT("/tags/:id", tagHandler.UpdateTag)
	api.DELETE("/tags/:id", tagHandler.DeleteTag)

	// Expense-Tag relationship routes
	api.GET("/expenses/:id/tags", tagHandler.GetTagsByExpense)
	api.POST("/expenses/:id/tags/:tag_id", tagHandler.AddTagToExpense)
	api.DELETE("/expenses/:id/tags/:tag_id", tagHandler.RemoveTagFromExpense)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK - Espenso with Gin"})
	})

	// Swagger UI
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	serverAddr := cfg.GetServerAddress()
	log.Printf("Espenso server with Gin starting on %s", serverAddr)
	log.Printf("Swagger UI available at: http://%s/swagger/index.html", serverAddr)
	log.Fatal(router.Run(":" + fmt.Sprintf("%d", cfg.Server.Port)))
}
