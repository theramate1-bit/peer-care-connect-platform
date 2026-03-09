import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { Star, MapPin, Clock, Heart, Calendar, MessageCircle, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getBestLocationImageUrl } from "@/lib/location-images";
import { getPublicLocationDisplay } from "@/lib/public-practitioner-profile";

interface PractitionerCardProps {
  practitioner: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    specializations: string[];
    location: string;
    clinic_address?: string;
    address_city?: string;
    clinic_latitude?: number;
    clinic_longitude?: number;
    therapist_type?: 'clinic_based' | 'mobile' | 'hybrid' | null;
    base_address?: string;
    mobile_service_radius_km?: number;
    hourly_rate: number;
    experience_years: number;
    bio: string;
    profile_photo_url?: string | null;
    avatar_preferences?: Record<string, unknown> | null;
    average_rating?: number;
    review_count?: number;
    next_available?: string;
    is_favorited?: boolean;
    user_role?: string;
    products?: Array<{
      id: string;
      name: string;
      price_amount: number;
      duration_minutes: number;
      is_active: boolean;
    }>;
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
        className={`h-4 w-4 transition-colors ${
          i < Math.floor(rating) 
            ? 'fill-amber-500 text-amber-500' 
            : 'fill-gray-200/60 text-gray-200/60'
        }`}
      />
    ));
  };

  const locationImageUrl = getBestLocationImageUrl(
    practitioner.clinic_latitude,
    practitioner.clinic_longitude,
    practitioner.clinic_address || practitioner.location,
    600,
    240
  );

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'massage_therapist':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'osteopath':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'Practitioner';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const locationDisplay = getPublicLocationDisplay({
    therapist_type: practitioner.therapist_type ?? null,
    clinic_address: practitioner.clinic_address ?? null,
    address_city: practitioner.address_city ?? null,
    location: practitioner.location ?? null,
    base_address: practitioner.base_address ?? null,
    mobile_service_radius_km: practitioner.mobile_service_radius_km ?? null,
  });

  const minPrice = practitioner.products?.filter(p => p.is_active).length > 0
    ? Math.min(...practitioner.products.filter(p => p.is_active).map(p => p.price_amount / 100))
    : null;

  return (
    <Card 
      className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-[border-color,background-color] duration-200 ease-out"
      tabIndex={0}
    >
      {/* Location Image */}
      {locationImageUrl && (
        <div className="relative w-full h-40 overflow-hidden bg-gray-100 rounded-t-xl">
          <img
            src={locationImageUrl}
            alt={`Location: ${practitioner.clinic_address || practitioner.location}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          
          {/* Favorite Button - Top Right */}
          {isClient && (
            <button
              onClick={handleFavorite}
              disabled={loading}
              className="absolute top-2 right-2 h-8 w-8 rounded-md bg-white/90 hover:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors flex items-center justify-center"
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart 
                className={`h-4 w-4 transition-colors ${
                  isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
                }`} 
              />
            </button>
          )}
        </div>
      )}

      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border border-gray-200 flex-shrink-0">
            <AvatarImage 
              src={practitioner.profile_photo_url || generateAvatarUrl(
                `${practitioner.first_name}${practitioner.last_name}`,
                practitioner.avatar_preferences
              )} 
            />
            <AvatarFallback className="bg-gray-100 text-gray-700 font-medium text-sm">
              {practitioner.first_name?.[0] || ''}{practitioner.last_name?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-1.5">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 leading-tight mb-1">
                {practitioner.first_name || ''} {practitioner.last_name || ''}
              </CardTitle>
              
              <div className="flex items-center gap-2 flex-wrap">
                {practitioner.user_role && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(practitioner.user_role)}`}>
                    {getRoleDisplayName(practitioner.user_role)}
                  </span>
                )}
                
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {renderStars(practitioner.average_rating || 0)}
            </div>
                  {practitioner.average_rating && practitioner.average_rating > 0 ? (
                    <>
                      <span className="text-xs font-medium text-gray-900">
              {practitioner.average_rating.toFixed(1)}
            </span>
                      {practitioner.review_count && practitioner.review_count > 0 && (
                        <span className="text-xs text-gray-500">
                          ({practitioner.review_count})
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <CardDescription className="flex items-start gap-1.5 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
              <span className="line-clamp-2">
                {locationDisplay.summary || practitioner.location}
            </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Services */}
        {(practitioner.products && practitioner.products.filter(p => p.is_active).length > 0) || 
         (practitioner.specializations && practitioner.specializations.length > 0) ? (
          <div className="flex flex-wrap gap-1.5">
            {(practitioner.products?.filter(p => p.is_active) || []).length > 0 ? (
              <>
                {practitioner.products
                  .filter(p => p.is_active)
                  .slice(0, 3)
                  .map((product) => (
                    <span
                      key={product.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                    >
                      {product.name}
                      {product.duration_minutes && (
                        <span className="ml-1 text-gray-500">
                          {product.duration_minutes}min
                        </span>
                      )}
                    </span>
                  ))}
                {practitioner.products.filter(p => p.is_active).length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-500 border border-gray-200 bg-transparent">
                    +{practitioner.products.filter(p => p.is_active).length - 3}
                  </span>
                )}
              </>
            ) : (
              <>
          {practitioner.specializations?.slice(0, 3).map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                  >
              {spec}
                  </span>
          ))}
                {practitioner.specializations && practitioner.specializations.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-500 border border-gray-200 bg-transparent">
                    +{practitioner.specializations.length - 3}
                  </span>
                )}
              </>
          )}
        </div>
        ) : null}

        {/* Bio */}
        {practitioner.bio && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {practitioner.bio}
        </p>
        )}

        {/* Stats & Price Row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-900">{practitioner.experience_years} years</span>
            <span className="text-gray-500">experience</span>
          </div>
          
          {minPrice !== null && (
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                From £{minPrice.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Next Available */}
        {practitioner.next_available && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Next: {practitioner.next_available}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button 
            variant="outline" 
            className="flex-1 h-9 text-xs font-medium focus:ring-2 focus:ring-primary/20"
            onClick={() => onViewProfile(practitioner.id)}
          >
            <UserIcon className="h-3.5 w-3.5 mr-1.5" />
            Profile
          </Button>
          {isClient && (
            <Button 
              className="flex-1 h-9 text-xs font-medium focus:ring-2 focus:ring-primary/20"
              onClick={() => onBook(practitioner.id)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Book
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};