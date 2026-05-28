import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User as UserIcon, 
  Camera, 
  Star, 
  Award, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  FileText,
  Video,
  Image,
  Plus,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GeocodingService } from '@/lib/geocoding';
import { toast } from 'sonner';

interface ProfileData {
  // Basic Information
  bio: string;
  location: string;
  phone: string;
  website: string;
  linkedin: string;
  
  // Professional Details
  professional_statement: string;
  treatment_philosophy: string;
  languages: string[];
  
  // Media & Portfolio
  profile_photo_url: string;
  cover_photo_url: string;
  portfolio_photos: string[];
  video_introduction_url: string;
  
  // Credentials & Experience
  continuing_education: Array<{
    title: string;
    institution: string;
    date: string;
    hours: number;
    certificate_url?: string;
  }>;
  awards_certifications: Array<{
    title: string;
    issuing_organization: string;
    date: string;
    description: string;
  }>;
  published_works: Array<{
    title: string;
    publication: string;
    date: string;
    url?: string;
  }>;
  media_appearances: Array<{
    title: string;
    platform: string;
    date: string;
    url?: string;
  }>;
  
  // Insurance & Emergency
  insurance_info: {
    provider: string;
    policy_number: string;
    coverage_amount: string;
    expiry_date: string;
  };
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
}

