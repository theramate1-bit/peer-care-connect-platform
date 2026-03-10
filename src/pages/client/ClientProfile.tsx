import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { User as UserIcon, Mail, Phone, MapPin, Bell, Upload, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileUploadService } from '@/lib/file-upload';

interface ClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  profile_photo_url?: string | null;
  preferences?: Record<string, unknown>;
  notification_preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    session_reminders: boolean;
    marketing_emails: boolean;
  };
}

const ClientProfile = () => {
  const { user, userProfile, updateProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    location: '',
    bio: '',
    email_notifications: true,
    sms_notifications: false,
    session_reminders: true,
    marketing_emails: false,
    profile_visible: true,
    show_contact_info: true
  });

  const editingRef = useRef(editing);
  editingRef.current = editing;

  useEffect(() => {
    if (userProfile?.id) {
      loadProfile();
    }
  }, [userProfile?.id]);

      // Real-time subscription for user profile updates
      useRealtimeSubscription(
        'users',
        `id=eq.${userProfile?.id}`,
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            if (editingRef.current) {
              toast('Profile updated elsewhere', {
                description: 'Refresh to see changes, or save your edits first.',
                action: (
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Refresh
                  </Button>
                )
              });
              if (payload.new.profile_photo_url !== undefined) {
                setProfilePhotoUrl(payload.new.profile_photo_url ?? null);
              }
              return;
            }
            const notificationPrefs = payload.new.preferences?.notification_preferences;
            if (notificationPrefs) {
              setFormData(prev => ({
                ...prev,
                email_notifications: notificationPrefs.email_notifications ?? true,
                sms_notifications: notificationPrefs.sms_notifications ?? false,
                session_reminders: notificationPrefs.session_reminders ?? true,
                marketing_emails: notificationPrefs.marketing_emails ?? false
              }));
            }
            if (payload.new.profile_photo_url !== undefined) {
              setProfilePhotoUrl(payload.new.profile_photo_url ?? null);
            }
            const prefs = payload.new.preferences;
            if (prefs && typeof prefs === 'object') {
              const pv = (prefs as Record<string, unknown>).profileVisible ?? (prefs as Record<string, unknown>).profile_visible;
              const sci = (prefs as Record<string, unknown>).showContactInfo ?? (prefs as Record<string, unknown>).show_contact_info;
              if (pv !== undefined) setFormData(prev => ({ ...prev, profile_visible: !!pv }));
              if (sci !== undefined) setFormData(prev => ({ ...prev, show_contact_info: !!sci }));
            }
          }
        }
      );

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userProfile?.id)
        .single();

      if (error) throw error;

      // Extract notification preferences from preferences JSONB column
      const notificationPrefs = data.preferences?.notification_preferences || {
        email_notifications: true,
        sms_notifications: false,
        session_reminders: true,
        marketing_emails: false
      };
      const privacyVisible = data.preferences?.profileVisible ?? data.preferences?.profile_visible ?? true;
      const privacyContact = data.preferences?.showContactInfo ?? data.preferences?.show_contact_info ?? true;

      const profileData = {
        ...data,
        notification_preferences: notificationPrefs
      };

      setProfile(profileData);
      setProfilePhotoUrl(profileData.profile_photo_url ?? null);
      setFormData({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        email_notifications: profileData.notification_preferences?.email_notifications ?? true,
        sms_notifications: profileData.notification_preferences?.sms_notifications ?? false,
        session_reminders: profileData.notification_preferences?.session_reminders ?? true,
        marketing_emails: profileData.notification_preferences?.marketing_emails ?? false,
        profile_visible: privacyVisible,
        show_contact_info: privacyContact
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate user authentication
      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in again.');
      }

      if (!userProfile?.id) {
        throw new Error('User profile not loaded. Please refresh the page.');
      }

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        location: formData.location,
        bio: formData.bio,
        preferences: {
          ...(profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {}),
          notification_preferences: {
            email_notifications: formData.email_notifications,
            sms_notifications: formData.sms_notifications,
            session_reminders: formData.session_reminders,
            marketing_emails: formData.marketing_emails
          },
          profileVisible: formData.profile_visible,
          showContactInfo: formData.show_contact_info
        },
        updated_at: new Date().toISOString()
      };

      const { error, data } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userProfile.id)
        .select();

      if (error) {
        console.error('Supabase update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      toast.success('Profile updated successfully');
      await refreshProfile();
      setEditing(false);
      await loadProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.message || error?.details || error?.hint || 'Unknown error occurred';
      toast.error(`Failed to save profile: ${errorMessage}`, {
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.trim()?.[0] || userProfile?.first_name?.[0] || '';
    const last = formData.last_name?.trim()?.[0] || userProfile?.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user?.email?.[0]?.toUpperCase() ?? '?';
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (parity with practitioner Profile)
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please select an image file (JPG, PNG, etc.)',
      });
      return;
    }

    // Validate file size (max 5MB, parity with practitioner Profile)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please select an image smaller than 5MB',
      });
      return;
    }

    const uploadWithRetry = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setUploadingPhoto(true);
          const uploadedFile = await FileUploadService.uploadFile(file, 'profile-photos', {
            maxSize: 5 * 1024 * 1024,
            compressImages: true,
            quality: 0.9
          });
          const { error } = await updateProfile({ profile_photo_url: uploadedFile.url });
          if (error) throw error;
          setProfilePhotoUrl(uploadedFile.url);
          await refreshProfile();
          toast.success('Profile photo updated');
          return;
        } catch (err: unknown) {
          if (attempt === retries) {
            const message = err instanceof Error ? err.message : 'Failed to upload photo';
            toast.error('Upload failed', {
              description: `Failed after ${retries} attempts. ${message}`,
            });
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    };

    try {
      await uploadWithRetry();
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profilePhotoUrl ?? profile?.profile_photo_url ?? userProfile?.profile_photo_url ?? undefined} />
                  <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                    id="client-profile-photo"
                    disabled={uploadingPhoto}
                  />
                  <Label
                    htmlFor="client-profile-photo"
                    className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary inline-block" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Change photo
                      </>
                    )}
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!editing}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking confirmations and updates</Label>
                  <p className="text-sm text-muted-foreground">Email for bookings and changes</p>
                </div>
                <Switch
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                  disabled={!editing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive text messages</p>
                </div>
                <Switch
                  checked={formData.sms_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, sms_notifications: checked })}
                  disabled={!editing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Reminders and alerts</Label>
                  <p className="text-sm text-muted-foreground">Session reminders before appointments</p>
                </div>
                <Switch
                  checked={formData.session_reminders}
                  onCheckedChange={(checked) => setFormData({ ...formData, session_reminders: checked })}
                  disabled={!editing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Platform updates and marketing</Label>
                  <p className="text-sm text-muted-foreground">Product news and promotional content</p>
                </div>
                <Switch
                  checked={formData.marketing_emails}
                  onCheckedChange={(checked) => setFormData({ ...formData, marketing_emails: checked })}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
              </CardTitle>
              <CardDescription>Control who can see your profile and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Profile visible to practitioners</Label>
                  <p className="text-sm text-muted-foreground">Allow practitioners you work with to see your profile</p>
                </div>
                <Switch
                  checked={formData.profile_visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, profile_visible: checked })}
                  disabled={!editing}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show contact info</Label>
                  <p className="text-sm text-muted-foreground">Let practitioners see your phone and email</p>
                </div>
                <Switch
                  checked={formData.show_contact_info}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_contact_info: checked })}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {editing ? (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditing(false);
                        loadProfile(); // Reset form data
                      }}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)} className="w-full">
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;


