# Database Design Documentation

## Database Configuration

- Database Name: `crypto_trading_db`
- Database Version: PostgreSQL 17 (Windows x64)
- Character Set: UTF-8
- Timezone: UTC
- Port: 5433
- Superuser: postgres
- Superuser Password: admin

## Connection Information

```bash
# Connection String
postgresql://postgres:admin@localhost:5433/crypto_trading_db

# Environment Variables
DB_HOST=localhost
DB_PORT=5433
DB_NAME=crypto_trading_db
DB_USER=postgres
DB_PASSWORD=admin
```

## Table Structure

### 1. Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Transactions Table

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_hash VARCHAR(66) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    amount DECIMAL(78,0) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Token Configurations Table

```sql
CREATE TABLE token_configs (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(42) UNIQUE NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    token_name VARCHAR(50) NOT NULL,
    decimals INTEGER NOT NULL CHECK (decimals BETWEEN 0 AND 18),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes

```sql
-- Users Table Indexes
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Transactions Table Indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_transaction_hash ON transactions(transaction_hash);

-- Token Configurations Table Indexes
CREATE INDEX idx_token_configs_token_address ON token_configs(token_address);
```

## Initial Data

```sql
-- Insert Initial Token Configurations
INSERT INTO token_configs (token_address, token_symbol, token_name, decimals) VALUES
('0x0000000000000000000000000000000000000000', 'ETH', 'Ethereum', 18),
('0x1234567890123456789012345678901234567890', 'USDT', 'Tether USD', 6);
```

## Common Queries

### 1. Query User Transaction History

```sql
SELECT t.*, u.wallet_address, tc.token_symbol
FROM transactions t
JOIN users u ON t.user_id = u.id
JOIN token_configs tc ON t.token_address = tc.token_address
WHERE u.wallet_address = '0x...'
ORDER BY t.created_at DESC;
```

### 2. Query Active Tokens

```sql
SELECT * FROM token_configs WHERE is_active = true;
```

### 3. Query Transaction Statistics

```sql
SELECT 
    tc.token_symbol,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN t.transaction_type = 'BUY' THEN 1 ELSE 0 END) as buy_count,
    SUM(CASE WHEN t.transaction_type = 'SELL' THEN 1 ELSE 0 END) as sell_count
FROM transactions t
JOIN token_configs tc ON t.token_address = tc.token_address
GROUP BY tc.token_symbol;
```

## Maintenance Commands

### 1. Backup Database

```bash
pg_dump -U postgres -p 5433 -W crypto_trading_db > backup.sql
# When prompted for password, enter: admin
```

### 2. Restore Database

```bash
psql -U postgres -p 5433 -W crypto_trading_db < backup.sql
# When prompted for password, enter: admin
```

### 3. Clean Up Expired Data

```sql
-- Delete failed transactions older than 30 days
DELETE FROM transactions 
WHERE status = 'FAILED' 
AND created_at < NOW() - INTERVAL '30 days';
```

### 4. Common Connection Commands

```bash
# Connect to Database
psql -U postgres -p 5433 -W crypto_trading_db
# When prompted for password, enter: admin

# Create Database
psql -U postgres -p 5433 -W -c "CREATE DATABASE crypto_trading_db;"
# When prompted for password, enter: admin
```

## Important Notes

1. All timestamps use UTC timezone
2. Amounts use DECIMAL(78,0) to support large numbers
3. Wallet addresses and token addresses must be valid Ethereum addresses
4. Regular database backups are required
5. Monitor database performance
6. Implement proper access control
7. Use parameterized queries to prevent SQL injection
8. Encrypt sensitive data
9. Maintain audit logs
10. Regular security audits 