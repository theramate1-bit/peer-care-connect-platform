import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  href?: string;
  glow?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  href,
  glow = false,
  ...props
}) => {
  const baseClasses = "relative inline-flex items-center justify-center font-medium transition-all duration-300 ease-out rounded-lg";
  
  const variants = {
    primary: "bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/25",
    secondary: "bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary-foreground border border-secondary/20 hover:border-secondary/40 hover:bg-secondary/20",
    ghost: "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20",
    glow: "bg-gradient-to-r from-wellness-600 via-wellness-500 to-wellness-600 text-white shadow-2xl hover:shadow-wellness-600/50 border border-wellness-400/50"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const glowEffect = glow || variant === 'glow' ? "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-wellness-600/20 before:via-transparent before:to-wellness-600/20 before:blur-xl before:-z-10 hover:before:blur-2xl" : "";

  const combinedClasses = cn(
    baseClasses,
    variants[variant],
    sizes[size],
    glowEffect,
    "group overflow-hidden",
    className
  );

  const buttonContent = (
    <>
      {/* Background gradient animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
        whileHover={{
          translateX: "200%",
          transition: { duration: 0.6, ease: "easeInOut" }
        }}
      />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      
      {/* Border glow effect */}
      {(glow || variant === 'glow') && (
        <motion.div
          className="absolute inset-0 rounded-lg border border-wellness-400/30"
          whileHover={{
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(34, 197, 94, 0.1)"
          }}
        />
      )}
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        className={combinedClasses}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {buttonContent}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={combinedClasses}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
};
