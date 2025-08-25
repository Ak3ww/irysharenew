# 🔍 **Wallet1 Profile Update Debug Guide**

## 🚨 **Issue Description**
- **Wallet1**: Profile update fails on local dev
- **Wallet2**: Profile update works on local dev  
- **Both wallets**: Work fine on deployed version

## 🛠️ **Debugging Steps**

### **Step 1: Check Console Logs**
1. Open browser console (F12)
2. Try to update profile with wallet1
3. Look for debug logs starting with 🔍, ❌, ✅, ⚠️
4. Copy ALL console output

### **Step 2: Verify Local Server**
```bash
# Check if local server is running
curl http://localhost:3001/api/approve-user

# Expected response: {"error":"userAddress is required."}
# If connection refused: Server not running
```

**Start local server if needed:**
```bash
cd iryshare
npm run server
# Should see: "✅ Local approval server running on http://localhost:3001"
```

### **Step 3: Check Environment Variables**
**Local .env file should contain:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

**Verify in console:**
- Look for "🔍 DEBUG: ProfileSettings Environment Info:"
- Check if `hasSupabaseUrl` and `hasSupabaseKey` are `true`

### **Step 4: Database Schema Check**
**Local vs Deployed differences:**
1. **Table structure**: Check if `usernames` table has all required columns
2. **Constraints**: Check for unique constraints, NOT NULL requirements
3. **Permissions**: Verify RLS (Row Level Security) policies

**Required columns in `usernames` table:**
```sql
- id (primary key)
- address (unique, NOT NULL)
- username (unique, NOT NULL)
- profile_public (boolean)
- profile_bio (text)
- profile_avatar (text)
- registration_signature (text)
```

### **Step 5: Wallet Connection Issues**
**Check MetaMask:**
1. **Network**: Ensure both wallets are on same network (Sepolia)
2. **Account**: Verify wallet1 is active in MetaMask
3. **Permissions**: Check if wallet1 has granted site permissions

**Signature issues:**
- Look for "❌ DEBUG: No signature received"
- Check if MetaMask popup appears
- Verify signature message format

### **Step 6: Supabase Storage Issues**
**Avatar upload problems:**
1. Check if `avatars` bucket exists in local Supabase
2. Verify storage permissions
3. Check file size limits

**Storage bucket creation:**
```sql
-- In Supabase SQL editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

### **Step 7: Common Local Dev Issues**

#### **Issue A: Local Server Not Running**
**Symptoms:**
- Console error: "Failed to fetch from localhost:3001"
- Profile update fails immediately

**Solution:**
```bash
npm run server
# Keep terminal open
```

#### **Issue B: Environment Variables Missing**
**Symptoms:**
- Console shows "NOT SET" for Supabase URL
- Profile update fails with "Error updating profile"

**Solution:**
1. Copy `.env` from deployed environment
2. Or create local `.env` with correct values

#### **Issue C: Database Schema Mismatch**
**Symptoms:**
- Console error: "column does not exist"
- Database constraint violations

**Solution:**
1. Compare local vs deployed database schema
2. Run missing migrations locally

#### **Issue D: Wallet Network Mismatch**
**Symptoms:**
- Signature fails
- MetaMask shows wrong network

**Solution:**
1. Switch both wallets to Sepolia testnet
2. Ensure same network for both wallets

## 🔍 **Debug Output Analysis**

### **Successful Profile Update:**
```
🔍 DEBUG: Starting profile update for wallet: 0x...
🔍 DEBUG: Profile data: {...}
✅ DEBUG: Signature received: 0x...
🔍 DEBUG: Updating profile in usernames table...
✅ DEBUG: Profile updated successfully in usernames table
🔍 DEBUG: Updating profile_visible for all user files...
✅ DEBUG: Profile visibility updated for all files
🎉 DEBUG: Profile update completed successfully for wallet: 0x...
```

### **Failed Profile Update - Common Patterns:**

#### **Pattern 1: MetaMask Issues**
```
❌ DEBUG: MetaMask not found
❌ DEBUG: No signature received
```
**Solution:** Check MetaMask connection and permissions

#### **Pattern 2: Database Issues**
```
❌ DEBUG: Error updating profile in usernames table:
❌ DEBUG: Error details: {code: "23505", message: "duplicate key value violates unique constraint"}
```
**Solution:** Check database constraints and existing data

#### **Pattern 3: Storage Issues**
```
⚠️ DEBUG: Error deleting old avatar: {...}
```
**Solution:** Check Supabase storage permissions and bucket existence

#### **Pattern 4: Environment Issues**
```
🔍 DEBUG: ProfileSettings Environment Info: {
  isLocalDev: true,
  hasSupabaseUrl: false,
  hasSupabaseKey: false
}
```
**Solution:** Fix environment variables

## 🚀 **Quick Fixes to Try**

### **Fix 1: Restart Local Server**
```bash
# Stop server (Ctrl+C)
npm run server
```

### **Fix 2: Clear Browser Cache**
- Hard refresh (Ctrl+Shift+R)
- Clear localStorage for the site
- Disconnect/reconnect MetaMask

### **Fix 3: Check Wallet Order**
- Ensure wallet1 is first account in MetaMask
- Try switching accounts and back

### **Fix 4: Verify Database Connection**
```javascript
// In browser console
import { supabase } from './src/utils/supabase.js'
const { data, error } = await supabase.from('usernames').select('*').limit(1)
console.log('DB Test:', { data, error })
```

## 📋 **Debug Checklist**

- [ ] Console shows debug logs
- [ ] Local server running on port 3001
- [ ] Environment variables loaded correctly
- [ ] Both wallets on same network (Sepolia)
- [ ] MetaMask permissions granted
- [ ] Database schema matches deployed
- [ ] Storage bucket exists and accessible
- [ ] No JavaScript errors in console
- [ ] Network tab shows successful API calls

## 🆘 **Still Stuck?**

**Provide this information:**
1. **Console logs** (all debug output)
2. **Environment info** (from debug logs)
3. **Error messages** (exact text)
4. **Wallet addresses** (wallet1 vs wallet2)
5. **Network tab** (failed requests)
6. **Local server status** (running/not running)

**Common root causes:**
- Local server not running
- Missing environment variables
- Database schema differences
- Wallet network mismatch
- MetaMask permission issues
- Storage bucket missing

---

*Debug guide created for Wallet1 profile update issue* 🔍
*Last updated: Current session* 📝
