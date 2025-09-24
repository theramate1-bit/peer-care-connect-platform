import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  fullScreen?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
  fullScreen = false,
  showRefreshButton = false,
  onRefresh
}) => {
  const spinner = (
    <div className={cn(
      'animate-spin rounded-full border-b-2 border-primary',
      sizeClasses[size],
      className
    )} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {spinner}
          {text && <p className="text-muted-foreground mt-4">{text}</p>}
          {showRefreshButton && onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center gap-2">
        {spinner}
        <span className="text-muted-foreground">{text}</span>
      </div>
    );
  }

  return spinner;
};

export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ loading, children, className, disabled, onClick, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <button
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className={cn(
            'animate-spin rounded-full border-b-2 border-current',
            sizeClasses[size]
          )} />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export const LoadingCard: React.FC<{
  text?: string;
  className?: string;
}> = ({ text = 'Loading...', className }) => {
  return (
    <div className={cn(
      'flex items-center justify-center p-8',
      className
    )}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};

export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  text?: string;
  className?: string;
}> = ({ isVisible, text = 'Loading...', className }) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50',
      className
    )}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};