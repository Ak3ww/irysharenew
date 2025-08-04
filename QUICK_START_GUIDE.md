# Iryshare Quick Start Guide

## 🚀 **Getting Started**

### **For Users**

#### **1. Connect Your Wallet**
1. Visit the Iryshare application
2. Click "Connect Wallet" on the landing page
3. Choose your preferred wallet (MetaMask, WalletConnect, etc.)
4. Ensure you're connected to Irys Testnet

#### **2. Upload Files**
1. **Public Files**: Click "Store" → Select file → Upload
2. **Private Files**: Click "Share" → Select file → Add recipients → Upload
3. **Recipients**: Use @username or 0x address format

#### **3. Send Tokens**
1. Navigate to "Send Tokens" page
2. Enter recipients and amounts (one per line)
3. Click "SEND" to execute batch transfer
4. View transaction history for details

#### **4. Manage Files**
1. **My Files**: View and manage your uploaded files
2. **Shared With Me**: Access files shared with you
3. **Search & Filter**: Find files quickly
4. **Pagination**: Navigate through large file lists

### **For Developers**

#### **1. Setup Development Environment**
```bash
# Clone the repository
git clone [repository-url]
cd iryshare

# Install dependencies
npm install

# Start development server
npm run dev
```

#### **2. Environment Configuration**
Create `.env.local` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_IRYS_NETWORK=testnet
```

#### **3. Key Files Structure**
```
src/
├── components/
│   ├── pages/          # Main page components
│   ├── layout/         # Layout components
│   ├── features/       # Feature-specific components
│   └── ui/            # Reusable UI components
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

## 🔧 **Core Features Overview**

### **📁 File Management**
- **Upload**: Drag & drop or click to upload
- **Share**: Encrypted sharing with multiple recipients
- **Search**: Real-time file search and filtering
- **Pagination**: Efficient file browsing

### **💰 Token Distribution**
- **Batch Transfers**: Send to multiple addresses in one transaction
- **Smart Contract**: Uses `0x1B2113272fd86F0fB67988003D8d3744A62278b0`
- **History**: Complete transaction logs
- **Network**: Irys Testnet integration

### **👤 User Features**
- **Profiles**: Custom @username support
- **Balance**: Real-time IRYS token balance
- **Settings**: User preferences and configuration
- **Wallet**: Multi-wallet support

## 🎨 **UI Components**

### **Design System**
- **Colors**: Black background with teal (#67FFD4) accents
- **Fonts**: Custom Irys font family
- **Buttons**: Consistent `.btn-irys` styling
- **Responsive**: Mobile-first design
- **Logo**: SVG format with perfect scaling and white color

### **Layout Components**
- **Sidebar**: Collapsible navigation (desktop)
- **MobileNav**: Bottom navigation (mobile)
- **ProfileWidget**: Top navigation bar
- **BackToTop**: Smooth scroll functionality

## 🔐 **Security Features**

### **Encryption**
- **Lit Protocol**: End-to-end encryption for private files
- **Access Control**: Ethereum-based permissions
- **Key Management**: Automatic key distribution
- **Decryption**: Seamless file access

### **Authentication**
- **Wallet-Based**: No traditional passwords
- **Address Verification**: Ethereum address validation
- **Session Management**: Secure session handling
- **Permission Checks**: Granular access control

## 📱 **Mobile Experience**

### **Responsive Design**
- **Touch-Friendly**: Optimized for mobile interactions
- **Bottom Navigation**: Easy thumb access
- **Modal Support**: Full-screen modals
- **Adaptive Cards**: Responsive file cards

### **Mobile Features**
- **Swipe Gestures**: Intuitive navigation
- **Touch Targets**: Proper button sizing
- **Keyboard Support**: Mobile keyboard optimization
- **Performance**: Optimized for mobile devices

## 🚀 **Performance Tips**

### **File Uploads**
- **Small Files**: Use regular upload (< 10MB)
- **Large Files**: Automatic chunked upload (≥ 10MB)
- **Progress Tracking**: Real-time upload progress
- **Error Recovery**: Automatic retry mechanisms

### **Token Distribution**
- **Batch Size**: Efficient for multiple recipients
- **Network Check**: Automatic Irys Testnet detection
- **Balance Validation**: Pre-transaction checks
- **History Storage**: Local storage for transaction logs

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Wallet Connection**
- **Problem**: Wallet not connecting
- **Solution**: Ensure MetaMask is installed and unlocked
- **Check**: Network should be Irys Testnet

#### **File Upload Failures**
- **Problem**: Large file upload fails
- **Solution**: Check network connection and file size
- **Alternative**: Try smaller file or different network

#### **Token Distribution Errors**
- **Problem**: Transaction fails
- **Solution**: Check balance and network connection
- **Verify**: Recipient addresses are valid

#### **Encryption Issues**
- **Problem**: Can't decrypt shared files
- **Solution**: Ensure wallet is connected and has access
- **Check**: Recipient address matches connected wallet

### **Network Issues**
- **Irys Network**: Check network status
- **MetaMask**: Verify network configuration
- **Browser**: Clear cache and cookies
- **Connection**: Check internet connectivity

## 📚 **Additional Resources**

### **Documentation**
- **Complete Documentation**: `COMPLETE_DAPP_DOCUMENTATION.md`
- **Pagination Guide**: `README_PAGINATION_IMPLEMENTATION.md`
- **TODO List**: `TODO_NEXT_SESSION.md`

### **Development**
- **Irys Network**: https://irys.xyz
- **Lit Protocol**: https://litprotocol.com
- **Wagmi**: https://wagmi.sh
- **Supabase**: https://supabase.com

### **Support**
- **Issues**: Check existing issues or create new ones
- **Discord**: Join community discussions
- **Documentation**: Refer to complete documentation
- **Testing**: Use testnet for development

---

## 🎉 **Quick Summary**

Iryshare is a comprehensive dApp that combines:
- **🔐 Secure File Storage** with encryption
- **💰 Token Distribution** with batch transfers
- **👥 User Management** with profiles
- **📱 Modern UI/UX** with responsive design

**Ready to get started?** Connect your wallet and begin exploring the decentralized file sharing and token distribution platform!

---

**Last Updated:** January 31, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready 