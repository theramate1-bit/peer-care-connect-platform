# Documentation Index

Welcome to the Peer Care Connect / Theramate documentation. This directory contains comprehensive documentation for developers, contributors, and users.

## 📚 Documentation Structure

### Development

- [Send all transactional email previews](./development/send-test-emails.md) — full HTML via `send-email` + `npm run email:send-all-previews`

### Getting Started

- [Development Setup](./getting-started/development-setup.md)
- [GitHub Actions secrets](./getting-started/github-actions.md)
- [Environment Configuration](./getting-started/environment-setup.md)
- [Quick Start Guide](./getting-started/quick-start.md)

### Architecture

- [**Canonical paths (web / mobile / Supabase)**](./architecture/CANONICAL_PATHS.md) — single source of truth for repo layout
- [**Supabase migration reconciliation**](./architecture/SUPABASE_MIGRATION_RECONCILIATION.md) — legacy vs canonical plan
- [System Overview](./architecture/system-overview.md)
- [**Supabase MCP live reference**](./architecture/supabase-mcp-live-reference.md) — **tables, columns, RLS note, edge functions** (from MCP; refresh after schema/deploy changes)
- [Database Schema](./architecture/database-schema.md) 🆕 - Core tables, relationships, guest/client, practitioner types
- [Database Tables MCP Reference](./architecture/database-tables-mcp-reference.md) 🆕 - Full MCP-derived schema, every table, code links
- [Edge Functions](./architecture/edge-functions.md) 🆕 - All Edge Functions with purpose and code links
- [Edge Cases Reference](./features/edge-cases-reference.md) 🆕 - What happens where; booking, exchange, notifications, messaging
- [API Design](./architecture/api-design.md)
- [Security Architecture](./architecture/security.md)

### Features

- **[Guest (feature-by-feature)](./features/guest/README.md)** — identity, web guest mode, native mobile requests, tokens, practitioner ops, messaging
- **[Client (feature-by-feature)](./features/client/README.md)** — identity, web/native booking, sessions, profile, messaging
- **[Practitioner types — clinic, mobile, hybrid](./features/practitioner-types/README.md)** — `therapist_type`, booking UX, buffers, onboarding (high importance)
- [Booking System](./features/booking-system.md)
- [How Booking Works](./features/how-booking-works.md) 🆕 - Step-by-step guide
- [Booking Flows Reference](./features/booking-flows-reference.md) 🆕 - Canonical map of every booking flow, step behavior, and save timing
- [Diary Overview](./features/diary-overview.md) 🆕 - Practitioner schedule/calendar
- [Dashboard Overview](./features/dashboard-overview.md) 🆕 - Practitioner dashboard, Today's Schedule, New Bookings
- [Client Management Overview](./features/client-management-overview.md) 🆕 - Client list, sessions, notes
- [Services & Pricing Overview](./features/services-and-pricing-overview.md) 🆕 - Products, service types
- [Notifications Overview](./features/notifications-overview.md) 🆕 - In-app notifications
- [Profile & Onboarding Overview](./features/profile-and-onboarding-overview.md) 🆕 - Profile, onboarding, therapist type
- [Clinic, Mobile & Hybrid Flows](./features/clinic-mobile-hybrid-flows.md) 🆕 - Direct booking vs request flows; sequence diagrams
- [Payment System](./features/payment-system.md)
- [How Payments Work](./features/how-payments-work.md) 🆕 - Payment flow explained
- [Messaging System](./features/messaging.md) 🆕 - Practitioner–client messaging, guest email path
- [Credit System](./features/credit-system.md)
- [How Credits Work](./features/how-credits-work.md) 🆕 - Credit system explained
- [How Treatment Exchange Works](./features/how-treatment-exchange-works.md) — Backend flow (two legs, RPCs)
- [Treatment Exchange — Mobile screen flows](./product/TREATMENT_EXCHANGE_MOBILE_SCREEN_FLOWS.md) — Native UI diagrams and QA
- [**App release readiness (CTO/PM blueprint)**](./product/APP_RELEASE_READINESS.md) — Architecture, release gates; run `npm run test:readiness`
- [**App release backlog (CTO/PM + diagrams)**](./product/APP_RELEASE_BACKLOG_CTO_PM.md) — Waves, sprint board, QA matrix, sign-off checklist
- [**App release todo (CTO/PM living)**](./product/APP_RELEASE_TODO_CTO_PM.md) — Ship blockers, bypass logic, payment/Connect QA, safe messaging
- [**Wave 1 QA release sign-off pack**](./testing/WAVE1_QA_RELEASE_SIGNOFF.md) — Manual smoke steps W1-1–W1-9 for TestFlight gate
- [**Production payment smoke (device)**](./testing/WAVE1_PROD_PAYMENT_SMOKE.md) — Live Stripe paths + MCP verification checklist
- [**App / web / mobile drift audit**](./product/APP_WEB_MOBILE_DRIFT_AUDIT.md) — Parity matrix, realtime, route gaps
- [Treatment Notes](./features/treatment-notes.md)
- [Pre-Assessment Form: Practitioner View UX Plan](./features/pre-assessment-practitioner-ux-plan.md) 🆕 - UX placement and integration guide
- [Feature-by-feature gaps index](./product/FEATURE_BY_FEATURE_GAPS_INDEX.md) 🆕 - Current missing items and parity gaps tracker
- [**Web ↔ App feature parity (CTO/PM)**](./product/WEB_APP_FEATURE_PARITY.md) 🆕 - Mermaid maps, backlog P0–P3, route matrix

