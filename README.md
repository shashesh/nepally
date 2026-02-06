# UNHN - US-Nepal Help Network

A utility-first community platform for the Nepalese diaspora in the USA, providing structured, location-based services for housing, jobs, emergencies, and travel coordination.

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/unhn.git
cd unhn

# Install dependencies
npm install

# Build shared package
npm run build --workspace=packages/shared

# Start mobile app
npm run mobile

# Start web app (in another terminal)
npm run web
```

For detailed setup instructions, see [Setup Guide](./docs/setup-guide.md).

## 📱 Project Overview

UNHN shifts away from algorithm-based social media feeds to provide structured, metro area-based services:

### Core Features

- **🏠 Housing** - Find roommates, apartments, and housing opportunities
- **💼 Jobs** - Discover job openings and career opportunities
- **🚨 Emergency** - Get urgent help from the community (Red Alert system)
- **✈️ Travel** - Find travel companions and coordinate trips

### Key Differentiators

- **Metro-First Location Model** - Content tagged with US Census Metro Area IDs
- **Trust & Safety System** - Multi-tiered account system (Level 0-2)
- **Smart Post Engine** - Category-based posts with mandatory fields and auto-expiry
- **Two-Step Red Alert System** - Moderator-verified emergency broadcasts

## 🛠️ Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Mobile App** | React Native (Expo) | Native performance, fast development |
| **Web App** | Next.js | Server-side rendering for excellent SEO |
| **Backend** | Firebase | Real-time chat, fastest to build, generous free tier |
| **Database** | Firestore | NoSQL, real-time, offline support |
| **Auth** | Firebase Auth | Phone (SMS), email, social login |
| **File Storage** | Cloudinary | Image optimization, CDN, free tier |
| **Push Notifications** | FCM | Free unlimited, works everywhere |
| **Language** | TypeScript | Type safety, shared code between mobile/web |

**Cost:** $0/month for development, $25-50/month for first 1-2K users

For detailed tech stack information, see [Tech Stack](./docs/tech-stack.md).

## 📁 Repository Structure

```
unhn/
├── apps/
│   ├── mobile/          # React Native mobile app (Expo)
│   └── web/             # Next.js web app
├── packages/
│   └── shared/          # Shared TypeScript code (types, utils, validation)
├── firebase/            # Firebase configuration and Cloud Functions
├── docs/                # Documentation
├── .github/             # GitHub Actions CI/CD
└── package.json         # Root package.json (monorepo)
```

This is a **monorepo** using **npm workspaces**. See [Monorepo Structure](./docs/monorepo-structure.md) for details.

## 🏗️ Architecture

### Mobile + Web Code Sharing

**70-80% code sharing** via `@unhn/shared` package:
- ✅ TypeScript types and interfaces
- ✅ Validation schemas (Zod)
- ✅ Utility functions (date, phone, ZIP formatting)
- ✅ Business logic (trust levels, expiry calculations)
- ✅ Constants (post categories, metro areas)

**Platform-specific:**
- ❌ UI components (React Native vs React)
- ❌ Navigation (React Navigation vs Next.js routing)
- ❌ Styling (StyleSheet vs CSS Modules)

See [Code Sharing Guide](./docs/code-sharing-guide.md) for details.

### Metro-First Location Model

Every post is tagged with a US Census Metro Area ID. Users see content from their local metro area by default.

**ZIP to Metro Mapping:**
- Static dataset from HUD USPS ZIP to County Crosswalk
- Loaded into Firestore `/metroAreas` collection
- No API costs, fast lookups

## 🔐 Trust & Safety

### Account Levels

- **Level 0 (New)** - View-only or 1 post/day limit
- **Level 1 (Verified)** - Phone/social verified, full posting rights
- **Level 2 (Contributor)** - High engagement, can verify emergencies

### Red Alert System

Emergency posts require moderator verification:
1. User submits emergency post
2. Local moderators receive notification
3. Moderator verifies and approves
4. Push notification sent to entire metro area

## 📖 Documentation

### Getting Started
- [Setup Guide](./docs/setup-guide.md) - Set up local development environment
- [Quick Start](./QUICK-START.md) - Quick reference guide
- [Tech Stack](./docs/tech-stack.md) - Complete technical architecture

### Architecture
- [Monorepo Structure](./docs/monorepo-structure.md) - How the codebase is organized
- [Code Sharing Guide](./docs/code-sharing-guide.md) - What to share between mobile/web
- [Database Schema](./docs/database-schema.md) - Firestore collections and fields

### Firebase
- [Firebase Setup](./docs/firebase-setup.md) - Configure Firebase project
- [Security Rules](./firebase/firestore.rules) - Firestore security rules
- [Cloud Functions](./firebase/functions/src/index.ts) - Serverless backend logic

### Deployment
- [Deployment Guide](./docs/deployment-guide.md) - Deploy to production

### Product
- [Product Roadmap](./product-roadmap.md) - Feature roadmap and phases
- [Feature Specs](./docs/features/) - Detailed feature specifications
- [User Journeys](./docs/user-journeys/) - User flow documentation

## 🚢 Development Workflow

### Daily Development

1. **Start Firebase emulators** (terminal 1):
   ```bash
   firebase emulators:start
   ```

2. **Build shared package in watch mode** (terminal 2):
   ```bash
   npm run dev --workspace=packages/shared
   ```

3. **Start mobile app** (terminal 3):
   ```bash
   npm run mobile
   # Scan QR code with Expo Go app
   ```

4. **Start web app** (terminal 4):
   ```bash
   npm run web
   # Open http://localhost:3000
   ```

### Making Changes

- Edit `packages/shared` - TypeScript auto-compiles, both apps hot-reload
- Edit `apps/mobile` - Expo hot-reloads
- Edit `apps/web` - Next.js hot-reloads

### Testing

```bash
# Lint all code
npm run lint

