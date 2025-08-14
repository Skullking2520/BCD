const express = require('express');
const { param, query, validationResult } = require('express-validator');
const database = require('../utils/database');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get platform overview statistics
 * @access  Public
 */
router.get('/overview',
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d', 'all']).withMessage('Invalid period')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const period = req.query.period || '30d';
    const overview = await database.getPlatformOverview(period);

    res.json({
      code: 200,
      data: {
        period,
        ...overview
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/market-trends
 * @desc    Get market trends and trading volume
 * @access  Public
 */
router.get('/market-trends',
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Invalid period'),
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const period = req.query.period || '7d';
    const filters = {
      gameId: req.query.game_id ? parseInt(req.query.game_id) : null,
      rarity: req.query.rarity,
      category: req.query.category
    };

    const trends = await database.getMarketTrends(period, filters);

    res.json({
      code: 200,
      data: {
        period,
        filters,
        trends
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/price-history/:item_id
 * @desc    Get detailed price history for a specific item
 * @access  Public
 */
router.get('/price-history/:item_id',
  [
    param('item_id').isInt({ min: 1 }).withMessage('Invalid item ID'),
    query('period').optional().isIn(['24h', '7d', '30d', '90d', 'all']).withMessage('Invalid period'),
    query('interval').optional().isIn(['1h', '4h', '1d', '7d']).withMessage('Invalid interval')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const itemId = parseInt(req.params.item_id);
    const period = req.query.period || '30d';
    const interval = req.query.interval || '1d';

    // Check if item exists
    const item = await database.getGameItemById(itemId);
    if (!item) {
      throw new NotFoundError('Item');
    }

    const priceHistory = await database.getDetailedPriceHistory(itemId, period, interval);

    res.json({
      code: 200,
      data: {
        item: {
          id: item.id,
          name: item.name,
          token_id: item.token_id,
          game_id: item.game_id,
          rarity: item.rarity
        },
        period,
        interval,
        price_history: priceHistory
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/top-items
 * @desc    Get top performing items by various metrics
 * @access  Public
 */
router.get('/top-items',
  [
    query('metric').optional().isIn(['volume', 'price', 'transactions', 'price_change']).withMessage('Invalid metric'),
    query('period').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Invalid period'),
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const metric = req.query.metric || 'volume';
    const period = req.query.period || '7d';
    const limit = parseInt(req.query.limit) || 20;

    const filters = {
      gameId: req.query.game_id ? parseInt(req.query.game_id) : null,
      rarity: req.query.rarity,
      category: req.query.category
    };

    const topItems = await database.getTopItems(metric, period, filters, limit);

    res.json({
      code: 200,
      data: {
        metric,
        period,
        filters,
        items: topItems
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/user-stats/:address
 * @desc    Get user trading statistics
 * @access  Public
 */
router.get('/user-stats/:address',
  [
    param('address').isLength(42).withMessage('Invalid address format'),
    query('period').optional().isIn(['24h', '7d', '30d', '90d', 'all']).withMessage('Invalid period')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const userAddress = req.params.address;
    const period = req.query.period || '30d';

    // Check if user exists
    const user = await database.findUserByAddress(userAddress);
    if (!user) {
      throw new NotFoundError('User');
    }

    const stats = await database.getUserTradingStats(userAddress, period);

    res.json({
      code: 200,
      data: {
        user: {
          address: user.wallet_address,
          username: user.username,
          reputation_score: user.reputation_score
        },
        period,
        stats
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/rarity-distribution
 * @desc    Get rarity distribution across games or platform
 * @access  Public
 */
router.get('/rarity-distribution',
  [
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = req.query.game_id ? parseInt(req.query.game_id) : null;
    const category = req.query.category;

    const distribution = await database.getRarityDistribution(gameId, category);

    res.json({
      code: 200,
      data: {
        game_id: gameId,
        category,
        distribution
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/game-comparison
 * @desc    Compare multiple games by key metrics
 * @access  Public
 */
router.get('/game-comparison',
  [
    query('game_ids').notEmpty().withMessage('Game IDs are required'),
    query('period').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Invalid period'),
    query('metrics').optional().withMessage('Metrics should be comma-separated')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameIdsStr = req.query.game_ids;
    const gameIds = gameIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (gameIds.length === 0 || gameIds.length > 10) {
      throw new ValidationError('Must provide 1-10 valid game IDs');
    }

    const period = req.query.period || '30d';
    const metrics = req.query.metrics ? req.query.metrics.split(',').map(m => m.trim()) : ['volume', 'transactions', 'users', 'avg_price'];

    const comparison = await database.compareGames(gameIds, period, metrics);

    res.json({
      code: 200,
      data: {
        game_ids: gameIds,
        period,
        metrics,
        comparison
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/trading-activity
 * @desc    Get trading activity over time
 * @access  Public
 */
router.get('/trading-activity',
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Invalid period'),
    query('interval').optional().isIn(['1h', '4h', '1d']).withMessage('Invalid interval'),
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const period = req.query.period || '7d';
    const interval = req.query.interval || '1d';
    const gameId = req.query.game_id ? parseInt(req.query.game_id) : null;

    const activity = await database.getTradingActivity(period, interval, gameId);

    res.json({
      code: 200,
      data: {
        period,
        interval,
        game_id: gameId,
        activity
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/price-ranges
 * @desc    Get price range distribution for items
 * @access  Public
 */
router.get('/price-ranges',
  [
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category'),
    query('currency').optional().isIn(['ETH', 'USDC', 'USDT']).withMessage('Invalid currency')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const filters = {
      gameId: req.query.game_id ? parseInt(req.query.game_id) : null,
      rarity: req.query.rarity,
      category: req.query.category,
      currency: req.query.currency || 'ETH'
    };

    const priceRanges = await database.getPriceRangeDistribution(filters);

    res.json({
      code: 200,
      data: {
        filters,
        price_ranges: priceRanges
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/trending-searches
 * @desc    Get trending search terms and popular items
 * @access  Public
 */
router.get('/trending-searches',
  [
    query('period').optional().isIn(['24h', '7d', '30d']).withMessage('Invalid period'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const period = req.query.period || '7d';
    const limit = parseInt(req.query.limit) || 20;

    const trending = await database.getTrendingSearches(period, limit);

    res.json({
      code: 200,
      data: {
        period,
        trending
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/analytics/market-health
 * @desc    Get market health indicators
 * @access  Public
 */
router.get('/market-health',
  [
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = req.query.game_id ? parseInt(req.query.game_id) : null;
    const healthIndicators = await database.getMarketHealthIndicators(gameId);

    res.json({
      code: 200,
      data: {
        game_id: gameId,
        health_indicators: healthIndicators
      },
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router; 