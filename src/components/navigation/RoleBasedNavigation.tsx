import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Calendar, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  Heart,
  Activity,
  Bone,
  Target,
  Award,
  Coins,
  Waves,
  Leaf,
  Sparkles,
  Shield,
  FileText,
  BookOpen,
  CreditCard,
  Star,
  Search,
  Plus,
  LogOut,
  UserCheck,
  ArrowLeftRight,
  Package,
  Inbox,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { isPractitioner } from '@/types/roles';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
  badgeColor?: string;
}

interface RoleBasedNavigationProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'mobile';
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({ 
  className, 
  variant = 'sidebar' 
}) => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();

  if (!userProfile) return null;

  const getRoleSpecificItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        label: 'Dashboard',
        href: userProfile.user_role === 'client' ? '/client/dashboard' : '/dashboard',
        icon: Home,
        description: 'Main dashboard'
      }
    ];

    switch (userProfile.user_role) {
      case 'client':
        return [
          ...baseItems,
          {
            label: 'Sessions',
            href: '/client/sessions',
            icon: Calendar,
            description: 'View your sessions and progress metrics'
          },
          {
            label: 'My Exercises',
            href: '/client/exercises',
            icon: Target,
            description: 'View your exercise programs from your practitioner'
          },
          {
            label: 'Progress',
            href: '/client/progress',
            icon: Activity,
            description: 'Track your progress and metrics'
          },
          {
            label: 'Goals',
            href: '/client/goals',
            icon: Target,
            description: 'View and track your treatment goals'
          },
          {
            label: 'Profile',
            href: '/client/profile',
            icon: Settings,
            description: 'Manage your profile'
          }
        ];

      case 'sports_therapist':
        return [
          ...baseItems,
          {
            label: 'Diary',
            href: '/practice/schedule',
            icon: Calendar,
            description: 'Manage your schedule'
          },
          {
            label: 'Client Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage your clients and session notes'
          },
          {
            label: 'Services & Pricing',
            href: '/practice/scheduler',
            icon: Package,
            description: 'Configure services and packages'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Exchange Requests',
            href: '/practice/exchange-requests',
            icon: Inbox,
            description: 'Review and respond to treatment exchange requests'
          },
          {
            label: 'Mobile requests',
            href: '/practice/mobile-requests',
            icon: MapPin,
            description: 'Review and respond to mobile booking requests'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Analytics',
            href: '/practice/analytics',
            icon: BarChart3,
            description: 'View performance data'
          },
          {
            label: 'Reviews',
            href: '/reviews',
            icon: Star,
            description: 'View client reviews and ratings'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: Settings,
            description: 'Update your profile'
          }
        ];

      case 'massage_therapist':
        return [
          ...baseItems,
          {
            label: 'Diary',
            href: '/practice/schedule',
            icon: Calendar,
            description: 'Manage your schedule'
          },
          {
            label: 'Client Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage your clients and session notes'
          },
          {
            label: 'Relaxation Programs',
            href: '/dashboard/projects',
            icon: Leaf,
            description: 'Create wellness programs'
          },
          {
            label: 'Wellness Tracking',
            href: '/analytics',
            icon: Sparkles,
            description: 'Monitor improvements'
          },
          {
            label: 'Services & Pricing',
            href: '/practice/scheduler',
            icon: Package,
            description: 'Configure services and packages'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Exchange Requests',
            href: '/practice/exchange-requests',
            icon: Inbox,
            description: 'Review and respond to treatment exchange requests'
          },
          {
            label: 'Mobile requests',
            href: '/practice/mobile-requests',
            icon: MapPin,
            description: 'Review and respond to mobile booking requests'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Analytics',
            href: '/practice/analytics',
            icon: BarChart3,
            description: 'View wellness data'
          },
          {
            label: 'Reviews',
            href: '/reviews',
            icon: Star,
            description: 'View client reviews and ratings'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: Settings,
            description: 'Update your profile'
          }
        ];

      case 'osteopath':
        return [
          ...baseItems,
          {
            label: 'Diary',
            href: '/practice/schedule',
            icon: Calendar,
            description: 'Manage your schedule'
          },
          {
            label: 'Patient Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage patient cases'
          },
          {
            label: 'Treatment Planning',
            href: '/dashboard/projects',
            icon: Target,
            description: 'Create treatment plans'
          },
          {
            label: 'Pain Management',
            href: '/analytics',
            icon: Shield,
            description: 'Monitor pain reduction'
          },
          {
            label: 'Services & Pricing',
            href: '/practice/scheduler',
            icon: Package,
            description: 'Configure services and packages'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Exchange Requests',
            href: '/practice/exchange-requests',
            icon: Inbox,
            description: 'Review and respond to treatment exchange requests'
          },
          {
            label: 'Mobile requests',
            href: '/practice/mobile-requests',
            icon: MapPin,
            description: 'Review and respond to mobile booking requests'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Analytics',
            href: '/analytics',
            icon: BarChart3,
            description: 'View treatment data'
          },
          {
            label: 'Reviews',
            href: '/reviews',
            icon: Star,
            description: 'View client reviews and ratings'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: Settings,
            description: 'Update your profile'
          }
        ];

      default:
        // Generic practitioner navigation
        return [
          ...baseItems,
          {
            label: 'Diary',
            href: '/practice/schedule',
            icon: Calendar,
            description: 'Manage your schedule'
          },
          {
            label: 'Client Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage your clients'
          },
          {
            label: 'Services & Pricing',
            href: '/practice/scheduler',
            icon: Package,
            description: 'Configure services and packages'
          },
          {
            label: 'Treatment Exchange',
            href: '/credits',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Exchange Requests',
            href: '/practice/exchange-requests',
            icon: Inbox,
            description: 'Review and respond to treatment exchange requests'
          },
          {
            label: 'Mobile requests',
            href: '/practice/mobile-requests',
            icon: MapPin,
            description: 'Review and respond to mobile booking requests'
          },
          {
            label: 'Analytics',
            href: '/analytics',
            icon: BarChart3,
            description: 'View practice data'
          },
          {
            label: 'Reviews',
            href: '/reviews',
            icon: Star,
            description: 'View client reviews and ratings'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: Settings,
            description: 'Update your profile'
          }
        ];
    }
  };

  const navigationItems = getRoleSpecificItems();
  // Show all navigation items - Treatment Exchange page handles opt-in state internally
  const filteredItems = navigationItems;

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const getRoleIcon = () => {
    switch (userProfile.user_role) {
      case 'client':
        return <Heart className="h-5 w-5 text-primary" />;
      case 'sports_therapist':
        return <Activity className="h-5 w-5 text-primary" />;
      case 'massage_therapist':
        return <Heart className="h-5 w-5 text-primary" />;
      case 'osteopath':
        return <Bone className="h-5 w-5 text-primary" />;
      default:
        return <Users className="h-5 w-5 text-primary" />;
    }
  };

  const getRoleTitle = () => {
    switch (userProfile.user_role) {
      case 'client':
        return 'TheraMate';
      case 'sports_therapist':
        return 'Sports Therapy Portal';
      case 'massage_therapist':
        return 'Massage Therapy Portal';
      case 'osteopath':
        return 'Osteopathy Portal';
      default:
        return 'Professional Portal';
    }
  };

  if (variant === 'header') {
    // For practitioners, include Treatment Exchange in the header navigation
    // Order: Dashboard, Diary, Client Management (or Patient Management), Services & Pricing, Treatment Exchange
    // For clients, show: Dashboard, Sessions, Progress
    const headerItems = isPractitioner(userProfile.user_role) 
      ? filteredItems.filter(item => 
          ['Dashboard', 'Diary', 'Client Management', 'Patient Management', 'Services & Pricing', 'Treatment Exchange'].includes(item.label)
        ).slice(0, 5)
      : filteredItems.filter(item => 
          ['Dashboard', 'Sessions', 'My Exercises', 'Progress'].includes(item.label)
        ).slice(0, 4);
    
    return (
      <nav className={cn("flex items-center space-x-1", className)}>
        {headerItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? 'default' : 'ghost'}
            size="sm"
            asChild
            className="relative"
          >
            <Link to={item.href}>
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
              {item.badge && (
                <Badge 
                  variant="secondary" 
                  className={cn("ml-2 text-xs", item.badgeColor)}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          </Button>
        ))}
      </nav>
    );
  }

  if (variant === 'mobile') {
    // Filter items for mobile view - only show specific items
    // Strict filter: only these exact labels are allowed
    const mobileAllowedLabels = [
      'Dashboard',
      'Diary',
      'Patient Management',
      'Client Management',
      'Services & Pricing',
      'Treatment Exchange',
      'Messages',
      'Profile'
    ];
    
    // Strictly filter - remove everything else (explicitly exclude unwanted items)
    let mobileItems = filteredItems.filter(item => {
      // Only include items that are explicitly in the allowed list
      return mobileAllowedLabels.includes(item.label);
    });
    
    // Ensure proper order: Dashboard, Diary, Patient Management, Services & Pricing, Treatment Exchange, Messages, Profile
    const orderedItems: NavigationItem[] = [];
    const order = ['Dashboard', 'Diary', 'Patient Management', 'Client Management', 'Services & Pricing', 'Treatment Exchange', 'Messages', 'Profile'];
    
    order.forEach(label => {
      const item = mobileItems.find(i => i.label === label);
      if (item) {
        orderedItems.push(item);
      }
    });
    
    // Add Messages if it doesn't exist and user is practitioner
    const hasMessages = orderedItems.find(item => item.label === 'Messages');
    if (!hasMessages && isPractitioner(userProfile.user_role)) {
      orderedItems.push({
        label: 'Messages',
        href: '/messages',
        icon: MessageSquare,
        description: 'View and send messages'
      });
    }
    
    mobileItems = orderedItems;
    
    return (
      <nav className={cn("space-y-2", className)} role="navigation" aria-label="Mobile navigation">
        <div className="space-y-1">
          {mobileItems.map((item) => (
            <Button
              key={item.href}
              variant={isActive(item.href) ? 'default' : 'ghost'}
              className="w-full justify-start h-auto min-h-[44px] px-4 py-3"
              asChild
            >
              <Link 
                to={item.href}
                onClick={() => {
                  // Close mobile menu on navigation (handled by parent)
                }}
              >
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-base">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.description}
                    </div>
                  )}
                </div>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs ml-2 flex-shrink-0", item.badgeColor)}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </Button>
          ))}
        </div>
      </nav>
    );
  }

  // Sidebar variant (default)
  return (
    <div className={cn("space-y-6", className)}>
      {/* Role Header */}
      <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
        {getRoleIcon()}
        <div>
          <p className="font-medium">{getRoleTitle()}</p>
          <p className="text-sm text-muted-foreground">
            {userProfile.first_name} {userProfile.last_name}
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-1">
        {filteredItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? 'default' : 'ghost'}
            className="w-full justify-start h-auto p-3"
            asChild
          >
            <Link to={item.href}>
              <item.icon className="h-4 w-4 mr-3" />
              <div className="flex-1 text-left">
                <div className="font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </div>
                )}
              </div>
              {item.badge && (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", item.badgeColor)}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          </Button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
