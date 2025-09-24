import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Circle, 
  ArrowRight,
  MessageSquare,
  Star,
  Heart,
  Bell,
  Camera,
  FileText,
  Zap
} from 'lucide-react';

interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned' | 'coming-soon';
  timeline: string;
  icon: React.ComponentType<{ className?: string }>;
  progress?: number;
  category: 'communication' | 'reviews' | 'wellness' | 'notifications' | 'advanced';
}

interface FeatureRoadmapProps {
  className?: string;
  userRole?: string;
}

export const FeatureRoadmap: React.FC<FeatureRoadmapProps> = ({ 
  className, 
  userRole = 'client' 
}) => {
  const getRoleSpecificFeatures = (): RoadmapFeature[] => {
    const baseFeatures: RoadmapFeature[] = [
      {
        id: 'messaging',
        title: 'Messaging System',
        description: 'Real-time communication between clients and therapists',
        status: 'coming-soon',
        timeline: 'Q1 2024',
        icon: MessageSquare,
        category: 'communication'
      },
      {
        id: 'reviews',
        title: 'Review & Rating System',
        description: 'Rate and review your therapy sessions',
        status: 'coming-soon',
        timeline: 'Q1 2024',
        icon: Star,
        category: 'reviews'
      },
      {
        id: 'favorites',
        title: 'Favorite Therapists',
        description: 'Bookmark your preferred healthcare professionals',
        status: 'completed',
        timeline: 'Available Now',
        icon: Heart,
        progress: 100,
        category: 'wellness'
      },
      {
        id: 'notifications',
        title: 'Smart Notifications',
        description: 'Get reminders for appointments and wellness tips',
        status: 'planned',
        timeline: 'Q2 2024',
        icon: Bell,
        category: 'notifications'
      },
      {
        id: 'photo-reviews',
        title: 'Photo Reviews',
        description: 'Share photos in your session reviews',
        status: 'planned',
        timeline: 'Q2 2024',
        icon: Camera,
        category: 'reviews'
      },
      {
        id: 'wellness-tracking',
        title: 'Wellness Tracking',
        description: 'Track your health and wellness journey',
        status: 'planned',
        timeline: 'Q3 2024',
        icon: Zap,
        category: 'wellness'
      }
    ];

    // Add role-specific features
    if (userRole === 'client') {
      return baseFeatures;
    }

    // Add practitioner-specific features
    const practitionerFeatures: RoadmapFeature[] = [
      {
        id: 'advanced-analytics',
        title: 'Advanced Analytics',
        description: 'Detailed insights into your practice performance',
        status: 'in-progress',
        timeline: 'Q1 2024',
        icon: FileText,
        progress: 75,
        category: 'advanced'
      },
      {
        id: 'client-management',
        title: 'Advanced Client Management',
        description: 'Comprehensive client relationship management tools',
        status: 'planned',
        timeline: 'Q2 2024',
        icon: Heart,
        category: 'wellness'
      }
    ];

    return [...baseFeatures, ...practitionerFeatures];
  };

  const features = getRoleSpecificFeatures();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'planned':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'coming-soon':
        return <Circle className="h-4 w-4 text-purple-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-orange-100 text-orange-800';
      case 'coming-soon':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Available Now';
      case 'in-progress':
        return 'In Development';
      case 'planned':
        return 'Planned';
      case 'coming-soon':
        return 'Coming Soon';
      default:
        return 'Unknown';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return <MessageSquare className="h-4 w-4" />;
      case 'reviews':
        return <Star className="h-4 w-4" />;
      case 'wellness':
        return <Heart className="h-4 w-4" />;
      case 'notifications':
        return <Bell className="h-4 w-4" />;
      case 'advanced':
        return <Zap className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'communication':
        return 'bg-blue-50 text-blue-700';
      case 'reviews':
        return 'bg-yellow-50 text-yellow-700';
      case 'wellness':
        return 'bg-pink-50 text-pink-700';
      case 'notifications':
        return 'bg-green-50 text-green-700';
      case 'advanced':
        return 'bg-purple-50 text-purple-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, RoadmapFeature[]>);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Feature Roadmap
        </CardTitle>
        <CardDescription>
          Upcoming features and improvements for {userRole === 'client' ? 'clients' : 'practitioners'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-full ${getCategoryColor(category)}`}>
                  {getCategoryIcon(category)}
                </div>
                <h3 className="font-medium capitalize">{category} Features</h3>
              </div>
              
              <div className="space-y-3">
                {categoryFeatures.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{feature.title}</h4>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(feature.status)}`}
                          >
                            {getStatusIcon(feature.status)}
                            <span className="ml-1">{getStatusText(feature.status)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {feature.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {feature.timeline}
                          </span>
                          {feature.progress !== undefined && (
                            <div className="flex items-center gap-2">
                              <span>Progress:</span>
                              <div className="w-20">
                                <Progress value={feature.progress} className="h-1" />
                              </div>
                              <span>{feature.progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {feature.status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Available</span>
                      </div>
                    )}
                    
                    {feature.status === 'in-progress' && (
                      <div className="flex items-center gap-1 text-blue-600 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Building</span>
                      </div>
                    )}
                    
                    {(feature.status === 'planned' || feature.status === 'coming-soon') && (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <ArrowRight className="h-4 w-4" />
                        <span>Upcoming</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium">Stay Updated</span>
          </div>
          <p className="text-sm text-muted-foreground">
            We're constantly working on new features. Follow our updates to be the first to know when new features are released.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
