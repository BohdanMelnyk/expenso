-- Create users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    totp_secret_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);

-- Seed a system_user for attributing pre-auth historical data. The
-- password_hash/totp_secret_encrypted values are random, never-distributed
-- placeholders: they satisfy the NOT NULL constraints but can never pass a
-- real bcrypt/TOTP check, so this account can never log in.
INSERT INTO users (username, password_hash, totp_secret_encrypted)
VALUES ('system_user', 'disabled:no-login', 'disabled:no-login');