### Integrations

- [Agent Context Stack](./integrations/agent-context.md) – Self-hosted agent memory & context assembly

### Customer mobile (Theramate)

- [Theramate iOS/Android app](../theramate-ios-client/README.md)
- [**BMAD planning artifacts (index)**](../_bmad-output/planning-artifacts/README.md) — also [architecture](../_bmad-output/planning-artifacts/architecture.md), [epics](../_bmad-output/planning-artifacts/epics.md), [story backlog index](../_bmad-output/planning-artifacts/story-backlog-index.md), [UX alignment](../_bmad-output/planning-artifacts/ux-design-alignment.md), [practitioner shard](../_bmad-output/planning-artifacts/prd-practitioner-shard.md), [exchange & credits shard](../_bmad-output/planning-artifacts/prd-exchange-credits-shard.md), [guest shard](../_bmad-output/planning-artifacts/prd-guest-shard.md), [marketplace discovery shard](../_bmad-output/planning-artifacts/prd-marketplace-discovery-shard.md), [payments & Stripe shard](../_bmad-output/planning-artifacts/prd-payments-stripe-shard.md), [subscription & billing portal shard](../_bmad-output/planning-artifacts/prd-subscription-billing-portal-shard.md), [notifications & messaging shard](../_bmad-output/planning-artifacts/prd-notifications-messaging-shard.md), [clinical documentation shard](../_bmad-output/planning-artifacts/prd-clinical-documentation-shard.md), [calendar sync shard](../_bmad-output/planning-artifacts/prd-calendar-sync-shard.md), [NFR release checklist](../_bmad-output/planning-artifacts/nfr-release-verification-checklist.md), [readiness (2026-05-03)](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-03.md), [readiness follow-up (2026-05-04)](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-04.md)
- [Mobile / web full screen inventory](./product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)

### Product & Email

- **[User types: Guest, Client, Practitioner](./product/USER_TYPES_OVERVIEW.md)** — canonical definitions, code paths in this repo, doc map (start here)
- [Email 20 Templates Audit](./product/EMAIL_20_TEMPLATES_AUDIT.md) – Template inventory, URLs, content, triggers
- [Email UX Design Audit Checklist](./product/EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md) – Per-template UX gaps and quick wins
- [Email UX Roadmap (Medium Effort)](./product/EMAIL_UX_ROADMAP_MEDIUM_EFFORT.md) – MJML, Juice, logo, dark mode
- [Email Testing Process](./product/EMAIL_TESTING_PROCESS.md) – Litmus, Email on Acid, testing checklist

### API Documentation

- [REST API Reference](./api/rest-api.md)
- [Edge Functions](./api/edge-functions.md)
- [Webhooks](./api/webhooks.md)
- [Authentication](./api/authentication.md)

### Operations

- [Observability (Sentry, logs)](./operations/OBSERVABILITY.md)
- [**Pre-deploy runbook**](./operations/PRE_DEPLOY_RUNBOOK.md) — `npm run pre-deploy`
- [Realtime cross-surface QA](./testing/REALTIME_CROSS_SURFACE_QA.md) — web ↔ app diary matrix

