const { Pool } = require('pg');
const { logger } = require('./logger');

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'game_items_trading',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database query helper
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error', { text, error: error.message });
    throw error;
  }
};

// Market listings queries
const getMarketListings = async (filters) => {
  let sql = `
    SELECT 
      ml.id,
      ml.listing_id,
      ml.seller_address,
      ml.price,
      ml.listing_type,
      ml.status,
      ml.created_at,
      gi.id as item_id,
      gi.name as item_name,
      gi.description as item_description,
      gi.image_url as item_image,
      gi.rarity,
      gi.level,
      g.name as game_name,
      g.logo_url as game_logo
    FROM market_listings ml
    JOIN game_items gi ON ml.item_id = gi.id
    JOIN games g ON gi.game_id = g.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 0;

  if (filters.gameId) {
    paramCount++;
    sql += ` AND gi.game_id = $${paramCount}`;
    params.push(filters.gameId);
  }

  if (filters.sellerAddress) {
    paramCount++;
    sql += ` AND ml.seller_address = $${paramCount}`;
    params.push(filters.sellerAddress);
  }

  if (filters.rarity) {
    paramCount++;
    sql += ` AND gi.rarity = $${paramCount}`;
    params.push(filters.rarity);
  }

  if (filters.category) {
    paramCount++;
    sql += ` AND gi.item_type_id = (SELECT id FROM item_types WHERE name = $${paramCount})`;
    params.push(filters.category);
  }

  if (filters.minPrice) {
    paramCount++;
    sql += ` AND ml.price >= $${paramCount}`;
    params.push(filters.minPrice);
  }

  if (filters.maxPrice) {
    paramCount++;
    sql += ` AND ml.price <= $${paramCount}`;
    params.push(filters.maxPrice);
  }

  if (filters.listingType) {
    paramCount++;
    sql += ` AND ml.listing_type = $${paramCount}`;
    params.push(filters.listingType);
  }

  if (filters.status) {
    paramCount++;
    sql += ` AND ml.status = $${paramCount}`;
    params.push(filters.status);
  }

  sql += ` ORDER BY ml.${filters.sortBy} ${filters.sortOrder}`;
  sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(filters.limit, filters.offset);

  const result = await query(sql, params);
  return result.rows;
};

const getMarketListingsCount = async (filters) => {
  let sql = `
    SELECT COUNT(*) as count
    FROM market_listings ml
    JOIN game_items gi ON ml.item_id = gi.id
    JOIN games g ON gi.game_id = g.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 0;

  if (filters.gameId) {
    paramCount++;
    sql += ` AND gi.game_id = $${paramCount}`;
    params.push(filters.gameId);
  }

  if (filters.sellerAddress) {
    paramCount++;
    sql += ` AND ml.seller_address = $${paramCount}`;
    params.push(filters.sellerAddress);
  }

  if (filters.rarity) {
    paramCount++;
    sql += ` AND gi.rarity = $${paramCount}`;
    params.push(filters.rarity);
  }

  if (filters.status) {
    paramCount++;
    sql += ` AND ml.status = $${paramCount}`;
    params.push(filters.status);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
};

const getMarketListingById = async (listingId) => {
  const sql = `
    SELECT 
      ml.*,
      gi.name as item_name,
      gi.description as item_description,
      gi.image_url as item_image,
      gi.rarity,
      gi.level,
      g.name as game_name,
      g.logo_url as game_logo
    FROM market_listings ml
    JOIN game_items gi ON ml.item_id = gi.id
    JOIN games g ON gi.game_id = g.id
    WHERE ml.id = $1
  `;
  
  const result = await query(sql, [listingId]);
  return result.rows[0];
};

// User queries
const getUserByAddress = async (walletAddress) => {
  const sql = 'SELECT * FROM users WHERE wallet_address = $1';
  const result = await query(sql, [walletAddress]);
  return result.rows[0];
};

const createUser = async (userData) => {
  const sql = `
    INSERT INTO users (wallet_address, username, email, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await query(sql, [
    userData.wallet_address,
    userData.username,
    userData.email,
    userData.avatar_url
  ]);
  return result.rows[0];
};

// Game queries
const getGames = async () => {
  const sql = 'SELECT * FROM games WHERE is_active = true ORDER BY name';
  const result = await query(sql);
  return result.rows;
};

const getGameById = async (gameId) => {
  const sql = 'SELECT * FROM games WHERE id = $1';
  const result = await query(sql, [gameId]);
  return result.rows[0];
};

// Item queries
const getItemsByOwner = async (ownerAddress) => {
  const sql = `
    SELECT 
      gi.*,
      g.name as game_name,
      it.name as item_type_name
    FROM game_items gi
    JOIN games g ON gi.game_id = g.id
    JOIN item_types it ON gi.item_type_id = it.id
    WHERE gi.owner_address = $1
    ORDER BY gi.created_at DESC
  `;
  const result = await query(sql, [ownerAddress]);
  return result.rows;
};

// Transaction queries
const createTransaction = async (transactionData) => {
  const sql = `
    INSERT INTO transactions (
      tx_hash, listing_id, buyer_address, seller_address, 
      item_id, price, platform_fee, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await query(sql, [
    transactionData.tx_hash,
    transactionData.listing_id,
    transactionData.buyer_address,
    transactionData.seller_address,
    transactionData.item_id,
    transactionData.price,
    transactionData.platform_fee,
    transactionData.status
  ]);
  return result.rows[0];
};

const updateTransactionStatus = async (txHash, status, blockData = null) => {
  let sql = 'UPDATE transactions SET status = $1';
  const params = [status];
  
  if (blockData) {
    sql += ', block_number = $2, gas_used = $3, gas_price = $4';
    params.push(blockData.blockNumber, blockData.gasUsed, blockData.gasPrice);
  }
  
  sql += ' WHERE tx_hash = $' + (params.length + 1);
  params.push(txHash);
  
  const result = await query(sql, params);
  return result.rowCount > 0;
};

// Analytics queries
const getMarketStats = async () => {
  const sql = `
    SELECT 
      COUNT(DISTINCT ml.id) as total_listings,
      COUNT(DISTINCT ml.seller_address) as unique_sellers,
      AVG(ml.price) as avg_price,
      SUM(CASE WHEN ml.status = 'sold' THEN 1 ELSE 0 END) as total_sales,
      SUM(CASE WHEN ml.status = 'sold' THEN ml.price ELSE 0 END) as total_volume
    FROM market_listings ml
    WHERE ml.created_at >= NOW() - INTERVAL '24 hours'
  `;
  const result = await query(sql);
  return result.rows[0];
};

const getTopItems = async (limit = 10) => {
  const sql = `
    SELECT 
      gi.name,
      gi.rarity,
      g.name as game_name,
      COUNT(t.id) as trade_count,
      AVG(t.price) as avg_price
    FROM game_items gi
    JOIN games g ON gi.game_id = g.id
    LEFT JOIN transactions t ON gi.id = t.item_id
    WHERE t.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY gi.id, gi.name, gi.rarity, g.name
    ORDER BY trade_count DESC, avg_price DESC
    LIMIT $1
  `;
  const result = await query(sql, [limit]);
  return result.rows;
};

module.exports = {
  query,
  getMarketListings,
  getMarketListingsCount,
  getMarketListingById,
  getUserByAddress,
  createUser,
  getGames,
  getGameById,
  getItemsByOwner,
  createTransaction,
  updateTransactionStatus,
  getMarketStats,
  getTopItems
}; 