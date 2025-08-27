import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Whitelisted wallets with rate limits and tiers
export const WHITELISTED_WALLETS = {
  "0x67eea7a2e81f7228c98ea6ddb3bd4c4849a55554": {
    tier: "premium",
    requestsPerMinute: 100,
    name: "Platform"
  },
  "0x4351fd8d9a25c14556ce621ddcce35c2adefe156": {
    tier: "enterprise",
    requestsPerMinute: 200,
    name: "Your Wallet"
  }
};

// Rate limiting storage
const rateLimitStore = new Map();

/**
 * Verify wallet signature
 */
export function verifySignature(message, signature, address) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Check if wallet is whitelisted
 */
export function isWhitelisted(address) {
  return WHITELISTED_WALLETS.hasOwnProperty(address.toLowerCase());
}

/**
 * Get wallet tier and rate limit info
 */
export function getWalletInfo(address) {
  return WHITELISTED_WALLETS[address.toLowerCase()] || null;
}

/**
 * Check rate limit for wallet
 */
export function checkRateLimit(address) {
  const now = Date.now();
  const walletInfo = getWalletInfo(address);
  
  if (!walletInfo) {
    return { allowed: false, reason: 'Wallet not whitelisted' };
  }

  const key = `${address}:${Math.floor(now / 60000)}`; // Reset every minute
  const currentRequests = rateLimitStore.get(key) || 0;

  if (currentRequests >= walletInfo.requestsPerMinute) {
    return { 
      allowed: false, 
      reason: 'Rate limit exceeded',
      resetTime: new Date(Math.floor(now / 60000) * 60000 + 60000).toISOString()
    };
  }

  // Increment request count
  rateLimitStore.set(key, currentRequests + 1);
  
  return { 
    allowed: true, 
    remaining: walletInfo.requestsPerMinute - currentRequests - 1,
    resetTime: new Date(Math.floor(now / 60000) * 60000 + 60000).toISOString()
  };
}

/**
 * Generate JWT token for authenticated wallet
 */
export function generateToken(address) {
  const walletInfo = getWalletInfo(address);
  
  const payload = {
    address: address.toLowerCase(),
    tier: walletInfo?.tier || 'standard',
    name: walletInfo?.name || 'Unknown',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Express middleware for wallet authentication
 */
export function authenticateWallet(req, res, next) {
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

    // Check rate limit
    const rateLimit = checkRateLimit(decoded.address);
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        details: rateLimit.reason,
        resetTime: rateLimit.resetTime
      });
    }

    // Add wallet info to request
    req.wallet = {
      address: decoded.address,
      tier: decoded.tier,
      name: decoded.name
    };

    req.rateLimit = {
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Admin authentication for managing whitelist
 */
export function authenticateAdmin(req, res, next) {
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

    const adminWallets = [
      // Add your admin wallet addresses here
      "0x4351fd8d9a25c14556ce621ddcce35c2adefe156" // Your wallet
    ];

    if (!adminWallets.includes(decoded.address.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = {
      address: decoded.address,
      name: decoded.name
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Admin authentication error' });
  }
}
