import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info, TrendingUp, Users, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PractitionerProduct {
  id: string;
  name: string;
  description?: string;
  price_amount: number;
  duration_minutes?: number;
  recommendation_reason?: string;
  pricing_rationale?: string;
  popularity_score?: number;
  recommended_for?: string[];
}

interface ServiceRecommendationCardProps {
  service: PractitionerProduct;
  isRecommended?: boolean;
  allServices?: PractitionerProduct[];
  className?: string;
  onClick?: () => void;
}

export const ServiceRecommendationCard: React.FC<ServiceRecommendationCardProps> = ({
  service,
  isRecommended = false,
  allServices = [],
  className,
  onClick
}) => {
  const [expanded, setExpanded] = useState(false);

  const pricePerMinute = service.duration_minutes
    ? (service.price_amount / 100) / service.duration_minutes
    : 0;

  const getRecommendationBadge = () => {
    if (isRecommended) {
      return (
        <Badge variant="default" className="bg-primary text-primary-foreground">
          <Star className="h-3 w-3 mr-1" />
          Recommended
        </Badge>
      );
    }
    if (service.popularity_score && service.popularity_score > 20) {
      return (
        <Badge variant="secondary">
          <TrendingUp className="h-3 w-3 mr-1" />
          Popular
        </Badge>
      );
    }
    return null;
  };

  const getComparisonMetrics = () => {
    if (allServices.length <= 1) return null;

    const sortedByPrice = [...allServices].sort((a, b) => a.price_amount - b.price_amount);
    const sortedByDuration = [...allServices].sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    const sortedByValue = [...allServices].sort((a, b) => {
      const aValue = a.duration_minutes ? (a.price_amount / 100) / a.duration_minutes : 0;
      const bValue = b.duration_minutes ? (b.price_amount / 100) / b.duration_minutes : 0;
      return aValue - bValue;
    });

    const priceRank = sortedByPrice.findIndex(s => s.id === service.id) + 1;
    const durationRank = sortedByDuration.findIndex(s => s.id === service.id) + 1;
    const valueRank = sortedByValue.findIndex(s => s.id === service.id) + 1;

    return { priceRank, durationRank, valueRank, total: allServices.length };
  };

  const metrics = getComparisonMetrics();

  return (
    <Card 
      className={cn(
        "transition-[border-color,background-color] duration-200 ease-out", 
        isRecommended && "border-primary border-2",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{service.name}</CardTitle>
              {getRecommendationBadge()}
            </div>
            {service.description && (
              <CardDescription className="text-xs mt-1">
                {service.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Service Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {service.duration_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{service.duration_minutes}m</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-primary">
              £{(service.price_amount / 100).toFixed(2)}
            </span>
          </div>
          {pricePerMinute > 0 && (
            <div className="text-xs">
              £{pricePerMinute.toFixed(2)}/min
            </div>
          )}
        </div>

        {/* Recommended For */}
        {service.recommended_for && service.recommended_for.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {service.recommended_for.map((useCase, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {useCase}
              </Badge>
            ))}
          </div>
        )}

        {/* Comparison Metrics */}
        {metrics && (
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2 border-t">
            <div className="text-center">
              <div className="font-medium">Price</div>
              <div className="text-primary">
                {metrics.priceRank === 1 ? 'Lowest' : `#${metrics.priceRank}`}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Duration</div>
              <div className="text-primary">
                {metrics.durationRank === 1 ? 'Shortest' : `#${metrics.durationRank}`}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Value</div>
              <div className="text-primary">
                {metrics.valueRank === 1 ? 'Best' : `#${metrics.valueRank}`}
              </div>
            </div>
          </div>
        )}

        {/* Why This Service? Expandable Section */}
        {(service.recommendation_reason || service.pricing_rationale || isRecommended) && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between text-xs h-auto py-2"
            >
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Why this service?
              </span>
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {expanded && (
              <div className="mt-2 space-y-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                {isRecommended && (
                  <div className="flex items-start gap-2">
                    <Star className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Recommended:</strong> This service is our top recommendation based on popularity and value.
                    </div>
                  </div>
                )}

                {service.recommendation_reason && (
                  <div className="flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Why recommended:</strong> {service.recommendation_reason}
                    </div>
                  </div>
                )}

                {service.pricing_rationale && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Pricing:</strong> {service.pricing_rationale}
                    </div>
                  </div>
                )}

                {service.popularity_score && service.popularity_score > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Popularity:</strong> This is one of the most popular services, chosen by many clients.
                    </div>
                  </div>
                )}

                {metrics && metrics.valueRank === 1 && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Best Value:</strong> This service offers the best price per minute compared to other options.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

