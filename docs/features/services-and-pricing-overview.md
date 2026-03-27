# Services & Pricing – Feature Overview

**Audience:** Junior developers

**Services & Pricing** is where practitioners define what they offer: treatment types, durations, prices, and whether each service is clinic-based, mobile, or both. Products drive marketplace visibility and booking flows.

---

## What are Services & Products?

Each **product** (`practitioner_products`) is a bookable service:

- **Name** – e.g. "Sports Massage"
- **Description** – Optional details
- **Price** – In pence (`price_amount`); displayed in GBP
- **Duration** – Minutes per session
- **Service type** – `clinic`, `mobile`, or `both`
- **Active** – `is_active = true` → shown in marketplace and booking

Products are managed at `/practice/products` and created/edited via **ProductForm**.

---

## User Sequence: Create Product

```mermaid
sequenceDiagram
    participant Practitioner
    participant ProductForm
    participant Supabase
    participant Stripe

    Practitioner->>ProductForm: Add new product
    ProductForm->>Practitioner: Show form (name, price, duration, service_type)
    Practitioner->>ProductForm: Fill & submit
    ProductForm->>ProductForm: Validate (service_type allowed for therapist_type)
    ProductForm->>Supabase: INSERT practitioner_products
    ProductForm->>Stripe: Create product/price (if Stripe sync enabled)
    Supabase-->>ProductForm: productId
    ProductForm->>Practitioner: Product in list; marketplace eligibility may change
```

---

## Practitioner Type ↔ Product Service Type

| Practitioner type | Allowed product `service_type`                       | Effect                                                                |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| **Clinic-based**  | `clinic` only (mobile products normalized to clinic) | Single "Book at clinic" flow                                          |
| **Mobile**        | `mobile` only                                        | Single "Request mobile session" flow                                  |
| **Hybrid**        | `clinic`, `mobile`, or `both`                        | "Book at clinic" and/or "Request mobile session" depending on product |

**`getEffectiveProductServiceType(therapistType, product)`** in `booking-flow-type.ts` enforces this. A clinic-based practitioner with a `mobile` product will have it treated as `clinic`; they cannot offer mobile.

**See:** [PRACTITIONER_TYPE_CLINIC_BASED](../product/PRACTITIONER_TYPE_CLINIC_BASED.md), [PRACTITIONER_TYPE_MOBILE](../product/PRACTITIONER_TYPE_MOBILE.md), [PRACTITIONER_TYPE_HYBRID](../product/PRACTITIONER_TYPE_HYBRID.md).

---

## Key Files

| File                                                   | Role                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `src/components/practitioner/ProductForm.tsx`          | Create/edit product; service type dropdown by therapist type          |
| `src/pages/practice/PracticeProducts.tsx` (or similar) | Product list; add/edit/delete                                         |
| `src/lib/booking-flow-type.ts`                         | `canBookClinic`, `canRequestMobile`, `getEffectiveProductServiceType` |
| `practitioner_products` table                          | Name, price, duration, `service_type`, `is_active`                    |

---

## Product Form – Service Type Options

- **Clinic-based:** Only "Clinic-Based" (no mobile option)
- **Mobile:** Only "Mobile Service" (`service_type: 'mobile'`)
- **Hybrid:** "Clinic-Based Only", "Mobile Only", "Both (Clinic & Mobile)"

Each product's `service_type` determines which booking CTAs appear on the marketplace for that practitioner.

---

## Marketplace Eligibility

A practitioner appears on the marketplace only if they have **at least one bookable product**:

- **Clinic:** `canBookClinic` true (clinic/both product + clinic address)
- **Mobile:** `canRequestMobile` true (mobile product + base coords + radius)
- **Hybrid:** Either `canBookClinic` or `canRequestMobile` (or both)

---

## Stripe Integration

Products can sync to Stripe:

- `stripe_product_id`, `stripe_price_id` – Links to Stripe catalog
- Used for payment processing (checkout, webhooks)

---

## Credit Cost (Treatment Exchange)

For treatment exchange, credit cost = duration (1 credit per minute). This comes from the selected **recipient** product when the requester books a reciprocal session.

---

## Related Docs

- [Practitioner Types](../product/PRACTITIONER_TYPE_CLINIC_BASED.md) (and Mobile, Hybrid)
- [How Booking Works](./how-booking-works.md)
- [Database Schema](../architecture/database-schema.md) – `practitioner_products`
- [How Credits Work](./how-credits-work.md)

---

**Last Updated:** 2026-03-15
