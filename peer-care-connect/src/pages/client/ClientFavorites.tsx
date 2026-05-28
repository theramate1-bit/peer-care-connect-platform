import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { Heart, Star, MapPin, Clock, Calendar, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface FavoritePractitioner {
  id: string;
  therapist_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  location: string;
  hourly_rate: number;
  average_rating?: number;
  user_role: string;
  specialties?: string[];
}

const ClientFavorites = () => {
  const { userProfile } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePractitioner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      fetchFavorites();
    }
  }, [userProfile]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      
      // Fetch favorites first
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('client_favorites')
        .select('id, therapist_id')
        .eq('client_id', userProfile.id);

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setFavorites([]);
        return;
      }

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      // Get therapist IDs
      const therapistIds = favoritesData.map(fav => fav.therapist_id);

      // Fetch therapist details separately
      const { data: therapistsData, error: therapistsError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          bio,
          location,
          hourly_rate,
          user_role,
          specialties
        `)
        .in('id', therapistIds);

      if (therapistsError) {
        console.error('Error fetching therapists:', therapistsError);
        setFavorites([]);
        return;
      }

      // Merge the data
      const formattedFavorites = favoritesData.map(fav => {
        const therapist = therapistsData.find(t => t.id === fav.therapist_id);
        return {
          id: fav.id,
          therapist_id: fav.therapist_id,
          first_name: therapist?.first_name || 'Unknown',
          last_name: therapist?.last_name || 'Practitioner',
          bio: therapist?.bio || '',
          location: therapist?.location || 'Unknown',
          hourly_rate: therapist?.hourly_rate || 0,
          user_role: therapist?.user_role || 'practitioner',
          specialties: therapist?.specialties || []
        };
      });

      setFavorites(formattedFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (therapistId: string) => {
    try {
      const { error } = await supabase
        .from('client_favorites')
        .delete()
        .eq('client_id', userProfile?.id)
        .eq('therapist_id', therapistId);

      if (error) {
        console.error('Error removing favorite:', error);
        return;
      }

      setFavorites(favorites.filter(fav => fav.therapist_id !== therapistId));
    } catch (error) {
      console.error('Error removing favorite:', error);
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
        return 'Practitioner';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Favorite Practitioners</h1>
          <p className="text-gray-600">
            Manage your saved practitioners and book sessions with them
          </p>
        </div>

        {favorites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring our marketplace to find practitioners you'd like to work with
              </p>
              <Button asChild>
                <Link to="/marketplace">Browse Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="transition-[border-color,background-color] duration-200 ease-out">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={generateAvatarUrl(
                          `${favorite.first_name}${favorite.last_name}`
                        )} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {favorite.first_name?.charAt(0)}{favorite.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight">
                        {favorite.first_name} {favorite.last_name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {getRoleDisplayName(favorite.user_role)}
                      </CardDescription>
                      {favorite.average_rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">
                            {favorite.average_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {favorite.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {favorite.bio}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {favorite.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{favorite.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">Pricing available in booking</span>
                    </div>
                  </div>

                  {favorite.specialties && favorite.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {favorite.specialties.slice(0, 3).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {favorite.specialties.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{favorite.specialties.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <Link to={`/therapist/${favorite.therapist_id}`}>
                        <UserIcon className="h-4 w-4 mr-2" />
                        View Profile
                      </Link>
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link to={`/client/booking?practitioner=${favorite.therapist_id}`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Now
                      </Link>
                    </Button>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeFavorite(favorite.therapist_id)}
                  >
                    <Heart className="h-4 w-4 mr-2 fill-current" />
                    Remove from Favorites
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientFavorites;

