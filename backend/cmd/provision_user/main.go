package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/skip2/go-qrcode"

	_ "github.com/lib/pq"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/auth"
	"expenso-backend/infrastructure/config"
	"expenso-backend/infrastructure/persistence/repositories"
)

func main() {
	cfg, err := config.LoadConfigForEnvironment()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	db, err := sql.Open("postgres", cfg.GetDatabaseURL())
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	reader := bufio.NewReader(os.Stdin)

	fmt.Print("Username: ")
	username, _ := reader.ReadString('\n')
	username = strings.TrimSpace(username)

	// This CLI is run locally by the operator against their own terminal,
	// so plaintext password entry is an acceptable trade-off against adding
	// a new terminal-echo-hiding dependency for a one-off admin tool.
	fmt.Print("Password: ")
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	passwordHasher := auth.NewBcryptPasswordHasher()
	passwordHash, err := passwordHasher.Hash(password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to hash password: %v\n", err)
		os.Exit(1)
	}

	totpService, err := auth.NewTOTPService([]byte(cfg.Auth.EncryptionKey), cfg.Auth.TOTPIssuer)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialize TOTP service: %v\n", err)
		os.Exit(1)
	}

	encryptedSecret, otpauthURL, err := totpService.GenerateSecret(username)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to generate TOTP secret: %v\n", err)
		os.Exit(1)
	}

	user, err := entities.NewUser(username, passwordHash, encryptedSecret)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create user: %v\n", err)
		os.Exit(1)
	}

	userRepo := repositories.NewUserRepository(db)
	if err := userRepo.Save(user); err != nil {
		fmt.Fprintf(os.Stderr, "failed to save user: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\nUser %q created (id=%d).\n", username, user.ID())
	fmt.Println("Scan this QR code into your authenticator app (Google Authenticator, Authy, etc.):")
	qr, err := qrcode.New(otpauthURL, qrcode.Medium)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to render QR code, here's the raw URL instead: %s\n", otpauthURL)
		os.Exit(1)
	}
	fmt.Println(qr.ToSmallString(false))
}
