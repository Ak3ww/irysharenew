# Changelog - January 31, 2025

## 🚀 New Features
- **Multiple Recipients Support**: Share modal now supports multiple recipients (comma-separated)
- **Toast Notifications**: Added success/error toasts for wallet address copying
- **Enhanced Mobile Support**: Improved file input positioning and touch handling on mobile devices

## 🔧 Bug Fixes
- **Share Modal Validation**: Fixed case-insensitive username validation and improved address validation
- **Modal Rendering**: Fixed FilePreview and ShareModal rendering issues on homepage using createPortal
- **Mobile Responsiveness**: Fixed file input offset issues on mobile view

## 🎨 UI/UX Improvements
- **Cleaner Interface**: Removed security update notice, footer, pricing section, and API docs
- **Better Validation**: Enhanced error messages and validation feedback
- **Improved Accessibility**: Better touch interactions and mobile compatibility

## 📱 Mobile Enhancements
- Added `touch-manipulation` class for better mobile touch handling
- Fixed file input positioning with explicit CSS styles
- Enhanced modal positioning for mobile devices

## 🗑️ Removed Components
- Security update notice from homepage
- Footer component from all pages
- Pricing section from landing page
- API documentation component and route

## 🔄 Technical Changes
- Updated recipient validation logic in Homepage.tsx
- Implemented createPortal for modal rendering
- Enhanced z-index and positioning for modals
- Added toast system integration for user feedback

## 📦 Files Modified
- `src/components/pages/Homepage.tsx` - Fixed validation, removed security notice
- `src/components/ui/share-modal.tsx` - Added multiple recipients, createPortal
- `src/components/ui/file-preview.tsx` - Added createPortal, enhanced positioning
- `src/App.tsx` - Removed Footer and ApiDocs
- `src/components/pages/Landing.tsx` - Removed pricing section
- `src/components/layout/ProfileWidget.tsx` - Added toast notifications
- `src/components/ui/file-input.tsx` - Fixed mobile positioning

## 🗑️ Files Deleted
- `src/components/pages/ApiDocs.tsx` - Completely removed

## ✅ Testing
All changes have been tested and verified:
- Share functionality works on both homepage and sidebar
- File preview modals work correctly
- Mobile responsiveness improved
- Toast notifications working
- All removed elements successfully removed 