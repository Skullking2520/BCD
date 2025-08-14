const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../utils/database');
const { 
  verifySignature, 
  generateToken, 
  generateNonce, 
  storeNonce, 
  getNonce, 
  deleteNonce,
  checkAuthRateLimit,
  isValidAddress 
} = require('../middleware/auth');
const { asyncHandler, ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const { logger, logSecurityEvent } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/auth/nonce
 * @desc    Get authentication nonce for wallet signature
 * @access  Public
 */
router.get('/nonce', 
  [
    body('address')
      .custom((value, { req }) => {
        // Get address from query params for GET request
        const address = req.query.address;
        if (!address) {
          throw new Error('Wallet address is required');
        }
        if (!isValidAddress(address)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
  ],
  asyncHandler(async (req, res) => {
    const { address } = req.query;

    // Rate limiting
    checkAuthRateLimit(req.ip);

    // Generate nonce
    const nonce = generateNonce();
    storeNonce(address, nonce);

    logger.info(`Nonce generated for address: ${address}`);

    res.json({
      code: 200,
      data: {
        nonce,
        message: `Sign this message to authenticate: ${nonce}`,
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * @route   POST /api/v1/auth/connect
 * @desc    Authenticate user with wallet signature
 * @access  Public
 */
router.post('/connect',
  [
    body('address')
      .notEmpty()
      .withMessage('Wallet address is required')
      .custom(value => {
        if (!isValidAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      }),
    body('signature')
      .notEmpty()
      .withMessage('Signature is required')
      .isLength({ min: 130, max: 132 })
      .withMessage('Invalid signature format'),
    body('message')
      .notEmpty()
      .withMessage('Message is required')
  ],
  asyncHandler(async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { address, signature, message } = req.body;

    // Rate limiting
    checkAuthRateLimit(req.ip);

    // Verify nonce exists and matches
    const storedNonce = getNonce(address);
    if (!storedNonce) {
      logSecurityEvent('AUTH_INVALID_NONCE', { address, ip: req.ip });
      throw new UnauthorizedError('Invalid or expired nonce');
    }

    const expectedMessage = `Sign this message to authenticate: ${storedNonce}`;
    if (message !== expectedMessage) {
      logSecurityEvent('AUTH_MESSAGE_MISMATCH', { address, ip: req.ip });
      throw new UnauthorizedError('Message mismatch');
    }

    // Verify signature
    const isValidSignature = verifySignature(message, signature, address);
    if (!isValidSignature) {
      logSecurityEvent('AUTH_INVALID_SIGNATURE', { address, ip: req.ip });
      throw new UnauthorizedError('Invalid signature');
    }

    // Delete used nonce
    deleteNonce(address);

    try {
      // Find or create user
      let user = await database.findUserByAddress(address);
      
      if (!user) {
        // Create new user
        user = await database.createUser({
          wallet_address: address,
          username: null,
          email: null,
          avatar_url: null,
          bio: null
        });
        
        logger.info(`New user created: ${address}`);
        logSecurityEvent('NEW_USER_REGISTERED', { address, ip: req.ip });
      } else {
        // Update last login
        await database.updateUser(address, { 
          last_login: new Date() 
        });
        
        logger.info(`User logged in: ${address}`);
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        code: 200,
        message: 'Authentication successful',
        data: {
          token,
          user: {
            id: user.id,
            address: user.wallet_address,
            username: user.username,
            avatar_url: user.avatar_url,
            bio: user.bio,
            reputation_score: user.reputation_score,
            created_at: user.created_at,
            is_verified: user.is_verified
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  })
);

/**
 * @route   POST /api/v1/auth/disconnect
 * @desc    Logout user (invalidate token client-side)
 * @access  Private
 */
router.post('/disconnect',
  // Note: In a stateless JWT system, we can't invalidate tokens server-side
  // without maintaining a blacklist. For now, we rely on client-side token removal.
  asyncHandler(async (req, res) => {
    // Log the logout event
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      logger.info('User logged out');
    }

    res.json({
      code: 200,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh',
  // This would require implementing refresh tokens
  // For now, clients should re-authenticate when tokens expire
  asyncHandler(async (req, res) => {
    res.status(501).json({
      code: 501,
      message: 'Token refresh not implemented',
      details: 'Please re-authenticate when your token expires',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verify JWT token validity
 * @access  Private
 */
router.get('/verify',
  require('../middleware/auth').authenticateToken,
  asyncHandler(async (req, res) => {
    res.json({
      code: 200,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.id,
          address: req.user.wallet_address,
          username: req.user.username,
          avatar_url: req.user.avatar_url,
          is_verified: req.user.is_verified
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router; 