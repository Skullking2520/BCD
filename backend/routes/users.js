const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const database = require('../utils/database');
const { authenticateToken, isValidAddress } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Only allow 1 file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @route   GET /api/v1/users/:address
 * @desc    Get user profile by wallet address
 * @access  Public
 */
router.get('/:address',
  [
    param('address')
      .custom(value => {
        if (!isValidAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { address } = req.params;

    const user = await database.findUserByAddress(address);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get user statistics
    const [itemsResult, transactionsResult] = await Promise.all([
      database.getGameItems({ ownerAddress: address, limit: 1000 }),
      database.query(`
        SELECT 
          COUNT(*) as total_trades,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_volume
        FROM transactions 
        WHERE (buyer_address = $1 OR seller_address = $1) AND status = 'completed'
      `, [address])
    ]);

    const userProfile = {
      id: user.id,
      wallet_address: user.wallet_address,
      username: user.username,
      avatar_url: user.avatar_url,
      bio: user.bio,
      reputation_score: user.reputation_score,
      is_verified: user.is_verified,
      created_at: user.created_at,
      last_login: user.last_login,
      stats: {
        total_items: itemsResult.length,
        total_trades: parseInt(transactionsResult.rows[0].total_trades),
        total_volume: transactionsResult.rows[0].total_volume
      }
    };

    res.json({
      code: 200,
      data: userProfile,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { username, email, bio } = req.body;
    const updates = {};

    if (username !== undefined) {
      // Check if username is already taken
      const existingUser = await database.query(
        'SELECT id FROM users WHERE username = $1 AND wallet_address != $2',
        [username, req.user.wallet_address]
      );
      
      if (existingUser.rows.length > 0) {
        throw new ValidationError('Username already taken');
      }
      
      updates.username = username;
    }

    if (email !== undefined) updates.email = email;
    if (bio !== undefined) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const updatedUser = await database.updateUser(req.user.wallet_address, updates);

    logger.info(`User profile updated: ${req.user.wallet_address}`);

    res.json({
      code: 200,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        wallet_address: updatedUser.wallet_address,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        avatar_url: updatedUser.avatar_url,
        reputation_score: updatedUser.reputation_score,
        is_verified: updatedUser.is_verified
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/users/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar',
  authenticateToken,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('Avatar file is required');
    }

    // In a real implementation, you would:
    // 1. Upload to IPFS or cloud storage (AWS S3, etc.)
    // 2. Get the URL back
    // 3. Save the URL to the database
    
    // For now, we'll simulate this with a placeholder URL
    const avatarUrl = `https://api.gameitemstrading.com/avatars/${req.user.id}-${Date.now()}.jpg`;
    
    const updatedUser = await database.updateUser(req.user.wallet_address, {
      avatar_url: avatarUrl
    });

    logger.info(`Avatar updated for user: ${req.user.wallet_address}`);

    res.json({
      code: 200,
      message: 'Avatar uploaded successfully',
      data: {
        avatar_url: avatarUrl
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/users/:address/items
 * @desc    Get user's game items
 * @access  Public
 */
router.get('/:address/items',
  [
    param('address')
      .custom(value => {
        if (!isValidAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      }),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('game_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Game ID must be a positive integer'),
    query('rarity')
      .optional()
      .isIn(['common', 'rare', 'epic', 'legendary', 'mythic'])
      .withMessage('Invalid rarity value')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if user exists
    const user = await database.findUserByAddress(address);
    if (!user) {
      throw new NotFoundError('User');
    }

    const filters = {
      ownerAddress: address,
      limit,
      offset
    };

    if (req.query.game_id) filters.gameId = parseInt(req.query.game_id);
    if (req.query.rarity) filters.rarity = req.query.rarity;

    const items = await database.getGameItems(filters);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) FROM game_items 
      WHERE owner_address = $1
      ${req.query.game_id ? 'AND game_id = $2' : ''}
      ${req.query.rarity ? `AND rarity = $${req.query.game_id ? 3 : 2}` : ''}
    `;
    
    const countParams = [address];
    if (req.query.game_id) countParams.push(parseInt(req.query.game_id));
    if (req.query.rarity) countParams.push(req.query.rarity);
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      code: 200,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: page < Math.ceil(total / limit),
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/users/:address/favorites
 * @desc    Get user's favorite items
 * @access  Private (only own favorites)
 */
router.get('/:address/favorites',
  authenticateToken,
  [
    param('address')
      .custom(value => {
        if (!isValidAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { address } = req.params;

    // Users can only view their own favorites
    if (address.toLowerCase() !== req.user.wallet_address.toLowerCase()) {
      throw new ForbiddenError('Access denied');
    }

    const favoritesQuery = `
      SELECT gi.*, g.name as game_name, g.logo_url as game_logo,
             owner.username as owner_username, uf.created_at as favorited_at
      FROM user_favorites uf
      JOIN game_items gi ON uf.item_id = gi.id
      JOIN games g ON gi.game_id = g.id
      LEFT JOIN users owner ON gi.owner_address = owner.wallet_address
      WHERE uf.user_id = $1
      ORDER BY uf.created_at DESC
    `;

    const result = await database.query(favoritesQuery, [req.user.id]);

    res.json({
      code: 200,
      data: {
        favorites: result.rows
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/users/favorites/:itemId
 * @desc    Add item to favorites
 * @access  Private
 */
router.post('/favorites/:itemId',
  authenticateToken,
  [
    param('itemId')
      .isInt({ min: 1 })
      .withMessage('Item ID must be a positive integer')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { itemId } = req.params;

    // Check if item exists
    const item = await database.getItemById(itemId);
    if (!item) {
      throw new NotFoundError('Item');
    }

    // Add to favorites (ignore if already exists)
    const insertQuery = `
      INSERT INTO user_favorites (user_id, item_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, item_id) DO NOTHING
      RETURNING *
    `;

    const result = await database.query(insertQuery, [req.user.id, itemId]);

    res.json({
      code: 200,
      message: result.rows.length > 0 ? 'Item added to favorites' : 'Item already in favorites',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   DELETE /api/v1/users/favorites/:itemId
 * @desc    Remove item from favorites
 * @access  Private
 */
router.delete('/favorites/:itemId',
  authenticateToken,
  [
    param('itemId')
      .isInt({ min: 1 })
      .withMessage('Item ID must be a positive integer')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { itemId } = req.params;

    const deleteQuery = `
      DELETE FROM user_favorites 
      WHERE user_id = $1 AND item_id = $2
      RETURNING *
    `;

    const result = await database.query(deleteQuery, [req.user.id, itemId]);

    res.json({
      code: 200,
      message: result.rows.length > 0 ? 'Item removed from favorites' : 'Item not in favorites',
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router; 