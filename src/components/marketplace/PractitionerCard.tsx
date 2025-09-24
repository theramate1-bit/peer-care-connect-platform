import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { Star, MapPin, Clock, Heart, Calendar, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PractitionerCardProps {
  practitioner: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    specializations: string[];
    location: string;
    hourly_rate: number;
    experience_years: number;
    bio: string;
    average_rating?: number;
    review_count?: number;
    next_available?: string;
    is_favorited?: boolean;
  };
  onViewProfile: (id: string) => void;
  onBook: (id: string) => void;
}

export const PractitionerCard = ({ practitioner, onViewProfile, onBook }: PractitionerCardProps) => {
  const [isFavorited, setIsFavorited] = useState(practitioner.is_favorited || false);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();

  const isClient = userProfile?.user_role === 'client';

  const handleFavorite = async () => {
    if (!user || !isClient) {
      toast.error("Please log in as a client to add favorites");
      return;
    }

    try {
      setLoading(true);
      
      if (isFavorited) {
        // Remove from favorites
        await supabase
          .from('client_favorites')
          .delete()
          .eq('client_id', user.id)
          .eq('therapist_id', practitioner.user_id);
        
        setIsFavorited(false);
        toast.success("Removed from favorites");
      } else {
        // Add to favorites
        await supabase
          .from('client_favorites')
          .insert({
            client_id: user.id,
            therapist_id: practitioner.user_id
          });
        
        setIsFavorited(true);
        toast.success("Added to favorites");
      }
    } catch (error) {
      toast.error("Failed to update favorites");
      console.error('Error updating favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={generateAvatarUrl(
                  `${practitioner.first_name}${practitioner.last_name}`,
                  practitioner.avatar_preferences
                )} 
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {practitioner.first_name.charAt(0)}{practitioner.last_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">
                {practitioner.first_name} {practitioner.last_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {practitioner.location}
              </CardDescription>
            </div>
          </div>
          
          {isClient && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavorite}
              disabled={loading}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <Heart 
                className={`h-4 w-4 ${
                  isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
                }`} 
              />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating */}
        {practitioner.average_rating && (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {renderStars(practitioner.average_rating)}
            </div>
            <span className="text-sm font-medium">
              {practitioner.average_rating.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({practitioner.review_count || 0} reviews)
            </span>
          </div>
        )}

        {/* Specializations */}
        <div className="flex flex-wrap gap-2">
          {practitioner.specializations?.slice(0, 3).map((spec) => (
            <Badge key={spec} variant="secondary" className="text-xs">
              {spec}
            </Badge>
          ))}
          {practitioner.specializations?.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{practitioner.specializations.length - 3} more
            </Badge>
          )}
        </div>

        {/* Bio */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {practitioner.bio}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              £{practitioner.hourly_rate}
            </div>
            <div className="text-xs text-muted-foreground">per hour</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {practitioner.experience_years}+ years
            </div>
            <div className="text-xs text-muted-foreground">experience</div>
          </div>
        </div>

        {/* Next Available */}
        {practitioner.next_available && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
            <Clock className="h-4 w-4" />
            Next available: {practitioner.next_available}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onViewProfile(practitioner.id)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          {isClient && (
            <Button 
              className="flex-1"
              onClick={() => onBook(practitioner.id)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};