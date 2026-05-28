/**
 * Typography component and token tests (KAN-123)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Typography } from '../typography';
import { typography, typographyClass, fontWeights } from '@/lib/typography-tokens';

describe('Typography tokens', () => {
  it('exports display and heading tokens with expected class substrings', () => {
    expect(typography.display.large).toContain('text-6xl');
    expect(typography.display.medium).toContain('text-5xl');
    expect(typography.display.small).toContain('text-4xl');
    expect(typography.heading.h1).toContain('text-3xl');
    expect(typography.heading.h2).toContain('text-2xl');
    expect(typography.heading.h3).toContain('text-xl');
  });

  it('exports body and small tokens', () => {
    expect(typography.body.base).toContain('text-base');
    expect(typography.body.large).toContain('text-lg');
    expect(typography.small.base).toContain('text-sm');
    expect(typography.small.muted).toContain('text-xs');
  });

  it('exports font weight tokens', () => {
    expect(fontWeights.normal).toBe('font-normal');
    expect(fontWeights.medium).toBe('font-medium');
    expect(fontWeights.semibold).toBe('font-semibold');
    expect(fontWeights.bold).toBe('font-bold');
  });

  it('typographyClass combines token with optional weight and className', () => {
    expect(typographyClass(typography.body.base)).toBe('text-base');
    expect(typographyClass(typography.body.base, { weight: 'medium' })).toContain('font-medium');
    expect(typographyClass(typography.body.base, { className: 'mt-2' })).toContain('mt-2');
  });
});

describe('Typography component', () => {
  it('renders h1 variant with correct tag and classes', () => {
    render(<Typography variant="h1">Page title</Typography>);
    const el = screen.getByText('Page title');
    expect(el.tagName).toBe('H1');
    expect(el.className).toMatch(/text-3xl/);
  });

  it('renders h2 and h3 with correct tags', () => {
    render(<Typography variant="h2">Section</Typography>);
    expect(screen.getByText('Section').tagName).toBe('H2');
    render(<Typography variant="h3">Subsection</Typography>);
    expect(screen.getByText('Subsection').tagName).toBe('H3');
  });

  it('renders body variant as p by default', () => {
    render(<Typography variant="body">Paragraph</Typography>);
    const el = screen.getByText('Paragraph');
    expect(el.tagName).toBe('P');
    expect(el.className).toMatch(/text-base/);
  });

  it('allows as prop to override element', () => {
    render(<Typography variant="h1" as="span">Title as span</Typography>);
    expect(screen.getByText('Title as span').tagName).toBe('SPAN');
  });

  it('applies weight variant', () => {
    render(<Typography variant="body" weight="bold">Bold body</Typography>);
    expect(screen.getByText('Bold body').className).toContain('font-bold');
  });
});
