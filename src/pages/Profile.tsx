import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { User, MapPin, Phone, Mail, Shield, Upload, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTherapistProfile } from "@/hooks/useTherapistProfile";
import { toast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadService } from "@/lib/file-upload";

const Profile = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const { therapistProfile, updateTherapistProfile, loading: therapistLoading } = useTherapistProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  // Form data for personal information
  const [personalData, setPersonalData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  // Form data for professional information (therapists only)
  const [professionalData, setProfessionalData] = useState({
    bio: "",
    location: "",
    experience_years: 0,
    specializations: [] as string[],
    qualifications: [] as string[],
    hourly_rate: 0,
    professional_body: "",
    registration_number: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    calendarReminders: true,
    marketingEmails: false,
    profileVisible: true,
    showContactInfo: false,
    autoAcceptBookings: false
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (userProfile) {
      setPersonalData({
        first_name: userProfile.first_name || "",
        last_name: userProfile.last_name || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
      });

      // Initialize profile photo URL
      setProfilePhotoUrl(userProfile.profile_photo_url || '');

      // Initialize preferences from user profile
      if (userProfile.preferences) {
        setPreferences({
          emailNotifications: userProfile.preferences.emailNotifications ?? true,
          smsNotifications: userProfile.preferences.smsNotifications ?? false,
          calendarReminders: userProfile.preferences.calendarReminders ?? true,
          marketingEmails: userProfile.preferences.marketingEmails ?? false,
          profileVisible: userProfile.preferences.profileVisible ?? true,
          showContactInfo: userProfile.preferences.showContactInfo ?? false,
          autoAcceptBookings: userProfile.preferences.autoAcceptBookings ?? false
        });
      }
    }
  }, [userProfile]);

  // Real-time subscription for user profile updates
  useRealtimeSubscription(
    'users',
    `id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Real-time profile update:', payload);
      if (payload.eventType === 'UPDATE') {
        // Update preferences if they exist
        if (payload.new.preferences) {
          setPreferences({
            emailNotifications: payload.new.preferences.emailNotifications ?? true,
            smsNotifications: payload.new.preferences.smsNotifications ?? false,
            calendarReminders: payload.new.preferences.calendarReminders ?? true,
            marketingEmails: payload.new.preferences.marketingEmails ?? false,
            profileVisible: payload.new.preferences.profileVisible ?? true,
            showContactInfo: payload.new.preferences.showContactInfo ?? false,
            autoAcceptBookings: payload.new.preferences.autoAcceptBookings ?? false
          });
        }
        
        // Update profile photo if it exists
        if (payload.new.profile_photo_url) {
          setProfilePhotoUrl(payload.new.profile_photo_url);
        }
      }
    }
  );

  useEffect(() => {
    if (therapistProfile) {
      setProfessionalData({
        bio: therapistProfile.bio || "",
        location: therapistProfile.location || "",
        experience_years: therapistProfile.experience_years || 0,
        specializations: therapistProfile.specializations || [],
        qualifications: therapistProfile.qualifications || [],
        hourly_rate: therapistProfile.hourly_rate || 0,
        professional_body: therapistProfile.professional_body || "",
        registration_number: therapistProfile.registration_number || "",
      });
    }
  }, [therapistProfile]);

  const specializationOptions = {
    sports_therapist: [
      { label: 'Sports Injury', value: 'sports_injury' },
      { label: 'Rehabilitation', value: 'rehabilitation' },
      { label: 'Strength Training', value: 'strength_training' },
      { label: 'Injury Prevention', value: 'injury_prevention' }
    ],
    massage_therapist: [
      { label: 'Sports Massage', value: 'sports_massage' },
      { label: 'Massage Therapy', value: 'massage_therapy' },
      { label: 'Rehabilitation', value: 'rehabilitation' }
    ],
    osteopath: [
      { label: 'Osteopathy', value: 'osteopathy' },
      { label: 'Rehabilitation', value: 'rehabilitation' },
      { label: 'Sports Injury', value: 'sports_injury' }
    ],
    client: []
  };

  const getAvailableSpecializations = () => {
    return specializationOptions[userProfile?.user_role as keyof typeof specializationOptions] || [];
  };

  const handleSavePersonal = async () => {
    setLoading(true);
    try {
      const { error } = await updateProfile(personalData);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Personal information updated successfully",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update personal information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfessional = async () => {
    setLoading(true);
    try {
      const { error } = await updateTherapistProfile(professionalData);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Professional information updated successfully",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update professional information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      // Save preferences to user profile
      const { error } = await updateProfile({
        preferences: preferences
      });
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionPercentage = () => {
    let completed = 0;
    let total = 4; // Basic fields: name, email, phone, location

    if (personalData.first_name) completed++;
    if (personalData.last_name) completed++;
    if (personalData.email) completed++;
    if (personalData.phone) completed++;

    if (userProfile?.user_role !== 'client') {
      total += 8; // Add professional fields
      if (professionalData.bio) completed++;
      if (professionalData.location) completed++;
      if (professionalData.experience_years > 0) completed++;
      if (professionalData.specializations.length > 0) completed++;
      if (professionalData.hourly_rate > 0) completed++;
      if (professionalData.registration_number) completed++;
      if (professionalData.professional_body) completed++;
      if (professionalData.qualifications.length > 0) completed++;
    }

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  const getUserTypeLabel = () => {
    switch (userProfile?.user_role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      case 'client': return 'Client';
      default: return 'User';
    }
  };

  const getInitials = () => {
    return `${personalData.first_name.charAt(0)}${personalData.last_name.charAt(0)}`.toUpperCase();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Upload file to Supabase Storage
      const uploadedFile = await FileUploadService.uploadFile(file, 'profile-photos', {
        maxSize: 5 * 1024 * 1024, // 5MB
        compressImages: true,
        quality: 0.9
      });

      // Update user profile with new photo URL
      const { error } = await updateProfile({
        profile_photo_url: uploadedFile.url
      });

      if (error) throw error;

      setProfilePhotoUrl(uploadedFile.url);
      
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully",
      });

    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  if (therapistLoading && userProfile?.user_role !== 'client') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Profile Management"
        description="Manage your professional profile and preferences"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile" }
        ]}
        backTo="/dashboard"
        actions={
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        }
      />

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={profilePhotoUrl || userProfile?.profile_photo_url} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingPhoto}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mb-4"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">{personalData.first_name} {personalData.last_name}</h3>
                    <p className="text-sm text-muted-foreground">{getUserTypeLabel()}</p>
                    {userProfile?.user_role !== 'client' && professionalData.registration_number && (
                      <div className="flex items-center justify-center space-x-1">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Verified License</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Profile Completion</span>
                    <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionPercentage < 100 ? "Complete your profile to get more bookings" : "Profile complete!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                {userProfile?.user_role !== 'client' && (
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                )}
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              {/* Personal Information */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Your basic contact information and personal details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={personalData.first_name}
                          disabled={!isEditing}
                          onChange={(e) => setPersonalData({...personalData, first_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={personalData.last_name}
                          disabled={!isEditing}
                          onChange={(e) => setPersonalData({...personalData, last_name: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-10"
                          value={personalData.email}
                          disabled={!isEditing}
                          onChange={(e) => setPersonalData({...personalData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          className="pl-10"
                          value={personalData.phone}
                          disabled={!isEditing}
                          onChange={(e) => setPersonalData({...personalData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    {isEditing && (
                      <Button onClick={handleSavePersonal} disabled={loading}>
                        <Check className="h-4 w-4 mr-2" />
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Professional Information (Only for non-clients) */}
              {userProfile?.user_role !== 'client' && (
                <TabsContent value="professional">
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Information</CardTitle>
                      <CardDescription>
                        Your credentials, specialties, and service details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio</Label>
                        <Textarea
                          id="bio"
                          value={professionalData.bio}
                          disabled={!isEditing}
                          onChange={(e) => setProfessionalData({...professionalData, bio: e.target.value})}
                          rows={4}
                          placeholder="Describe your professional background and approach..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="location"
                              className="pl-10"
                              value={professionalData.location}
                              disabled={!isEditing}
                              onChange={(e) => setProfessionalData({...professionalData, location: e.target.value})}
                              placeholder="City, State/Country"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="experience">Years of Experience</Label>
                          <Input
                            id="experience"
                            type="number"
                            value={professionalData.experience_years}
                            disabled={!isEditing}
                            onChange={(e) => setProfessionalData({...professionalData, experience_years: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="hourlyRate">Hourly Rate (£)</Label>
                          <Input
                            id="hourlyRate"
                            type="number"
                            value={professionalData.hourly_rate}
                            disabled={!isEditing}
                            onChange={(e) => setProfessionalData({...professionalData, hourly_rate: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registrationNumber">Registration Number</Label>
                          <Input
                            id="registrationNumber"
                            value={professionalData.registration_number}
                            disabled={!isEditing}
                            onChange={(e) => setProfessionalData({...professionalData, registration_number: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="professionalBody">Professional Body</Label>
                        <Select 
                          value={professionalData.professional_body} 
                          onValueChange={(value) => setProfessionalData({...professionalData, professional_body: value})}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your professional body" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="society_of_sports_therapists">Society of Sports Therapists</SelectItem>
                            <SelectItem value="british_association_of_sports_therapists">British Association of Sports Therapists</SelectItem>
                            <SelectItem value="chartered_society_of_physiotherapy">Chartered Society of Physiotherapy</SelectItem>
                            <SelectItem value="british_osteopathic_association">British Osteopathic Association</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Specializations</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {getAvailableSpecializations().map((spec) => (
                            <div key={spec.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={spec.value}
                                checked={professionalData.specializations.includes(spec.value)}
                                disabled={!isEditing}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setProfessionalData({
                                      ...professionalData,
                                      specializations: [...professionalData.specializations, spec.value]
                                    });
                                  } else {
                                    setProfessionalData({
                                      ...professionalData,
                                      specializations: professionalData.specializations.filter(s => s !== spec.value)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={spec.value} className="text-sm">{spec.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qualifications">Qualifications</Label>
                        <Textarea
                          id="qualifications"
                          value={professionalData.qualifications.join(', ')}
                          disabled={!isEditing}
                          onChange={(e) => setProfessionalData({
                            ...professionalData, 
                            qualifications: e.target.value.split(',').map(q => q.trim()).filter(q => q)
                          })}
                          rows={3}
                          placeholder="List your qualifications separated by commas (e.g., BSc Sports Therapy, Level 3 Massage)"
                        />
                        <p className="text-xs text-muted-foreground">
                          Separate multiple qualifications with commas
                        </p>
                      </div>
                      
                      {isEditing && (
                        <Button onClick={handleSaveProfessional} disabled={loading}>
                          <Check className="h-4 w-4 mr-2" />
                          {loading ? "Saving..." : "Save Changes"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Preferences */}
              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Account Preferences
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Manage your notification settings and privacy preferences. Changes are saved automatically and sync in real-time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Notifications</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive booking confirmations and updates</p>
                          </div>
                          <Switch
                            checked={preferences.emailNotifications}
                            onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>SMS Notifications</Label>
                            <p className="text-sm text-muted-foreground">Get text message reminders</p>
                          </div>
                          <Switch
                            checked={preferences.smsNotifications}
                            onCheckedChange={(checked) => setPreferences({...preferences, smsNotifications: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Calendar Reminders</Label>
                            <p className="text-sm text-muted-foreground">Internal calendar reminders</p>
                          </div>
                          <Switch
                            checked={preferences.calendarReminders}
                            onCheckedChange={(checked) => setPreferences({...preferences, calendarReminders: checked})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Privacy Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Profile Visibility</Label>
                            <p className="text-sm text-muted-foreground">Show your profile to other users</p>
                          </div>
                          <Switch
                            checked={preferences.profileVisible}
                            onCheckedChange={(checked) => setPreferences({...preferences, profileVisible: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Contact Information</Label>
                            <p className="text-sm text-muted-foreground">Display phone number on your profile</p>
                          </div>
                          <Switch
                            checked={preferences.showContactInfo}
                            onCheckedChange={(checked) => setPreferences({...preferences, showContactInfo: checked})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button onClick={handleSavePreferences} disabled={loading}>
                        <Check className="h-4 w-4 mr-2" />
                        {loading ? "Saving..." : "Save Preferences"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;