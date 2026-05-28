# Quick Start Guide

Get up and running with Peer Care Connect in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

## Installation

```bash
# Clone your fork of the monorepo (replace URL with yours)
git clone https://github.com/your-username/<repo>.git
cd <repo>

# Install workspaces from repo root
npm install

# Environment (see environment-setup.md for variable list)
cp env.production.example .env.local
# Edit .env.local with your Supabase and Stripe keys

# Start web dev (root package.json — may target a workspace; see README if this fails)
npm run dev
```

The dev URL depends on your branch setup (Vite/Next or workspace). See [README](../../README.md) and [development-setup](./development-setup.md).

## Next Steps

- [Full Development Setup](./development-setup.md)
- [Environment Configuration](./environment-setup.md)
- [Contributing Guide](../../CONTRIBUTING.md)
