/**
 * Typography tokens for consistent hierarchy across the platform.
 * Use these class strings or the <Typography> component.
 *
 * Scale:
 * - Display: 4xl–6xl (hero, marketing)
 * - Heading: xl–3xl (h1 > h2 > h3)
 * - Body: base–lg (paragraphs)
 * - Small: xs–sm (captions, labels)
 *
 * Font weights: font-normal (400), font-medium (500), font-semibold (600), font-bold (700).
 * Line heights: ~1.2 for headings, 1.5–1.6 for body (defined in Tailwind fontSize).
 */

export const typography = {
  /** Display: hero / marketing (4xl–6xl) */
  display: {
    large: 'text-6xl font-bold tracking-tight',   // 6xl, 1.1
    medium: 'text-5xl font-bold tracking-tight',  // 5xl, 1.15
    small: 'text-4xl font-semibold tracking-tight', // 4xl, 1.2
  },
  /** Heading: page/section hierarchy (xl–3xl) */
  heading: {
    h1: 'text-3xl font-semibold tracking-tight',  // 3xl, 1.25
    h2: 'text-2xl font-semibold tracking-tight',  // 2xl, 1.3
    h3: 'text-xl font-medium tracking-tight',     // xl, 1.5
  },
  /** Body: paragraphs (base–lg) */
  body: {
    large: 'text-lg',   // 1.6 line height
    base: 'text-base',  // 1.6 line height
    small: 'text-sm',   // 1.5 line height
  },
  /** Small: captions, labels (xs–sm) */
  small: {
    base: 'text-sm',
    muted: 'text-xs text-muted-foreground',
  },
} as const;

/** Font weight tokens (Tailwind classes) */
export const fontWeights = {
  normal: 'font-normal',    // 400
  medium: 'font-medium',    // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold',        // 700
} as const;

/** Utility: combine typography token with optional weight and className */
export function typographyClass(
  token: string,
  opts?: { weight?: keyof typeof fontWeights; className?: string }
): string {
  const parts = [token];
  if (opts?.weight) parts.push(fontWeights[opts.weight]);
  if (opts?.className) parts.push(opts.className);
  return parts.join(' ');
}
