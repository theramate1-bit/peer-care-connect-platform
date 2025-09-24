/**
 * Enhanced Practitioner Profile Manager
 * Comprehensive profile management with verification status, analytics, and optimization tips
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Shield, 
  Star, 
  Eye, 
  TrendingUp, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  MapPin,
  Award,
  MessageSquare,
  Calendar,
  DollarSign,
  Target,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface ProfileStats {
  profileViews: number;
  averageRating: number;
  responseTime: number;
  completionPercentage: number;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'not_submitted';
  lastUpdated: string;
}

interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  completed: boolean;
}

const ProfileManager: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    profileViews: 0,
    averageRating: 0,
    responseTime: 0,
    completionPercentage: 0,
    verificationStatus: 'not_submitted',
    lastUpdated: ''
  });
  const [optimizationTips, setOptimizationTips] = useState<OptimizationTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeEnabled, setExchangeEnabled] = useState<boolean>(!!userProfile?.treatment_exchange_enabled);
  const [services, setServices] = useState<Array<{ id?: string; name: string; description?: string; duration_minutes: number; price_minor: number; active: boolean }>>([]);
  const [newService, setNewService] = useState<{ name: string; description: string; duration_minutes: number; price_minor: number }>({ name: '', description: '', duration_minutes: 60, price_minor: 0 });

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch therapist profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user?.id);

      // Fetch profile views (simulated)
      const profileViews = profile?.profile_views || 0;
      const averageRating = reviews && reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Calculate completion percentage
      const completionPercentage = calculateCompletionPercentage(profile);

      // Determine verification status
      const verificationStatus = determineVerificationStatus(profile);

      setStats({
        profileViews,
        averageRating: Math.round(averageRating * 10) / 10,
        responseTime: profile?.response_time_hours || 0,
        completionPercentage,
        verificationStatus,
        lastUpdated: profile?.updated_at || ''
      });
      setExchangeEnabled(!!profile?.treatment_exchange_enabled);

      // Load services
      const { data: svc } = await supabase
        .from('practitioner_services')
        .select('*')
        .eq('practitioner_id', user?.id)
        .order('created_at', { ascending: false });
      setServices(svc || []);

      // Generate optimization tips
      generateOptimizationTips(profile, completionPercentage);

    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const toggleExchange = async (enabled: boolean) => {
    try {
      setExchangeEnabled(enabled);
      const { error } = await supabase
        .from('users')
        .update({ treatment_exchange_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', user?.id);
      if (error) throw error;
      toast.success(enabled ? 'Treatment Exchange enabled.' : 'Treatment Exchange disabled.');
    } catch (e) {
      toast.error('Failed to update Treatment Exchange setting');
      setExchangeEnabled(!enabled);
    }
  };

  const saveNewService = async () => {
    try {
      if (!newService.name || newService.price_minor < 0 || newService.duration_minutes <= 0) {
        toast.error('Please provide valid service details');
        return;
      }
      const { data, error } = await supabase
        .from('practitioner_services')
        .insert({
          practitioner_id: user?.id,
          name: newService.name,
          description: newService.description,
          duration_minutes: newService.duration_minutes,
          price_minor: newService.price_minor,
          active: true
        })
        .select()
        .single();
      if (error) throw error;
      setServices(prev => [data, ...prev]);
      setNewService({ name: '', description: '', duration_minutes: 60, price_minor: 0 });
      toast.success('Service added');
    } catch (e:any) {
      toast.error(e.message || 'Failed to add service');
    }
  };

  const updateService = async (id: string, patch: Partial<{ name: string; description: string; duration_minutes: number; price_minor: number; active: boolean }>) => {
    try {
      const { data, error } = await supabase
        .from('practitioner_services')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setServices(prev => prev.map(s => s.id === id ? data : s));
      toast.success('Service updated');
    } catch (e:any) {
      toast.error(e.message || 'Failed to update service');
    }
  };

  const calculateCompletionPercentage = (profile: any) => {
    if (!profile) return 0;
    
    const fields = [
      'bio',
      'specializations',
      'qualifications',
      'hourly_rate',
      'location',
      'professional_statement',
      'treatment_philosophy',
      'response_time_hours',
      'profile_image_url'
    ];
    
    const completedFields = fields.filter(field => profile[field] && profile[field] !== '');
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const determineVerificationStatus = (profile: any) => {
    if (!profile) return 'not_submitted';
    if (profile.verification_status === 'verified') return 'verified';
    if (profile.verification_status === 'rejected') return 'rejected';
    if (profile.professional_body && profile.registration_number) return 'pending';
    return 'not_submitted';
  };

  const generateOptimizationTips = (profile: any, completionPercentage: number) => {
    const tips: OptimizationTip[] = [];

    // Profile completion tips
    if (completionPercentage < 100) {
      tips.push({
        id: 'profile_completion',
        title: 'Complete Your Profile',
        description: `Your profile is ${completionPercentage}% complete. Add missing information to improve visibility.`,
        priority: 'high',
        action: 'Edit Profile',
        completed: false
      });
    }

    // Verification tips
    if (stats.verificationStatus === 'not_submitted') {
      tips.push({
        id: 'verification',
        title: 'Get Verified',
        description: 'Submit your professional credentials to build trust with clients.',
        priority: 'high',
        action: 'Submit Verification',
        completed: false
      });
    }

    // Response time tips
    if (stats.responseTime > 24) {
      tips.push({
        id: 'response_time',
        title: 'Improve Response Time',
        description: `Your average response time is ${stats.responseTime} hours. Aim for under 24 hours.`,
        priority: 'medium',
        action: 'Update Settings',
        completed: false
      });
    }

    // Profile views tips
    if (stats.profileViews < 10) {
      tips.push({
        id: 'profile_views',
        title: 'Increase Profile Visibility',
        description: 'Optimize your profile keywords and add more detailed descriptions.',
        priority: 'medium',
        action: 'Optimize Profile',
        completed: false
      });
    }

    // Rating tips
    if (stats.averageRating < 4.5 && stats.averageRating > 0) {
      tips.push({
        id: 'rating',
        title: 'Improve Client Ratings',
        description: `Your current rating is ${stats.averageRating}/5. Focus on client satisfaction.`,
        priority: 'medium',
        action: 'View Reviews',
        completed: false
      });
    }

    setOptimizationTips(tips);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Not Submitted</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <User className="h-6 w-6" />
            <span>Profile Management</span>
          </h2>
          <p className="text-muted-foreground">Manage your professional profile and track performance</p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to="/profiles/edit">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/profiles/view">
              <Eye className="w-4 h-4 mr-2" />
              View Public Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                <p className="text-3xl font-bold text-primary">{stats.profileViews}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <Eye className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.averageRating || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Based on reviews</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                <p className="text-3xl font-bold text-blue-600">{stats.responseTime}h</p>
                <p className="text-xs text-muted-foreground">Average response</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Completion</p>
                <p className="text-3xl font-bold text-green-600">{stats.completionPercentage}%</p>
                <Progress value={stats.completionPercentage} className="mt-2" />
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treatment Exchange Opt-in */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coins className="h-5 w-5" />
              <span>Treatment Exchange</span>
            </CardTitle>
            <CardDescription>
              Exchange sessions with other professionals using credits
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Enable Treatment Exchange</p>
              <p className="text-xs text-muted-foreground">Show the menu item and access exchange features</p>
            </div>
            <Switch checked={exchangeEnabled} onCheckedChange={toggleExchange} />
          </CardContent>
        </Card>

        {/* Services Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>My Services & Pricing</span>
            </CardTitle>
            <CardDescription>Define services clients can book with fixed pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Service Name</Label>
                <Input value={newService.name} onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={newService.duration_minutes} onChange={e => setNewService(prev => ({ ...prev, duration_minutes: parseInt(e.target.value || '0') }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={newService.description} onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div>
                <Label>Price (£)</Label>
                <Input type="number" step="0.01" value={(newService.price_minor/100).toString()} onChange={e => setNewService(prev => ({ ...prev, price_minor: Math.round(parseFloat(e.target.value || '0') * 100) }))} />
              </div>
              <div className="flex items-end">
                <Button onClick={saveNewService}>Add Service</Button>
              </div>
            </div>

            <div className="space-y-3">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services yet.</p>
              ) : (
                services.map(svc => (
                  <div key={svc.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">{svc.name} • {svc.duration_minutes}m</div>
                      <div className="text-sm text-muted-foreground">£{(svc.price_minor/100).toFixed(2)}{svc.description ? ` — ${svc.description}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={svc.active ? 'default' : 'outline'}>{svc.active ? 'Active' : 'Inactive'}</Badge>
                      <Button size="sm" variant="outline" onClick={() => updateService(svc.id as string, { active: !svc.active })}>
                        {svc.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Verification Status</span>
            </CardTitle>
            <CardDescription>
              Professional verification builds trust with clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status</span>
              {getVerificationBadge(stats.verificationStatus)}
            </div>
            
            {stats.verificationStatus === 'not_submitted' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Get Verified</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Submit your professional credentials to increase client trust and visibility.
                    </p>
                    <Button size="sm" className="mt-2">
                      Submit Verification
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {stats.verificationStatus === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Verification Pending</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your credentials are being reviewed. This usually takes 24-48 hours.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.verificationStatus === 'verified' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Verified Professional</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your credentials have been verified. This helps build trust with clients.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimization Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>Optimization Tips</span>
            </CardTitle>
            <CardDescription>
              Improve your profile performance with these recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {optimizationTips.length > 0 ? (
                optimizationTips.map((tip) => (
                  <div key={tip.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(tip.priority)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{tip.title}</h4>
                        <Badge variant="outline" className={getPriorityColor(tip.priority)}>
                          {tip.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tip.description}</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        {tip.action}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-medium text-green-900">All Set!</h3>
                  <p className="text-sm text-green-700">Your profile is optimized and performing well.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common profile management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
              <Link to="/profiles/edit">
                <Edit3 className="h-6 w-6" />
                <span>Edit Profile</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
              <Link to="/practice/appointment-scheduler">
                <Calendar className="h-6 w-6" />
                <span>Manage Schedule</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
              <Link to="/practice/billing">
                <DollarSign className="h-6 w-6" />
                <span>Billing & Payments</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
              <Link to="/messages">
                <MessageSquare className="h-6 w-6" />
                <span>Messages</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileManager;
