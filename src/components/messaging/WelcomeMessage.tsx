import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, Shield, Clock, ArrowRight, X } from 'lucide-react';

interface UserProfile {
  firstName?: string;
  userRole?: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath';
  healthNeeds?: string[];
  location?: string;
  isNewUser?: boolean;
}

interface WelcomeMessageProps {
  userProfile: UserProfile;
  onDismiss?: () => void;
  onGetStarted?: () => void;
  className?: string;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  userProfile,
  onDismiss,
  onGetStarted,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  const tips = [
    {
      icon: <Heart className="h-5 w-5 text-red-500" />,
      title: 'Find Your Perfect Match',
      description: 'Our AI matches you with therapists based on your specific health needs and preferences.'
    },
    {
      icon: <Shield className="h-5 w-5 text-green-500" />,
      title: 'Verified Professionals',
      description: 'All therapists are licensed, verified, and background-checked for your safety.'
    },
    {
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      title: 'Flexible Scheduling',
      description: 'Book sessions that fit your schedule with real-time availability.'
    },
    {
      icon: <Star className="h-5 w-5 text-yellow-500" />,
      title: 'Quality Guaranteed',
      description: 'Read reviews from real patients and choose with confidence.'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleSpecificMessage = () => {
    switch (userProfile.userRole) {
      case 'client':
        return {
          title: 'Welcome to Your Health Journey',
          subtitle: 'We\'re here to connect you with the perfect healthcare professional for your needs.',
          actionText: 'Find My Therapist',
          actionIcon: <Heart className="h-4 w-4" />
        };
      case 'sports_therapist':
      case 'massage_therapist':
      case 'osteopath':
        return {
          title: 'Welcome to Your Practice',
          subtitle: 'Start building your client base and grow your practice with our platform.',
          actionText: 'Set Up Profile',
          actionIcon: <Star className="h-4 w-4" />
        };
      default:
        return {
          title: 'Welcome to TheraMate',
          subtitle: 'Your trusted healthcare marketplace for professional therapy services.',
          actionText: 'Get Started',
          actionIcon: <ArrowRight className="h-4 w-4" />
        };
    }
  };

  const getPersonalizedRecommendations = () => {
    if (!userProfile.healthNeeds || userProfile.healthNeeds.length === 0) {
      return null;
    }

    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Based on your interests:</h4>
        <div className="flex flex-wrap gap-2">
          {userProfile.healthNeeds.slice(0, 3).map((need, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {need.replace('_', ' ').toUpperCase()}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const roleMessage = getRoleSpecificMessage();

  if (!isVisible) return null;

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsVisible(false);
            onDismiss?.();
          }}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {getGreeting()}{userProfile.firstName ? `, ${userProfile.firstName}` : ''}! 👋
              </h3>
              {userProfile.isNewUser && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  New User
                </Badge>
              )}
            </div>
            
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              {roleMessage.title}
            </h4>
            
            <p className="text-gray-600 mb-4">
              {roleMessage.subtitle}
            </p>

            {getPersonalizedRecommendations()}

            <div className="mt-6">
              <Button 
                onClick={onGetStarted}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {roleMessage.actionText}
                {roleMessage.actionIcon}
              </Button>
            </div>
          </div>
        </div>

        {/* Rotating tips */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {tips[currentTip].icon}
            </div>
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">{tips[currentTip].title}</h5>
              <p className="text-sm text-gray-600">{tips[currentTip].description}</p>
            </div>
          </div>
          
          {/* Tip indicators */}
          <div className="flex justify-center space-x-1 mt-3">
            {tips.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  index === currentTip ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">500+</div>
            <div className="text-xs text-gray-600">Verified Therapists</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">4.8/5</div>
            <div className="text-xs text-gray-600">Average Rating</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">24/7</div>
            <div className="text-xs text-gray-600">Support Available</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const QuickActions: React.FC<{ userRole?: string; onAction?: (action: string) => void }> = ({
  userRole,
  onAction
}) => {
  const getActions = () => {
    switch (userRole) {
      case 'client':
        return [
          { id: 'browse', label: 'Browse Therapists', icon: '🔍' },
          { id: 'book', label: 'Book Session', icon: '📅' },
          { id: 'profile', label: 'Complete Profile', icon: '👤' }
        ];
      case 'sports_therapist':
      case 'massage_therapist':
      case 'osteopath':
        return [
          { id: 'profile', label: 'Set Up Profile', icon: '👨‍⚕️' },
          { id: 'availability', label: 'Set Availability', icon: '⏰' },
          { id: 'earn', label: 'Start Earning', icon: '💰' }
        ];
      default:
        return [
          { id: 'learn', label: 'Learn More', icon: '📚' },
          { id: 'browse', label: 'Browse Services', icon: '🔍' },
          { id: 'contact', label: 'Contact Us', icon: '📞' }
        ];
    }
  };

  const actions = getActions();

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => onAction?.(action.id)}
          className="flex flex-col items-center space-y-1 h-auto py-3"
        >
          <span className="text-lg">{action.icon}</span>
          <span className="text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default WelcomeMessage;
