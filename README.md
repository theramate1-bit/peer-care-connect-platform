# Theramate - Credit-Based Therapy Exchange Platform

A comprehensive platform connecting clients with verified therapists through a credit-based economy, featuring real-time messaging, location-based matching, and advanced scheduling capabilities.

## 🚀 Features

### Core Platform Features
- **Credit-Based Economy**: Earn and spend credits for therapy sessions
- **Real-time Messaging**: Secure, encrypted communication between clients and therapists
- **Professional Verification**: License and credential verification system
- **Advanced Scheduling**: Recurring sessions, waitlists, and auto-reminders
- **Location Matching**: Find nearby therapists using interactive maps
- **Role-Based Access Control**: Separate portals for clients and practitioners

### Client Features
- Browse and search verified therapists
- Book sessions using credits or traditional payment
- Real-time messaging with therapists
- Session history and progress tracking
- Location-based therapist discovery
- Review and rating system

### Practitioner Features
- Professional profile management
- License and credential verification
- Session scheduling and management
- Credit earning system
- Client communication tools
- Service area management

### Admin Features
- Verification dashboard
- User management
- Platform analytics
- Content moderation

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Shadcn/ui** for components
- **React Router** for navigation
- **React Hook Form** with Zod validation
- **Leaflet.js** for maps
- **Stripe** for payments

### Backend
- **Supabase** for backend services
- **PostgreSQL** with PostGIS for geospatial queries
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for messaging
- **Edge Functions** for serverless logic

### External Services
- **OpenStreetMap** for free map tiles
- **Nominatim API** for geocoding
- **Stripe** for payment processing

## 📁 Project Structure

```
theramate/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Shadcn/ui components
│   │   ├── admin/          # Admin-specific components
│   │   ├── client/         # Client-specific components
│   │   ├── location/       # Location-based components
│   │   └── messaging/      # Messaging components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── credits.ts      # Credit system API
│   │   ├── messaging.ts    # Messaging API
│   │   ├── verification.ts # Verification API
│   │   ├── scheduling.ts   # Scheduling API
│   │   ├── location.ts     # Location API
│   │   ├── validation.ts   # Input validation
│   │   ├── security.ts     # Security utilities
│   │   └── performance.ts  # Performance optimization
│   ├── pages/              # Page components
│   │   ├── admin/          # Admin pages
│   │   ├── client/         # Client pages
│   │   └── public/         # Public pages
│   ├── types/              # TypeScript type definitions
│   └── App.tsx             # Main app component
├── supabase/
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd theramate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. **Set up the database**
   ```bash
   # Run migrations in order:
   # 1. 20250116_credit_system.sql
   # 2. 20250116_messaging_system.sql
   # 3. 20250116_professional_verification.sql
   # 4. 20250116_advanced_scheduling.sql
   # 5. 20250116_location_matching.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

### Core Tables
- `user_profiles` - User account information
- `therapist_profiles` - Therapist-specific data
- `client_sessions` - Therapy session records
- `reviews` - Client reviews and ratings

### Credit System
- `credits` - User credit balances
- `credit_transactions` - Credit transaction history
- `credit_rates` - Credit pricing configuration

### Messaging System
- `conversations` - Message conversations
- `messages` - Individual messages

### Verification System
- `professional_licenses` - License information
- `professional_qualifications` - Qualifications
- `insurance_policies` - Insurance coverage
- `background_checks` - Background check records

### Scheduling System
- `recurring_patterns` - Recurring session patterns
- `recurring_session_instances` - Individual session instances
- `waitlists` - Waitlist entries
- `reminders` - Session reminders

### Location System
- `user_locations` - User location data
- `service_areas` - Therapist service areas
- `location_preferences` - User location preferences

## 🔐 Security Features

### Authentication & Authorization
- Supabase Auth with email/password
- Role-based access control (RBAC)
- Protected routes and components
- Session management with timeout

### Data Protection
- Row Level Security (RLS) policies
- Input validation and sanitization
- XSS and CSRF protection
- Rate limiting on API endpoints

### File Upload Security
- File type validation
- File size limits
- Secure file storage
- Virus scanning (recommended for production)

## 📱 API Documentation

### Credit System
```typescript
// Get user credit balance
const balance = await CreditManager.getBalance(userId);

// Purchase credits
await CreditManager.purchaseCredits(userId, amount, reference, description);

// Spend credits
await CreditManager.spendCredits(userId, amount, reason);
```

### Messaging System
```typescript
// Get conversations
const conversations = await MessagingManager.getConversations(userId);

// Send message
await MessagingManager.sendMessage(conversationId, content, senderId);
```

### Location System
```typescript
// Find nearby therapists
const therapists = await LocationManager.findNearbyTherapists(
  latitude, longitude, radiusKm
);

// Set user location
await LocationManager.setUserLocation(userId, address, city, state, country, postalCode, lat, lng);
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

### Test Structure
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for UI components
- E2E tests for critical user flows

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
1. Set up production Supabase project
2. Configure production environment variables
3. Set up Stripe webhooks
4. Configure CDN for static assets
5. Set up monitoring and logging

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: Supabase (managed)
- **Database**: Supabase PostgreSQL
- **CDN**: CloudFlare or AWS CloudFront

## 📊 Performance Optimization

### Implemented Optimizations
- Code splitting and lazy loading
- Image optimization and lazy loading
- API response caching
- Database query optimization
- Bundle size optimization
- Memory management

### Monitoring
- Performance metrics tracking
- Error monitoring and logging
- User analytics
- Database performance monitoring

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits for commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api.md)
- [Component Library](docs/components.md)
- [Deployment Guide](docs/deployment.md)

### Getting Help
- Check the [FAQ](docs/faq.md)
- Open an issue on GitHub
- Contact the development team

## 🗺️ Roadmap

### Phase 1: Core Platform ✅
- [x] User authentication and profiles
- [x] Credit-based economy
- [x] Basic booking system

### Phase 2: Communication ✅
- [x] Real-time messaging
- [x] Notification system
- [x] Review and rating system

### Phase 3: Verification ✅
- [x] Professional verification
- [x] License management
- [x] Admin dashboard

### Phase 4: Advanced Features ✅
- [x] Recurring sessions
- [x] Waitlist management
- [x] Auto-reminders

### Phase 5: Location Services ✅
- [x] Location-based matching
- [x] Interactive maps
- [x] Distance calculations

### Phase 6: Polish & Optimization ✅
- [x] Performance optimization
- [x] Security enhancements
- [x] Error handling
- [x] Documentation

### Future Enhancements
- [ ] Mobile app (React Native)
- [ ] Video calling integration
- [ ] AI-powered matching
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] White-label solutions

---

**Built with ❤️ for the therapy community**