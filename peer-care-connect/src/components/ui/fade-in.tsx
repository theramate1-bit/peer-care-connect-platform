import React, { useEffect, useState } from 'react';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Fade-in animation component with Framer Motion-like smooth transitions
 */
export const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  delay = 0, 
  duration = 0.4,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}s`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
};

/**
 * Staggered fade-in for lists
 */
export const FadeInStagger: React.FC<{
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}> = ({ children, staggerDelay = 0.05, className = '' }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
};