### Deployment

- [Deployment Guide](./deployment/deployment-guide.md)
- [Environment Setup](./deployment/environment-setup.md)
- [CI/CD Pipeline](./deployment/cicd.md)
- [Monitoring & Logging](./deployment/monitoring.md)

### Testing

- [Testing Guide](./testing/testing-guide.md)
- [Test Structure](./testing/test-structure.md)
- [E2E Testing](./testing/e2e-testing.md)
- [Test Data Setup](./testing/test-data.md)
- [Pre-Assessment Practitioner View E2E Test](./testing/pre-assessment-practitioner-e2e-test.md) 🆕
- [Pre-Assessment Manual Test Checklist](./testing/pre-assessment-manual-test-checklist.md) 🆕
- [Pre-Assessment E2E Test Results](./testing/pre-assessment-e2e-test-results.md) 🆕

### Troubleshooting

- [React Runtime Duplication Fix](./troubleshooting/react-runtime-duplication-fix.md) 🆕 - Fix for React "Objects are not valid as a React child" error
- [Stripe Transfers Capability Fix](./troubleshooting/stripe-transfers-capability-fix.md) 🆕 - Fix for `PRACTITIONER_TRANSFERS_NOT_ENABLED` error
- [Booking Flow Step Map](./troubleshooting/booking-flow-step-map.md) 🆕 - Source-of-truth mapping for booking steps/buttons and intake save timing

### Contributing

- [Contributing Guidelines](../CONTRIBUTING.md)
- [Junior Developer Guide](./contributing/junior-developer-guide.md) 🆕
- [Junior Dev Feature Index](./contributing/junior-dev-feature-index.md) 🆕 - Map of feature docs for quick reference
- [Common Patterns](./contributing/common-patterns.md) 🆕
- [Code Standards](./contributing/code-standards.md)
- [Git Workflow](./contributing/git-workflow.md)
- [Code Review Process](./contributing/code-review.md)

## 🚀 Quick Links

- [Main README](../README.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Changelog](../CHANGELOG.md)

## 📖 Project-Specific Documentation

### Web app (Theramate / Peer Care Connect)

- **Code:** Vite app in **`peer-care-connect/`** plus feature code in repo-root **`src/`**; canonical **`supabase/`** at repo root. See [CANONICAL_PATHS](./architecture/CANONICAL_PATHS.md).
- **Entry / setup:** see root [README.md](../README.md) and [docs/getting-started/](../getting-started/).

### AI UGC Creator

- Located in `ai-ugc-creator/README.md`
- Next.js + InstantDB
- Video generation tool

### Theramate iOS Client

- Located in `theramate-ios-client/README.md`
- React Native / Expo
- Mobile application

### Legacy documentation paths (`peer-care-connect/`)

Many older docs link to **`peer-care-connect/src/...`**. In this monorepo the **web app** lives at repo-root **`src/`**, the **Expo app** at **`theramate-ios-client/`**, and **Supabase** at **`supabase/`**. A **`peer-care-connect/`** directory may exist only as an **empty npm workspace** placeholder. When a doc link 404s, search the repo for the **file basename** (e.g. `BookingFlow.tsx` → `src/components/booking/BookingFlow.tsx`) or read [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md).

## 🔍 Finding Information

### By Role

- **New Developer:** Start with [Getting Started](./getting-started/)
- **Contributor:** See [Contributing](./contributing/)
- **DevOps:** Check [Deployment](./deployment/)
- **QA/Testing:** Review [Testing](./testing/)

### By Topic

- **Setup & Installation:** [Getting Started](./getting-started/)
- **How Features Work:** [Features](./features/)
- **System Design:** [Architecture](./architecture/)
- **API Usage:** [API Documentation](./api/)
- **Deploying:** [Deployment](./deployment/)

## 📝 Documentation Standards

All documentation should:

- Be clear and concise
- Include code examples where relevant
- Be kept up to date
- Follow markdown best practices
- Include links to related docs

## 🤝 Contributing to Documentation

See [Contributing Guidelines](../CONTRIBUTING.md) for how to contribute documentation improvements.

---

**Last Updated:** 2026-04-21
