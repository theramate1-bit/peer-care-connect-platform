# Typography hierarchy

Consistent typography scale and hierarchy for the platform.

## Scale

| Category | Tailwind sizes | Use case | Line height |
|----------|----------------|----------|-------------|
| **Display** | 4xl–6xl | Hero, marketing headlines | ~1.1–1.2 |
| **Heading** | xl–3xl | Page title (h1), section (h2), subsection (h3) | ~1.2–1.3 |
| **Body** | base–lg | Paragraphs, content | 1.5–1.6 |
| **Small** | xs–sm | Captions, labels, secondary text | 1.5 |

## Heading hierarchy

- **h1**: `text-3xl font-semibold` — one per page (e.g. "My Sessions")
- **h2**: `text-2xl font-semibold` — major sections
- **h3**: `text-xl font-medium` — subsections, card titles

## Font weights

| Token | Tailwind | Weight |
|-------|----------|--------|
| Regular | `font-normal` | 400 |
| Medium | `font-medium` | 500 |
| Semibold | `font-semibold` | 600 |
| Bold | `font-bold` | 700 |

## Usage

### Typography component

```tsx
import { Typography } from '@/components/ui/typography';

<Typography variant="h1">Page title</Typography>
<Typography variant="h2">Section</Typography>
<Typography variant="body">Paragraph text.</Typography>
<Typography variant="small-muted">Caption</Typography>
```

### Token classes

```tsx
import { typography, typographyClass } from '@/lib/typography-tokens';

// Pre-defined tokens
<h1 className={typography.heading.h1}>Title</h1>
<p className={typography.body.base}>Body</p>

// With optional weight and custom class
<span className={typographyClass(typography.body.small, { weight: 'medium', className: 'text-primary' })}>
  Label
</span>
```

### Direct Tailwind

Use `text-3xl`, `text-2xl`, `text-xl`, `text-lg`, `text-base`, `text-sm`, `text-xs` with `font-normal` / `font-medium` / `font-semibold` / `font-bold` for ad-hoc use. Prefer tokens or the Typography component for consistency.

## Mobile

Tailwind `fontSize` uses `clamp()` so sizes scale with viewport. Line heights are set per size in `tailwind.config.ts` (headings ~1.2–1.3, body 1.5–1.6).

## Visual regression

To add regression tests for typography, snapshot key pages or the Typography component with each variant and compare against a baseline.
