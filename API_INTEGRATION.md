# Iryshare Analytics API Integration Guide

## Overview
The Iryshare Analytics API provides external platforms with access to platform statistics and analytics data. This API is secured with wallet-based authentication and rate limiting.

## Quick Start

### 1. Authentication Flow
1. **Connect Wallet**: User connects their Web3 wallet (MetaMask, WalletConnect, etc.)
2. **Check Whitelist**: Verify wallet is authorized to access the API
3. **Sign Message**: User signs a message to prove wallet ownership
4. **Get Token**: Receive JWT access token for API requests

### 2. API Endpoints
- **Base URL**: `https://your-vercel-domain.vercel.app/api`
- **Health Check**: `GET /health`
- **Platform Stats**: `GET /api/analytics/platform-stats`
- **Recent Activity**: `GET /api/analytics/recent-activity`

## Authentication

### Step 1: Check Whitelist Status
```javascript
GET /api/auth/whitelist-status/{wallet_address}
```

**Response:**
```json
{
  "address": "0x...",
  "whitelisted": true,
  "tier": "premium",
  "name": "Platform Name",
  "requestsPerMinute": 100
}
```

### Step 2: Request Access
```javascript
POST /api/auth/request-access
Content-Type: application/json

{
  "address": "0x...",
  "message": "Sign this message to access Iryshare Analytics API",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wallet": {
    "address": "0x...",
    "tier": "premium",
    "name": "Platform Name"
  },
  "rateLimit": {
    "remaining": 99,
    "resetTime": "2025-08-27T08:00:00.000Z"
  }
}
```

### Step 3: Use Access Token
Include the token in the Authorization header:
```javascript
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

### Platform Statistics
```javascript
GET /api/analytics/platform-stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalUsers": 34,
  "totalFiles": 67,
  "totalUploads": 67,
  "totalStorage": 43758401,
  "totalAllocated": 4398046511104,
  "timestamp": "2025-08-27T08:56:45.007Z"
}
```

### Recent Activity
```javascript
GET /api/analytics/recent-activity
Authorization: Bearer {token}
```

**Response:**
```json
{
  "activity": [
    {
      "id": "uuid",
      "filename": "example.pdf",
      "size": 1024000,
      "uploadedBy": "username",
      "avatarUrl": "https://...",
      "timestamp": "2025-08-27T08:56:45.007Z"
    }
  ]
}
```

## Rate Limiting

### Tiers and Limits
- **Standard**: 50 requests per minute
- **Premium**: 100 requests per minute  
- **Enterprise**: 200 requests per minute

### Rate Limit Headers
```javascript
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1756368000
```

## Error Handling

### Common Error Codes
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid or missing token
- `403`: Forbidden - Wallet not whitelisted
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server issues

### Error Response Format
```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "timestamp": "2025-08-27T08:56:45.007Z"
}
```

## Implementation Examples

### JavaScript/Node.js
```javascript
const ethers = require('ethers');

async function getIryshareStats() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const message = "Sign this message to access Iryshare Analytics API";
  const signature = await wallet.signMessage(message);
  
  const response = await fetch('https://your-domain.vercel.app/api/auth/request-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: wallet.address,
      message,
      signature
    })
  });
  
  const { accessToken } = await response.json();
  
  // Use token for API requests
  const stats = await fetch('https://your-domain.vercel.app/api/analytics/platform-stats', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  return stats.json();
}
```

### Python
```python
import requests
from eth_account import Account
import os

def get_iryshare_stats():
    account = Account.from_key(os.environ['PRIVATE_KEY'])
    message = "Sign this message to access Iryshare Analytics API"
    signature = account.sign_message(message)
    
    response = requests.post('https://your-domain.vercel.app/api/auth/request-access', json={
        'address': account.address,
        'message': message,
        'signature': signature.signature.hex()
    })
    
    access_token = response.json()['accessToken']
    
    # Use token for API requests
    stats = requests.get('https://your-domain.vercel.app/api/analytics/platform-stats', 
                        headers={'Authorization': f'Bearer {access_token}'})
    
    return stats.json()
```

## Security Considerations

### Wallet Authentication
- Only whitelisted wallet addresses can access the API
- Users must sign messages to prove wallet ownership
- JWT tokens have expiration times

### Rate Limiting
- Prevents abuse and ensures fair usage
- Different tiers for different usage levels
- Automatic rate limit reset

### Data Privacy
- No individual user data exposed
- Only aggregated platform statistics
- Private file information remains encrypted

## Support and Contact

For API access requests, whitelist additions, or technical support:
- **Email**: [Your contact email]
- **Documentation**: [Your docs URL]
- **GitHub**: [Your repo URL]

---

*Last updated: August 27, 2025*
