# Canonical migrations changelog

Record **new** files added under `supabase/migrations/` (not legacy `peer-care-connect/supabase/`).

## 2026-06-04

| Migration                                                 | Purpose                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `20251229_add_treatment_exchange_opt_in.sql`              | Column `users.treatment_exchange_opt_in` (idempotent `IF NOT EXISTS`) |
| `20260604120000_treatment_exchange_opt_in_supplement.sql` | Partial index + column comment (merged from legacy duplicate)         |

**Deploy:** `supabase db push` from repo root.
