import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Search, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { GeocodingService } from '@/lib/geocoding';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Dynamic import for Leaflet
let L: any = null;
let Map: any = null;
let TileLayer: any = null;
let Marker: any = null;

const loadLeaflet = async () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      L = window.L;
      Map = L.Map;
      TileLayer = L.TileLayer;
      Marker = L.Marker;
      
      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
    }
  }
};

interface LocationSetupProps {
  onComplete: (locationData: {
    address: string;
    latitude: number;
    longitude: number;
    serviceRadius: number;
  }) => void;
  initialData?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    serviceRadius?: number;
  };
}

export const LocationSetup: React.FC<LocationSetupProps> = ({ 
  onComplete, 
  initialData 
}) => {
  const { user } = useAuth();
  const [address, setAddress] = useState(initialData?.address || '');
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialData?.latitude && initialData?.longitude ? {
    latitude: initialData.latitude,
    longitude: initialData.longitude
  } : null);
  const [serviceRadius, setServiceRadius] = useState(initialData?.serviceRadius || 25);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLeaflet().then(() => {
      setMapLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current && coordinates) {
      initializeMap();
    }
  }, [mapLoaded, coordinates]);

  const initializeMap = () => {
    if (!L || !mapRef.current || !coordinates) return;

    // Clear existing map
    if (map) {
      map.remove();
      setMap(null);
      setMarker(null);
    }

    if (mapRef.current) {
      mapRef.current.innerHTML = '';
    }

    setTimeout(() => {
      if (!mapRef.current || !coordinates) return;

      const newMap = new L.Map(mapRef.current, {
        center: [coordinates.latitude, coordinates.longitude],
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(newMap);

      // Add marker
      const newMarker = L.marker([coordinates.latitude, coordinates.longitude], {
        draggable: true
      }).addTo(newMap);

      // Update coordinates when marker is dragged
      newMarker.on('dragend', (e: any) => {
        const lat = e.target.getLatLng().lat;
        const lng = e.target.getLatLng().lng;
        setCoordinates({ latitude: lat, longitude: lng });
      });

      // Update marker when map is clicked
      newMap.on('click', (e: any) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setCoordinates({ latitude: lat, longitude: lng });
        newMarker.setLatLng([lat, lng]);
      });

      setMap(newMap);
      setMarker(newMarker);
    }, 100);
  };

  const handleGeocode = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    try {
      const result = await GeocodingService.geocodeAddress(address);
      if (result) {
        setCoordinates({
          latitude: result.latitude,
          longitude: result.longitude
        });
        toast.success('Location found!');
      } else {
        toast.error('Could not find location. Please try a different address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Error finding location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      setCoordinates({ latitude: lat, longitude: lng });
      
      // Reverse geocode to get address
      const address = await GeocodingService.reverseGeocode(lat, lng);
      if (address) {
        setAddress(address);
      }
      
      toast.success('Current location detected!');
    } catch (error) {
      console.error('Geolocation error:', error);
      toast.error('Could not get your current location. Please enter your address manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!coordinates) {
      toast.error('Please set your location on the map');
      return;
    }

    if (!address.trim()) {
      toast.error('Please enter your address');
      return;
    }

    setLoading(true);
    try {
      // Save location to database
      const { error } = await supabase
        .from('users')
        .update({
          location: address,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          service_radius_km: serviceRadius,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) {
        throw error;
      }

      onComplete({
        address,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        serviceRadius
      });

      toast.success('Location saved successfully!');
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Set Your Location</h2>
        <p className="text-muted-foreground">
          Help clients find you by setting your practice location and service area
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Practice Address</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your practice address..."
                className="flex-1"
              />
              <Button
                onClick={handleGeocode}
                disabled={loading || !address.trim()}
                variant="outline"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGetCurrentLocation}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          </div>

          {coordinates && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Location Set</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="serviceRadius">Service Radius: {serviceRadius} km</Label>
            <Slider
              id="serviceRadius"
              value={[serviceRadius]}
              onValueChange={(value) => setServiceRadius(value[0])}
              max={100}
              min={5}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              This is how far you're willing to travel for appointments
            </p>
          </div>
        </CardContent>
      </Card>

      {mapLoaded && (
        <Card>
          <CardHeader>
            <CardTitle>Map Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef}
              className="w-full h-96 rounded-lg border"
              style={{ minHeight: '384px' }}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Click on the map or drag the marker to adjust your location
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleComplete}
          disabled={loading || !coordinates}
          className="px-8"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
