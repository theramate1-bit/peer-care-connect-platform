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
  BookOpen,
  CreditCard,
  Star,
  Search,
  Plus,
  LogOut,
  UserCheck,
  ArrowLeftRight
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
            label: 'Find Therapists',
            href: '/marketplace',
            icon: Search,
            description: 'Browse qualified therapists'
          },
          {
            label: 'My Bookings',
            href: '/client/sessions',
            icon: Calendar,
            description: 'View your sessions'
          },
          {
            label: 'My Profile',
            href: '/client/profile',
            icon: Settings,
            description: 'Manage your profile'
          },
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            description: 'Communicate with therapists'
          }
        ];

      case 'sports_therapist':
        return [
          ...baseItems,
          {
            label: 'Client Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage your clients'
          },
          {
            label: 'Treatment Notes',
            href: '/practice/notes',
            icon: Activity,
            description: 'Create session notes'
          },
          {
            label: 'Schedule',
            href: '/practice/scheduler',
            icon: Calendar,
            description: 'Manage appointments'
          },
          {
            label: 'Peer Treatment',
            href: '/practice/peer-treatment',
            icon: UserCheck,
            description: 'Book treatment with peers'
          },
          {
            label: 'Treatment Exchange',
            href: '/practice/treatment-exchange',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Credits',
            href: '/credits',
            icon: Coins,
            description: 'Manage your credit balance'
          },
          {
            label: 'Analytics',
            href: '/practice/analytics',
            icon: BarChart3,
            description: 'View performance data'
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
            label: 'Client Wellness',
            href: '/practice/clients',
            icon: Heart,
            description: 'Track client wellness'
          },
          {
            label: 'Massage Techniques',
            href: '/practice/notes',
            icon: Waves,
            description: 'Manage techniques'
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
            label: 'Schedule',
            href: '/practice/scheduler',
            icon: Calendar,
            description: 'Manage appointments'
          },
          {
            label: 'Peer Treatment',
            href: '/practice/peer-treatment',
            icon: UserCheck,
            description: 'Book treatment with peers'
          },
          {
            label: 'Treatment Exchange',
            href: '/practice/treatment-exchange',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Credits',
            href: '/credits',
            icon: Coins,
            description: 'Manage your credit balance'
          },
          {
            label: 'Analytics',
            href: '/practice/analytics',
            icon: BarChart3,
            description: 'View wellness data'
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
            label: 'Patient Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage patient cases'
          },
          {
            label: 'Structural Assessment',
            href: '/practice/notes',
            icon: Bone,
            description: 'Conduct assessments'
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
            label: 'Schedule',
            href: '/practice/scheduler',
            icon: Calendar,
            description: 'Manage appointments'
          },
          {
            label: 'Peer Treatment',
            href: '/practice/peer-treatment',
            icon: UserCheck,
            description: 'Book treatment with peers'
          },
          {
            label: 'Treatment Exchange',
            href: '/practice/treatment-exchange',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Credits',
            href: '/credits',
            icon: Coins,
            description: 'Manage your credit balance'
          },
          {
            label: 'Analytics',
            href: '/analytics',
            icon: BarChart3,
            description: 'View treatment data'
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
            label: 'Client Management',
            href: '/practice/clients',
            icon: Users,
            description: 'Manage your clients'
          },
          {
            label: 'Schedule',
            href: '/practice/scheduler',
            icon: Calendar,
            description: 'Manage appointments'
          },
          {
            label: 'Treatment Notes',
            href: '/practice/notes',
            icon: BookOpen,
            description: 'Create session notes'
          },
          {
            label: 'Peer Treatment',
            href: '/practice/peer-treatment',
            icon: UserCheck,
            description: 'Book treatment with peers'
          },
          {
            label: 'Treatment Exchange',
            href: '/practice/treatment-exchange',
            icon: ArrowLeftRight,
            description: 'Exchange treatments with other practitioners'
          },
          {
            label: 'Analytics',
            href: '/analytics',
            icon: BarChart3,
            description: 'View practice data'
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
  // Conditionally hide Treatment Exchange if not opted-in
  const filteredItems = userProfile.treatment_exchange_enabled
    ? navigationItems
    : navigationItems.filter(item => item.href !== '/practice/treatment-exchange');

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
        return 'Client Portal';
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
    // For practitioners, include Credits in the header navigation
    const headerItems = isPractitioner(userProfile.user_role) 
      ? filteredItems.filter(item => 
          ['Dashboard', 'Client Management', 'Treatment Notes', 'Schedule', 'Credits'].includes(item.label)
        ).slice(0, 5)
      : filteredItems.slice(0, 4);
    
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
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
          {getRoleIcon()}
          <div>
            <p className="font-medium text-sm">{getRoleTitle()}</p>
            <p className="text-xs text-muted-foreground">
              {userProfile.first_name} {userProfile.last_name}
            </p>
          </div>
        </div>
        
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <Button
              key={item.href}
              variant={isActive(item.href) ? 'default' : 'ghost'}
              className="w-full justify-start"
              asChild
            >
              <Link to={item.href}>
                <item.icon className="h-4 w-4 mr-3" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">
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
        </div>
      </div>
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