# Type check all packages
npm run type-check

# Format all code
npm run format
```

## 📦 Available Scripts

```bash
# Root scripts
npm run mobile         # Start mobile app
npm run web            # Start web app
npm run lint           # Lint all code
npm run format         # Format all code
npm run type-check     # Type check all packages
npm run clean          # Clean all node_modules

# Workspace scripts
npm run dev --workspace=packages/shared
npm run build --workspace=apps/web
npm run build --workspace=apps/mobile
```

## 🚀 Deployment

### Web App (Vercel)
- Automatic deployment from GitHub
- Free tier for hobby projects
- URL: https://unhn.app

### Mobile Apps (Expo EAS)
```bash
eas build --platform ios
eas build --platform android
eas submit --platform all
```

See [Deployment Guide](./docs/deployment-guide.md) for details.

## 🎯 Development Phases

### Phase 1: Utility Core & Trust Foundation (Months 1-3)
- ✅ Identity verification
- ✅ Structured posting forms
- ✅ Metro-based feeds
- ✅ Basic chat

### Phase 2: Community Safety & Growth (Months 4-6)
- 🔄 Red Alert system
- 🔄 Peer vs business distinction
- 🔄 Hyper-local filtering
- 🔄 Advanced moderation

### Phase 3: Sustainability & Ecosystem (Months 7-12)
- ⏳ Self-service ad portal
- ⏳ AI moderation
- ⏳ Resource wiki
- ⏳ Community features

## 🤝 Contributing

1. Read [Setup Guide](./docs/setup-guide.md)
2. Read [Code Sharing Guide](./docs/code-sharing-guide.md)
3. Create a feature branch
4. Make changes
5. Run tests and linting
6. Submit pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- US Census Bureau for metro area data
- HUD for ZIP to County Crosswalk data
- Nepalese diaspora community for feedback

## 📞 Support

- **Documentation:** See [docs/](./docs/) folder
- **Issues:** https://github.com/your-org/unhn/issues
- **Email:** support@unhn.app
- **Website:** https://unhn.app

---

**Built with ❤️ for the Nepalese diaspora community**
