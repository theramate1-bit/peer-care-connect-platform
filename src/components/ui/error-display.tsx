import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getErrorType, ErrorType } from '@/lib/error-handling';

interface ErrorDisplayProps {
  error: any;
  context?: string;
  onRetry?: () => void;
  className?: string;
  title?: string;
  description?: string;
  retryLabel?: string;
}

const errorIcons = {
  [ErrorType.NETWORK]: '🌐',
  [ErrorType.VALIDATION]: '⚠️',
  [ErrorType.AUTHENTICATION]: '🔐',
  [ErrorType.AUTHORIZATION]: '🚫',
  [ErrorType.NOT_FOUND]: '🔍',
  [ErrorType.SERVER]: '⚙️',
  [ErrorType.UNKNOWN]: '❓'
};

export function ErrorDisplay({ 
  error, 
  context, 
  onRetry, 
  className,
  title,
  description,
  retryLabel = 'Try Again'
}: ErrorDisplayProps) {
  const errorType = getErrorType(error);
  const icon = errorIcons[errorType];
  
  const finalTitle = title || `Error${context ? ` in ${context}` : ''}`;
  const finalDescription = description || error?.message || 'An unexpected error occurred';

  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl">{icon}</span>
        </div>
        <CardTitle className="text-destructive">{finalTitle}</CardTitle>
        <CardDescription>{finalDescription}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="text-center">
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function InlineError({ 
  error, 
  context, 
  onRetry, 
  className,
  retryLabel = 'Retry'
}: Omit<ErrorDisplayProps, 'title' | 'description'>) {
  const errorType = getErrorType(error);
  
  return (
    <div className={cn('flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg', className)}>
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">
            Error{context ? ` in ${context}` : ''}
          </p>
          <p className="text-sm text-destructive/80">
            {error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorBoundaryFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void; 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorDisplay
        error={error}
        context="application"
        onRetry={resetError}
        title="Something went wrong"
        description="An unexpected error occurred. Please try refreshing the page."
        retryLabel="Refresh Page"
      />
    </div>
  );
}
