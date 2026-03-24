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
	"os"

	_ "expenso-backend/docs"
	"expenso-backend/infrastructure/config"
	"expenso-backend/infrastructure/http/handlers"
	"expenso-backend/infrastructure/http/middleware"
	"expenso-backend/infrastructure/llm"
	"expenso-backend/infrastructure/logger"
	"expenso-backend/infrastructure/migration"
	"expenso-backend/infrastructure/persistence/repositories"
	"expenso-backend/usecases/interactors/category"
	"expenso-backend/usecases/interactors/expense"
	"expenso-backend/usecases/interactors/income"
	"expenso-backend/usecases/interactors/tag"
	"expenso-backend/usecases/interactors/vendors"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		fmt.Fprintf(os.Stderr, "WARNING: Could not load .env file, continuing with existing environment variables\n")
	}

	// Initialize logger
	logger.SetLevel(logger.INFO)
	logger.Info("Starting Expenso server...")

	// Load configuration
	cfg, err := config.LoadConfigForEnvironment()
	if err != nil {
		logger.Fatal("Failed to load config", logger.Fields{"error": err.Error()})
	}

	// Log LLM config status for debugging
	logger.Info("LLM configuration loaded", logger.Fields{
		"llm_model":       cfg.LLM.Model,
		"llm_max_tokens":  cfg.LLM.MaxTokens,
		"llm_api_key_set": cfg.LLM.APIKey != "",
		"llm_api_key_len": len(cfg.LLM.APIKey),
	})

	// Database connection
	databaseURL := cfg.GetDatabaseURL()
	logger.Info("Connecting to database...")
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", logger.Fields{"error": err.Error()})
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		logger.Fatal("Failed to ping database", logger.Fields{"error": err.Error()})
	}
	logger.Info("Database connection established")

	// Run database migrations
	logger.Info("Running database migrations...")
	migrator := migration.NewMigrator(db, "./migrations")
	if err := migrator.Initialize(); err != nil {
		logger.Fatal("Failed to initialize migrator", logger.Fields{"error": err.Error()})
	}
	if err := migrator.RunMigrations(); err != nil {
		logger.Fatal("Migration failed", logger.Fields{"error": err.Error()})
	}
	logger.Info("Database migrations completed")

	// Initialize LLM client for AI-powered expense parsing
	logger.Info("Initializing LLM client")
	anthropicClient := llm.NewAnthropicClient(cfg.LLM)

	// Repository layer (implements interfaces from use case layer)
	tagRepo := repositories.NewTagRepository(db)
	expenseRepo := repositories.NewExpenseRepository(db, tagRepo)
	incomeRepo := repositories.NewIncomeRepository(db, tagRepo)
	vendorRepo := repositories.NewVendorRepository(db)
	categoryRepo := repositories.NewCategoryRepository(db)

	// Use case layer (interactors)
	expenseInteractor := expense.NewExpenseInteractor(expenseRepo, vendorRepo, tagRepo)

	// Setup expense parser for LLM-powered parsing
	expenseParser := expense.NewExpenseParser(anthropicClient, vendorRepo)
	expenseInteractor.SetExpenseParser(expenseParser)

	// Setup bank transaction mapper for LLM-powered bank import
	bankTransactionMapper := expense.NewBankTransactionMapper(anthropicClient, vendorRepo, expenseParser)
	expenseInteractor.SetBankTransactionMapper(bankTransactionMapper)

	incomeInteractor := income.NewIncomeInteractor(incomeRepo, vendorRepo, tagRepo)
	vendorInteractor := vendors.NewVendorInteractor(vendorRepo)
	categoryInteractor := category.NewCategoryInteractor(categoryRepo)
	tagInteractor := tag.NewTagInteractor(tagRepo)

	// Interface layer (HTTP handlers)
	expenseHandler := handlers.NewExpenseHandler(expenseInteractor)
	incomeHandler := handlers.NewIncomeHandler(incomeInteractor)
	vendorHandler := handlers.NewVendorHandler(vendorInteractor)
	categoryHandler := handlers.NewCategoryHandler(categoryInteractor)
	tagHandler := handlers.NewTagHandler(tagInteractor)
	bankImportHandler := handlers.NewBankImportHandler(expenseInteractor)

	// Setup Gin router
	gin.SetMode(gin.ReleaseMode) // Disable Gin's default logging
	router := gin.New()

	// Add custom middleware in order
	router.Use(middleware.ErrorRecovery()) // Recover from panics
	router.Use(middleware.RequestLogger()) // Log all requests

	// CORS middleware for Gin
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Allow both localhost:3000 and localhost:3001 for development
		if origin == "http://localhost:3000" || origin == "http://localhost:3001" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		}
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
	api.POST("/expenses/parse", expenseHandler.ParseExpense)

	// Specific expense routes MUST come BEFORE parameterized routes
	api.GET("/expenses/export/csv", expenseHandler.ExportExpensesCSV)
	api.POST("/expenses/import/csv/preview", expenseHandler.ImportExpensesCSVPreview)
	api.POST("/expenses/import/csv/confirm", expenseHandler.ImportExpensesCSVConfirm)

	// Bank statement import routes
	api.POST("/expenses/import/bank/preview", bankImportHandler.UploadBankCSV)
	api.POST("/expenses/import/bank/confirm", bankImportHandler.CreateExpenseFromBank)

	// Balance and earnings routes (specific)
	api.GET("/expenses/balance", expenseHandler.GetBalanceSummary)
	api.GET("/expenses/actual", expenseHandler.GetActualExpenses)
	api.GET("/expenses/earnings", expenseHandler.GetEarnings)
	api.GET("/expenses/by-category", expenseHandler.GetExpensesByCategory)
	api.GET("/expenses/by-tag", expenseHandler.GetExpensesByTag)
	api.GET("/expenses/check-duplicates", expenseHandler.CheckDuplicates)
	api.GET("/expenses/averages", expenseHandler.GetAverageExpenses)

	// Parameterized routes MUST come LAST
	api.GET("/expenses/:id", expenseHandler.GetExpense)
	api.PUT("/expenses/:id", expenseHandler.UpdateExpense)
	api.DELETE("/expenses/:id", expenseHandler.DeleteExpense)

	// Income routes
	api.GET("/incomes", incomeHandler.GetIncomes)
	api.POST("/incomes", incomeHandler.CreateIncome)
	api.GET("/incomes/:id", incomeHandler.GetIncomeByID)
	api.PUT("/incomes/:id", incomeHandler.UpdateIncome)
	api.DELETE("/incomes/:id", incomeHandler.DeleteIncome)
	api.GET("/incomes/source/:source", incomeHandler.GetIncomesBySource)
	api.GET("/incomes/summary", incomeHandler.GetIncomesSummary)

	// Vendor routes
	api.GET("/vendors", vendorHandler.GetVendors)
	api.POST("/vendors", vendorHandler.CreateVendor)
	api.GET("/vendors/:id", vendorHandler.GetVendor)
	api.PUT("/vendors/:id", vendorHandler.UpdateVendor)
	api.DELETE("/vendors/:id", vendorHandler.DeleteVendor)
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
	logger.Info("Server configuration", logger.Fields{
		"address":     serverAddr,
		"port":        cfg.Server.Port,
		"swagger_url": fmt.Sprintf("http://%s/swagger/index.html", serverAddr),
	})

	logger.Info("Expenso server starting", logger.Fields{"address": serverAddr})
	if err := router.Run(":" + fmt.Sprintf("%d", cfg.Server.Port)); err != nil {
		logger.Fatal("Server failed to start", logger.Fields{"error": err.Error()})
	}
}
