-- Game Items Trading Platform Database Schema
-- PostgreSQL initialization script

-- Create database (run this separately if needed)
-- CREATE DATABASE game_items_trading;

-- Connect to the database
-- \c game_items_trading;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    reputation_score INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    total_volume DECIMAL(20,8) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    developer VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    contract_address VARCHAR(42) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item types table
CREATE TABLE item_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game items table (NFT metadata)
CREATE TABLE game_items (
    id SERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL,
    game_id INTEGER REFERENCES games(id),
    item_type_id INTEGER REFERENCES item_types(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    rarity VARCHAR(20) CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    level INTEGER DEFAULT 1,
    attributes JSONB,
    owner_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    token_uri TEXT,
    is_tradeable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_address, token_id)
);

-- Market listings table
CREATE TABLE market_listings (
    id SERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    seller_address VARCHAR(42) NOT NULL,
    item_id INTEGER REFERENCES game_items(id),
    price DECIMAL(20,8) NOT NULL,
    listing_type VARCHAR(20) DEFAULT 'fixed' CHECK (listing_type IN ('fixed', 'auction', 'offer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auction info table
CREATE TABLE auction_info (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES market_listings(id),
    starting_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8) NOT NULL,
    min_bid_increment DECIMAL(20,8) DEFAULT 0.001,
    end_time TIMESTAMP NOT NULL,
    highest_bidder VARCHAR(42),
    bid_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    listing_id INTEGER REFERENCES market_listings(id),
    buyer_address VARCHAR(42) NOT NULL,
    seller_address VARCHAR(42) NOT NULL,
    item_id INTEGER REFERENCES game_items(id),
    price DECIMAL(20,8) NOT NULL,
    platform_fee DECIMAL(20,8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    gas_used BIGINT,
    gas_price BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites table
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    item_id INTEGER REFERENCES game_items(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, item_id)
);

-- Price history table
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES game_items(id),
    price DECIMAL(20,8) NOT NULL,
    volume_24h DECIMAL(20,8) DEFAULT 0,
    change_24h DECIMAL(10,2) DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game developers table
CREATE TABLE game_developers (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    game_id INTEGER REFERENCES games(id),
    role VARCHAR(50) DEFAULT 'developer',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO item_types (name, description) VALUES
('weapon', 'Combat weapons and equipment'),
('armor', 'Defensive equipment and protection'),
('consumable', 'Potions, scrolls, and temporary items'),
('character', 'Playable characters and heroes'),
('pet', 'Companion animals and creatures'),
('skin', 'Cosmetic appearance items'),
('currency', 'In-game currency and tokens'),
('badge', 'Achievement and status badges'),
('collectible', 'Rare collectible items');

-- Insert sample games
INSERT INTO games (name, developer, description, logo_url) VALUES
('Legend of Valor', 'Epic Studios', 'A fantasy MMORPG with epic battles', 'https://example.com/lov-logo.png'),
('Cyber Arena', 'Tech Games', 'Futuristic competitive shooter', 'https://example.com/cyber-logo.png'),
('Dragon Quest', 'Fantasy Corp', 'Adventure RPG with dragon companions', 'https://example.com/dragon-logo.png');

-- Create indexes for better performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_game_items_owner ON game_items(owner_address);
CREATE INDEX idx_game_items_contract_token ON game_items(contract_address, token_id);
CREATE INDEX idx_market_listings_seller ON market_listings(seller_address);
CREATE INDEX idx_market_listings_status ON market_listings(status);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_address);
CREATE INDEX idx_transactions_seller ON transactions(seller_address);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_price_history_item_time ON price_history(item_id, recorded_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_items_updated_at BEFORE UPDATE ON game_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_listings_updated_at BEFORE UPDATE ON market_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 