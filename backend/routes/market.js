const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../utils/database');
const { authenticateToken, optionalAuth, isValidAddress } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError, BadRequestError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/market/listings
 * @desc    Get market listings with filters
 * @access  Public
 */
router.get('/listings',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('seller').optional().custom(value => {
      if (!isValidAddress(value)) {
        throw new Error('Invalid seller address format');
      }
      return true;
    }),
    query('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary', 'mythic']).withMessage('Invalid rarity'),
    query('category').optional().isIn(['weapon', 'armor', 'consumable', 'character', 'pet', 'skin', 'currency', 'badge', 'collectible']).withMessage('Invalid category'),
    query('min_price').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
    query('max_price').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
    query('listing_type').optional().isIn(['fixed', 'auction', 'offer']).withMessage('Invalid listing type'),
    query('sort').optional().isIn(['created_at', 'price', 'end_time']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
    query('status').optional().isIn(['active', 'sold', 'cancelled', 'expired']).withMessage('Invalid status')
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
      sellerAddress: req.query.seller,
      rarity: req.query.rarity,
      category: req.query.category,
      minPrice: req.query.min_price ? parseFloat(req.query.min_price) : null,
      maxPrice: req.query.max_price ? parseFloat(req.query.max_price) : null,
      listingType: req.query.listing_type,
      status: req.query.status || 'active',
      sortBy: req.query.sort || 'created_at',
      sortOrder: req.query.order || 'desc'
    };

    const listings = await database.getMarketListings(filters);
    const totalCount = await database.getMarketListingsCount(filters);

    res.json({
      code: 200,
      data: {
        listings,
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
 * @route   GET /api/v1/market/listings/:id
 * @desc    Get listing details by ID
 * @access  Public
 */
router.get('/listings/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid listing ID')
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const listingId = parseInt(req.params.id);
    const listing = await database.getMarketListingById(listingId);

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    // Get auction info if it's an auction
    let auctionInfo = null;
    if (listing.listing_type === 'auction') {
      auctionInfo = await database.getAuctionInfo(listingId);
    }

    const listingData = {
      ...listing,
      auction_info: auctionInfo
    };

    res.json({
      code: 200,
      data: listingData,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/market/listings
 * @desc    Create a new market listing
 * @access  Private
 */
router.post('/listings',
  [
    body('item_id').isInt({ min: 1 }).withMessage('Valid item ID is required'),
    body('price').isFloat({ min: 0.000001 }).withMessage('Price must be greater than 0'),
    body('currency').optional().isIn(['ETH', 'USDC', 'USDT']).withMessage('Invalid currency'),
    body('listing_type').isIn(['fixed', 'auction']).withMessage('Invalid listing type'),
    body('duration_hours').optional().isInt({ min: 1, max: 168 }).withMessage('Duration must be between 1 and 168 hours'),
    // Auction specific fields
    body('starting_price').optional().isFloat({ min: 0.000001 }).withMessage('Starting price must be greater than 0'),
    body('min_increment').optional().isFloat({ min: 0.000001 }).withMessage('Min increment must be greater than 0'),
    body('buyout_price').optional().isFloat({ min: 0.000001 }).withMessage('Buyout price must be greater than 0')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const {
      item_id,
      price,
      currency = 'ETH',
      listing_type,
      duration_hours,
      starting_price,
      min_increment,
      buyout_price
    } = req.body;

    // Verify item exists and user owns it
    const item = await database.getGameItemById(item_id);
    if (!item) {
      throw new NotFoundError('Item');
    }

    if (item.owner_address.toLowerCase() !== req.user.wallet_address.toLowerCase()) {
      throw new ForbiddenError('You do not own this item');
    }

    // Check if item is already listed
    const existingListing = await database.getActiveListingByItemId(item_id);
    if (existingListing) {
      throw new BadRequestError('Item is already listed');
    }

    // Calculate end time
    const endTime = duration_hours 
      ? new Date(Date.now() + duration_hours * 60 * 60 * 1000)
      : null;

    const listingData = {
      item_id,
      seller_address: req.user.wallet_address,
      price,
      currency,
      listing_type,
      end_time: endTime
    };

    const newListing = await database.createMarketListing(listingData);

    // Create auction info if it's an auction
    if (listing_type === 'auction') {
      const auctionData = {
        listing_id: newListing.id,
        starting_price: starting_price || price,
        current_price: starting_price || price,
        min_increment: min_increment || (price * 0.05), // Default 5% increment
        buyout_price: buyout_price || null
      };
      await database.createAuctionInfo(auctionData);
    }

    logger.info(`New market listing created: ${newListing.id} by user ${req.user.id}`);

    res.status(201).json({
      code: 201,
      message: 'Listing created successfully',
      data: newListing,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   PUT /api/v1/market/listings/:id
 * @desc    Update listing (price only for fixed price listings)
 * @access  Private
 */
router.put('/listings/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid listing ID'),
    body('price').isFloat({ min: 0.000001 }).withMessage('Price must be greater than 0')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const listingId = parseInt(req.params.id);
    const { price } = req.body;

    const listing = await database.getMarketListingById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.seller_address.toLowerCase() !== req.user.wallet_address.toLowerCase()) {
      throw new ForbiddenError('You do not own this listing');
    }

    if (!listing.is_active) {
      throw new BadRequestError('Cannot update inactive listing');
    }

    if (listing.listing_type !== 'fixed') {
      throw new BadRequestError('Can only update price for fixed price listings');
    }

    const updatedListing = await database.updateMarketListing(listingId, { price });

    logger.info(`Market listing updated: ${listingId} by user ${req.user.id}`);

    res.json({
      code: 200,
      message: 'Listing updated successfully',
      data: updatedListing,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   DELETE /api/v1/market/listings/:id
 * @desc    Cancel a listing
 * @access  Private
 */
router.delete('/listings/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid listing ID')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const listingId = parseInt(req.params.id);
    const listing = await database.getMarketListingById(listingId);

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.seller_address.toLowerCase() !== req.user.wallet_address.toLowerCase()) {
      throw new ForbiddenError('You do not own this listing');
    }

    if (!listing.is_active) {
      throw new BadRequestError('Listing is already inactive');
    }

    await database.cancelMarketListing(listingId);

    logger.info(`Market listing cancelled: ${listingId} by user ${req.user.id}`);

    res.json({
      code: 200,
      message: 'Listing cancelled successfully',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/market/listings/:id/buy
 * @desc    Buy an item (fixed price or auction buyout)
 * @access  Private
 */
router.post('/listings/:id/buy',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid listing ID'),
    body('transaction_hash').notEmpty().withMessage('Transaction hash is required'),
    body('gas_fee').optional().isFloat({ min: 0 }).withMessage('Gas fee must be non-negative')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const listingId = parseInt(req.params.id);
    const { transaction_hash, gas_fee = 0 } = req.body;

    const listing = await database.getMarketListingById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (!listing.is_active) {
      throw new BadRequestError('Listing is not active');
    }

    if (listing.seller_address.toLowerCase() === req.user.wallet_address.toLowerCase()) {
      throw new BadRequestError('Cannot buy your own listing');
    }

    // Check if listing has expired
    if (listing.end_time && new Date() > listing.end_time) {
      throw new BadRequestError('Listing has expired');
    }

    let purchasePrice = listing.price;

    // Handle auction buyout
    if (listing.listing_type === 'auction') {
      const auctionInfo = await database.getAuctionInfo(listingId);
      if (!auctionInfo.buyout_price) {
        throw new BadRequestError('This auction does not have a buyout price');
      }
      purchasePrice = auctionInfo.buyout_price;
    }

    // Create transaction record
    const transactionData = {
      listing_id: listingId,
      buyer_address: req.user.wallet_address,
      seller_address: listing.seller_address,
      item_id: listing.item_id,
      transaction_hash,
      price: purchasePrice,
      currency: listing.currency,
      gas_fee,
      status: 'completed'
    };

    const transaction = await database.createTransaction(transactionData);

    // Update item owner
    await database.updateGameItem(listing.item_id, {
      owner_address: req.user.wallet_address
    });

    // Mark listing as sold
    await database.updateMarketListing(listingId, { 
      is_active: false,
      updated_at: new Date()
    });

    // Record price history
    await database.recordPriceHistory(listing.item_id, purchasePrice, listing.currency, transaction.id);

    logger.info(`Item purchased: listing ${listingId} by user ${req.user.id}, transaction ${transaction_hash}`);

    res.json({
      code: 200,
      message: 'Item purchased successfully',
      data: {
        transaction,
        item_id: listing.item_id
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   POST /api/v1/market/listings/:id/bid
 * @desc    Place a bid on an auction
 * @access  Private
 */
router.post('/listings/:id/bid',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid listing ID'),
    body('bid_amount').isFloat({ min: 0.000001 }).withMessage('Bid amount must be greater than 0'),
    body('transaction_hash').notEmpty().withMessage('Transaction hash is required')
  ],
  authenticateToken,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const listingId = parseInt(req.params.id);
    const { bid_amount, transaction_hash } = req.body;

    const listing = await database.getMarketListingById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.listing_type !== 'auction') {
      throw new BadRequestError('This is not an auction');
    }

    if (!listing.is_active) {
      throw new BadRequestError('Auction is not active');
    }

    if (listing.end_time && new Date() > listing.end_time) {
      throw new BadRequestError('Auction has ended');
    }

    if (listing.seller_address.toLowerCase() === req.user.wallet_address.toLowerCase()) {
      throw new BadRequestError('Cannot bid on your own auction');
    }

    const auctionInfo = await database.getAuctionInfo(listingId);
    const minBid = auctionInfo.current_price + auctionInfo.min_increment;

    if (bid_amount < minBid) {
      throw new BadRequestError(`Bid must be at least ${minBid} ${listing.currency}`);
    }

    // Update auction info
    await database.updateAuctionInfo(listingId, {
      current_price: bid_amount,
      highest_bidder: req.user.wallet_address,
      bid_count: auctionInfo.bid_count + 1
    });

    // Create bid transaction record
    const transactionData = {
      listing_id: listingId,
      buyer_address: req.user.wallet_address,
      seller_address: listing.seller_address,
      item_id: listing.item_id,
      transaction_hash,
      price: bid_amount,
      currency: listing.currency,
      status: 'pending'
    };

    const transaction = await database.createTransaction(transactionData);

    logger.info(`Bid placed: ${bid_amount} ${listing.currency} on listing ${listingId} by user ${req.user.id}`);

    res.json({
      code: 200,
      message: 'Bid placed successfully',
      data: {
        transaction,
        current_price: bid_amount,
        next_min_bid: bid_amount + auctionInfo.min_increment
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/market/stats
 * @desc    Get market statistics
 * @access  Public
 */
router.get('/stats',
  [
    query('game_id').optional().isInt({ min: 1 }).withMessage('Invalid game ID'),
    query('period').optional().isIn(['24h', '7d', '30d', '90d', 'all']).withMessage('Invalid period')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const gameId = req.query.game_id ? parseInt(req.query.game_id) : null;
    const period = req.query.period || '24h';

    const stats = await database.getMarketStats(gameId, period);

    res.json({
      code: 200,
      data: stats,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route   GET /api/v1/market/trending
 * @desc    Get trending items and games
 * @access  Public
 */
router.get('/trending',
  [
    query('period').optional().isIn(['24h', '7d', '30d']).withMessage('Invalid period'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const period = req.query.period || '24h';
    const limit = parseInt(req.query.limit) || 10;

    const trending = await database.getTrendingData(period, limit);

    res.json({
      code: 200,
      data: trending,
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router; 