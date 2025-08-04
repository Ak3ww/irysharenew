# Iryshare Deployment Guide

## Backup Created: July 30, 2025 16:19:09

### Overview
This backup contains all necessary files for deploying Iryshare to Vercel. The application is a decentralized file sharing platform with public/private profiles, encrypted file storage, and real-time sharing capabilities.

### Key Features
- **File Management**: Upload, download, and share files (encrypted and public)
- **Profile System**: Public/private profiles with searchable usernames
- **Real-time Sharing**: Live file sharing with notifications
- **Encryption**: Lit Protocol integration for encrypted files
- **Irys Integration**: Decentralized file storage
- **Supabase**: Database and real-time subscriptions

### Files Included in Backup

#### Core Application Files
- `src/` - Complete React TypeScript source code
- `public/` - Static assets and fonts
- `api/` - API routes (approve-user endpoint)
- `package.json` - Dependencies and scripts
- `package-lock.json` - Locked dependency versions
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `eslint.config.js` - ESLint configuration
- `index.html` - Entry HTML file
- `server.js` - Express server (to be moved to `/api/approve-user`)

#### Database Setup Files
- `complete_fresh_schema.sql` - Complete database schema
- `fix_profile_rls.sql` - Row-level security policies for profiles
- `add_profile_fields.sql` - Profile-related database fields

### Deployment Steps

#### 1. Vercel Setup
1. Create new Vercel project
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Set install command: `npm install`

#### 2. Environment Variables
Set the following environment variables in Vercel:

```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Irys Configuration
VITE_IRYS_NODE=node2.irys.xyz
VITE_IRYS_TOKEN=your_irys_token

# Lit Protocol Configuration
VITE_LIT_CHAIN=ethereum
VITE_LIT_NETWORK=mainnet

# Application Configuration
VITE_APP_NAME=Iryshare
VITE_APP_VERSION=1.0.0
```

#### 3. Database Setup
1. Run `complete_fresh_schema.sql` in Supabase SQL editor
2. Run `fix_profile_rls.sql` to set up RLS policies
3. Run `add_profile_fields.sql` to add profile fields

#### 4. API Route Setup
Move `server.js` to `/api/approve-user/index.js` for Vercel serverless function:

```javascript
// /api/approve-user/index.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // ... existing server.js logic
};
```

#### 5. Build Configuration
Ensure `vite.config.ts` is configured for production:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
```

### Key Components

#### Core Components
- `App.tsx` - Main application component with routing
- `Home.tsx` - Dashboard with file upload and management
- `Profile.tsx` - Public profile display
- `ProfileSettings.tsx` - Profile configuration
- `MyFiles.tsx` - User's file management
- `SharedWithMe.tsx` - Files shared with user
- `FilePreview.tsx` - File preview and actions
- `ShareModal.tsx` - File sharing interface

#### Utilities
- `irys.ts` - Irys network integration
- `supabase.ts` - Supabase client and functions
- `lit.ts` - Lit Protocol encryption
- `storage.ts` - File storage utilities

### Database Schema

#### Key Tables
- `files` - File metadata and storage info
- `file_shares` - File sharing relationships
- `usernames` - User profiles and settings
- `user_storage` - User storage tracking

#### Important Fields
- `profile_public` - Profile visibility setting
- `profile_bio` - User bio text
- `profile_avatar` - Avatar image URL
- `profile_visible` - File visibility in profiles

### Security Features
- Row-level security (RLS) policies
- Wallet signature verification
- Encrypted file storage with Lit Protocol
- Access control conditions for shared files

### Testing Checklist
- [ ] File upload (encrypted and public)
- [ ] File download (encrypted and public)
- [ ] File sharing with recipients
- [ ] Profile creation and editing
- [ ] Public profile search and viewing
- [ ] Private profile restrictions
- [ ] Real-time notifications
- [ ] Avatar upload and display
- [ ] Wallet signature verification

### Troubleshooting

#### Common Issues
1. **RLS Policy Errors**: Ensure all RLS policies are properly set up
2. **Irys Upload Failures**: Check Irys token and network configuration
3. **Lit Protocol Errors**: Verify chain and network settings
4. **Real-time Issues**: Check Supabase real-time configuration

#### Environment Variable Issues
- Ensure all environment variables are set in Vercel
- Check for typos in variable names
- Verify Supabase service role key has proper permissions

### Backup Information
- **Backup Date**: July 30, 2025 16:19:09
- **Backup Location**: `backups/deployment_backup_20250730_161909/`
- **Application Version**: Pre-deployment stable version
- **Database Schema**: Complete with profile system and RLS policies

### Post-Deployment
1. Test all functionality in production
2. Monitor error logs in Vercel
3. Verify database connections
4. Test file upload/download speeds
5. Validate real-time features

### Support
For deployment issues, refer to:
- Vercel documentation
- Supabase documentation
- Irys documentation
- Lit Protocol documentation 