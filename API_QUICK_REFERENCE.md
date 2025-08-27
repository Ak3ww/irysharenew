# Iryshare Analytics API - Quick Reference

## 🔐 Authentication Flow

```
1. Connect Wallet → 2. Check Whitelist → 3. Sign Message → 4. Get Token → 5. Use API
```

## 📍 Base URLs
- **Local Development**: `http://localhost:3002`
- **Production**: `https://your-vercel-domain.vercel.app`

## 🔑 Authentication Endpoints

### Check Whitelist Status
```http
GET /api/auth/whitelist-status/{wallet_address}
```

### Request Access
```http
POST /api/auth/request-access
Content-Type: application/json

{
  "address": "0x...",
  "message": "Sign this message to access Iryshare Analytics API",
  "signature": "0x..."
}
```

### Verify Token
```http
GET /api/auth/verify-token
Authorization: Bearer {token}
```

## 📊 Analytics Endpoints

### Platform Statistics
```http
GET /api/analytics/platform-stats
Authorization: Bearer {token}
```

**Response Fields:**
- `totalUsers`: Total registered users
- `totalFiles`: Total files uploaded
- `totalUploads`: Total uploads (same as totalFiles)
- `totalStorage`: Total storage used in bytes
- `totalAllocated`: Total storage allocated in bytes
- `timestamp`: Current timestamp

### Recent Activity
```http
GET /api/analytics/recent-activity
Authorization: Bearer {token}
```

**Response Fields:**
- `activity[]`: Array of recent file uploads
  - `id`: File UUID
  - `filename`: File name
  - `size`: File size in bytes
  - `uploadedBy`: Username of uploader
  - `avatarUrl`: User avatar URL
  - `timestamp`: Upload timestamp

## 🚦 Rate Limits

| Tier | Requests/Minute | Description |
|------|----------------|-------------|
| Standard | 50 | Basic access |
| Premium | 100 | Enhanced access |
| Enterprise | 200 | Full access |

## 📝 Code Examples

### JavaScript (Frontend)
```javascript
// 1. Connect wallet and get signature
const message = "Sign this message to access Iryshare Analytics API";
const signature = await signer.signMessage(message);

// 2. Request access
const response = await fetch('/api/auth/request-access', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: signer.address,
    message,
    signature
  })
});

const { accessToken } = await response.json();

// 3. Use API
const stats = await fetch('/api/analytics/platform-stats', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const data = await stats.json();
console.log('Total users:', data.totalUsers);
```

### Python
```python
import requests
from eth_account import Account

# 1. Sign message
account = Account.from_key(private_key)
message = "Sign this message to access Iryshare Analytics API"
signed = account.sign_message(message)

# 2. Request access
response = requests.post('/api/auth/request-access', json={
    'address': account.address,
    'message': message,
    'signature': signed.signature.hex()
})

access_token = response.json()['accessToken']

# 3. Use API
headers = {'Authorization': f'Bearer {access_token}'}
stats = requests.get('/api/analytics/platform-stats', headers=headers)
print('Total users:', stats.json()['totalUsers'])
```

### cURL
```bash
# 1. Check whitelist status
curl -X GET "https://your-domain.vercel.app/api/auth/whitelist-status/0x..."

# 2. Request access (you'll need to sign the message first)
curl -X POST "https://your-domain.vercel.app/api/auth/request-access" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","message":"...","signature":"..."}'

# 3. Use API with token
curl -X GET "https://your-domain.vercel.app/api/analytics/platform-stats" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ⚠️ Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify token or signature |
| 403 | Forbidden | Check whitelist status |
| 429 | Rate Limited | Wait for rate limit reset |
| 500 | Server Error | Try again later |

## 🔧 Development

### Local Testing
```bash
cd analytics-api
npm install
npm run dev
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

### Health Check
```http
GET /health
```

## 📚 Full Documentation
- **Integration Guide**: `API_INTEGRATION.md`
- **Future Roadmap**: `FUTURE.md`
- **GitHub**: [Your repo URL]

---

*Need help? Check the full integration guide or contact the development team.*
