# Theramate iOS Client

**Canonical Theramate customer mobile app** for this monorepo (Expo, iOS + Android).

A beautiful client app to discover, book, and manage therapy sessions with verified healthcare practitioners.

## 🎨 Design System

This app uses a **soft cream theme** inspired by:

- [KokonutUI](https://kokonutui.com)
- [Magic UI](https://magicui.design)
- [Aceternity UI](https://ui.aceternity.com)

### Color Palette

- **Primary Background:** `#FFFDF8` (Cream)
- **Primary Action:** `#7A9E7E` (Sage Green)
- **Secondary Accent:** `#C9826D` (Terracotta)
- **Text:** `#2D2A26` (Charcoal)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Xcode) or physical device with Expo Go

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase and Stripe keys. After `eas init`, set EAS_PROJECT_ID
# (see `app.config.js`) so production builds use your Expo project id.
```

### Unit tests (deep links, URL helpers)

```bash
npm test
```

From monorepo root: `npm run test:mobile`.

### Development

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios
```

## 📱 Features

### Phase 1 - Core MVP

- ✅ Authentication (Email/Password, Google, Apple)
- ✅ Client onboarding flow
- ✅ Dashboard with upcoming sessions
- ✅ Therapist discovery & search
- ✅ Therapist profiles with reviews
- ✅ Booking flow with Stripe payments (Payment Sheet first; **hosted Checkout** in allowlisted in-app WebView when needed — see `app/hosted-web.tsx`, `lib/openHostedWeb.ts`)
- ✅ My Sessions management
- ✅ Push notifications

### Phase 2 - Communication

- ✅ Real-time messaging (tabs)
- ✅ In-app notifications (`/notifications`); absolute URLs route to native screens or **in-app WebView** (`lib/notificationUrlOpen.ts`, `lib/notificationNavigation.ts`)

### Phase 3 - Engagement

- ✅ Saved therapists — heart on Explore / practitioner profile; **Profile → Saved therapists** (persisted `favorites`)
- 🔲 Reviews submission
- 🔲 Progress tracking

## 🏗 Project Structure

```
theramate-ios-client/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens
│   ├── (tabs)/            # Main app tabs (client)
│   ├── (practitioner)/    # Practitioner shell (tabs + stack screens)
│   ├── booking/           # Booking flow
│   ├── hosted-web.tsx     # Allowlisted WebView (Stripe Checkout, portal, signed URLs)
│   └── stripe-customer-portal.tsx
├── components/            # Reusable components
│   ├── ui/                # Base UI components
│   └── web/               # ControlledHostedWebView, etc.
├── lib/                   # Core utilities
│   ├── supabase.ts        # Supabase client
│   ├── openHostedWeb.ts   # Navigate to hosted-web with pending session
│   ├── hostedWebViewAllowlist.ts
│   └── notificationUrlOpen.ts
├── stores/                # Zustand stores
├── hooks/                 # Custom hooks
├── types/                 # TypeScript types
├── constants/             # App constants
└── assets/                # Static assets
```

**Product docs (monorepo):** `docs/product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md`, `docs/product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`.

## 🔗 Backend Integration

This app connects to the same Supabase backend as the web app:

- Authentication via Supabase Auth
- Real-time data via PostgREST
- File storage via Supabase Storage
- Payments via Stripe Connect

## 📖 Documentation

See [PRD.md](./PRD.md) for complete product requirements including:

- Database schema
- API endpoints
- Auth flow
- Third-party integrations

Monorepo product docs: [Mobile native completion checklist](../docs/product/MOBILE_NATIVE_COMPLETION_CHECKLIST.md), [Mobile ↔ web inventory](../docs/product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md).

## 🛠 Tech Stack

- **Framework:** React Native + Expo
- **Navigation:** Expo Router
- **Styling:** NativeWind (Tailwind CSS)
- **State:** Zustand + React Query
- **Backend:** Supabase
- **Payments:** Stripe

## 📝 License

MIT License - See LICENSE file
