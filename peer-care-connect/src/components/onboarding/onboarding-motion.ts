import type { Variants } from 'framer-motion';

export const onboardingSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.9,
};

export const onboardingStepVariants: Variants = {
  initial: { opacity: 0, transform: 'translate3d(20px, 0, 0)' },
  animate: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
  exit: { opacity: 0, transform: 'translate3d(-12px, 0, 0)' },
};

export const onboardingFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
