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

## 🔧 STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Your Repository

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Production ready for Vercel deployment"
   git push origin main
   ```

2. **Verify your project structure:**
   ```
   iryshare/
   ├── src/
   ├── public/
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
```

#### Optional Variables:
```
VITE_IRYS_NODE=https://devnet.irys.xyz
```

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

#### 3. **Routing Issues**
- The `vercel.json` includes SPA routing configuration
- All routes should redirect to `index.html`

#### 4. **Performance Issues**
- Enable Vercel Analytics for monitoring
- Use Vercel's Edge Network for global performance
- Consider enabling compression

## 📊 POST-DEPLOYMENT

### 1. **Test Your Application**
- Verify all features work on production
- Test file uploads and sharing
- Check wallet connections

### 2. **Monitor Performance**
- Use Vercel Analytics
- Monitor error logs
- Check Core Web Vitals

### 3. **Set Up Monitoring**
- Configure error tracking (Sentry, etc.)
- Set up uptime monitoring
- Monitor database performance

## 🔒 SECURITY CONSIDERATIONS

### 1. **Environment Variables**
- Never commit sensitive keys to Git
- Use Vercel's environment variable encryption
- Rotate keys regularly

### 2. **CORS Configuration**
- Configure Supabase CORS settings
- Add your Vercel domain to allowed origins

### 3. **Content Security Policy**
- Consider adding CSP headers
- Configure frame-ancestors for embedded use

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
```

---

**🎉 Your IRYSHARE app should now be live on Vercel!**

**Next Steps:**
1. Test all functionality
2. Set up monitoring
3. Configure custom domain (optional)
4. Share your live URL!

**Backup Location:** `iryshare/backups/backup_20250131_170746/` 