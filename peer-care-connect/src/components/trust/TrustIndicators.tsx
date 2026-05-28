import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, CheckCircle, Star, Users, Award, Clock } from 'lucide-react';

interface TrustIndicatorsProps {
  variant?: 'compact' | 'detailed' | 'minimal';
  showCounts?: boolean;
  className?: string;
}

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({ 
  variant = 'compact', 
  showCounts = true,
  className = '' 
}) => {
  const indicators = [
    {
      icon: <Shield className="h-4 w-4" />,
      text: 'HIPAA Compliant',
      color: 'bg-green-100 text-green-800',
      description: 'Healthcare privacy protected'
    },
    {
      icon: <Lock className="h-4 w-4" />,
      text: 'SSL Secured',
      color: 'bg-blue-100 text-blue-800',
      description: '256-bit encryption'
    },
    {
      icon: <CheckCircle className="h-4 w-4" />,
      text: 'Verified Professionals',
      color: 'bg-purple-100 text-purple-800',
      description: 'Licensed & background checked'
    },
    {
      icon: <Star className="h-4 w-4" />,
      text: '4.8/5 Rating',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Based on 1,200+ reviews'
    },
    {
      icon: <Users className="h-4 w-4" />,
      text: '10,000+ Patients',
      color: 'bg-indigo-100 text-indigo-800',
      description: 'Trusted by thousands'
    },
    {
      icon: <Award className="h-4 w-4" />,
      text: 'Award Winning',
      color: 'bg-orange-100 text-orange-800',
      description: 'Best Healthcare Platform 2024'
    }
  ];

  if (variant === 'minimal') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {indicators.slice(0, 3).map((indicator, index) => (
          <Badge key={index} variant="secondary" className={`${indicator.color} border-0`}>
            {indicator.icon}
            <span className="ml-1 text-xs">{indicator.text}</span>
          </Badge>
        ))}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Why Trust TheraMate?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indicators.map((indicator, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${indicator.color}`}>
                  {indicator.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{indicator.text}</p>
                  <p className="text-sm text-gray-600">{indicator.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">24/7 Support Available</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Our support team is always here to help with any questions or concerns.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact variant (default)
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {indicators.map((indicator, index) => (
        <Badge key={index} variant="secondary" className={`${indicator.color} border-0`}>
          {indicator.icon}
          <span className="ml-1 text-xs">{indicator.text}</span>
        </Badge>
      ))}
    </div>
  );
};

export const SecurityBadges: React.FC<{ className?: string }> = ({ className = '' }) => {
  const badges = [
    { name: 'SSL', description: 'Secure Connection', icon: '🔒' },
    { name: 'HIPAA', description: 'Privacy Compliant', icon: '🏥' },
    { name: 'PCI DSS', description: 'Payment Secure', icon: '💳' },
    { name: 'SOC 2', description: 'Security Audited', icon: '🛡️' }
  ];

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {badges.map((badge, index) => (
        <div key={index} className="flex items-center space-x-1 text-xs text-gray-600">
          <span className="text-lg">{badge.icon}</span>
          <div>
            <div className="font-medium">{badge.name}</div>
            <div className="text-gray-500">{badge.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SocialProof: React.FC<{ className?: string }> = ({ className = '' }) => {
  const stats = [
    { number: '10,000+', label: 'Happy Patients', icon: '👥' },
    { number: '500+', label: 'Verified Therapists', icon: '👨‍⚕️' },
    { number: '4.8/5', label: 'Average Rating', icon: '⭐' },
    { number: '99.9%', label: 'Uptime', icon: '⚡' }
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="text-center p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default TrustIndicators;
