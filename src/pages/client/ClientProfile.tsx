import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { User, Mail, Phone, MapPin, Heart, Target, Bell, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface ClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  health_goals: string[];
  preferred_therapy_types: string[];
  notification_preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    session_reminders: boolean;
    marketing_emails: boolean;
  };
  privacy_settings: {
    profile_visibility: 'public' | 'private';
    data_sharing: boolean;
  };
}

const ClientProfile = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    location: '',
    bio: '',
    health_goals: [] as string[],
    preferred_therapy_types: [] as string[],
    email_notifications: true,
    sms_notifications: false,
    session_reminders: true,
    marketing_emails: false,
    profile_visibility: 'public' as 'public' | 'private',
    data_sharing: false
  });

  useEffect(() => {
    if (userProfile) {
      loadProfile();
    }
  }, [userProfile]);

  // Real-time subscription for user profile updates
  useRealtimeSubscription(
    'users',
    `id=eq.${userProfile?.id}`,
    (payload) => {
      console.log('🔄 Real-time client profile update:', payload);
      if (payload.eventType === 'UPDATE') {
        // Update form data with new preferences
        if (payload.new.notification_preferences) {
          setFormData(prev => ({
            ...prev,
            email_notifications: payload.new.notification_preferences.email_notifications ?? true,
            sms_notifications: payload.new.notification_preferences.sms_notifications ?? false,
            session_reminders: payload.new.notification_preferences.session_reminders ?? true,
            marketing_emails: payload.new.notification_preferences.marketing_emails ?? false
          }));
        }
        
        if (payload.new.privacy_settings) {
          setFormData(prev => ({
            ...prev,
            profile_visibility: payload.new.privacy_settings.profile_visibility || 'public',
            data_sharing: payload.new.privacy_settings.data_sharing || false
          }));
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

      const profileData = {
        ...data,
        health_goals: data.health_goals || [],
        preferred_therapy_types: data.preferred_therapy_types || [],
        notification_preferences: data.notification_preferences || {
          email_notifications: true,
          sms_notifications: false,
          session_reminders: true,
          marketing_emails: false
        },
        privacy_settings: data.privacy_settings || {
          profile_visibility: 'public',
          data_sharing: false
        }
      };

      setProfile(profileData);
      setFormData({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        health_goals: profileData.health_goals || [],
        preferred_therapy_types: profileData.preferred_therapy_types || [],
        email_notifications: profileData.notification_preferences?.email_notifications ?? true,
        sms_notifications: profileData.notification_preferences?.sms_notifications ?? false,
        session_reminders: profileData.notification_preferences?.session_reminders ?? true,
        marketing_emails: profileData.notification_preferences?.marketing_emails ?? false,
        profile_visibility: profileData.privacy_settings?.profile_visibility || 'public',
        data_sharing: profileData.privacy_settings?.data_sharing || false
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
      
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        location: formData.location,
        bio: formData.bio,
        health_goals: formData.health_goals,
        preferred_therapy_types: formData.preferred_therapy_types,
        notification_preferences: {
          email_notifications: formData.email_notifications,
          sms_notifications: formData.sms_notifications,
          session_reminders: formData.session_reminders,
          marketing_emails: formData.marketing_emails
        },
        privacy_settings: {
          profile_visibility: formData.profile_visibility,
          data_sharing: formData.data_sharing
        }
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userProfile?.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditing(false);
      loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const therapyTypes = [
    'Sports Massage',
    'Deep Tissue Massage',
    'Swedish Massage',
    'Osteopathy',
    'Sports Therapy',
    'Manual Therapy',
    'Injury Rehabilitation',
    'Performance Training'
  ];

  const healthGoals = [
    'Pain Relief',
    'Injury Recovery',
    'Performance Enhancement',
    'Stress Relief',
    'Improved Flexibility',
    'Better Posture',
    'Sports Performance',
    'General Wellness'
  ];

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
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder="Tell us about yourself and your health goals..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Health Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Health Goals
              </CardTitle>
              <CardDescription>What are you hoping to achieve?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {healthGoals.map((goal) => (
                  <label key={goal} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.health_goals.includes(goal)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            health_goals: [...formData.health_goals, goal]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            health_goals: formData.health_goals.filter(g => g !== goal)
                          });
                        }
                      }}
                      disabled={!editing}
                      className="rounded"
                    />
                    <span className="text-sm">{goal}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preferred Therapy Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Preferred Therapy Types
              </CardTitle>
              <CardDescription>What types of therapy interest you?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {therapyTypes.map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.preferred_therapy_types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            preferred_therapy_types: [...formData.preferred_therapy_types, type]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            preferred_therapy_types: formData.preferred_therapy_types.filter(t => t !== type)
                          });
                        }
                      }}
                      disabled={!editing}
                      className="rounded"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
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
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
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
                  <Label>Session Reminders</Label>
                  <p className="text-sm text-muted-foreground">Reminders before sessions</p>
                </div>
                <Switch
                  checked={formData.session_reminders}
                  onCheckedChange={(checked) => setFormData({ ...formData, session_reminders: checked })}
                  disabled={!editing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Promotional content</p>
                </div>
                <Switch
                  checked={formData.marketing_emails}
                  onCheckedChange={(checked) => setFormData({ ...formData, marketing_emails: checked })}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Profile Visibility</Label>
                <Select
                  value={formData.profile_visibility}
                  onValueChange={(value) => setFormData({ ...formData, profile_visibility: value as 'public' | 'private' })}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-muted-foreground">Share data for research</p>
                </div>
                <Switch
                  checked={formData.data_sharing}
                  onCheckedChange={(checked) => setFormData({ ...formData, data_sharing: checked })}
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