# NUSA Mobile App (React Native + Expo)

This is the mobile application for NUSA, built with React Native and Expo.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on physical device
npm start
# Then scan QR code with Expo Go app
```

## Project Structure

```
src/
├── screens/       # Screen components (HomeScreen, PostListScreen, etc.)
├── components/    # Reusable UI components
├── navigation/    # Navigation configuration
├── hooks/         # Custom React hooks
├── services/      # API services (Firebase, etc.)
└── config/        # App configuration
```

## Key Features

- **React Navigation** - Native navigation for iOS and Android
- **Expo** - Managed workflow for faster development
- **TypeScript** - Type-safe code
- **Shared Package** - Imports business logic from @nusa/shared

## Development

### Testing on Device

1. Install Expo Go app on your phone (iOS or Android)
2. Run `npm start`
3. Scan QR code with Expo Go app
4. App will load on your device with hot reload

### Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

## Environment Variables

Create `.env` file:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```
