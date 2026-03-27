# Documentation Index

Welcome to the Peer Care Connect / Theramate documentation. This directory contains comprehensive documentation for developers, contributors, and users.

## 📚 Documentation Structure

### Development

- [Send all transactional email previews](./development/send-test-emails.md) — full HTML via `send-email` + `npm run email:send-all-previews`

### Getting Started

- [Development Setup](./getting-started/development-setup.md)
- [Environment Configuration](./getting-started/environment-setup.md)
- [Quick Start Guide](./getting-started/quick-start.md)

### Architecture

- [System Overview](./architecture/system-overview.md)
- [Database Schema](./architecture/database-schema.md) 🆕 - Core tables, relationships, guest/client, practitioner types
- [Database Tables MCP Reference](./architecture/database-tables-mcp-reference.md) 🆕 - Full MCP-derived schema, every table, code links
- [Edge Functions](./architecture/edge-functions.md) 🆕 - All Edge Functions with purpose and code links
- [Edge Cases Reference](./features/edge-cases-reference.md) 🆕 - What happens where; booking, exchange, notifications, messaging
- [API Design](./architecture/api-design.md)
- [Security Architecture](./architecture/security.md)

### Features

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
- [How Treatment Exchange Works](./features/how-treatment-exchange-works.md) 🆕 - Exchange system explained
- [Treatment Notes](./features/treatment-notes.md)
- [Pre-Assessment Form: Practitioner View UX Plan](./features/pre-assessment-practitioner-ux-plan.md) 🆕 - UX placement and integration guide

### Integrations

- [Agent Context Stack](./integrations/agent-context.md) – Self-hosted agent memory & context assembly

### Customer mobile (Theramate)

- [Theramate iOS/Android app](../theramate-ios-client/README.md)
- [BMAD interim UX artifact (customer mobile)](../_bmad-output/planning-artifacts/ux-design-customer-mobile.md)
- [Mobile / web full screen inventory](./product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)

### Product & Email

- [Email 20 Templates Audit](./product/EMAIL_20_TEMPLATES_AUDIT.md) – Template inventory, URLs, content, triggers
- [Email UX Design Audit Checklist](./product/EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md) – Per-template UX gaps and quick wins
- [Email UX Roadmap (Medium Effort)](./product/EMAIL_UX_ROADMAP_MEDIUM_EFFORT.md) – MJML, Juice, logo, dark mode
- [Email Testing Process](./product/EMAIL_TESTING_PROCESS.md) – Litmus, Email on Acid, testing checklist

### API Documentation

- [REST API Reference](./api/rest-api.md)
- [Edge Functions](./api/edge-functions.md)
- [Webhooks](./api/webhooks.md)
- [Authentication](./api/authentication.md)

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

### Peer Care Connect (Main Platform)

- Located in `peer-care-connect/README.md`
- React + Vite + Supabase
- Full documentation in `peer-care-connect/` directory

### AI UGC Creator

- Located in `ai-ugc-creator/README.md`
- Next.js + InstantDB
- Video generation tool

### Theramate iOS Client

- Located in `theramate-ios-client/README.md`
- React Native / Expo
- Mobile application

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

**Last Updated:** 2025-02-09
