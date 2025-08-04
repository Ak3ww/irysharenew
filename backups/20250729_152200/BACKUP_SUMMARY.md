# IryShare Backup - July 29, 2025 15:22:00

## Backup Purpose
Backup created before implementing Lit Protocol to replace the current Libsodium-based encryption system.

## Current State
- **Encryption System**: Libsodium (ChaCha20-Poly1305)
- **File Storage**: Irys Network
- **Database**: Supabase
- **Authentication**: RainbowKit + Wagmi

## Files Backed Up

### Core Components
- `Home.tsx` - Main application component with file upload, sharing, and preview functionality
- `MyFiles.tsx` - Component for viewing user's own files
- `SharedFiles.tsx` - Component for viewing files shared with the user

### Utilities
- `libsodium.ts` - Core encryption/decryption functions using Libsodium
- `irys.ts` - Irys network integration for file uploads
- `supabase.ts` - Supabase database integration
- `encryptionWorker.ts` - Web Worker for encryption operations
- `encryption-worker.js` - Web Worker script file

### Configuration
- `package.json` - Project dependencies and scripts

## Current Features
1. **File Upload**: Encrypted and unencrypted file uploads to Irys
2. **File Sharing**: Share files with specific recipients using symmetric encryption
3. **File Preview**: Preview encrypted and unencrypted files
4. **Recipient Management**: Add new recipients to shared files (requires re-encryption)
5. **Profile Management**: Username registration and profile settings
6. **Storage Tracking**: Track file storage usage

## Known Issues
- **Re-upload Cost**: Adding new recipients requires re-uploading the entire file to Irys
- **Encryption Limitation**: Cannot change encryption keys of already uploaded files without re-uploading

## Next Steps
Implement Lit Protocol to enable:
- Dynamic access control without re-uploading files
- More flexible recipient management
- Better cost efficiency for file sharing

## Recovery Instructions
To restore from this backup:
1. Copy all files from this directory back to their original locations
2. Run `npm install` to ensure dependencies are correct
3. Restart the development server

## Notes
- This backup represents a working state with Libsodium encryption
- All file sharing functionality is operational but requires re-uploading for new recipients
- The backup was created after fixing the decryption issues with the metadata-only approach 