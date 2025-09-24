import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  User, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  Banknote
} from 'lucide-react';

interface ConnectAccount {
  id: string;
  stripe_account_id: string;
  account_status: 'pending' | 'active' | 'restricted' | 'disabled';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  business_type: string;
  company?: any;
  individual?: any;
  created_at: string;
}

const ConnectAccountSetup: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [connectAccount, setConnectAccount] = useState<ConnectAccount | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    business_type: 'individual',
    company: {
      name: '',
      tax_id: '',
      address: {
        line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'GB'
      }
    },
    individual: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: {
        line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'GB'
      },
      dob: {
        day: '',
        month: '',
        year: ''
      },
      ssn_last_4: ''
    }
  });

  useEffect(() => {
    if (user) {
      loadConnectAccount();
    }
  }, [user]);

  const loadConnectAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('connect_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading connect account:', error);
      }

      if (data) {
        setConnectAccount(data);
        setShowForm(false);
      } else {
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error loading connect account:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create Connect account
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'create-connect-account',
          business_type: formData.business_type,
          company: formData.business_type === 'company' ? formData.company : undefined,
          individual: formData.individual
        }
      });

      if (error) throw error;

      toast({
        title: "Connect Account Created",
        description: "Your Stripe Connect account has been created successfully. Please complete the verification process.",
      });

      // Reload the account
      await loadConnectAccount();

    } catch (error) {
      console.error('Error creating connect account:', error);
      toast({
        title: "Error",
        description: "Failed to create Connect account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleAddressChange = (section: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        address: {
          ...prev[section as keyof typeof prev].address,
          [field]: value
        }
      }
    }));
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      individual: {
        ...prev.individual,
        dob: {
          ...prev.individual.dob,
          [field]: value
        }
      }
    }));
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      restricted: 'bg-red-100 text-red-800',
      disabled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'restricted':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to set up your Connect account.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Stripe Connect Account Setup</h1>
        <p className="text-muted-foreground mt-2">
          Set up your account to receive payments from clients
        </p>
      </div>

      {/* Existing Account Status */}
      {connectAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>
              Your Stripe Connect account details and verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(connectAccount.account_status)}
                <div>
                  <p className="font-medium">Account Status</p>
                  <p className="text-sm text-muted-foreground">
                    {connectAccount.account_status === 'active' 
                      ? 'Your account is fully verified and ready to receive payments'
                      : 'Your account is pending verification'}
                  </p>
                </div>
              </div>
              {getStatusBadge(connectAccount.account_status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">
                  Charges: {connectAccount.charges_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                <span className="text-sm">
                  Payouts: {connectAccount.payouts_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">
                  Details: {connectAccount.details_submitted ? 'Submitted' : 'Pending'}
                </span>
              </div>
            </div>

            {connectAccount.account_status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Verification Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      To complete your account setup, you need to verify your identity and business details 
                      with Stripe. This process typically takes 1-2 business days.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setShowForm(true)}
                    >
                      Update Details
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {connectAccount.account_status === 'active' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Account Verified!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your account is fully verified and ready to receive payments. 
                      You can now start accepting payments from clients.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {connectAccount ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
              {connectAccount ? 'Update Account Details' : 'Create Connect Account'}
            </CardTitle>
            <CardDescription>
              Provide your business information to set up your Stripe Connect account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Type Selection */}
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select 
                  value={formData.business_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company Information */}
              {formData.business_type === 'company' && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium">Company Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={formData.company.name}
                        onChange={(e) => handleInputChange('company', 'name', e.target.value)}
                        placeholder="Your Company Ltd"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID (VAT Number)</Label>
                      <Input
                        id="taxId"
                        value={formData.company.tax_id}
                        onChange={(e) => handleInputChange('company', 'tax_id', e.target.value)}
                        placeholder="GB123456789"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Street Address"
                        value={formData.company.address.line1}
                        onChange={(e) => handleAddressChange('company', 'line1', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="City"
                        value={formData.company.address.city}
                        onChange={(e) => handleAddressChange('company', 'city', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="State/County"
                        value={formData.company.address.state}
                        onChange={(e) => handleAddressChange('company', 'state', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Postal Code"
                        value={formData.company.address.postal_code}
                        onChange={(e) => handleAddressChange('company', 'postal_code', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Information */}
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">Personal Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.individual.first_name}
                      onChange={(e) => handleInputChange('individual', 'first_name', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.individual.last_name}
                      onChange={(e) => handleInputChange('individual', 'last_name', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.individual.email}
                      onChange={(e) => handleInputChange('individual', 'email', e.target.value)}
                      placeholder="john.doe@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.individual.phone}
                      onChange={(e) => handleInputChange('individual', 'phone', e.target.value)}
                      placeholder="+44 20 1234 5678"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Select value={formData.individual.dob.day} onValueChange={(value) => handleDateChange('day', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={formData.individual.dob.month} onValueChange={(value) => handleDateChange('month', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={formData.individual.dob.year} onValueChange={(value) => handleDateChange('year', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Personal Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Street Address"
                      value={formData.individual.address.line1}
                      onChange={(e) => handleAddressChange('individual', 'line1', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="City"
                      value={formData.individual.address.city}
                      onChange={(e) => handleAddressChange('individual', 'city', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="State/County"
                      value={formData.individual.address.state}
                      onChange={(e) => handleAddressChange('individual', 'state', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Postal Code"
                      value={formData.individual.address.postal_code}
                      onChange={(e) => handleAddressChange('individual', 'postal_code', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssn">Last 4 digits of SSN/National ID (Optional)</Label>
                  <Input
                    id="ssn"
                    value={formData.individual.ssn_last_4}
                    onChange={(e) => handleInputChange('individual', 'ssn_last_4', e.target.value)}
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {connectAccount ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {connectAccount ? 'Update Account' : 'Create Account'}
                    </>
                  )}
                </Button>
                
                {connectAccount && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Information Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Security & Privacy</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your information is encrypted and securely transmitted to Stripe. 
                      We do not store sensitive financial information on our servers.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Learn more about setting up your Stripe Connect account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Verification Process</h4>
              <p className="text-sm text-muted-foreground">
                After submitting your information, Stripe will review and verify your account. 
                This typically takes 1-2 business days.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Required Documents</h4>
              <p className="text-sm text-muted-foreground">
                You may be asked to provide additional documents such as government-issued ID, 
                business registration, or proof of address.
              </p>
            </div>
          </div>
          
          <Button variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Stripe Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectAccountSetup;
