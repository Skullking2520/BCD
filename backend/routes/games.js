const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, requireGameDeveloper, isValidAddress } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/games
 * @desc    Get all games with filters
 * @access  Public
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('verified').optional().isBoolean().withMessage('Verified must be boolean'),
    query('active').optional().isBoolean().withMessage('Active must be boolean'),
    query('developer').optional().custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid developer address format');
      }
      return true;
    }),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be 1-100 characters'),
    query('sort').optional().isIn(['created_at', 'name', 'items_count']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {
      limit,
      offset,
      verified: req.query.verified !== undefined ? req.query.verified === 'true' : null,
      active: req.query.active !== undefined ? req.query.active === 'true' : null,
      developer: req.query.developer,
      search: req.query.search,
      sortBy: req.query.sort || 'created_at',
      sortOrder: req.query.order || 'desc'
    };

    const games = await database.getAllGames(filters);
    const totalCount = await database.getGamesCount(filters);

    res.json({
      code: 200,
      data: {
        games,
        pagination: {
          page,
          limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit),
          has_next: page < Math.ceil(totalCount / limit),
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/games/:id
 * @desc    Get game details by ID
 * @access  Public
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const game = await database.getGameById(gameId);

    if (!game) {
      throw new NotFoundError('Game');
    }

    // Get game statistics
    const stats = await database.getGameStats(gameId);
    
    // Get recent items from this game
    const recentItems = await database.getGameItems({ 
      gameId, 
      limit: 10, 
      sortBy: 'created_at', 
      sortOrder: 'desc' 
    });

    const gameData = {
      ...game,
      stats,
      recent_items: recentItems
    };

    res.json({
      code: 200,
      data: gameData,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/games
 * @desc    Register a new game
 * @access  Private
 */
router.post('/',
  [
    body('name').notEmpty().isLength({ max: 100 }).withMessage('Game name is required and must be less than 100 characters'),
    body('developer').notEmpty().isLength({ max: 100 }).withMessage('Developer name is required and must be less than 100 characters'),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
    body('logo_url').optional().isURL().withMessage('Invalid logo URL'),
    body('website_url').optional().isURL().withMessage('Invalid website URL'),
    body('contract_address').optional().custom(value => {
      if (value && !isValidAddress(value)) {
        throw new Error('Invalid contract address format');
      }
      return true;
    }),
    body('genre').optional().isIn(['action', 'adventure', 'rpg', 'strategy', 'puzzle', 'racing', 'sports', 'simulation', 'other']).withMessage('Invalid genre'),
    body('platforms').optional().isArray().withMessage('Platforms must be an array'),
    body('social_links').optional().isObject().withMessage('Social links must be an object')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const {
      name,
      developer,
      description,
      logo_url,
      website_url,
      contract_address,
      genre,
      platforms,
      social_links
    } = req.body;

    // Check if game with same name already exists
    const existingGame = await database.getGameByName(name);
    if (existingGame) {
      throw new ValidationError('A game with this name already exists');
    }

    // Check if contract address is already registered
    if (contract_address) {
      const existingContract = await database.getGameByContract(contract_address);
      if (existingContract) {
        throw new ValidationError('This contract address is already registered');
      }
    }

    const gameData = {
      name,
      developer,
      description,
      logo_url,
      website_url,
      contract_address,
      genre,
      platforms: platforms ? JSON.stringify(platforms) : null,
      social_links: social_links ? JSON.stringify(social_links) : null,
      is_verified: false,
      is_active: true
    };

    const newGame = await database.createGame(gameData);

    // Add user as game developer
    await database.addGameDeveloper(req.user.id, newGame.id, 'owner');

    logger.info(`New game registered: ${newGame.id} (${name}) by user ${req.user.id}`);

    res.status(201).json({
      code: 201,
      message: 'Game registered successfully',
      data: newGame,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   PUT /api/v1/games/:id
 * @desc    Update game information
 * @access  Private (Game developers only)
 */
router.put('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID'),
    body('name').optional().isLength({ max: 100 }).withMessage('Game name must be less than 100 characters'),
    body('developer').optional().isLength({ max: 100 }).withMessage('Developer name must be less than 100 characters'),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
    body('logo_url').optional().isURL().withMessage('Invalid logo URL'),
    body('website_url').optional().isURL().withMessage('Invalid website URL'),
    body('genre').optional().isIn(['action', 'adventure', 'rpg', 'strategy', 'puzzle', 'racing', 'sports', 'simulation', 'other']).withMessage('Invalid genre'),
    body('platforms').optional().isArray().withMessage('Platforms must be an array'),
    body('social_links').optional().isObject().withMessage('Social links must be an object')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const game = await database.getGameById(gameId);

    if (!game) {
      throw new NotFoundError('Game');
    }

    // Check if user is game developer
    const hasPermission = await database.checkGameDeveloperPermission(req.user.id, gameId);
    if (!hasPermission) {
      throw new ForbiddenError('No permission to update this game');
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.developer !== undefined) updates.developer = req.body.developer;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.logo_url !== undefined) updates.logo_url = req.body.logo_url;
    if (req.body.website_url !== undefined) updates.website_url = req.body.website_url;
    if (req.body.genre !== undefined) updates.genre = req.body.genre;
    if (req.body.platforms !== undefined) updates.platforms = JSON.stringify(req.body.platforms);
    if (req.body.social_links !== undefined) updates.social_links = JSON.stringify(req.body.social_links);

    const updatedGame = await database.updateGame(gameId, updates);

    logger.info(`Game updated: ${gameId} by user ${req.user.id}`);

    res.json({
      code: 200,
      message: 'Game updated successfully',
      data: updatedGame,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/games/:id/verify
 * @desc    Verify a game (admin only)
 * @access  Private (Admin only)
 */
router.post('/:id/verify',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID')
  ],
  authenticateToken,
  // requireAdmin, // Need to implement this middleware
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const game = await database.getGameById(gameId);

    if (!game) {
      throw new NotFoundError('Game');
    }

    if (game.is_verified) {
      throw new ValidationError('Game is already verified');
    }

    await database.updateGame(gameId, { is_verified: true });

    logger.info(`Game verified: ${gameId} by admin ${req.user.id}`);

    res.json({
      code: 200,
      message: 'Game verified successfully',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/games/:id/activate
 * @desc    Activate/deactivate a game
 * @access  Private (Game developers or admin)
 */
router.post('/:id/activate',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID'),
    body('active').isBoolean().withMessage('Active status is required')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const { active } = req.body;

    const game = await database.getGameById(gameId);
    if (!game) {
      throw new NotFoundError('Game');
    }

    // Check permissions
    const hasPermission = await database.checkGameDeveloperPermission(req.user.id, gameId);
    if (!hasPermission) {
      throw new ForbiddenError('No permission to modify this game');
    }

    await database.updateGame(gameId, { is_active: active });

    logger.info(`Game ${active ? 'activated' : 'deactivated'}: ${gameId} by user ${req.user.id}`);

    res.json({
      code: 200,
      message: `Game ${active ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/games/:id/items
 * @desc    Get items for a specific game
 * @access  Public
 */
router.get('/:id/items',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category'),
    query('owner').optional().custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid owner address format');
      }
      return true;
    }),
    query('sort').optional().isIn(['created_at', 'name', 'rarity']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if game exists
    const game = await database.getGameById(gameId);
    if (!game) {
      throw new NotFoundError('Game');
    }

    const filters = {
      gameId,
      limit,
      offset,
      rarity: req.query.rarity,
      category: req.query.category,
      ownerAddress: req.query.owner,
      sortBy: req.query.sort || 'created_at',
      sortOrder: req.query.order || 'desc'
    };

    const items = await database.getGameItems(filters);
    const totalCount = await database.getGameItemsCount(filters);

    res.json({
      code: 200,
      data: {
        game: {
          id: game.id,
          name: game.name,
          developer: game.developer
        },
        items,
        pagination: {
          page,
          limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit),
          has_next: page < Math.ceil(totalCount / limit),
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/games/:id/developers
 * @desc    Get developers for a specific game
 * @access  Public
 */
router.get('/:id/developers',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    
    // Check if game exists
    const game = await database.getGameById(gameId);
    if (!game) {
      throw new NotFoundError('Game');
    }

    const developers = await database.getGameDevelopers(gameId);

    res.json({
      code: 200,
      data: {
        game: {
          id: game.id,
          name: game.name
        },
        developers
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/games/:id/developers
 * @desc    Add a developer to a game
 * @access  Private (Game owner only)
 */
router.post('/:id/developers',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID'),
    body('user_address').custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid user address format');
      }
      return true;
    }),
    body('role').optional().isIn(['developer', 'admin', 'moderator']).withMessage('Invalid role'),
    body('permissions').optional().isObject().withMessage('Permissions must be an object')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const { user_address, role = 'developer', permissions } = req.body;

    // Check if game exists
    const game = await database.getGameById(gameId);
    if (!game) {
      throw new NotFoundError('Game');
    }

    // Check if current user is owner
    const currentUserRole = await database.getGameDeveloperRole(req.user.id, gameId);
    if (currentUserRole !== 'owner') {
      throw new ForbiddenError('Only game owners can add developers');
    }

    // Find user by address
    const targetUser = await database.findUserByAddress(user_address);
    if (!targetUser) {
      throw new NotFoundError('User with this address not found');
    }

    // Check if user is already a developer
    const existingRole = await database.getGameDeveloperRole(targetUser.id, gameId);
    if (existingRole) {
      throw new ValidationError('User is already a developer for this game');
    }

    await database.addGameDeveloper(targetUser.id, gameId, role, permissions);

    logger.info(`Developer added to game ${gameId}: user ${targetUser.id} with role ${role}`);

    res.json({
      code: 200,
      message: 'Developer added successfully',
      data: {
        user_id: targetUser.id,
        user_address: targetUser.wallet_address,
        role,
        permissions
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/games/:id/stats
 * @desc    Get detailed game statistics
 * @access  Public
 */
router.get('/:id/stats',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('period').optional().isIn(['24h', '7d', '30d', '90d', 'all']).withMessage('Invalid period')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = parseInt(req.params.id);
    const period = req.query.period || '30d';

    // Check if game exists
    const game = await database.getGameById(gameId);
    if (!game) {
      throw new NotFoundError('Game');
    }

    const stats = await database.getDetailedGameStats(gameId, period);

    res.json({
      code: 200,
      data: {
        game: {
          id: game.id,
          name: game.name,
          developer: game.developer
        },
        period,
        stats
      },
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router; 