const ProfileBuilder = () => {
  const { user, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    bio: '',
    location: '',
    phone: '',
    website: '',
    linkedin: '',
    professional_statement: '',
    treatment_philosophy: '',
    languages: [],
    profile_photo_url: '',
    cover_photo_url: '',
    portfolio_photos: [],
    video_introduction_url: '',
    continuing_education: [],
    awards_certifications: [],
    published_works: [],
    media_appearances: [],
    insurance_info: {
      provider: '',
      policy_number: '',
      coverage_amount: '',
      expiry_date: ''
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (user) {
      loadExistingProfile();
    }
  }, [user]);

  const loadExistingProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (data && !error) {
        setProfileData(prev => ({
          ...prev,
          bio: data.bio || '',
          location: data.location || '',
          phone: data.phone || '',
          website: data.website || '',
          linkedin: data.linkedin || '',
          professional_statement: data.professional_statement || '',
          treatment_philosophy: data.treatment_philosophy || '',
          languages: data.languages || [],
          profile_photo_url: data.profile_photo_url || '',
          cover_photo_url: data.cover_photo_url || '',
          portfolio_photos: data.portfolio_photos || [],
          video_introduction_url: data.video_introduction_url || '',
          continuing_education: data.continuing_education || [],
          awards_certifications: data.awards_certifications || [],
          published_works: data.published_works || [],
          media_appearances: data.media_appearances || [],
          insurance_info: data.insurance_info || {
            provider: '',
            policy_number: '',
            coverage_amount: '',
            expiry_date: ''
          },
          emergency_contact: data.emergency_contact || {
            name: '',
            relationship: '',
            phone: '',
            email: ''
          }
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Geocode location if present
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (profileData.location) {
        const geo = await GeocodingService.geocodeAddress(profileData.location);
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          ...profileData,
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const addArrayItem = (field: keyof ProfileData, item: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[]), item]
    }));
  };

  const removeArrayItem = (field: keyof ProfileData, index: number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: keyof ProfileData, index: number, item: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map((val, i) => i === index ? item : val)
    }));
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bio">Professional Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell clients about your background, expertise, and approach..."
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            rows={4}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="City, State/Country"
            value={profileData.location}
            onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+44 123 456 7890"
            value={profileData.phone}
            onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://yourwebsite.com"
            value={profileData.website}
            onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={profileData.linkedin}
            onChange={(e) => setProfileData(prev => ({ ...prev, linkedin: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Languages Spoken</Label>
        <div className="flex flex-wrap gap-2">
          {['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Arabic', 'Hindi'].map(lang => (
            <Badge
              key={lang}
              variant={profileData.languages.includes(lang) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                if (profileData.languages.includes(lang)) {
                  setProfileData(prev => ({
                    ...prev,
                    languages: prev.languages.filter(l => l !== lang)
                  }));
                } else {
                  setProfileData(prev => ({
                    ...prev,
                    languages: [...prev.languages, lang]
                  }));
                }
              }}
            >
              {lang}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfessionalDetails = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="professional_statement">Professional Statement</Label>
        <Textarea
          id="professional_statement"
          placeholder="A compelling statement about your professional mission and values..."
          value={profileData.professional_statement}
          onChange={(e) => setProfileData(prev => ({ ...prev, professional_statement: e.target.value }))}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="treatment_philosophy">Treatment Philosophy</Label>
        <Textarea
          id="treatment_philosophy"
          placeholder="Describe your approach to treatment and client care..."
          value={profileData.treatment_philosophy}
          onChange={(e) => setProfileData(prev => ({ ...prev, treatment_philosophy: e.target.value }))}
          rows={4}
        />
      </div>
    </div>
  );

  const renderMediaPortfolio = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label>Profile Photo</Label>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileData.profile_photo_url} />
              <AvatarFallback>
                <Camera className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Input
                placeholder="Photo URL"
                value={profileData.profile_photo_url}
                onChange={(e) => setProfileData(prev => ({ ...prev, profile_photo_url: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground">
                Upload a professional headshot (recommended: 400x400px)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Cover Photo</Label>
          <div className="space-y-2">
            <Input
              placeholder="Cover photo URL"
              value={profileData.cover_photo_url}
              onChange={(e) => setProfileData(prev => ({ ...prev, cover_photo_url: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground">
              Banner image for your profile (recommended: 1200x300px)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Video Introduction</Label>
        <Input
          placeholder="Video URL (YouTube, Vimeo, etc.)"
          value={profileData.video_introduction_url}
          onChange={(e) => setProfileData(prev => ({ ...prev, video_introduction_url: e.target.value }))}
        />
        <p className="text-sm text-muted-foreground">
          A short video introducing yourself to potential clients
        </p>
      </div>

      <div className="space-y-4">
        <Label>Portfolio Photos</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {profileData.portfolio_photos.map((photo, index) => (
            <div key={index} className="relative">
              <img
                src={photo}
                alt={`Portfolio ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => removeArrayItem('portfolio_photos', index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="h-24 w-full border-dashed"
            onClick={() => {
              const url = prompt('Enter portfolio photo URL:');
              if (url) {
                addArrayItem('portfolio_photos', url);
              }
            }}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCredentials = () => (
    <Tabs defaultValue="education" className="w-full">
      <TabsList className="w-full flex overflow-x-auto whitespace-nowrap gap-2 p-1">
        <TabsTrigger value="education" className="shrink-0">Education</TabsTrigger>
        <TabsTrigger value="awards" className="shrink-0">Awards</TabsTrigger>
        <TabsTrigger value="publications" className="shrink-0">Publications</TabsTrigger>
        <TabsTrigger value="media" className="shrink-0">Media</TabsTrigger>
      </TabsList>

      <TabsContent value="education" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Continuing Education</h3>
          <Button
            size="sm"
            onClick={() => addArrayItem('continuing_education', {
              title: '',
              institution: '',
              date: '',
              hours: 0
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        </div>
        
        {profileData.continuing_education.map((course, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Course Title"
                  value={course.title}
                  onChange={(e) => updateArrayItem('continuing_education', index, { ...course, title: e.target.value })}
                />
                <Input
                  placeholder="Institution"
                  value={course.institution}
                  onChange={(e) => updateArrayItem('continuing_education', index, { ...course, institution: e.target.value })}
                />
                <Input
                  type="date"
                  value={course.date}
                  onChange={(e) => updateArrayItem('continuing_education', index, { ...course, date: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Hours"
                  value={course.hours}
                  onChange={(e) => updateArrayItem('continuing_education', index, { ...course, hours: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => removeArrayItem('continuing_education', index)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="awards" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Awards & Certifications</h3>
          <Button
            size="sm"
            onClick={() => addArrayItem('awards_certifications', {
              title: '',
              issuing_organization: '',
              date: '',
              description: ''
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Award
          </Button>
        </div>
        
        {profileData.awards_certifications.map((award, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Award Title"
                  value={award.title}
                  onChange={(e) => updateArrayItem('awards_certifications', index, { ...award, title: e.target.value })}
                />
                <Input
                  placeholder="Issuing Organization"
                  value={award.issuing_organization}
                  onChange={(e) => updateArrayItem('awards_certifications', index, { ...award, issuing_organization: e.target.value })}
                />
                <Input
                  type="date"
                  value={award.date}
                  onChange={(e) => updateArrayItem('awards_certifications', index, { ...award, date: e.target.value })}
                />
                <Input
                  placeholder="Description"
                  value={award.description}
                  onChange={(e) => updateArrayItem('awards_certifications', index, { ...award, description: e.target.value })}
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => removeArrayItem('awards_certifications', index)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="publications" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Published Works</h3>
          <Button
            size="sm"
            onClick={() => addArrayItem('published_works', {
              title: '',
              publication: '',
              date: '',
              url: ''
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Publication
          </Button>
        </div>
        
        {profileData.published_works.map((work, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Title"
                  value={work.title}
                  onChange={(e) => updateArrayItem('published_works', index, { ...work, title: e.target.value })}
                />
                <Input
                  placeholder="Publication"
                  value={work.publication}
                  onChange={(e) => updateArrayItem('published_works', index, { ...work, publication: e.target.value })}
                />
                <Input
                  type="date"
                  value={work.date}
                  onChange={(e) => updateArrayItem('published_works', index, { ...work, date: e.target.value })}
                />
                <Input
                  type="url"
                  placeholder="URL (optional)"
                  value={work.url}
                  onChange={(e) => updateArrayItem('published_works', index, { ...work, url: e.target.value })}
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => removeArrayItem('published_works', index)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="media" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Media Appearances</h3>
          <Button
            size="sm"
            onClick={() => addArrayItem('media_appearances', {
              title: '',
              platform: '',
              date: '',
              url: ''
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Appearance
          </Button>
        </div>
        
        {profileData.media_appearances.map((appearance, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Title"
                  value={appearance.title}
                  onChange={(e) => updateArrayItem('media_appearances', index, { ...appearance, title: e.target.value })}
                />
                <Input
                  placeholder="Platform"
                  value={appearance.platform}
                  onChange={(e) => updateArrayItem('media_appearances', index, { ...appearance, platform: e.target.value })}
                />
                <Input
                  type="date"
                  value={appearance.date}
                  onChange={(e) => updateArrayItem('media_appearances', index, { ...appearance, date: e.target.value })}
                />
                <Input
                  type="url"
                  placeholder="URL (optional)"
                  value={appearance.url}
                  onChange={(e) => updateArrayItem('media_appearances', index, { ...appearance, url: e.target.value })}
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => removeArrayItem('media_appearances', index)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );

  const renderInsuranceEmergency = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Insurance Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="insurance_provider">Insurance Provider</Label>
            <Input
              id="insurance_provider"
              placeholder="Provider Name"
              value={profileData.insurance_info.provider}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                insurance_info: { ...prev.insurance_info, provider: e.target.value }
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="policy_number">Policy Number</Label>
            <Input
              id="policy_number"
              placeholder="Policy Number"
              value={profileData.insurance_info.policy_number}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                insurance_info: { ...prev.insurance_info, policy_number: e.target.value }
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="coverage_amount">Coverage Amount</Label>
            <Input
              id="coverage_amount"
              placeholder="e.g., £1,000,000"
              value={profileData.insurance_info.coverage_amount}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                insurance_info: { ...prev.insurance_info, coverage_amount: e.target.value }
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={profileData.insurance_info.expiry_date}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                insurance_info: { ...prev.insurance_info, expiry_date: e.target.value }
              }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_name">Contact Name</Label>
            <Input
              id="emergency_name"
              placeholder="Full Name"
              value={profileData.emergency_contact.name}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                emergency_contact: { ...prev.emergency_contact, name: e.target.value }
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergency_relationship">Relationship</Label>
            <Input
              id="emergency_relationship"
              placeholder="e.g., Spouse, Parent"
              value={profileData.emergency_contact.relationship}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                emergency_contact: { ...prev.emergency_contact, relationship: e.target.value }
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergency_phone">Phone Number</Label>
            <Input
              id="emergency_phone"
              type="tel"
              placeholder="+44 123 456 7890"
              value={profileData.emergency_contact.phone}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                emergency_contact: { ...prev.emergency_contact, phone: e.target.value }
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergency_email">Email</Label>
            <Input
              id="emergency_email"
              type="email"
              placeholder="contact@example.com"
              value={profileData.emergency_contact.email}
              onChange={(e) => setProfileData(prev => ({
                ...prev,
                emergency_contact: { ...prev.emergency_contact, email: e.target.value }
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-2xl font-bold">Profile Complete!</h3>
        <p className="text-muted-foreground">
          Review your profile information before saving. You can always edit this later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bio:</span>
              <span className="font-medium">{profileData.bio ? '✓' : '✗'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">{profileData.location ? '✓' : '✗'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{profileData.phone ? '✓' : '✗'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Languages:</span>
              <span className="font-medium">{profileData.languages.length > 0 ? '✓' : '✗'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Professional Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Professional Statement:</span>
              <span className="font-medium">{profileData.professional_statement ? '✓' : '✗'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Treatment Philosophy:</span>
              <span className="font-medium">{profileData.treatment_philosophy ? '✓' : '✗'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profile Photo:</span>
              <span className="font-medium">{profileData.profile_photo_url ? '✓' : '✗'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Portfolio Photos:</span>
              <span className="font-medium">{profileData.portfolio_photos.length > 0 ? '✓' : '✗'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button size="lg" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderProfessionalDetails();
      case 3:
        return renderMediaPortfolio();
      case 4:
        return renderCredentials();
      case 5:
        return renderInsuranceEmergency();
      case 6:
        return renderReview();
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Basic Information';
      case 2:
        return 'Professional Details';
      case 3:
        return 'Media & Portfolio';
      case 4:
        return 'Credentials & Experience';
      case 5:
        return 'Insurance & Emergency';
      case 6:
        return 'Review & Save';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return 'Tell clients about your background and contact information';
      case 2:
        return 'Share your professional mission and treatment approach';
      case 3:
        return 'Add photos, videos, and portfolio items';
      case 4:
        return 'Showcase your education, awards, and publications';
      case 5:
        return 'Provide insurance details and emergency contact';
      case 6:
        return 'Review your profile and save changes';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Build Your Professional Profile</h1>
          <p className="text-muted-foreground mt-2">
            Create a comprehensive profile that builds trust with potential clients
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
                <p className="text-muted-foreground">{getStepDescription()}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Step {currentStep} of {totalSteps}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {getStepContent()}
            
            {currentStep < totalSteps && (
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  Back
                </Button>
                
                <Button onClick={handleNext}>
                  {currentStep === totalSteps - 1 ? 'Review Profile' : 'Next Step'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileBuilder;
