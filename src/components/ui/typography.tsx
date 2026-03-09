import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/typography-tokens';

const typographyVariants = cva('', {
  variants: {
    variant: {
      'display-large': typography.display.large,
      'display-medium': typography.display.medium,
      'display-small': typography.display.small,
      h1: typography.heading.h1,
      h2: typography.heading.h2,
      h3: typography.heading.h3,
      'body-large': typography.body.large,
      body: typography.body.base,
      'body-small': typography.body.small,
      small: typography.small.base,
      'small-muted': typography.small.muted,
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

type TypographyVariant = NonNullable<VariantProps<typeof typographyVariants>['variant']>;

const defaultTag: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  'display-large': 'h1',
  'display-medium': 'h1',
  'display-small': 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  'body-large': 'p',
  body: 'p',
  'body-small': 'p',
  small: 'span',
  'small-muted': 'span',
};

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: keyof JSX.IntrinsicElements;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, weight, as, ...props }, ref) => {
    const resolvedVariant = variant ?? 'body';
    const Comp = (as ?? defaultTag[resolvedVariant]) as keyof JSX.IntrinsicElements;
    return React.createElement(Comp, {
      ref: ref as React.Ref<HTMLParagraphElement>,
      className: cn(typographyVariants({ variant, weight }), className),
      ...props,
    });
  }
);
Typography.displayName = 'Typography';

export { Typography, typographyVariants };
