# Credit System

**Audience:** Junior developers

The Credit System is the practitioner-to-practitioner economy used for treatment exchange flows.

---

## What the Credit System Does

- Tracks practitioner credit balances
- Records credit transactions (earn/spend/refund/adjustments)
- Powers eligibility checks for treatment exchange actions
- Connects exchange request lifecycle to credit effects

---

## Where Credits Are Used

### 1) Treatment exchange requests

When a practitioner requests treatment from another practitioner, the system checks exchange eligibility and credit-related constraints before advancing the request.

### 2) Accept/decline/reciprocal booking flow

Exchange state changes (pending, accepted, declined, cancelled, expired) are tied to rules that control whether the next credit-dependent action is allowed.

### 3) Practitioner dashboards and exchange surfaces

Credits are surfaced in practitioner-facing exchange and credits screens, and interact with request actions and notifications.

---

## Canonical Deep Dives

Use these as primary references:

- [How the Credit System Works](./how-credits-work.md)
- [How Treatment Exchange Works](./how-treatment-exchange-works.md)

Product-level audits/specs:

- [Credits and Treatment Exchange Audit](../product/CREDITS_AND_TREATMENT_EXCHANGE_AUDIT.md)
- [Treatment Exchange Production Readiness](../product/TREATMENT_EXCHANGE_PRODUCTION_READINESS.md)
- [Treatment Exchange Notification Flows](../product/TREATMENT_EXCHANGE_NOTIFICATION_FLOWS.md)

---

## Related Flows

- [Dashboard Overview](./dashboard-overview.md)
- [Notifications Overview](./notifications-overview.md)
- [Clinic, Mobile & Hybrid Flows](./clinic-mobile-hybrid-flows.md)

---

## Implementation Notes

- Treat credit balance reads and transaction writes as backend-authoritative.
- For behavior questions, confirm with the latest exchange RPC and migration docs under `supabase/migrations`.
- When docs disagree, prefer the newest product docs and then verify against source.
