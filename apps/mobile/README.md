# Nepally Mobile App

React Native mobile application for the Nepally platform (Nepalese United Support Alliance).

## Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Expo CLI

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Fill in your environment variables in `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth client ID

### Running the App

#### Development

```bash
# Start Metro bundler
npm start

# Run on iOS simulator (macOS only)
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

#### Production Build

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Architecture

### Directory Structure

```
src/
├── components/        # Reusable UI components
│   ├── buttons/       # Button components
│   ├── inputs/        # Input components
│   ├── cards/         # Card components
│   ├── badges/        # Badge components
│   ├── banners/       # Banner components
│   └── tutorial/      # Tutorial components
├── config/            # App configuration
│   ├── supabase.ts    # Supabase client setup
│   └── constants.ts   # App constants
├── contexts/          # React contexts
│   └── AuthContext.tsx # Authentication context
├── hooks/             # Custom React hooks
│   ├── useAuth.ts     # Authentication hook
│   ├── useMetroArea.ts # Metro area hook
│   ├── useOnboarding.ts # Onboarding hook
│   └── useKeyboard.ts # Keyboard detection hook
├── navigation/        # Navigation setup
│   ├── RootNavigator.tsx
│   ├── OnboardingNavigator.tsx
│   └── MainTabNavigator.tsx
├── screens/           # Screen components
│   ├── onboarding/    # Onboarding flow screens
│   └── HomeScreen.tsx # Main home screen
├── services/          # API and auth services
│   ├── auth/          # Authentication services
│   └── api/           # API client functions
├── styles/            # Design system tokens
│   ├── colors.ts      # Color palette
│   ├── typography.ts  # Typography scale
│   └── spacing.ts     # Spacing system
├── types/             # TypeScript type definitions
│   └── navigation.ts  # Navigation types
└── utils/             # Utility functions
    ├── validation.ts  # Input validation
    ├── storage.ts     # AsyncStorage helpers
    └── platform.ts    # Platform-specific utilities
```

### Tech Stack

- **React**: 19.2.3
- **React Native**: 0.86.3
- **Expo**: SDK 57
- **Navigation**: React Navigation v7
- **State Management**: React Context + Hooks
- **Backend**: Supabase (PostgreSQL)
- **Storage**: AsyncStorage
- **Icons**: Expo Vector Icons
- **TypeScript**: 7.0.x (Full type safety)

> **Note:** Both mobile and web apps use React 19.2.3 for consistency across the monorepo.

## Features Implemented (Phase 1)

- ✅ Welcome screen with branding
- ✅ Signup method selection (Google OAuth stub)
- ✅ ZIP code entry and metro area mapping
- ✅ Metro area confirmation
- ✅ 3-card tutorial (swipeable)
- ✅ Home screen with Level 0 state
- ✅ Level 0 banner (dismissible)
- ✅ Category-based post feed
- ✅ Trust level system foundation
- ✅ Restricted posting for Level 0 users

## Development Notes

### Design System

All visual elements follow the design system defined in `docs/wireframes/00-design-system-foundation.md`:

- **Colors**: Blue (#1565C0) primary, Nepali Red (#DC143C) accent
- **Typography**: Platform-specific (SF Pro on iOS, Roboto on Android)
- **Spacing**: 8pt grid system
- **Platform Differences**: Respected throughout (button heights, text casing, etc.)

### Known Limitations (Phase 1)

- Google OAuth not fully implemented (callback handling needed)
- Phone and email signup are stubs
- Profile photo upload not available
- GPS-based ZIP lookup not implemented
- English language only (Nepali translation planned for Phase 2)

## Next Steps (Phase 2)

1. Implement phone verification (Journey #02)
2. Add email verification flow
3. Complete Google OAuth integration
4. Implement post creation flow
5. Add messaging functionality

## Testing

### Manual Testing Checklist

- [ ] Complete onboarding flow (Welcome → Signup → ZIP → Metro → Tutorial → Home)
- [ ] ZIP validation (valid/invalid codes)
- [ ] Metro area mapping
- [ ] Tutorial card swiping
- [ ] Level 0 banner display and dismissal
- [ ] Category filtering on home screen
- [ ] Post card display
- [ ] Restricted actions for Level 0 users

### Test Users

See `docs/user-journeys/onboarding/01-signup-and-onboarding.md` for test scenarios.

## Contributing

See main repository README for contribution guidelines.

## License

Proprietary - Nepally Platform
