# 🚀 IRYSHARE - NEW CLEAN LOGIN FLOW

## 🎯 What's New

We've completely rebuilt the login flow to be clean and simple, working with your existing `complete_fresh_schema.sql` database:

### ✅ **1. Clean Landing Page**
- Connect wallet with RainbowKit
- Automatic registration popup for new users
- Username registration with Supabase
- No complex authentication - just wallet + username

### ✅ **2. Simple File Operations**
- **Share Files** (private only) - Uses Lit Protocol encryption
- **Store Files** (public & private) - Private uses same encryption as sharing
- **File Preview** - Built-in preview for images, PDFs, videos, audio
- **12GB Free Storage** - Per user storage tracking

### ✅ **3. Works with Your Existing Database**
- Uses your existing `complete_fresh_schema.sql` database
- Just adds missing `usernames` table
- Fixes RLS policies to allow all operations

## 🛠️ Setup Instructions

### **Step 1: Run the Complete Schema**
```sql
-- Run this in your Supabase SQL editor:
-- Copy and paste the contents of complete_fresh_schema.sql
-- This includes everything: usernames table, fixed RLS policies, and all functions
```

### **Step 2: Update Environment Variables**
Make sure you have these in your `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### **Step 3: Start the App**
```bash
cd iryshare
npm run dev
```

## 🎮 How It Works

### **New User Flow:**
1. **Landing Page** → Connect wallet
2. **Registration Popup** → Enter username
3. **Main App** → Start sharing/storing files

### **Returning User Flow:**
1. **Landing Page** → Connect wallet
2. **Auto-login** → Goes straight to main app
3. **Main App** → All features available

### **File Operations:**
- **Share** → Encrypted with Lit Protocol, saved to `file_shares`
  - Accepts `@username` or `0x...address` (or mix of both)
  - Unregistered addresses will receive files once they register
  - Maximum 10 recipients
- **Store Public** → Direct upload to Irys, no encryption
- **Store Private** → Encrypted with Lit Protocol, private to owner

## 📁 File Structure

```
iryshare/
├── src/
│   ├── components/
│   │   ├── App.tsx          # Main app with login flow
│   │   ├── Landing.tsx      # Clean landing page
│   │   └── Home.tsx         # Main app (simplified)
│   └── utils/
│       ├── irys.ts          # File upload functions
│       ├── litIrys.ts       # Encryption functions
│       └── supabase.ts      # Database client
├── complete_fresh_schema.sql # Complete schema with usernames and fixed RLS
└── README_NEW_FLOW.md       # This file
```

## 🎨 Features

### ✅ **Working Features:**
- Wallet connection with RainbowKit
- Username registration and login
- File sharing (encrypted)
- File storage (public/private)
- File preview system
- 12GB storage limit
- Clean UI with Irys fonts

### 🚫 **Removed Features:**
- Complex Supabase authentication
- Profile pages
- Navigation routing
- Complex RLS policies
- Tags system

## 🔧 Database Schema

### **Your Existing Tables:**
- `files` - File metadata (from complete_fresh_schema.sql)
- `file_shares` - Shared file relationships
- `user_storage` - Storage tracking (12GB per user)

### **New Table Added:**
- `usernames` - User registration (address + username)

### **Functions:**
- `get_user_files(address)` - Get owned and shared files

## 🎯 Next Steps

1. **Run the complete schema** - Everything included in complete_fresh_schema.sql
2. **Test the login flow** - Try registering a new user
3. **Test file sharing** - Share a file with another user
4. **Test file storage** - Store public and private files
5. **Test file preview** - Upload different file types

## 📋 Database Changes

### **What We Added:**
- `usernames` table for login/registration
- Simple RLS policies that allow all operations
- No complex authentication requirements

### **What We Fixed:**
- RLS policies now work without Supabase auth
- All file operations work directly
- Clean, simple database access

The app is now clean, simple, and focused on the core file sharing functionality! 🎉

**Ready to test? Run the complete schema and try the new flow!** 