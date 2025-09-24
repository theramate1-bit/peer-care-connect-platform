/**
 * Practitioner Pricing Setup Component
 * Allows practitioners to set their own pricing during onboarding and profile updates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PricingService } from '@/lib/pricing';
import { PricingUtils } from '@/types/pricing';
import { DollarSign, Clock, Percent, Shield, AlertCircle } from 'lucide-react';

interface PractitionerPricingSetupProps {
  practitionerId: string;
  userRole: string;
  onPricingUpdate?: (pricing: any) => void;
  initialPricing?: any;
  isOnboarding?: boolean;
}

export const PractitionerPricingSetup: React.FC<PractitionerPricingSetupProps> = ({
  practitionerId,
  userRole,
  onPricingUpdate,
  initialPricing,
  isOnboarding = false
}) => {
  const [pricing, setPricing] = useState({
    hourly_rate: 0,
    session_pricing: {
      '30min': 0,
      '45min': 0,
      '60min': 0,
      '90min': 0
    },
    accepts_insurance: false,
    insurance_providers: [] as string[],
    discount_available: false,
    discount_percentage: 0,
    minimum_session_duration: 30,
    pricing_notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);

  useEffect(() => {
    if (initialPricing) {
      setPricing(initialPricing);
    } else {
      loadRecommendations();
    }
  }, [userRole, initialPricing]);

  const loadRecommendations = async () => {
    try {
      const recs = await PricingService.getPriceRecommendations(userRole);
      setRecommendations(recs);
      
      // Set recommended pricing as default
      setPricing(prev => ({
        ...prev,
        session_pricing: recs,
        hourly_rate: recs['60min'] // Use 60min rate as hourly rate
      }));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handlePricingChange = (field: string, value: any) => {
    setPricing(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]);
  };

  const handleSessionPricingChange = (sessionType: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      session_pricing: {
        ...prev.session_pricing,
        [sessionType]: value
      }
    }));
    setErrors([]);
  };

  const handleSave = async () => {
    setLoading(true);
    setErrors([]);

    try {
      // Validate pricing
      const validation = PricingService.validatePricing(pricing);
      if (!validation.valid) {
        setErrors(validation.errors);
        setLoading(false);
        return;
      }

      // Save pricing
      const success = await PricingService.updatePractitionerPricing(practitionerId, pricing);
      
      if (success) {
        onPricingUpdate?.(pricing);
        if (isOnboarding) {
          // Move to next step in onboarding
        }
      } else {
        setErrors(['Failed to save pricing. Please try again.']);
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      setErrors(['An error occurred while saving pricing.']);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendations = () => {
    if (recommendations) {
      setPricing(prev => ({
        ...prev,
        session_pricing: recommendations,
        hourly_rate: recommendations['60min']
      }));
    }
  };

  const sessionTypes = [
    { key: '30min', label: '30 minutes', icon: '⏱️' },
    { key: '45min', label: '45 minutes', icon: '⏰' },
    { key: '60min', label: '60 minutes', icon: '🕐' },
    { key: '90min', label: '90 minutes', icon: '🕑' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Set Your Pricing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set your rates to attract clients and build your practice
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="hourly_rate"
                type="number"
                value={pricing.hourly_rate}
                onChange={(e) => handlePricingChange('hourly_rate', parseInt(e.target.value) || 0)}
                className="pl-10"
                placeholder="75"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your standard hourly rate for reference
            </p>
          </div>

          {/* Session Pricing */}
          <div className="space-y-4">
            <Label>Session Pricing (£)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionTypes.map((session) => (
                <div key={session.key} className="space-y-2">
                  <Label htmlFor={session.key} className="flex items-center gap-2">
                    <span>{session.icon}</span>
                    {session.label}
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={session.key}
                      type="number"
                      value={pricing.session_pricing[session.key as keyof typeof pricing.session_pricing]}
                      onChange={(e) => handleSessionPricingChange(session.key, parseInt(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Based on similar practitioners, we recommend: 30min: £{recommendations['30min']}, 
                    60min: £{recommendations['60min']}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyRecommendations}
                  >
                    Apply Recommendations
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Insurance */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="accepts_insurance"
                checked={pricing.accepts_insurance}
                onCheckedChange={(checked) => handlePricingChange('accepts_insurance', checked)}
              />
              <Label htmlFor="accepts_insurance" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Accept Insurance
              </Label>
            </div>
            {pricing.accepts_insurance && (
              <div className="space-y-2">
                <Label>Insurance Providers</Label>
                <div className="flex flex-wrap gap-2">
                  {['BUPA', 'AXA', 'Vitality', 'Aviva', 'Cigna'].map((provider) => (
                    <Badge
                      key={provider}
                      variant={pricing.insurance_providers.includes(provider) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const providers = pricing.insurance_providers.includes(provider)
                          ? pricing.insurance_providers.filter(p => p !== provider)
                          : [...pricing.insurance_providers, provider];
                        handlePricingChange('insurance_providers', providers);
                      }}
                    >
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discounts */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="discount_available"
                checked={pricing.discount_available}
                onCheckedChange={(checked) => handlePricingChange('discount_available', checked)}
              />
              <Label htmlFor="discount_available" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Offer Discounts
              </Label>
            </div>
            {pricing.discount_available && (
              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Discount Percentage (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="discount_percentage"
                    type="number"
                    value={pricing.discount_percentage}
                    onChange={(e) => handlePricingChange('discount_percentage', parseInt(e.target.value) || 0)}
                    className="pl-10"
                    placeholder="10"
                    max={100}
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Minimum Session Duration */}
          <div className="space-y-2">
            <Label htmlFor="minimum_duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Minimum Session Duration (minutes)
            </Label>
            <Input
              id="minimum_duration"
              type="number"
              value={pricing.minimum_session_duration}
              onChange={(e) => handlePricingChange('minimum_session_duration', parseInt(e.target.value) || 30)}
              placeholder="30"
              min={15}
              max={120}
            />
          </div>

          {/* Pricing Notes */}
          <div className="space-y-2">
            <Label htmlFor="pricing_notes">Pricing Notes (Optional)</Label>
            <textarea
              id="pricing_notes"
              value={pricing.pricing_notes}
              onChange={(e) => handlePricingChange('pricing_notes', e.target.value)}
              className="w-full p-3 border rounded-md resize-none"
              rows={3}
              placeholder="Any additional information about your pricing..."
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                if (isOnboarding) {
                  // Skip pricing setup
                }
              }}
            >
              {isOnboarding ? 'Skip for Now' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? 'Saving...' : 'Save Pricing'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PractitionerPricingSetup;
