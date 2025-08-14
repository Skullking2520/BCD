const jwt = require('jsonwebtoken');
const database = require('../utils/database');
const { logger } = require('../utils/logger');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Extract token from request
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.substring(7);
  }
  return null;
};

// Main authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        code: 401,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    // Get user from database
    const user = await database.getUserByAddress(decoded.wallet_address);
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      code: 500,
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await database.getUserByAddress(decoded.wallet_address);
        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        code: 403,
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Game developer authorization
const requireGameDeveloper = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const gameId = req.params.gameId || req.body.gameId;
    if (!gameId) {
      return res.status(400).json({
        code: 400,
        message: 'Game ID required',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is a developer for this game
    const game = await database.getGameById(gameId);
    if (!game) {
      return res.status(404).json({
        code: 404,
        message: 'Game not found',
        timestamp: new Date().toISOString()
      });
    }

    // For now, allow any authenticated user to act as developer
    // In production, you would check against a developers table
    req.game = game;
    next();
  } catch (error) {
    logger.error('Game developer authorization error', { error: error.message });
    return res.status(500).json({
      code: 500,
      message: 'Authorization failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Validate Ethereum address
const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Validate address middleware
const validateAddress = (paramName = 'address') => {
  return (req, res, next) => {
    const address = req.params[paramName] || req.body[paramName] || req.query[paramName];
    
    if (address && !isValidAddress(address)) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid Ethereum address format',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  requireRole,
  requireGameDeveloper,
  isValidAddress,
  validateAddress
}; 