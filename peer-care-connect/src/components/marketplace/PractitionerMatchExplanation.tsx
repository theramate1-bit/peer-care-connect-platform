import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info, MapPin, Star, Award, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchReason {
  type: 'experience' | 'specialization' | 'location' | 'rating' | 'popularity';
  label: string;
  value: string | number;
  description: string;
}

interface PractitionerMatchExplanationProps {
  practitioner: {
    id: string;
    first_name: string;
    last_name: string;
    experience_years?: number;
    specializations?: string[];
    location?: string;
    average_rating?: number;
    total_sessions?: number;
    distance?: number; // in km
  };
  matchScore?: number;
  matchReasons?: MatchReason[];
  className?: string;
}

export const PractitionerMatchExplanation: React.FC<PractitionerMatchExplanationProps> = ({
  practitioner,
  matchScore,
  matchReasons,
  className
}) => {
  const [expanded, setExpanded] = useState(false);

  // Generate match reasons if not provided
  const reasons: MatchReason[] = matchReasons || [
    ...(practitioner.experience_years && practitioner.experience_years >= 5
      ? [{
          type: 'experience' as const,
          label: 'Experience',
          value: `${practitioner.experience_years}+ years`,
          description: `${practitioner.experience_years}+ years of experience treating similar conditions`
        }]
      : []),
    ...(practitioner.specializations && practitioner.specializations.length > 0
      ? [{
          type: 'specialization' as const,
          label: 'Specialization',
          value: practitioner.specializations[0],
          description: `Specializes in ${practitioner.specializations[0]}`
        }]
      : []),
    ...(practitioner.distance !== undefined && practitioner.distance < 10
      ? [{
          type: 'location' as const,
          label: 'Location',
          value: `${practitioner.distance.toFixed(1)}km away`,
          description: `Within ${practitioner.distance.toFixed(1)}km of your location`
        }]
      : []),
    ...(practitioner.average_rating && practitioner.average_rating >= 4.5
      ? [{
          type: 'rating' as const,
          label: 'Rating',
          value: `${practitioner.average_rating.toFixed(1)}/5`,
          description: `Highly rated (${practitioner.average_rating.toFixed(1)}/5) by clients`
        }]
      : []),
    ...(practitioner.total_sessions && practitioner.total_sessions > 50
      ? [{
          type: 'popularity' as const,
          label: 'Popularity',
          value: `${practitioner.total_sessions}+ sessions`,
          description: `Experienced with ${practitioner.total_sessions}+ completed sessions`
        }]
      : [])
  ];

  const getIcon = (type: MatchReason['type']) => {
    switch (type) {
      case 'experience':
        return <Award className="h-4 w-4" />;
      case 'specialization':
        return <TrendingUp className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'rating':
        return <Star className="h-4 w-4" />;
      case 'popularity':
        return <Users className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (type: MatchReason['type']) => {
    switch (type) {
      case 'experience':
        return 'bg-blue-100 text-blue-800';
      case 'specialization':
        return 'bg-purple-100 text-purple-800';
      case 'location':
        return 'bg-green-100 text-green-800';
      case 'rating':
        return 'bg-yellow-100 text-yellow-800';
      case 'popularity':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (reasons.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Why this practitioner?
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {matchScore !== undefined 
                ? `${matchScore}% match based on your needs`
                : 'Recommended based on your search criteria'}
            </CardDescription>
          </div>
          {matchScore !== undefined && (
            <Badge variant="default" className="text-sm">
              {matchScore}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Match Reasons - Always Visible */}
        <div className="flex flex-wrap gap-2">
          {reasons.slice(0, 3).map((reason, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className={cn("text-xs flex items-center gap-1", getBadgeColor(reason.type))}
            >
              {getIcon(reason.type)}
              <span>{reason.label}: {reason.value}</span>
            </Badge>
          ))}
          {reasons.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{reasons.length - 3} more
            </Badge>
          )}
        </div>

        {/* Detailed Explanation - Expandable */}
        {reasons.length > 0 && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between text-xs h-auto py-2"
            >
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                See detailed match explanation
              </span>
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {expanded && (
              <div className="mt-3 space-y-2 text-xs">
                {reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-white/50"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(reason.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground mb-0.5">
                        {reason.label}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Overall Match Summary */}
                <div className="mt-3 pt-3 border-t bg-white/70 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Why this match?</strong> This practitioner was selected based on 
                    {reasons.length > 1 ? ' multiple factors including ' : ' '}
                    {reasons.map((r, i) => {
                      if (i === reasons.length - 1 && reasons.length > 1) {
                        return ` and ${r.label.toLowerCase()}`;
                      }
                      if (i === 0) {
                        return r.label.toLowerCase();
                      }
                      return `, ${r.label.toLowerCase()}`;
                    }).join('')}
                    {practitioner.first_name && practitioner.last_name && (
                      <span>. {practitioner.first_name} {practitioner.last_name} is well-suited to address your specific needs.</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

