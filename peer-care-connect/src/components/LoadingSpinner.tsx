import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export const LoadingSpinner = ({ 
  size = 'md', 
  className, 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const spinner = (
    <div className={cn(
      'flex items-center justify-center',
      fullScreen && 'min-h-screen',
      className
    )}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )} />
        {text && (
          <p className="text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );

  return spinner;
};

// Skeleton loading components
export const SkeletonCard = () => (
  <div className="rounded-lg border p-4 space-y-3">
    <div className="flex items-center space-x-3">
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 w-full bg-muted rounded animate-pulse" />
      <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="h-4 bg-muted rounded animate-pulse flex-1"
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
        ))}
      </div>
    ))}
  </div>
);

// Page loading component
export const PageLoading = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-lg text-muted-foreground">{text}</p>
    </div>
  </div>
);

// Button loading state
export const LoadingButton = ({ 
  loading, 
  children, 
  ...props 
}: { 
  loading: boolean; 
  children: React.ReactNode; 
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props} disabled={loading || props.disabled}>
    {loading ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </>
    ) : (
      children
    )}
  </button>
);
