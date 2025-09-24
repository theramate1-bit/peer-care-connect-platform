import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, MapPin, Clock, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TherapistFavoritesService } from '@/lib/database';

interface Therapist {
  id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  bio?: string;
  specialties?: string[];
  location?: string;
  rating?: number;
  review_count?: number;
  is_favorite: boolean;
}

interface FavoriteTherapistsProps {
  className?: string;
}

export const FavoriteTherapists: React.FC<FavoriteTherapistsProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favoriteTherapists, setFavoriteTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavoriteTherapists();
    }
  }, [user]);

  const fetchFavoriteTherapists = async () => {
    try {
      setLoading(true);
      
      // Use the actual database service
      const favorites = await TherapistFavoritesService.getFavorites(user?.id || '');
      
      if (favorites.length === 0) {
        setFavoriteTherapists([]);
        return;
      }

      // Fetch therapist details for each favorite
      const therapistIds = favorites.map(fav => fav.therapist_id);
      const { data: therapists, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          user_role,
          bio,
          specialties,
          location,
          rating,
          review_count
        `)
        .in('id', therapistIds);

      if (error) throw error;

      const therapistsWithFavorites = therapists?.map(therapist => ({
        ...therapist,
        is_favorite: true
      })) || [];

      setFavoriteTherapists(therapistsWithFavorites);
    } catch (error) {
      console.error('Error fetching favorite therapists:', error);
      toast({
        title: "Error",
        description: "Failed to load favorite therapists",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (therapistId: string, isCurrentlyFavorite: boolean) => {
    try {
      if (isCurrentlyFavorite) {
        // Remove from favorites using the service
        await TherapistFavoritesService.removeFavorite(user?.id || '', therapistId);

        setFavoriteTherapists(prev => 
          prev.filter(therapist => therapist.id !== therapistId)
        );

        toast({
          title: "Removed from favorites",
          description: "Therapist removed from your favorites list"
        });
      } else {
        // Add to favorites using the service
        await TherapistFavoritesService.addFavorite(user?.id || '', therapistId);

        toast({
          title: "Added to favorites",
          description: "Therapist added to your favorites list"
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive"
      });
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'Sports Therapist';
      case 'massage_therapist':
        return 'Massage Therapist';
      case 'osteopath':
        return 'Osteopath';
      default:
        return 'Therapist';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return '🏃‍♂️';
      case 'massage_therapist':
        return '💆‍♀️';
      case 'osteopath':
        return '🦴';
      default:
        return '👨‍⚕️';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600" />
            Favorite Therapists
          </CardTitle>
          <CardDescription>Your bookmarked healthcare professionals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          Favorite Therapists
        </CardTitle>
        <CardDescription>Your bookmarked healthcare professionals</CardDescription>
      </CardHeader>
      <CardContent>
        {favoriteTherapists.length > 0 ? (
          <div className="space-y-4">
            {favoriteTherapists.map((therapist) => (
              <div key={therapist.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{getRoleIcon(therapist.user_role)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {therapist.first_name} {therapist.last_name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {getRoleDisplayName(therapist.user_role)}
                      </Badge>
                    </div>
                    {therapist.bio && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {therapist.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {therapist.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {therapist.location}
                        </div>
                      )}
                      {therapist.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {therapist.rating} ({therapist.review_count} reviews)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFavorite(therapist.id, therapist.is_favorite)}
                    className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                  >
                    <Heart className={`h-4 w-4 mr-1 ${therapist.is_favorite ? 'fill-current' : ''}`} />
                    {therapist.is_favorite ? 'Favorited' : 'Favorite'}
                  </Button>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No favorite therapists yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start exploring therapists and add them to your favorites
            </p>
            <Button>
              Browse Therapists
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
