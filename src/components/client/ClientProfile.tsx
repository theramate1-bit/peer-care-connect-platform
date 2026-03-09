import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Target,
  Calendar,
  Save,
  CheckCircle,
  Palette,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateAvatarUrl, AVATAR_OPTIONS, type AvatarPreferences } from "@/lib/avatar-generator";

interface ClientProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  primary_goal: string;
  preferred_therapy_types: string[];
  avatar_preferences: AvatarPreferences;
}

export const ClientProfile = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [profileData, setProfileData] = useState<ClientProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    primary_goal: '',
    preferred_therapy_types: [],
    avatar_preferences: {
      hairColor: 'brown',
      clothingColor: 'blue',
      accessories: [],
      backgroundColor: 'f0f0f0',
      skinColor: 'light',
      clothing: 'shirt',
      hairStyle: 'short',
      eyes: 'default',
      eyebrows: 'default',
      mouth: 'default',
      flip: false,
      rotate: 0,
      scale: 1
    }
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
    }
  }, [user?.id]); // ✅ Use primitive ID instead of object

  // Memoize avatar preferences string to prevent infinite loops
  const avatarPrefsString = useMemo(
    () => JSON.stringify(profileData.avatar_preferences),
    [profileData.avatar_preferences]
  );

  // Debug avatar preferences changes and force re-render
  useEffect(() => {
    const avatarUrl = generateAvatarUrl(
      `${profileData.first_name}${profileData.last_name}`,
      profileData.avatar_preferences
    );
    // Force re-render by updating avatar key
    setAvatarKey(prev => prev + 1);
  }, [avatarPrefsString, profileData.first_name, profileData.last_name]); // ✅ Stable dependencies

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Get user profile data
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (userError) {
        console.error('User profile error:', userError);
        throw userError;
      }

      // Get client profile data
      const { data: clientProfile, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (clientError) {
        if (clientError.code === 'PGRST116') {
          console.warn('Client profile not found, using defaults');
        } else {
          console.error('Client profile error:', clientError);
        }
      }

      // Extract preferences from client profile
      const preferences = clientProfile?.preferences || {};
      const primaryGoal = preferences.primary_goal || '';
      const preferredTherapyTypes = preferences.preferred_therapy_types || [];

      console.log('Fetched user profile:', userProfile);
      console.log('Fetched client profile:', clientProfile);
      console.log('Extracted preferences:', preferences);
      console.log('User ID:', user?.id);
      console.log('User email:', user?.email);

      // Extract avatar preferences from user profile
      const avatarPreferences = userProfile.avatar_preferences || {
        hairColor: 'brown',
        clothingColor: 'blue',
        accessories: [],
        backgroundColor: 'f0f0f0',
        skinColor: 'light',
        clothing: 'shirt',
        hairStyle: 'short',
        eyes: 'default',
        eyebrows: 'default',
        mouth: 'default',
        flip: false,
        rotate: 0,
        scale: 1
      };

      const profileDataToSet = {
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: user?.email || '',
        phone: userProfile.phone || '',
        location: userProfile.location || '',
        primary_goal: primaryGoal,
        preferred_therapy_types: preferredTherapyTypes,
        avatar_preferences: avatarPreferences
      };

      console.log('Setting profile data:', profileDataToSet);
      setProfileData(profileDataToSet);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Saving profile data:', profileData);

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          location: profileData.location,
          avatar_preferences: profileData.avatar_preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) {
        console.error('User profile update error:', userError);
        throw userError;
      }

      // Update client_profiles table with preferences
      const { error: clientError } = await supabase
        .from('client_profiles')
        .upsert({
          user_id: user.id,
          preferences: {
            primary_goal: profileData.primary_goal,
            preferred_therapy_types: profileData.preferred_therapy_types
          }
        });

      if (clientError) {
        console.error('Client profile update error:', clientError);
        throw clientError;
      }

      toast.success('Profile updated successfully!');
      
      // Refresh the profile data after successful save
      await fetchProfileData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTherapyTypeChange = (therapyType: string, checked: boolean) => {
    if (checked) {
      setProfileData(prev => ({
        ...prev,
        preferred_therapy_types: [...prev.preferred_therapy_types, therapyType]
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        preferred_therapy_types: prev.preferred_therapy_types.filter(t => t !== therapyType)
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription>
            Update your personal information and health goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary mb-4">
              <UserIcon className="h-4 w-4" />
              <span className="font-medium">Basic Information</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profileData.email}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={profileData.location}
                  onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, State/Country"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Health Goals */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary mb-4">
              <Target className="h-4 w-4" />
              <span className="font-medium">Health Goals & Preferences</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryGoal">Primary Health Goal *</Label>
              <Select 
                value={profileData.primary_goal} 
                onValueChange={(value) => setProfileData(prev => ({ ...prev, primary_goal: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your main goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pain_relief">Pain Relief</SelectItem>
                  <SelectItem value="injury_recovery">Injury Recovery</SelectItem>
                  <SelectItem value="performance_improvement">Performance Improvement</SelectItem>
                  <SelectItem value="stress_relief">Stress Relief</SelectItem>
                  <SelectItem value="general_wellness">General Wellness</SelectItem>
                  <SelectItem value="preventive_care">Preventive Care</SelectItem>
                  <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Therapy Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Sports Therapy', value: 'sports_therapy' },
                  { label: 'Massage Therapy', value: 'massage_therapy' },
                  { label: 'Osteopathy', value: 'osteopathy' },
                  { label: 'Physiotherapy', value: 'physiotherapy' }
                ].map((therapy) => (
                  <div key={therapy.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={therapy.value}
                      checked={profileData.preferred_therapy_types.includes(therapy.value)}
                      onCheckedChange={(checked) => handleTherapyTypeChange(therapy.value, checked as boolean)}
                    />
                    <Label htmlFor={therapy.value} className="text-sm">{therapy.label}</Label>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Avatar Customization */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary mb-4">
              <Palette className="h-4 w-4" />
              <span className="font-medium">Avatar Customization</span>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Your Avatar</h4>
                  <p className="text-sm text-muted-foreground">
                    Customize how you appear to other users on the platform
                  </p>
                </div>
                <div className="relative">
                  <img
                    src={generateAvatarUrl(
                      `${profileData.first_name}${profileData.last_name}`,
                      profileData.avatar_preferences
                    )}
                    alt="Avatar Preview"
                    className="w-16 h-16 rounded-full border-2 border-primary/20"
                    key={`avatar-${avatarKey}`}
                    onError={(e) => {
                      const avatarUrl = generateAvatarUrl(
                        `${profileData.first_name}${profileData.last_name}`,
                        profileData.avatar_preferences
                      );
                      console.error('Avatar failed to load:', avatarUrl);
                      console.error('Error:', e);
                    }}
                    onLoad={() => {
                      const avatarUrl = generateAvatarUrl(
                        `${profileData.first_name}${profileData.last_name}`,
                        profileData.avatar_preferences
                      );
                      console.log('Avatar loaded successfully:', avatarUrl);
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Eye className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Hair Color */}
                <div className="space-y-2">
                  <Label htmlFor="avatarHairColor">Hair Color</Label>
                  <Select 
                    value={profileData.avatar_preferences.hairColor} 
                    onValueChange={(value) => {
                      console.log('Hair color changed to:', value);
                      setProfileData(prev => ({
                        ...prev,
                        avatar_preferences: {...prev.avatar_preferences, hairColor: value}
                      }));
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hair color" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_OPTIONS.hairColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clothing Color */}
                <div className="space-y-2">
                  <Label htmlFor="avatarClothingColor">Clothing Color</Label>
                  <Select 
                    value={profileData.avatar_preferences.clothingColor} 
                    onValueChange={(value) => {
                      console.log('Clothing color changed to:', value);
                      setProfileData(prev => ({
                        ...prev,
                        avatar_preferences: {...prev.avatar_preferences, clothingColor: value}
                      }));
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select clothing color" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_OPTIONS.clothingColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skin Color */}
                <div className="space-y-2">
                  <Label htmlFor="avatarSkinColor">Skin Tone</Label>
                  <Select 
                    value={profileData.avatar_preferences.skinColor} 
                    onValueChange={(value) => {
                      console.log('Skin color changed to:', value);
                      setProfileData(prev => ({
                        ...prev,
                        avatar_preferences: {...prev.avatar_preferences, skinColor: value}
                      }));
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skin tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_OPTIONS.skinColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Accessories */}
                <div className="space-y-2">
                  <Label htmlFor="avatarAccessories">Accessories</Label>
                  <Select 
                    value={profileData.avatar_preferences.accessories?.[0] || 'none'} 
                    onValueChange={(value) => {
                      console.log('Accessories changed to:', value);
                      setProfileData(prev => ({
                        ...prev,
                        avatar_preferences: {...prev.avatar_preferences, accessories: value === 'none' ? [] : [value]}
                      }));
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select accessories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {AVATAR_OPTIONS.accessories.map((accessory) => (
                        <SelectItem key={accessory.value} value={accessory.value}>
                          {accessory.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Your avatar updates in real-time as you make changes. 
                  This is how you'll appear to therapists and other users on the platform.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={saving || !profileData.first_name || !profileData.last_name || !profileData.primary_goal}
              className="min-w-32"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};