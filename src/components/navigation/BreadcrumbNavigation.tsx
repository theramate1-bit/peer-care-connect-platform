import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbs } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';

interface BreadcrumbNavigationProps {
  className?: string;
  showHome?: boolean;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  className,
  showHome = true
}) => {
  const { breadcrumbs } = useBreadcrumbs();

  if (breadcrumbs.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            to="/"
            className="hover:text-foreground transition-colors"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.length > 0 && (
            <ChevronRight className="h-4 w-4" />
          )}
        </>
      )}
      
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.href}>
          <Link
            to={breadcrumb.href}
            className={cn(
              "hover:text-foreground transition-colors flex items-center gap-1",
              index === breadcrumbs.length - 1 && "text-foreground font-medium"
            )}
          >
            {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4" />}
            <span>{breadcrumb.label}</span>
          </Link>
          {index < breadcrumbs.length - 1 && (
            <ChevronRight className="h-4 w-4" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Hook for easy breadcrumb management
export function useBreadcrumbManager() {
  const { addBreadcrumb, removeBreadcrumb, clearBreadcrumbs } = useBreadcrumbs();

  const setBreadcrumbs = (breadcrumbs: Array<{ label: string; href: string; icon?: React.ComponentType<{ className?: string }> }>) => {
    clearBreadcrumbs();
    breadcrumbs.forEach(breadcrumb => addBreadcrumb(breadcrumb));
  };

  const addBreadcrumbToCurrent = (label: string, href: string, icon?: React.ComponentType<{ className?: string }>) => {
    addBreadcrumb({ label, href, icon });
  };

  return {
    addBreadcrumb: addBreadcrumbToCurrent,
    removeBreadcrumb,
    clearBreadcrumbs,
    setBreadcrumbs,
  };
}
