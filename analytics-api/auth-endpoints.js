import express from 'express';
import { ethers } from 'ethers';
import { 
  verifySignature, 
  isWhitelisted, 
  getWalletInfo, 
  checkRateLimit, 
  generateToken, 
  verifyToken,
  authenticateAdmin 
} from './auth-middleware.js';

const router = express.Router();

/**
 * Check if wallet is whitelisted
 */
router.get('/whitelist-status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const whitelisted = isWhitelisted(address);
    const walletInfo = getWalletInfo(address);

    res.json({
      address: address.toLowerCase(),
      whitelisted,
      tier: walletInfo?.tier || null,
      name: walletInfo?.name || null,
      requestsPerMinute: walletInfo?.requestsPerMinute || 0
    });
  } catch (error) {
    console.error('Whitelist status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Request API access by signing a message
 */
router.post('/request-access', async (req, res) => {
  try {
    const { address, message, signature } = req.body;

    // Validate inputs
    if (!address || !message || !signature) {
      return res.status(400).json({ 
        error: 'Missing required fields: address, message, signature' 
      });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Check if wallet is whitelisted
    if (!isWhitelisted(address)) {
      return res.status(403).json({ 
        error: 'Wallet not whitelisted',
        message: 'This wallet address is not authorized to access the API'
      });
    }

    // Verify signature
    if (!verifySignature(message, signature, address)) {
      return res.status(401).json({ 
        error: 'Invalid signature',
        message: 'Signature verification failed'
      });
    }

    // Check rate limit
    const rateLimit = checkRateLimit(address);
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        reason: rateLimit.reason,
        resetTime: rateLimit.resetTime
      });
    }

    // Generate access token
    const accessToken = generateToken(address);
    const walletInfo = getWalletInfo(address);

    res.json({
      success: true,
      accessToken,
      wallet: {
        address: address.toLowerCase(),
        tier: walletInfo.tier,
        name: walletInfo.name
      },
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      },
      message: 'Access granted successfully'
    });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Verify access token
 */
router.get('/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const walletInfo = getWalletInfo(decoded.address);
    if (!walletInfo) {
      return res.status(403).json({ error: 'Wallet no longer whitelisted' });
    }

    res.json({
      valid: true,
      wallet: {
        address: decoded.address,
        tier: decoded.tier,
        name: decoded.name
      },
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Admin endpoints for managing whitelist
 */
router.use('/admin', authenticateAdmin);

/**
 * Get current whitelist
 */
router.get('/admin/whitelist', (req, res) => {
  try {
    const whitelist = Object.entries(WHITELISTED_WALLETS).map(([address, info]) => ({
      address,
      tier: info.tier,
      requestsPerMinute: info.requestsPerMinute,
      name: info.name
    }));

    res.json({ whitelist });
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Add wallet to whitelist
 */
router.post('/admin/whitelist', (req, res) => {
  try {
    const { address, tier, requestsPerMinute, name } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    if (!tier || !['standard', 'premium', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Valid tier required: standard, premium, or enterprise' });
    }

    if (!requestsPerMinute || requestsPerMinute < 1) {
      return res.status(400).json({ error: 'Valid requests per minute required' });
    }

    // In a real implementation, you'd update a database
    // For now, we'll just return success
    res.json({
      success: true,
      message: `Wallet ${address} added to whitelist`,
      wallet: { address, tier, requestsPerMinute, name }
    });
  } catch (error) {
    console.error('Add to whitelist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Remove wallet from whitelist
 */
router.delete('/admin/whitelist/:address', (req, res) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    // In a real implementation, you'd remove from database
    // For now, we'll just return success
    res.json({
      success: true,
      message: `Wallet ${address} removed from whitelist`
    });
  } catch (error) {
    console.error('Remove from whitelist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
