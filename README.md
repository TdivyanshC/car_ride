# 🚗 Car Ride Sharing App

A modern, production-ready ride-sharing application built with React Native (Expo) and FastAPI. Features Google Places API integration for intelligent location search and real-time ride sharing capabilities.

## ✨ Features

- **Smart Location Search** - MapMyIndia API integration with autocomplete suggestions
- **Real-time Ride Sharing** - Publish and search for rides with live updates
- **Native Date/Time Picker** - Platform-specific date and time selection
- **Cross-platform** - iOS and Android support via Expo
- **Production Ready** - Error boundaries, proper error handling, and deployment configurations

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Framework**: Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand + React Query
- **Maps**: React Native Maps with Google Maps provider
- **UI**: React Native components with custom styling

### Backend (FastAPI)
- **Framework**: FastAPI with Python
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO for live updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB
- Expo CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd car-ride
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env  # Configure your environment variables
   python server.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm start
   ```

## 📱 Development

### Running the App
```bash
# Frontend
cd frontend
npm start

# Backend
cd backend
python server.py
```

### Building for Production
```bash
cd frontend
eas build --platform android --profile production
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_PUBLIC_MAPMYINDIA_API_KEY=your_mapmyindia_api_key
```

**Backend (.env)**
```env
MONGODB_URL=mongodb://localhost:27017/car_ride
JWT_SECRET=your_jwt_secret
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including:

- Google Play Store submission
- Backend deployment options
- EAS Build configuration
- Production environment setup

## 🧪 Testing

```bash
# Frontend linting
cd frontend
npm run lint

# Backend testing (if implemented)
cd backend
python -m pytest
```

## 📁 Project Structure

```
car-ride/
├── frontend/                 # React Native app
│   ├── app/                  # Expo Router pages
│   ├── src/
│   │   ├── api/             # API clients
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React contexts
│   │   └── screens/         # Screen components
│   ├── assets/              # Images and fonts
│   └── app.json             # Expo configuration
├── backend/                  # FastAPI server
│   ├── models.py            # Database models
│   ├── server.py            # Main application
│   └── requirements.txt     # Python dependencies
├── DEPLOYMENT.md            # Deployment guide
└── README.md               # This file
```

## 🔐 Security

- JWT authentication for API endpoints
- Input validation and sanitization
- CORS configuration for production
- Environment variable management
- API key restrictions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for common issues
- Review the code documentation
- Open an issue on GitHub

---

**Built with ❤️ using React Native, Expo, and FastAPI**
