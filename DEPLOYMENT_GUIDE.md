# 🚀 IRYSHARE VERCEL DEPLOYMENT GUIDE

## 📋 PREREQUISITES

### 1. **Vercel Account**
- Sign up at [vercel.com](https://vercel.com)
- Install Vercel CLI: `npm i -g vercel`

### 2. **GitHub Repository**
- Push your code to GitHub
- Ensure repository is public or Vercel has access

### 3. **Supabase Project**
- Ensure your Supabase project is set up
- Note down your project URL and anon key

### 4. **Ethereum Wallet Setup**
- You'll need a private key for the approval server
- This will be used for granting user allowances on Irys

## 🔧 STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Your Repository

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Production ready for Vercel deployment with serverless API"
   git push origin main
   ```

2. **Verify your project structure:**
   ```
   iryshare/
   ├── src/
   ├── public/
   ├── api/
   │   └── approve-user.js    # Serverless function
   ├── package.json
   ├── vite.config.ts
   ├── vercel.json
   ├── tailwind.config.js
   └── index.html
   ```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure project settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `iryshare` (if your repo has multiple folders)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

#### Option B: Deploy via CLI

1. **Navigate to your project:**
   ```bash
   cd iryshare
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project or create new
   - Set up environment variables (see Step 3)

### Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

#### Required Variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
PRIVATE_KEY=your-ethereum-private-key-for-approvals
```

#### Optional Variables:
```
VITE_IRYS_NODE=https://devnet.irys.xyz
```

#### ⚠️ **IMPORTANT: PRIVATE_KEY Setup**
- This is your Ethereum private key for granting user allowances
- **NEVER commit this to Git** - only set it in Vercel environment variables
- Use a dedicated wallet for this purpose
- Keep your private key secure

### Step 4: Configure Build Settings

1. **Go to Project Settings > General**
2. **Set Build & Development Settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
   - **Development Command:** `npm run dev`

### Step 5: Configure Domain (Optional)

1. **Go to Project Settings > Domains**
2. **Add your custom domain**
3. **Configure DNS settings** as instructed

## 🔧 SERVERLESS FUNCTION SETUP

### API Structure
Your app now uses Vercel serverless functions instead of a traditional Express server:

- **API Endpoint:** `/api/approve-user`
- **Function File:** `api/approve-user.js`
- **Runtime:** Node.js 18.x

### How It Works
1. **Frontend calls:** `https://your-domain.vercel.app/api/approve-user`
2. **Vercel routes** the request to the serverless function
3. **Function processes** the approval using your private key
4. **Response returned** to the frontend

### Testing the API
You can test your API endpoint after deployment:
```bash
curl -X POST https://your-domain.vercel.app/api/approve-user \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x..."}'
```

## 🔍 TROUBLESHOOTING

### Common Issues:

#### 1. **Build Failures**
- Check that all dependencies are in `package.json`
- Ensure TypeScript compilation passes locally
- Verify environment variables are set correctly

#### 2. **Environment Variables Not Working**
- Ensure variables start with `VITE_` for client-side access
- Redeploy after adding environment variables
- Check variable names match your code

#### 3. **API Function Issues**
- Check Vercel function logs in the dashboard
- Verify `PRIVATE_KEY` is set correctly
- Ensure the function file is in the `api/` directory

#### 4. **Routing Issues**
- The `vercel.json` includes proper API routing
- API routes are handled before SPA routing

#### 5. **Performance Issues**
- Enable Vercel Analytics for monitoring
- Use Vercel's Edge Network for global performance
- Consider enabling compression

## 📊 POST-DEPLOYMENT

### 1. **Test Your Application**
- Verify all features work on production
- Test file uploads and sharing
- Check wallet connections
- Test the approval API endpoint

### 2. **Monitor Performance**
- Use Vercel Analytics
- Monitor error logs
- Check Core Web Vitals
- Monitor function execution times

### 3. **Set Up Monitoring**
- Configure error tracking (Sentry, etc.)
- Set up uptime monitoring
- Monitor database performance

## 🔒 SECURITY CONSIDERATIONS

### 1. **Environment Variables**
- Never commit sensitive keys to Git
- Use Vercel's environment variable encryption
- Rotate keys regularly
- Keep your `PRIVATE_KEY` secure

### 2. **CORS Configuration**
- Configure Supabase CORS settings
- Add your Vercel domain to allowed origins

### 3. **Content Security Policy**
- Consider adding CSP headers
- Configure frame-ancestors for embedded use

### 4. **API Security**
- The serverless function includes CORS headers
- Only POST requests are allowed
- Input validation is implemented

## 🚀 OPTIMIZATION TIPS

### 1. **Performance**
- Enable Vercel's Edge Network
- Use image optimization
- Implement lazy loading

### 2. **SEO**
- Add meta tags
- Configure Open Graph
- Set up sitemap

### 3. **Analytics**
- Add Google Analytics
- Configure Vercel Analytics
- Monitor user behavior

## 📞 SUPPORT

### If you encounter issues:

1. **Check Vercel logs** in the dashboard
2. **Verify environment variables** are set correctly
3. **Test locally** with `npm run build`
4. **Check Supabase** project settings
5. **Review browser console** for errors
6. **Check function logs** for API issues

### Useful Commands:
```bash
# Test build locally
npm run build

# Test preview
npm run preview

# Check for TypeScript errors
npx tsc --noEmit

# Lint code
npm run lint

# Test API locally (if you want to run server.js)
node server.js
```

---

**🎉 Your IRYSHARE app should now be live on Vercel with serverless API!**

**Next Steps:**
1. Test all functionality including API calls
2. Set up monitoring
3. Configure custom domain (optional)
4. Share your live URL!

**Backup Location:** `iryshare/backups/backup_20250131_170746/` 