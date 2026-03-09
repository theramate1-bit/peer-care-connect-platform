import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import CookieConsent from '@/components/analytics/CookieConsent';

export const SettingsProfile: React.FC = () => {
  const { userProfile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: userProfile?.first_name || '',
    last_name: userProfile?.last_name || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    location: userProfile?.location || '',
    bio: userProfile?.bio || '',
    registration_number: userProfile?.registration_number || '',
    professional_body: userProfile?.professional_body || '',
    specializations: (userProfile?.specializations as any) || [],
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: userProfile?.first_name || '',
      last_name: userProfile?.last_name || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      location: userProfile?.location || '',
      bio: userProfile?.bio || '',
      registration_number: userProfile?.registration_number || '',
      professional_body: userProfile?.professional_body || '',
      specializations: (userProfile?.specializations as any) || [],
    });
    setIsEditing(false);
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify({
    first_name: userProfile?.first_name || '',
    last_name: userProfile?.last_name || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    location: userProfile?.location || '',
    bio: userProfile?.bio || '',
    registration_number: userProfile?.registration_number || '',
    professional_body: userProfile?.professional_body || '',
    specializations: (userProfile?.specializations as any) || [],
  });

  return (
    <div className="space-y-6">
      {/* Allow users to revisit cookie preferences */}
      <div className="hidden">
        <CookieConsent />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Profile Information</h2>
        <p className="text-muted-foreground text-sm">
          Update your personal information and profile details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            This information will be visible to other users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="text-lg">
                {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!isEditing}
                rows={4}
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Registration Number */}
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                value={formData.registration_number}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            {/* Professional Body */}
            <div className="space-y-2">
              <Label>Professional Body</Label>
              <Select
                value={formData.professional_body || ''}
                onValueChange={(val) => setFormData(prev => ({ ...prev, professional_body: val }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your professional body" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASRaT">BASRaT</SelectItem>
                  <SelectItem value="FHT">FHT</SelectItem>
                  <SelectItem value="SST">SST</SelectItem>
                  <SelectItem value="GOsC">GOsC</SelectItem>
                  <SelectItem value="CNHC">CNHC</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specializations (comma-separated tags) */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="specializations">Specializations</Label>
              <Input
                id="specializations"
                placeholder="e.g. Sports Injury, Rehabilitation, Strength Training"
                value={(formData.specializations || []).join(', ')}
                onChange={(e) => {
                  const vals = e.target.value
                    .split(',')
                    .map(v => v.trim())
                    .filter(Boolean);
                  setFormData(prev => ({ ...prev, specializations: vals }));
                }}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



