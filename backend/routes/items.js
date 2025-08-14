const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, optionalAuth, isValidAddress } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/items
 * @desc    Get game items with filters
 * @access  Public
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('owner').optional().custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid owner address format');
      }
      return true;
    }),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category'),
    query('min_price').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
    query('max_price').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
    query('sort').optional().isIn(['created_at', 'price', 'rarity', 'name']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
  ],
  optionalAuth,
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
      gameId: req.query.game_id ? parseInt(req.query.game_id) : null,
      ownerAddress: req.query.owner,
      rarity: req.query.rarity,
      category: req.query.category,
      minPrice: req.query.min_price ? parseFloat(req.query.min_price) : null,
      maxPrice: req.query.max_price ? parseFloat(req.query.max_price) : null,
      sortBy: req.query.sort || 'created_at',
      sortOrder: req.query.order || 'desc',
      includeInactive: req.query.include_inactive === 'true'
    };

    const items = await database.getGameItems(filters);
    const totalCount = await database.getGameItemsCount(filters);

    res.json({
      code: 200,
      data: {
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
 * @route   GET /api/v1/items/:id
 * @desc    Get item details by ID
 * @access  Public
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid item ID')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const itemId = parseInt(req.params.id);
    const item = await database.getGameItemById(itemId);

    if (!item) {
      throw new NotFoundError('Item');
    }

    // Get price history
    const priceHistory = await database.getItemPriceHistory(itemId);
    
    // Get current market listing if exists
    const currentListing = await database.getActiveListingByItemId(itemId);

    const itemData = {
      ...item,
      price_history: priceHistory,
      current_listing: currentListing,
      is_favorited: req.user ? await database.isItemFavorited(req.user.id, itemId) : false
    };

    res.json({
      code: 200,
      data: itemData,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/items
 * @desc    Create a new game item (minting)
 * @access  Private (Game developers or admins)
 */
router.post('/',
  [
    body('game_id').isInt({ min: 1 }).withMessage('Valid game ID is required'),
    body('name').notEmpty().isLength({ max: 200 }).withMessage('Name is required and must be less than 200 characters'),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
    body('image_url').optional().isURL().withMessage('Invalid image URL'),
    body('attributes').optional().isJSON().withMessage('Attributes must be valid JSON'),
    body('rarity').isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    body('item_type').notEmpty().withMessage('Item type is required'),
    body('category').isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category'),
    body('level_requirement').optional().isInt({ min: 0 }).withMessage('Level requirement must be non-negative'),
    body('token_id').notEmpty().withMessage('Token ID is required'),
    body('contract_address').custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid contract address format');
      }
      return true;
    }),
    body('owner_address').custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid owner address format');
      }
      return true;
    })
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const {
      game_id,
      name,
      description,
      image_url,
      attributes,
      rarity,
      item_type,
      category,
      level_requirement,
      token_id,
      contract_address,
      owner_address
    } = req.body;

    // Verify user has permission to create items for this game
    const hasPermission = await database.checkGameDeveloperPermission(req.user.id, game_id);
    if (!hasPermission) {
      throw new ForbiddenError('No permission to create items for this game');
    }

    // Check if item already exists
    const existingItem = await database.getGameItemByTokenId(contract_address, token_id);
    if (existingItem) {
      throw new ValidationError('Item with this token ID already exists');
    }

    // Create item type if not exists
    let itemTypeId = await database.getItemTypeId(game_id, item_type, category);
    if (!itemTypeId) {
      itemTypeId = await database.createItemType(game_id, item_type, category);
    }

    const itemData = {
      token_id,
      contract_address,
      game_id,
      item_type_id: itemTypeId,
      owner_address,
      name,
      description,
      image_url,
      attributes: attributes ? JSON.parse(attributes) : null,
      rarity,
      level_requirement: level_requirement || 0
    };

    const newItem = await database.createGameItem(itemData);

    logger.info(`New game item created: ${newItem.id} by user ${req.user.id}`);

    res.status(201).json({
      code: 201,
      message: 'Item created successfully',
      data: newItem,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   PUT /api/v1/items/:id
 * @desc    Update item metadata (only specific fields)
 * @access  Private (Game developers or item owner)
 */
router.put('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid item ID'),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
    body('attributes').optional().isJSON().withMessage('Attributes must be valid JSON'),
    body('level_requirement').optional().isInt({ min: 0 }).withMessage('Level requirement must be non-negative')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const itemId = parseInt(req.params.id);
    const item = await database.getGameItemById(itemId);

    if (!item) {
      throw new NotFoundError('Item');
    }

    // Check permissions - either game developer or item owner
    const hasGamePermission = await database.checkGameDeveloperPermission(req.user.id, item.game_id);
    const isOwner = item.owner_address.toLowerCase() === req.user.wallet_address.toLowerCase();

    if (!hasGamePermission && !isOwner) {
      throw new ForbiddenError('No permission to update this item');
    }

    const updates = {};
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.attributes !== undefined) updates.attributes = JSON.parse(req.body.attributes);
    if (req.body.level_requirement !== undefined) updates.level_requirement = req.body.level_requirement;

    const updatedItem = await database.updateGameItem(itemId, updates);

    logger.info(`Game item updated: ${itemId} by user ${req.user.id}`);

    res.json({
      code: 200,
      message: 'Item updated successfully',
      data: updatedItem,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/items/:id/favorite
 * @desc    Add item to favorites
 * @access  Private
 */
router.post('/:id/favorite',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid item ID')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const itemId = parseInt(req.params.id);
    
    // Check if item exists
    const item = await database.getGameItemById(itemId);
    if (!item) {
      throw new NotFoundError('Item');
    }

    await database.addToFavorites(req.user.id, itemId);

    res.json({
      code: 200,
      message: 'Item added to favorites',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   DELETE /api/v1/items/:id/favorite
 * @desc    Remove item from favorites
 * @access  Private
 */
router.delete('/:id/favorite',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid item ID')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const itemId = parseInt(req.params.id);
    await database.removeFromFavorites(req.user.id, itemId);

    res.json({
      code: 200,
      message: 'Item removed from favorites',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/items/:id/history
 * @desc    Get item transaction history
 * @access  Public
 */
router.get('/:id/history',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid item ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const itemId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if item exists
    const item = await database.getGameItemById(itemId);
    if (!item) {
      throw new NotFoundError('Item');
    }

    const history = await database.getItemTransactionHistory(itemId, { limit, offset });
    const totalCount = await database.getItemTransactionCount(itemId);

    res.json({
      code: 200,
      data: {
        item: {
          id: item.id,
          name: item.name,
          token_id: item.token_id
        },
        transactions: history,
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

module.exports = router; 