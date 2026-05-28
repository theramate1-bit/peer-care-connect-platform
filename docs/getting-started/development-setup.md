# Development Setup Guide

This guide will help you set up your local development environment for Peer Care Connect / Theramate.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17.0 or higher ([Download](https://nodejs.org/))
- **npm** 9.0.0 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Supabase Account** ([Sign up](https://supabase.com))
- **Stripe Account** ([Sign up](https://stripe.com)) - For payment features

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/<repo>.git
cd <repo>
```

## Step 2: Install Dependencies

### Monorepo root (recommended)

```bash
npm install
```

### Other projects (optional)

```bash
# AI UGC Creator
cd ai-ugc-creator
npm install
cd ..

# iOS Client (if needed)
cd theramate-ios-client
npm install
cd ..
```

## Step 3: Set Up Environment Variables

1. **Copy the example file (repo root):**

   ```bash
   cp env.production.example .env.local
   ```

2. **Fill in your environment variables:**
   - See [Environment Setup Guide](./environment-setup.md) for detailed instructions
   - Get your Supabase keys from [Supabase Dashboard](https://supabase.com/dashboard)
   - Get your Stripe keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

## Step 4: Set Up Supabase

1. **Create a Supabase project:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project
   - Note your project URL and anon key

2. **Run database migrations:**

   ```bash
   # Migrations live at repo-root supabase/migrations
   # Use Supabase CLI or Dashboard SQL Editor
   ```

3. **Set up Edge Functions:**

   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Deploy Edge Functions
   supabase functions deploy
   ```

## Step 5: Start Development Server

```bash
# From repo root (uses root package.json workspaces)
npm run dev
```

The local URL and port depend on your branch (Vite vs Next, workspace wiring). If `npm run dev` fails on a missing workspace package, see the root [README](../../README.md).

## Step 6: Verify Installation

1. **Open the application** in your browser
2. **Check the console** for any errors
3. **Test authentication** by creating an account
4. **Verify database connection** by checking if data loads

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill process on port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill
```

#### Environment Variables Not Loading

- Ensure file is named `.env.local` (not `.env`)
- Restart the development server
- Check that variables start with `VITE_` for client-side access

#### Database Connection Issues

- Verify Supabase project is active
- Check environment variables are correct
- Ensure RLS policies are set up correctly

#### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read the [Contributing Guide](../../CONTRIBUTING.md)
- Review [Code Standards](../contributing/code-standards.md)
- Check out [Testing Guide](../testing/testing-guide.md)
- Explore the [Architecture Documentation](../architecture/system-overview.md)

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Supabase

### Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
```

## Getting Help

- Check [Troubleshooting](#troubleshooting) section
- Review [Documentation Index](../README.md)
- Open an issue on your fork / upstream repository
- Ask in your team’s chat or repo Discussions

---

**Last Updated:** 2025-02-09
