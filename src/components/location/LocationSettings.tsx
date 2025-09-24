import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle,
  AlertCircle,
  Home,
  Building,
  Globe
} from 'lucide-react';
import { LocationManager, UserLocation, LocationPreferences } from '@/lib/location';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const LocationSettings = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [preferences, setPreferences] = useState<LocationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: '',
    service_radius_km: 25
  });

  const [preferencesData, setPreferencesData] = useState({
    preferred_travel_distance_km: 25,
    preferred_cities: [] as string[],
    avoid_areas: [] as string[],
    home_visit_preferred: false,
    clinic_visit_preferred: true,
    virtual_session_preferred: false
  });

  const [newCity, setNewCity] = useState('');
  const [newAvoidArea, setNewAvoidArea] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userLocations, userPreferences] = await Promise.all([
        LocationManager.getUserLocations(user!.id),
        LocationManager.getLocationPreferences(user!.id)
      ]);

      setLocations(userLocations);
      setPreferences(userPreferences);

      if (userPreferences) {
        setPreferencesData({
          preferred_travel_distance_km: userPreferences.preferred_travel_distance_km,
          preferred_cities: userPreferences.preferred_cities,
          avoid_areas: userPreferences.avoid_areas,
          home_visit_preferred: userPreferences.home_visit_preferred,
          clinic_visit_preferred: userPreferences.clinic_visit_preferred,
          virtual_session_preferred: userPreferences.virtual_session_preferred
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Error loading location data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await LocationManager.getCurrentLocation();
      if (location) {
        // Reverse geocode to get address
        const geocodeResult = await LocationManager.geocodeAddress(
          'Current Location',
          'Unknown',
          'Unknown'
        );
        
        if (geocodeResult) {
          setFormData(prev => ({
            ...prev,
            address: geocodeResult.formatted_address,
            city: 'Current Location',
            state: '',
            country: 'United States'
          }));
        }
      } else {
        toast.error('Unable to get your current location');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      toast.error('Error getting your location');
    }
  };

  const handleAddLocation = async () => {
    if (!user?.id) return;

    try {
      // Geocode the address to get coordinates
      const geocodeResult = await LocationManager.geocodeAddress(
        formData.address,
        formData.city,
        formData.state,
        formData.country
      );

      if (!geocodeResult) {
        toast.error('Could not find coordinates for this address');
        return;
      }

      await LocationManager.setUserLocation(
        user.id,
        formData.address,
        formData.city,
        formData.state || null,
        formData.country,
        formData.postal_code || null,
        geocodeResult.latitude,
        geocodeResult.longitude,
        formData.service_radius_km,
        locations.length === 0 // First location is primary
      );

      toast.success('Location added successfully');
      setShowAddForm(false);
      setFormData({
        address: '',
        city: '',
        state: '',
        country: 'United States',
        postal_code: '',
        service_radius_km: 25
      });
      await loadUserData();
    } catch (error) {
      console.error('Error adding location:', error);
      toast.error('Error adding location');
    }
  };

  const handleUpdatePreferences = async () => {
    if (!user?.id) return;

    try {
      await LocationManager.updateLocationPreferences(user.id, preferencesData);
      toast.success('Preferences updated successfully');
      await loadUserData();
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Error updating preferences');
    }
  };

  const addPreferredCity = () => {
    if (newCity.trim() && !preferencesData.preferred_cities.includes(newCity.trim())) {
      setPreferencesData(prev => ({
        ...prev,
        preferred_cities: [...prev.preferred_cities, newCity.trim()]
      }));
      setNewCity('');
    }
  };

  const removePreferredCity = (city: string) => {
    setPreferencesData(prev => ({
      ...prev,
      preferred_cities: prev.preferred_cities.filter(c => c !== city)
    }));
  };

  const addAvoidArea = () => {
    if (newAvoidArea.trim() && !preferencesData.avoid_areas.includes(newAvoidArea.trim())) {
      setPreferencesData(prev => ({
        ...prev,
        avoid_areas: [...prev.avoid_areas, newAvoidArea.trim()]
      }));
      setNewAvoidArea('');
    }
  };

  const removeAvoidArea = (area: string) => {
    setPreferencesData(prev => ({
      ...prev,
      avoid_areas: prev.avoid_areas.filter(a => a !== area)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading location settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Locations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Your Locations
            </CardTitle>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No locations added yet</p>
              <p className="text-sm">Add your location to help others find you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {location.is_primary ? (
                        <Home className="h-5 w-5 text-primary" />
                      ) : (
                        <Building className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{location.address}</h4>
                        {location.is_primary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                        {location.is_verified && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {location.city}, {location.state} {location.postal_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Service radius: {location.service_radius_km}km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLocation(location.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!location.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* Handle delete */}}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddForm && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Add New Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="ZIP code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_radius">Service Radius (km)</Label>
                    <Input
                      id="service_radius"
                      type="number"
                      value={formData.service_radius_km}
                      onChange={(e) => setFormData(prev => ({ ...prev, service_radius_km: parseInt(e.target.value) || 25 }))}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={getCurrentLocation} variant="outline">
                    <Navigation className="h-4 w-4 mr-2" />
                    Use Current Location
                  </Button>
                  <Button onClick={handleAddLocation}>
                    Add Location
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Location Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Location Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="travel_distance">Preferred Travel Distance (km)</Label>
            <Input
              id="travel_distance"
              type="number"
              value={preferencesData.preferred_travel_distance_km}
              onChange={(e) => setPreferencesData(prev => ({ 
                ...prev, 
                preferred_travel_distance_km: parseInt(e.target.value) || 25 
              }))}
              min="1"
              max="200"
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label>Preferred Cities</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Add preferred city"
                  onKeyPress={(e) => e.key === 'Enter' && addPreferredCity()}
                />
                <Button onClick={addPreferredCity} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferencesData.preferred_cities.map((city, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {city}
                    <button
                      onClick={() => removePreferredCity(city)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Areas to Avoid</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newAvoidArea}
                  onChange={(e) => setNewAvoidArea(e.target.value)}
                  placeholder="Add area to avoid"
                  onKeyPress={(e) => e.key === 'Enter' && addAvoidArea()}
                />
                <Button onClick={addAvoidArea} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferencesData.avoid_areas.map((area, index) => (
                  <Badge key={index} variant="destructive" className="flex items-center gap-1">
                    {area}
                    <button
                      onClick={() => removeAvoidArea(area)}
                      className="ml-1 hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="home_visit">Prefer Home Visits</Label>
                <p className="text-sm text-muted-foreground">
                  I prefer therapists to come to my location
                </p>
              </div>
              <Switch
                id="home_visit"
                checked={preferencesData.home_visit_preferred}
                onCheckedChange={(checked) => setPreferencesData(prev => ({ 
                  ...prev, 
                  home_visit_preferred: checked 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="clinic_visit">Prefer Clinic Visits</Label>
                <p className="text-sm text-muted-foreground">
                  I prefer to visit therapist's clinic
                </p>
              </div>
              <Switch
                id="clinic_visit"
                checked={preferencesData.clinic_visit_preferred}
                onCheckedChange={(checked) => setPreferencesData(prev => ({ 
                  ...prev, 
                  clinic_visit_preferred: checked 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="virtual_session">Prefer Virtual Sessions</Label>
                <p className="text-sm text-muted-foreground">
                  I'm open to online/virtual therapy sessions
                </p>
              </div>
              <Switch
                id="virtual_session"
                checked={preferencesData.virtual_session_preferred}
                onCheckedChange={(checked) => setPreferencesData(prev => ({ 
                  ...prev, 
                  virtual_session_preferred: checked 
                }))}
              />
            </div>
          </div>

          <Button onClick={handleUpdatePreferences} className="w-full">
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
