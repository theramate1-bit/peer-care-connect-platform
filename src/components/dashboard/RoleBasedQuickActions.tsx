import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus,
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
  Waves,
  Leaf,
  Sparkles,
  Shield,
  BookOpen,
  CreditCard,
  Star,
  Search,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  badge?: string;
  badgeColor?: string;
}

interface RoleBasedQuickActionsProps {
  className?: string;
  variant?: 'grid' | 'list' | 'compact';
}

export const RoleBasedQuickActions: React.FC<RoleBasedQuickActionsProps> = ({ 
  className, 
  variant = 'grid' 
}) => {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  const getRoleSpecificActions = (): QuickAction[] => {
    switch (userProfile.user_role) {
      case 'client':
        return [
          {
            label: 'Find Therapists',
            href: '/marketplace',
            icon: Search,
            description: 'Browse qualified healthcare professionals',
            color: 'bg-primary/10 text-primary hover:bg-primary/20'
          },
          {
            label: 'Book Session',
            href: '/client/booking',
            icon: Calendar,
            description: 'Schedule your next therapy session',
            color: 'bg-green-100 text-green-600 hover:bg-green-200'
          },
          {
            label: 'My Sessions',
            href: '/client/sessions',
            icon: Calendar,
            description: 'View your upcoming and past sessions',
            color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          },
          {
            label: 'Update Profile',
            href: '/client/profile',
            icon: Settings,
            description: 'Manage your personal information',
            color: 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          },
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            description: 'Communicate with your therapists',
            color: 'bg-orange-100 text-orange-600 hover:bg-orange-200'
          },
          {
            label: 'Reviews',
            href: '/reviews',
            icon: Star,
            description: 'Leave reviews for your sessions',
            color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
          }
        ];

      case 'sports_therapist':
        return [
          {
            label: 'Client Management',
            href: '/dashboard',
            icon: Users,
            description: 'Manage your clients and sessions',
            color: 'bg-primary/10 text-primary hover:bg-primary/20'
          },
          {
            label: 'Schedule',
            href: '/booking',
            icon: Calendar,
            description: 'Manage your availability and bookings',
            color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: User as UserIcon,
            description: 'Update your professional profile',
            color: 'bg-green-100 text-green-600 hover:bg-green-200'
          },
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            description: 'Communicate with clients',
            color: 'bg-orange-100 text-orange-600 hover:bg-orange-200'
          }
        ];

      case 'massage_therapist':
        return [
          {
            label: 'Client Management',
            href: '/dashboard',
            icon: Users,
            description: 'Manage your clients and sessions',
            color: 'bg-primary/10 text-primary hover:bg-primary/20'
          },
          {
            label: 'Schedule',
            href: '/booking',
            icon: Calendar,
            description: 'Manage your availability and bookings',
            color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: User as UserIcon,
            description: 'Update your professional profile',
            color: 'bg-green-100 text-green-600 hover:bg-green-200'
          },
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            description: 'Communicate with clients',
            color: 'bg-orange-100 text-orange-600 hover:bg-orange-200'
          }
        ];

      case 'osteopath':
        return [
          {
            label: 'Client Management',
            href: '/dashboard',
            icon: Users,
            description: 'Manage your clients and sessions',
            color: 'bg-primary/10 text-primary hover:bg-primary/20'
          },
          {
            label: 'Schedule',
            href: '/booking',
            icon: Calendar,
            description: 'Manage your availability and bookings',
            color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: User as UserIcon,
            description: 'Update your professional profile',
            color: 'bg-green-100 text-green-600 hover:bg-green-200'
          },
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            description: 'Communicate with clients',
            color: 'bg-orange-100 text-orange-600 hover:bg-orange-200'
          }
        ];

      default:
        // Generic practitioner actions
        return [
          {
            label: 'Client Management',
            href: '/dashboard',
            icon: Users,
            description: 'Manage your clients and their sessions',
            color: 'bg-primary/10 text-primary hover:bg-primary/20'
          },
          {
            label: 'Schedule',
            href: '/booking',
            icon: Calendar,
            description: 'View and manage your calendar',
            color: 'bg-green-100 text-green-600 hover:bg-green-200'
          },
          {
            label: 'Treatment Notes',
            href: '/dashboard',
            icon: BookOpen,
            description: 'Create and view session notes',
            color: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          },
          {
            label: 'Analytics',
            href: '/analytics',
            icon: BarChart3,
            description: 'View your practice analytics',
            color: 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          }
        ];
    }
  };

  const quickActions = getRoleSpecificActions();

  const getRoleTitle = () => {
    switch (userProfile.user_role) {
      case 'client':
        return 'Quick Actions';
      case 'sports_therapist':
        return 'Sports Therapy Actions';
      case 'massage_therapist':
        return 'Massage Therapy Actions';
      case 'osteopath':
        return 'Osteopathy Actions';
      default:
        return 'Quick Actions';
    }
  };

  const getRoleDescription = () => {
    switch (userProfile.user_role) {
      case 'client':
        return 'Access your most used client features';
      case 'sports_therapist':
        return 'Access your most used sports therapy features';
      case 'massage_therapist':
        return 'Access your most used massage therapy features';
      case 'osteopath':
        return 'Access your most used osteopathy features';
      default:
        return 'Access your most used features';
    }
  };

  if (variant === 'list') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{getRoleTitle()}</CardTitle>
          <CardDescription>{getRoleDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="w-full justify-start h-auto p-4"
                asChild
              >
                <Link to={action.href}>
                  <div className={`p-2 rounded-full ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left ml-3">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                  {action.badge && (
                    <span className={`text-xs px-2 py-1 rounded-full ${action.badgeColor}`}>
                      {action.badge}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        <h3 className="font-medium mb-3">{getRoleTitle()}</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.slice(0, 4).map((action) => (
            <Button
              key={action.href}
              variant="outline"
              size="sm"
              className="h-auto p-3 flex-col"
              asChild
            >
              <Link to={action.href}>
                <action.icon className="h-4 w-4 mb-1" />
                <span className="text-xs">{action.label}</span>
                {action.badge && (
                  <span className={`text-xs px-1 py-0.5 rounded ${action.badgeColor} mt-1`}>
                    {action.badge}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{getRoleTitle()}</CardTitle>
        <CardDescription>{getRoleDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              className={`h-auto p-4 flex-col transition-[border-color,background-color] duration-200 ease-out ${action.color}`}
              asChild
            >
              <Link to={action.href}>
                <action.icon className="h-6 w-6 mb-2" />
                <div className="font-medium mb-1">{action.label}</div>
                <div className="text-xs text-center text-muted-foreground">
                  {action.description}
                </div>
                {action.badge && (
                  <span className={`text-xs px-2 py-1 rounded-full mt-2 ${action.badgeColor}`}>
                    {action.badge}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
