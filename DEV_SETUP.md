# 🚀 Iryshare Development Setup

## Quick Start

### Option 1: Full Development Environment (Recommended)
```bash
npm run dev:full
```
This starts both the local approval server and frontend dev server.

### Option 2: Manual Setup
```bash
# Terminal 1: Start local approval server
npm run server

# Terminal 2: Start frontend dev server
npm run dev
```

## How It Works

### Development Mode (localhost)
- ✅ **Local Approval Server**: `http://localhost:3001/api/approve-user`
- ✅ **Frontend**: `http://localhost:5173`
- ✅ **Real Approvals**: Uses your funded dev wallet
- ✅ **Sponsored Uploads**: Users just sign, no gas fees

### Production Mode (Vercel)
- ✅ **Vercel API**: `/api/approve-user`
- ✅ **Same Approval System**: Works identically to local
- ✅ **Sponsored Uploads**: Users just sign, no gas fees

## Environment Variables

Make sure you have `.env` file with:
```env
PRIVATE_KEY=your_ethereum_private_key_for_dev_wallet
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing

1. **Register a user** → Should call approval API
2. **Upload a file** → Should work without 402 errors
3. **Check console** → Should show approval success

## Troubleshooting

- **402 Payment Required**: Check if dev wallet has Sepolia ETH
- **404 API Error**: Make sure local server is running
- **Approval Failed**: Check `.env` file and private key

## Your Dev Wallet

- **Address**: `0xebe5e0c25a5f7ea6b404a74b6bb78318cc295148`
- **Network**: Sepolia Devnet
- **Balance**: Check with `irys balance 0xEbe5E0C25a5F7EA6b404A74b6bb78318Cc295148 -n devnet -t ethereum --provider-url https://1rpc.io/sepolia` 