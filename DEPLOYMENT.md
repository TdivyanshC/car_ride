# 🚀 Car Ride Sharing App - Play Store Deployment Guide

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Google Play Console Account** - Developer account ($25 one-time fee)
2. **Google Cloud Console** - For APIs and services
3. **EAS Account** - Expo Application Services (free tier available)
4. **Production Backend** - Deployed and accessible
5. **API Keys** - Google Places API, backend URLs configured

## 🔧 Pre-Deployment Setup

### 1. Environment Configuration

Update your environment files:

**frontend/.env.production**
```env
EXPO_PUBLIC_BACKEND_URL=https://your-production-backend.com
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_production_google_places_api_key
EXPO_PUBLIC_ENVIRONMENT=production
```

**backend/.env** (Production)
```env
MONGODB_URL=mongodb+srv://...
JWT_SECRET=your_production_jwt_secret
GOOGLE_PLACES_API_KEY=your_production_google_places_api_key
```

### 2. App Configuration

Update `frontend/app.json` with your production details:

```json
{
  "expo": {
    "name": "Car Ride Sharing",
    "slug": "car-ride-sharing",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.carridesharing"
    },
    "android": {
      "package": "com.yourcompany.carridesharing",
      "versionCode": 1
    }
  }
}
```

### 3. Google Services Setup

#### Google Places API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable "Places API" and "Maps SDK for Android"
4. Create API key with restrictions:
   - Application restrictions: Android apps
   - API restrictions: Places API, Maps SDK for Android

#### Google Play Console Setup
1. Create app in Google Play Console
2. Fill out store listing information
3. Set up internal testing track initially

## 📱 Build & Deploy with EAS

### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. Login to EAS
```bash
eas login
```

### 3. Configure EAS Project
```bash
cd frontend
eas build:configure
```

### 4. Create EAS Build Configuration

Create `frontend/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5. Build for Production
```bash
# Build Android APK/AAB
eas build --platform android --profile production

# Build iOS (if deploying to App Store)
eas build --platform ios --profile production
```

### 6. Submit to Play Store
```bash
# Submit Android build
eas submit --platform android --profile production
```

## 🔐 Backend Deployment

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Deploy
git push heroku main
```

### Option 3: DigitalOcean/VPS
```bash
# On your server
git clone your-repo
cd backend
pip install -r requirements.txt
python server.py
```

## 📋 Play Store Submission Checklist

### App Content
- [ ] App name and description
- [ ] Screenshots (at least 2, max 8)
- [ ] Feature graphic (1024x500)
- [ ] Icon (512x512)
- [ ] Privacy policy URL
- [ ] Terms of service URL

### Technical Requirements
- [ ] Target API level 34+
- [ ] App Bundle (AAB) format
- [ ] 64-bit support
- [ ] Location permissions properly declared
- [ ] Network security config

### Store Listing
- [ ] Short description (80 chars)
- [ ] Full description
- [ ] Category: Travel & Local > Transportation
- [ ] Content rating: Everyone
- [ ] Contact details

## 🚀 Deployment Steps

### Phase 1: Internal Testing
1. Build app with EAS
2. Upload to Play Console Internal Testing
3. Add testers
4. Test thoroughly

### Phase 2: Closed Testing
1. Move to Closed Testing track
2. Expand tester group
3. Gather feedback

### Phase 3: Open Testing (Beta)
1. Move to Open Testing
2. Public beta testing

### Phase 4: Production
1. Submit to Production track
2. Wait for review (7-14 days)
3. Publish to Play Store

## 🔍 Common Issues & Solutions

### Build Issues
```bash
# Clear cache
npx expo install --fix

# Clear EAS cache
eas build --clear-cache
```

### API Key Issues
- Ensure API key restrictions are correct
- Check billing is enabled on Google Cloud
- Verify API quotas

### Backend Connection Issues
- Check CORS settings
- Verify HTTPS in production
- Test API endpoints

### Play Store Rejections
- Ensure privacy policy is accessible
- Check content rating accuracy
- Verify app doesn't violate policies

## 📊 Monitoring & Analytics

### Firebase Analytics (Recommended)
```bash
# Install Firebase
npm install @react-native-firebase/app @react-native-firebase/analytics

# Configure in app.json
{
  "plugins": [
    "@react-native-firebase/app",
    "@react-native-firebase/analytics"
  ]
}
```

### Crash Reporting
```bash
# Install Sentry
npm install @sentry/react-native

# Configure error tracking
```

## 🔄 Updates & Maintenance

### App Updates
```bash
# Update version in app.json
# Build new version
eas build --platform android --profile production

# Submit update
eas submit --platform android --profile production
```

### Backend Updates
- Deploy backend changes
- Test API compatibility
- Update mobile app if needed

## 📞 Support & Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [EAS Documentation](https://docs.expo.dev/eas/)
- [React Native Community](https://reactnative.dev/)

## ⚠️ Important Notes

1. **Keep API keys secure** - Never commit to version control
2. **Test thoroughly** - Use internal testing track first
3. **Monitor crashes** - Set up crash reporting
4. **Plan updates** - Have a release strategy
5. **Backup data** - Regular database backups
6. **Monitor usage** - Track API quotas and costs

## 🎯 Success Checklist

- [ ] App builds successfully
- [ ] All features work in production
- [ ] Backend is deployed and accessible
- [ ] API keys are configured
- [ ] Store listing is complete
- [ ] Internal testing passed
- [ ] App published to Play Store

---

**Need help?** Check the troubleshooting section or contact the development team.