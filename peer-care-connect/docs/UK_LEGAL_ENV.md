# UK legal pages — environment variables

Public legal routes (`/privacy`, `/terms`, `/cookies`) use a single **last updated** date from `src/config/uk-legal.ts` and **verified Companies House defaults** (Theramate Limited, company number **17150275**, registered office **82, Suite A James Carter Road, Mildenhall, United Kingdom, IP28 7DE**).

## Optional Vite overrides

Use these only if you need to override defaults without a code change (e.g. after filing a new registered office at Companies House):

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_COMPANY_REGISTRATION_NUMBER` | `17150275` | England & Wales company number |
| `VITE_REGISTERED_OFFICE` | Single line, as filed | Registered office |
| `VITE_ICO_REGISTRATION_REFERENCE` | Your ICO reference | ICO public register / fee line in Privacy Policy |

If `VITE_ICO_REGISTRATION_REFERENCE` is unset, the Privacy Policy still explains ICO compliance and points to the register and `privacy@theramate.co.uk`.

## Review cadence

- Bump `LEGAL_LAST_UPDATED` and `LEGAL_TERMS_VERSION` in `src/config/uk-legal.ts` when you materially change terms or processing.
- **Terms v5.1** (`/terms`): company particulars shown in full (Theramate Limited, Companies House number, registered office).
- Have material changes reviewed by a **UK-qualified solicitor**; this repo text is not legal advice.
