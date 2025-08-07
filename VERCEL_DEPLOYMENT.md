# 🚀 Vercel Deployment Guide

## 🔧 **Step 1: Set Environment Variables in Vercel**

Go to your Vercel dashboard → Project Settings → Environment Variables:

### **Required Environment Variables:**
```
PRIVATE_KEY=your_ethereum_private_key_for_dev_wallet
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **How to Add:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: `PRIVATE_KEY`
   - **Value**: Your private key (without 0x prefix)
   - **Environment**: Production, Preview, Development
5. Repeat for other variables
6. Click **Save**

## 🔧 **Step 2: Deploy to Vercel**

```bash
# Deploy to Vercel
vercel --prod
```

## 🔧 **Step 3: Test the API**

After deployment, test your API:

```bash
curl -X POST https://your-app.vercel.app/api/approve-user \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x1234567890123456789012345678901234567890"}'
```

## 🔧 **Step 4: Verify Environment Variables**

Check if your environment variables are loaded:

```bash
# Add this to your API temporarily to debug
console.log('PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
console.log('PRIVATE_KEY length:', process.env.PRIVATE_KEY?.length);
```

## 🎯 **How the Sponsored System Works**

### **Your Friend's Bridgebox Approach:**
```
Frontend → Bridgebox API → Nginx Server → Private Key in .env
```

### **Your Iryshare Approach:**
```
Frontend → Vercel API → Environment Variables → Irys Approval
```

### **The Flow:**
1. **User registers** → Calls `/api/approve-user`
2. **API creates approval** → Uses your dev wallet
3. **User uploads** → Uses approval, no gas fees
4. **Your wallet pays** → For all user uploads

## 🔍 **Troubleshooting**

### **"PRIVATE_KEY not found" Error:**
- ✅ Check Vercel Environment Variables
- ✅ Make sure variable name is exactly `PRIVATE_KEY`
- ✅ Deploy again after adding variables

### **"Approval failed" Error:**
- ✅ Check if dev wallet has Sepolia ETH
- ✅ Verify private key is correct
- ✅ Check Irys devnet connection

### **"404 API Error":**
- ✅ Make sure `api/approve-user.js` is in root folder
- ✅ Check Vercel deployment logs
- ✅ Verify API endpoint URL

## 🎯 **Your Dev Wallet Setup**

- **Address**: `0xebe5e0c25a5f7ea6b404a74b6bb78318cc295148`
- **Network**: Sepolia Devnet
- **Balance Check**: 
  ```bash
  irys balance 0xEbe5E0C25a5F7EA6b404A74b6bb78318Cc295148 -n devnet -t ethereum --provider-url https://1rpc.io/sepolia
  ```

## 🚀 **Deployment Commands**

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Check deployment status
vercel ls
```

## ✅ **Success Indicators**

After deployment, you should see:
- ✅ **Registration**: No approval warnings
- ✅ **Upload**: No 402 Payment Required errors
- ✅ **Console**: "User approved for sponsored uploads"
- ✅ **API**: Returns success response 