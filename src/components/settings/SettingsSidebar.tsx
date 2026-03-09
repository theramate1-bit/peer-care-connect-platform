import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { 
  User as UserIcon, 
  Bell, 
  Shield, 
  CreditCard, 
  Key, 
  Palette, 
  Globe, 
  Database,
  HelpCircle,
  Settings as SettingsIcon
} from 'lucide-react';

interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  badgeColor?: string;
}

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    label: 'Profile',
    href: '/settings/profile',
    icon: User as UserIcon,
    description: 'Manage your personal information'
  },
  {
    label: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Configure notification preferences'
  },
  {
    label: 'Privacy & Security',
    href: '/settings/privacy',
    icon: Shield,
    description: 'Control your privacy and security settings'
  },
  {
    label: 'Subscription',
    href: '/settings/subscription',
    icon: CreditCard,
    description: 'Manage your subscription and billing'
  },
  {
    label: 'Password & Security',
    href: '/settings/password',
    icon: Key,
    description: 'Change your password and security settings'
  },
  {
    label: 'Appearance',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Customize your app appearance'
  },
  {
    label: 'Language & Region',
    href: '/settings/language',
    icon: Globe,
    description: 'Set your language and regional preferences'
  },
  {
    label: 'Data & Storage',
    href: '/settings/data',
    icon: Database,
    description: 'Manage your data and storage settings'
  },
  {
    label: 'Help & Support',
    href: '/settings/help',
    icon: HelpCircle,
    description: 'Get help and contact support'
  }
];

export const SettingsSidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2 mb-4">
        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-lg">Settings</h2>
      </div>
      
      <nav className="space-y-1">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              "hover:bg-muted/50 hover:text-foreground",
              isActive(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {item.description}
              </div>
            </div>
            {item.badge && (
              <span className={cn(
                "px-2 py-1 text-xs rounded-full",
                item.badgeColor || "bg-muted text-muted-foreground"
              )}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      
      <Separator className="my-4" />
      
      <div className="px-3 py-2">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Quick Actions</p>
          <div className="space-y-1">
            <Link 
              to="/profile" 
              className="block text-xs hover:text-foreground transition-colors"
            >
              View Public Profile
            </Link>
            <Link 
              to="/help" 
              className="block text-xs hover:text-foreground transition-colors"
            >
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
