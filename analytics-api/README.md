# Iryshare Analytics API

A secure, wallet-authenticated analytics API for the Iryshare platform that provides platform statistics and user activity data.

## Features

- 🔐 **Wallet Authentication**: Secure API access using Web3 wallet signatures
- 📊 **Platform Analytics**: Total users, files, storage usage, and activity metrics
- ⚡ **Rate Limiting**: Tiered rate limits (Standard: 50, Premium: 100, Enterprise: 200 req/min)
- 🚀 **Real-time Data**: Live data from Supabase database
- 🔒 **Privacy Focused**: Only platform-level statistics, no individual user data

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
PORT=3002
```

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3002`

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /api/analytics/platform-stats` - Platform statistics
- `GET /api/analytics/recent-activity` - Recent file uploads

### Authentication Endpoints

- `GET /api/auth/whitelist-status/:address` - Check wallet whitelist status
- `POST /api/auth/request-access` - Request API access with wallet signature
- `GET /api/auth/verify-token` - Verify access token

### Admin Endpoints (Admin wallets only)

- `GET /api/auth/admin/whitelist` - Get current whitelist
- `POST /api/auth/admin/whitelist` - Add wallet to whitelist
- `DELETE /api/auth/admin/whitelist/:address` - Remove wallet from whitelist

### Dashboard Pages

- `/admin/api-dashboard` - Admin dashboard for managing whitelists
- `/platform-test` - External developer testing interface

## Authentication Flow

1. **Connect Wallet**: User connects their Web3 wallet
2. **Check Whitelist**: Verify wallet is authorized for API access
3. **Sign Message**: User signs a message to prove wallet ownership
4. **Get Token**: Receive JWT token for authenticated API calls
5. **Use API**: Make requests with `Authorization: Bearer <token>` header

## Whitelisted Wallets

Currently whitelisted addresses:

- `0x67eea7a2e81f7228c98ea6ddb3bd4c4849a55554` - Platform (Premium: 100 req/min)
- `0x4351fd8d9a25c14556ce621ddcce35c2adefe156` - Your Wallet (Enterprise: 200 req/min)

## Rate Limits

- **Standard**: 50 requests per minute
- **Premium**: 100 requests per minute  
- **Enterprise**: 200 requests per minute

## Example Usage

### JavaScript/Fetch

```javascript
const token = 'your_jwt_token_here';
const response = await fetch('https://your-domain.com/api/analytics/platform-stats', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

### cURL

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-domain.com/api/analytics/platform-stats
```

### Python

```python
import requests

headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('https://your-domain.com/api/analytics/platform-stats', headers=headers)
data = response.json()
```

## Database Schema

The API connects to Supabase and requires these tables:

- `profiles` - User profile information
- `files` - File metadata and storage info
- `user_storage` - User storage allocation and usage

## Development

### Project Structure

```
analytics-api/
├── analytics-server.js      # Main server file
├── auth-middleware.js       # Authentication middleware
├── auth-endpoints.js        # Auth-related API endpoints
├── platform-test.html       # External developer testing page
├── admin-dashboard.html     # Admin management interface
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### Adding New Endpoints

1. Add route in `analytics-server.js`
2. Implement authentication if needed
3. Add rate limiting considerations
4. Update documentation

## Deployment

### Vercel

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms

- Ensure Node.js 18+ support
- Set environment variables
- Configure CORS if needed

## Security

- JWT tokens expire after 24 hours
- Wallet signatures are verified using ethers.js
- Rate limiting prevents abuse
- Whitelist-only access control
- No sensitive user data exposed

## Support

For questions or issues:
- Check the platform test page: `/platform-test`
- Review admin dashboard: `/admin/api-dashboard`
- Check server logs for errors

## License

MIT License - see LICENSE file for details
