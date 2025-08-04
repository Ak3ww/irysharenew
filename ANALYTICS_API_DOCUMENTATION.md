# Analytics & API Documentation

## 📊 Analytics Integration

### Google Analytics 4 Setup
- **Location**: `index.html` (head section)
- **Tracking ID**: `G-XXXXXXXXXX` (replace with your actual GA4 ID)
- **Events Tracked**:
  - User registration
  - User login
  - File uploads
  - Page views
  - Errors
  - Feature usage

### Analytics Utility (`src/utils/analytics.ts`)
```typescript
// Track custom events
trackEvent(eventName: string, parameters?: Record<string, any>)

// Track user registration
trackUserRegistration(walletType: string, address: string)

// Track file upload
trackFileUpload(fileSize: number, fileType: string, isEncrypted: boolean, action: 'share' | 'store', recipientCount?: number)

// Track page views
trackPageView(pageName: string)

// Track user login
trackUserLogin(walletType: string, address: string)

// Track errors
trackError(errorType: string, errorMessage: string, context?: string)

// Track feature usage
trackFeatureUsage(featureName: string, parameters?: Record<string, any>)
```

## 🔌 API Endpoints

### Base URL
```
/api/analytics
```

### Endpoints

#### 1. Platform Statistics
```
GET /api/analytics?type=platform
```

**Response:**
```json
{
  "totalUsers": 150,
  "totalFiles": 1250,
  "totalUploads": 1250,
  "totalStorage": 1073741824,
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

#### 2. User Data
```
GET /api/analytics?type=users&username=john_doe
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "address": "0x1234...",
    "created_at": "2024-01-31T12:00:00.000Z"
  },
  "files": [...],
  "fileCount": 25,
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

#### 3. File Data
```
GET /api/analytics?type=files&fileId=uuid
```

**Response:**
```json
{
  "file": {
    "id": "uuid",
    "file_name": "document.pdf",
    "file_size_bytes": 1048576,
    "file_type": "application/pdf",
    "file_url": "https://...",
    "owner_address": "0x1234...",
    "is_encrypted": false,
    "created_at": "2024-01-31T12:00:00.000Z",
    "usernames": {
      "username": "john_doe"
    }
  },
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

#### 4. Recent Activity
```
GET /api/analytics?type=activity&limit=10
```

**Response:**
```json
{
  "activity": [
    {
      "id": "uuid",
      "action": "File Upload",
      "timestamp": "2024-01-31T12:00:00.000Z",
      "user": "john_doe",
      "fileName": "document.pdf"
    }
  ],
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

## 📈 Admin Dashboard

### Access
- **URL**: `/admin/analytics`
- **Features**:
  - Real-time platform statistics
  - Recent user activity
  - Storage usage metrics
  - Refresh functionality

### Components
- **AnalyticsDashboard**: Main dashboard component
- **Stats Cards**: Total users, files, uploads, storage
- **Activity Feed**: Recent file uploads and user actions

## 🚀 Implementation Status

### ✅ Completed
- [x] Google Analytics 4 integration
- [x] Analytics utility functions
- [x] Event tracking in components
- [x] API endpoints for analytics data
- [x] Admin dashboard component
- [x] Page view tracking
- [x] User registration/login tracking
- [x] File upload tracking
- [x] Error tracking

### 🔄 In Progress
- [ ] Rate limiting for API endpoints
- [ ] API authentication
- [ ] More detailed analytics
- [ ] Export functionality

### 📋 Planned
- [ ] Custom analytics dashboard
- [ ] Real-time updates
- [ ] Advanced filtering
- [ ] Data visualization charts
- [ ] User behavior analytics

## 🔧 Setup Instructions

### 1. Google Analytics 4
1. Create a GA4 property
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Replace `G-XXXXXXXXXX` in `index.html`
4. Verify tracking in GA4 dashboard

### 2. API Deployment
1. Deploy to Vercel
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Test API endpoints

### 3. Admin Dashboard
1. Navigate to `/admin/analytics`
2. Verify data loading
3. Test refresh functionality

## 📊 Key Metrics Tracked

### User Metrics
- Total registered users
- User login frequency
- User retention
- Wallet types used

### File Metrics
- Total files uploaded
- File types distribution
- File sizes
- Encryption usage
- Sharing patterns

### Platform Metrics
- Total storage used
- Upload frequency
- Error rates
- Feature usage

### Business Metrics
- User growth
- File upload growth
- Storage cost analysis
- User engagement

## 🔒 Privacy & Security

### Data Privacy
- Wallet addresses are truncated in analytics
- No personal data stored in GA4
- API responses sanitized

### Security
- CORS enabled for API
- Rate limiting (planned)
- Input validation
- Error handling

## 📝 Usage Examples

### Frontend Analytics
```typescript
import { trackEvent, trackFileUpload } from '../utils/analytics';

// Track custom event
trackEvent('button_clicked', { button: 'upload', page: 'homepage' });

// Track file upload
trackFileUpload(1048576, 'application/pdf', false, 'store', 0);
```

### API Usage
```javascript
// Get platform stats
const response = await fetch('/api/analytics?type=platform');
const stats = await response.json();

// Get user data
const userResponse = await fetch('/api/analytics?type=users&username=john_doe');
const userData = await userResponse.json();
```

## 🐛 Troubleshooting

### Common Issues
1. **GA4 not tracking**: Check Measurement ID in `index.html`
2. **API errors**: Verify environment variables
3. **Dashboard not loading**: Check API endpoints
4. **CORS errors**: Ensure proper headers in API

### Debug Mode
Analytics events are logged to console in development mode:
```javascript
// Check browser console for analytics events
console.log('Analytics Event:', eventName, parameters);
``` 