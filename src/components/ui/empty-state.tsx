import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, UserSearch, Calendar, MessageSquare, Bell, Search, FileText } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'minimal' | 'card';
}

/**
 * Standardized empty state component following BMAD-METHOD principles
 * Provides consistent empty states across the platform
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'card'
}) => {
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      {Icon && (
        <div className="mb-4 p-3 rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex gap-3 flex-wrap justify-center">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'minimal') {
    return <div className={cn("py-12", className)}>{content}</div>;
  }

  if (variant === 'default') {
    return (
      <div className={cn("py-12 px-4", className)}>
        {content}
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card>
      <CardContent className="py-12">
        {content}
      </CardContent>
    </Card>
  );
};

// Pre-configured empty states for common scenarios
export const EmptyPractitioners = ({ 
  onClearFilters, 
  onSearch 
}: { 
  onClearFilters?: () => void;
  onSearch?: () => void;
}) => (
  <EmptyState
    icon={UserSearch}
    title="No therapists found"
    description="Try adjusting your search criteria or filters to find more therapists."
    action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined}
    secondaryAction={onSearch ? { label: 'Browse All', onClick: onSearch } : undefined}
  />
);

export const EmptySessions = ({ 
  onCreateSession 
}: { 
  onCreateSession?: () => void;
}) => (
  <EmptyState
    icon={Calendar}
    title="No sessions yet"
    description="You don't have any sessions scheduled. Book your first session to get started."
    action={onCreateSession ? { label: 'Book Session', onClick: onCreateSession } : undefined}
  />
);

export const EmptyMessages = ({ 
  onStartConversation,
  variant = 'card'
}: { 
  onStartConversation?: () => void;
  variant?: 'default' | 'minimal' | 'card';
}) => (
  <EmptyState
    icon={MessageSquare}
    title="No conversations yet"
    description="Start a conversation with your therapist to begin messaging."
    action={onStartConversation ? { label: 'Find Therapists', onClick: onStartConversation } : undefined}
    variant={variant}
  />
);

export const EmptyNotifications = () => (
  <EmptyState
    icon={Bell}
    title="No notifications"
    description="You're all caught up! Notifications will appear here when you receive them."
    variant="minimal"
  />
);

export const EmptyResults = ({ 
  onClearFilters 
}: { 
  onClearFilters?: () => void;
}) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description="Try adjusting your filters or search terms to find what you're looking for."
    action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined}
  />
);

export const EmptyList = ({ 
  title = "No items",
  description = "There are no items to display.",
  action 
}: { 
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) => (
  <EmptyState
    title={title}
    description={description}
    action={action}
    variant="minimal"
  />
);

export const EmptyNotes = ({ 
  onFindPractitioners 
}: { 
  onFindPractitioners?: () => void;
}) => (
  <EmptyState
    icon={FileText}
    title="No Notes Yet"
    description="Your practitioners will add treatment notes and exercise programs (HEPs) after your sessions. Book a session to get started!"
    action={onFindPractitioners ? { label: 'Find Practitioners', onClick: onFindPractitioners } : undefined}
  />
);
