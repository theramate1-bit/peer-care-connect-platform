import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Clock, 
  Star, 
  Users, 
  Filter,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { LocationManager, NearbyTherapist } from '@/lib/location';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Dynamic import for Leaflet to avoid SSR issues
let L: any = null;
let Map: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;

const loadLeaflet = async () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      // Import Leaflet CSS first
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      // Import Leaflet JavaScript
      const leaflet = await import('leaflet');
      L = leaflet.default;
      Map = leaflet.Map;
      TileLayer = leaflet.TileLayer;
      Marker = leaflet.Marker;
      Popup = leaflet.Popup;
      
      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
      // Fallback: try loading from CDN
      try {
        await loadLeafletFromCDN();
      } catch (cdnError) {
        console.error('Failed to load Leaflet from CDN:', cdnError);
      }
    }
  }
  return L;
};

const loadLeafletFromCDN = async () => {
  return new Promise((resolve, reject) => {
    // Load CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Load JavaScript
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      L = (window as any).L;
      Map = L.Map;
      TileLayer = L.TileLayer;
      Marker = L.Marker;
      Popup = L.Popup;
      
      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      resolve(L);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

interface LocationSearchProps {
  onTherapistSelect?: (therapist: NearbyTherapist) => void;
  initialLocation?: { latitude: number; longitude: number };
  showMap?: boolean;
}

export const LocationSearch = ({ 
  onTherapistSelect, 
  initialLocation,
  showMap = true 
}: LocationSearchProps) => {
  const { user } = useAuth();
  const [searchLocation, setSearchLocation] = useState<{ latitude: number; longitude: number } | null>(initialLocation || null);
  const [searchAddress, setSearchAddress] = useState('');
  const [therapists, setTherapists] = useState<NearbyTherapist[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(25);
  const [sessionType, setSessionType] = useState<string>('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLocation) {
      setSearchLocation(initialLocation);
      searchTherapists(initialLocation.latitude, initialLocation.longitude);
    } else {
      // Try to get user's current location
      getCurrentLocation();
    }
  }, [initialLocation]);

  useEffect(() => {
    if (showMap && searchLocation && mapRef.current) {
      loadLeaflet().then((leaflet) => {
        if (leaflet) {
          initializeMap();
        }
      });
    }
  }, [showMap, searchLocation]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (map) {
        map.remove();
        setMap(null);
        setMarkers([]);
      }
    };
  }, []);

  // Handle map resize when container changes
  useEffect(() => {
    if (map && mapRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      });
      
      resizeObserver.observe(mapRef.current);
      
      // Also listen for window resize
      const handleWindowResize = () => {
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      };
      
      window.addEventListener('resize', handleWindowResize);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleWindowResize);
      };
    }
  }, [map]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await LocationManager.getCurrentLocation();
      if (location) {
        setSearchLocation(location);
        searchTherapists(location.latitude, location.longitude);
        toast.success('Location found!');
      } else {
        // Provide helpful guidance for blocked permissions
        toast.info('Location access is blocked. Please click the lock icon in your browser\'s address bar and allow location access, or enter your location manually.');
        // Set a default location (London, UK) as fallback
        const defaultLocation = { latitude: 51.5074, longitude: -0.1278 };
        setSearchLocation(defaultLocation);
        setSearchAddress('London, UK');
        searchTherapists(defaultLocation.latitude, defaultLocation.longitude);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      toast.error('Error getting your location. Please enter your location manually.');
      // Set a default location as fallback
      const defaultLocation = { latitude: 51.5074, longitude: -0.1278 };
      setSearchLocation(defaultLocation);
      setSearchAddress('London, UK');
      searchTherapists(defaultLocation.latitude, defaultLocation.longitude);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!L || !mapRef.current || !searchLocation) return;

    // Clear any existing map and markers
    if (map) {
      map.remove();
      setMap(null);
      setMarkers([]);
    }
    
    // Clear the map container completely
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
    }

    // Wait a bit for DOM cleanup
    setTimeout(() => {
      if (!mapRef.current || !searchLocation) return;

      const container = mapRef.current;
      
      // Force container dimensions and styling
      container.style.cssText = `
        width: 100%;
        height: 500px;
        min-height: 500px;
        max-height: 500px;
        display: block;
        position: relative;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        background-color: #f9fafb;
        overflow: hidden;
        box-sizing: border-box;
      `;

      // Ensure container is visible and has dimensions
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Map container has no dimensions, retrying...');
        setTimeout(initializeMap, 200);
        return;
      }

      const newMap = new L.Map(container, {
        center: [searchLocation.latitude, searchLocation.longitude],
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: false,
        worldCopyJump: false,
        maxBounds: null,
        tap: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        renderer: L.canvas()
      });

      // Add tile layer with better error handling
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        updateWhenZooming: false,
        keepBuffer: 2,
        maxNativeZoom: 18,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }).addTo(newMap);

      // Add user location marker
      const userMarker = L.marker([searchLocation.latitude, searchLocation.longitude], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      })
        .addTo(newMap)
        .bindPopup('<div class="p-2"><strong>Your Location</strong></div>');

      setMap(newMap);
      setMarkers([userMarker]);

      // Force map to resize and fit properly with better timing
      const resizeMap = () => {
        if (newMap && !newMap._loaded) {
          newMap.whenReady(() => {
            newMap.invalidateSize();
            newMap.fitBounds([[searchLocation.latitude - 0.1, searchLocation.longitude - 0.1], [searchLocation.latitude + 0.1, searchLocation.longitude + 0.1]], {
              padding: [20, 20]
            });
          });
        } else if (newMap) {
          newMap.invalidateSize();
          newMap.fitBounds([[searchLocation.latitude - 0.1, searchLocation.longitude - 0.1], [searchLocation.latitude + 0.1, searchLocation.longitude + 0.1]], {
            padding: [20, 20]
          });
        }
      };

      // Multiple resize attempts to ensure proper rendering
      setTimeout(resizeMap, 100);
      setTimeout(resizeMap, 300);
      setTimeout(resizeMap, 600);
      setTimeout(resizeMap, 1200);
    }, 150);
  };

  const searchTherapists = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const results = await LocationManager.findNearbyTherapists(
        lat, 
        lng, 
        radius, 
        sessionType || undefined
      );
      
      // Use real results from database
      const therapistsToShow = results;
      
      setTherapists(therapistsToShow);
      
      // Log search for analytics
      if (user?.id) {
        await LocationManager.logLocationSearch(
          user.id,
          lat,
          lng,
          radius,
          { sessionType },
          therapistsToShow.length
        );
      }

      // Update map markers
      if (map && L) {
        updateMapMarkers(therapistsToShow);
      }
    } catch (error) {
      console.error('Error searching therapists:', error);
      toast.error('Error searching for therapists');
    } finally {
      setLoading(false);
    }
  };

  const updateMapMarkers = (therapistList: NearbyTherapist[]) => {
    if (!map || !L || !searchLocation) return;

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    const newMarkers: any[] = [];

    // Add search location marker with custom icon
    const searchMarker = L.marker([searchLocation.latitude, searchLocation.longitude], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    })
      .addTo(map)
      .bindPopup('<div class="p-2"><strong>Your Location</strong></div>');
    newMarkers.push(searchMarker);

    // Add therapist markers with custom icons
    therapistList.forEach(therapist => {
      const marker = L.marker([therapist.latitude || 0, therapist.longitude || 0], {
        icon: L.divIcon({
          className: 'therapist-marker',
          html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-3 min-w-[200px]">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span class="text-green-600 font-semibold text-sm">${therapist.therapist_name.charAt(0)}</span>
              </div>
              <div>
                <h3 class="font-semibold text-sm">${therapist.therapist_name}</h3>
                <p class="text-xs text-gray-500">${therapist.distance_km.toFixed(1)}km away</p>
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-gray-600">${therapist.specializations.slice(0, 2).join(', ')}</p>
              <p class="text-xs font-medium text-green-600">$${therapist.hourly_rate}/hour</p>
              <div class="flex items-center gap-1">
                <span class="text-xs text-yellow-500">★</span>
                <span class="text-xs">${therapist.rating.toFixed(1)} (${therapist.review_count} reviews)</span>
              </div>
            </div>
          </div>
        `);
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers if there are therapists
    if (therapistList.length > 0) {
      const bounds = L.latLngBounds([
        [searchLocation.latitude, searchLocation.longitude],
        ...therapistList.map(t => [t.latitude || 0, t.longitude || 0])
      ]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestions = await LocationManager.getLocationSuggestions(query);
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error getting location suggestions:', error);
    }
  };

  const handleLocationSelect = async (suggestion: any) => {
    setSearchAddress(suggestion.display_name);
    setSearchLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude
    });
    setShowSuggestions(false);
    await searchTherapists(suggestion.latitude, suggestion.longitude);
  };

  const handleSearch = async () => {
    if (!searchLocation) {
      toast.error('Please select a location');
      return;
    }

    await searchTherapists(searchLocation.latitude, searchLocation.longitude);
  };

  const formatDistance = (distance: number) => {
    return LocationManager.formatDistance(distance);
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Find Therapists Near You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Search Location</Label>
              <div className="relative">
                <Input
                  id="address"
                  placeholder="Enter city, address, or zip code"
                  value={searchAddress}
                  onChange={(e) => {
                    setSearchAddress(e.target.value);
                    handleAddressSearch(e.target.value);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleLocationSelect(suggestion)}
                      >
                        <p className="text-sm font-medium">{suggestion.display_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={loading}
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {loading ? 'Getting Location...' : 'Use Current Location'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Search Radius</Label>
              <Select value={radius.toString()} onValueChange={(value) => setRadius(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-type">Session Type</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All session types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All session types</SelectItem>
                  <SelectItem value="massage">Massage Therapy</SelectItem>
                  <SelectItem value="sports_therapy">Sports Therapy</SelectItem>
                  <SelectItem value="osteopathy">Osteopathy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={getCurrentLocation}>
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      {showMap && (
        <Card>
          <CardHeader>
            <CardTitle>Map View</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative w-full" style={{ height: '500px' }}>
              <div 
                ref={mapRef} 
                className="w-full h-full"
                style={{
                  width: '100%',
                  height: '500px',
                  minHeight: '500px',
                  maxHeight: '500px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              />
              {!map && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Found {therapists.length} therapist{therapists.length !== 1 ? 's' : ''}
          </h3>
          {searchLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {searchAddress || `${searchLocation.latitude.toFixed(4)}, ${searchLocation.longitude.toFixed(4)}`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {therapists.map((therapist) => (
            <Card 
              key={therapist.therapist_id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onTherapistSelect?.(therapist)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      {therapist.therapist_photo_url ? (
                        <img 
                          src={therapist.therapist_photo_url} 
                          alt={therapist.therapist_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{therapist.therapist_name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={therapist.is_verified ? "default" : "secondary"}>
                          {therapist.is_verified ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {therapist.is_verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      {formatDistance(therapist.distance_km)}
                    </p>
                    <p className="text-xs text-muted-foreground">away</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {therapist.city}, {therapist.state}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{therapist.rating ? therapist.rating.toFixed(1) : 'No rating'}</span>
                    <span className="text-muted-foreground">
                      ({therapist.review_count || 0} reviews)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">${therapist.hourly_rate}/hour</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {therapist.specializations.slice(0, 3).map((spec, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {therapist.specializations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{therapist.specializations.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {therapists.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No therapists found in this area</p>
            <p className="text-sm">Try expanding your search radius or changing location</p>
          </div>
        )}
      </div>
    </div>
  );
};
