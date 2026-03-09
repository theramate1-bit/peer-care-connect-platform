import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Save, X, Sparkles, Settings } from 'lucide-react';
import { createPractitionerProduct, updatePractitionerProduct, PractitionerProduct, CreateProductData } from '@/lib/stripe-products';
import { parseAmount, formatAmount, validatePricing, calculateApplicationFee } from '@/config/platform-fees';
import { validateData, productSchema } from '@/lib/validators';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  getServiceDefaultDuration, 
  getServiceDefaultDescription,
  calculateDefaultPrice,
  generateDefaultPackageName,
  getServiceDurationRange
} from '@/lib/service-defaults';
import { ProductTemplateSelector } from './ProductTemplateSelector';
import { ProductTemplate, applyTemplate } from '@/lib/product-templates';
import { getPricingRecommendation, type PricingRecommendation } from '@/lib/pricing-recommendations';
import {
  getMarketAnalysisForService,
  getMarketAnalysisBreakdown,
  getYourPriceVsMarket,
  type MarketAnalysis,
  type MarketAnalysisBreakdownRow,
} from '@/lib/market-analysis';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Info, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { PricingCalculator } from '@/components/pricing/PricingCalculator';
import { PricingTips } from '@/components/pricing/PricingTips';

interface ProductFormProps {
  practitionerId: string;
  product?: PractitionerProduct;
  onSuccess: (product: PractitionerProduct) => void;
  onCancel: () => void;
  initialServiceCategory?: string; // Pre-select service category when creating from a service section
  initialServiceType?: 'clinic' | 'mobile' | 'both'; // Pre-select service type when creating from a tab
}

// Service code to display name mapping
const getServiceDisplayName = (code: string): string => {
  const serviceNames: Record<string, string> = {
    // Sports Therapist
    'sports_injury_assessment': 'Sports Injury Assessment',
    'exercise_rehabilitation': 'Exercise Rehabilitation',
    'strength_conditioning': 'Strength & Conditioning',
    'injury_prevention': 'Injury Prevention Programs',
    'performance_enhancement': 'Sports Performance Enhancement',
    'return_to_play': 'Return to Play Protocols',
    // Massage Therapist
    'deep_tissue': 'Deep Tissue Massage',
    'sports_massage': 'Sports Massage',
    'swedish_massage': 'Swedish Massage',
    'trigger_point': 'Trigger Point Therapy',
    'myofascial_release': 'Myofascial Release',
    'relaxation_massage': 'Relaxation Massage',
    // Osteopath
    'structural_osteopathy': 'Structural Osteopathy',
    'cranial_osteopathy': 'Cranial Osteopathy',
    'visceral_osteopathy': 'Visceral Osteopathy',
    'paediatric_osteopathy': 'Paediatric Osteopathy',
    'sports_osteopathy': 'Sports Osteopathy',
    'postural_assessment': 'Postural Assessment',
    // Common services available to all therapist types
    'massage': 'Massage',
    'acupuncture': 'Acupuncture',
    'cupping': 'Cupping',
    'mobilisation': 'Mobilisation',
    'manipulation': 'Manipulation',
    'stretching': 'Stretching',
  };
  return serviceNames[code] || code;
};

export const ProductForm: React.FC<ProductFormProps> = ({
  practitionerId,
  product,
  onSuccess,
  onCancel,
  initialServiceCategory,
  initialServiceType,
}) => {
  const { user, userProfile } = useAuth();
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // Get default duration based on service category if provided
  const getInitialDuration = () => {
    if (product?.duration_minutes) return product.duration_minutes;
    if (initialServiceCategory && typeof initialServiceCategory === 'string') {
      return getServiceDefaultDuration(initialServiceCategory);
    }
    if (product?.service_category && typeof product.service_category === 'string') {
      return getServiceDefaultDuration(product.service_category);
    }
    return 60; // Default fallback
  };

  const getInitialName = () => {
    if (product?.name) return product.name;
    // Safely get service category - ensure it's a string
    const serviceCategory = (typeof initialServiceCategory === 'string' ? initialServiceCategory : null) 
      || (typeof product?.service_category === 'string' ? product.service_category : null);
    if (serviceCategory && serviceCategory.trim()) {
      return generateDefaultPackageName(serviceCategory, getInitialDuration());
    }
    return '';
  };

  const getInitialDescription = () => {
    if (product?.description) return product.description;
    // Safely get service category - ensure it's a string
    const serviceCategory = (typeof initialServiceCategory === 'string' ? initialServiceCategory : null) 
      || (typeof product?.service_category === 'string' ? product.service_category : null);
    if (serviceCategory && serviceCategory.trim()) {
      return getServiceDefaultDescription(serviceCategory);
    }
    return '';
  };

  const getInitialPrice = () => {
    if (product?.price_amount) return product.price_amount;
    // Will be calculated after hourly rate is loaded
    return 0;
  };

  // Helper to safely get service category as string
  const getSafeServiceCategory = (): string | undefined => {
    // Check product.service_category first (if product exists)
    if (product?.service_category) {
      if (typeof product.service_category === 'string' && product.service_category.trim()) {
        return product.service_category;
      }
      // If it's not a string, ignore it
      return undefined;
    }
    // Then check initialServiceCategory
    if (initialServiceCategory) {
      if (typeof initialServiceCategory === 'string' && initialServiceCategory.trim()) {
        return initialServiceCategory;
      }
    }
    return undefined;
  };

  // Get initial service_type based on product, initialServiceType prop, or therapist type
  const getInitialServiceType = (): 'clinic' | 'mobile' | 'both' => {
    if (product?.service_type) return product.service_type;
    if (initialServiceType) return initialServiceType;
    // Default based on therapist type
    if (userProfile?.therapist_type === 'mobile') return 'mobile';
    if (userProfile?.therapist_type === 'hybrid') return 'both';
    return 'clinic'; // Default for clinic_based or null
  };

  const [formData, setFormData] = useState<CreateProductData>({
    name: getInitialName(),
    description: getInitialDescription(),
    price_amount: getInitialPrice(),
    duration_minutes: getInitialDuration(),
    category: (product as any)?.category || 'general',
    service_category: getSafeServiceCategory(),
    service_type: getInitialServiceType(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [pricingRecommendation, setPricingRecommendation] = useState<PricingRecommendation | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [loadingMarketAnalysis, setLoadingMarketAnalysis] = useState(false);
  const [marketBreakdownOpen, setMarketBreakdownOpen] = useState(false);
  const [marketBreakdownRows, setMarketBreakdownRows] = useState<MarketAnalysisBreakdownRow[]>([]);

  // Local state for price input to allow free-form typing
  const [priceInputValue, setPriceInputValue] = useState<string>(
    formData.price_amount > 0 ? (formData.price_amount / 100).toFixed(2) : ''
  );
  
  // Sync priceInputValue when product prop changes (initial load or when editing different product)
  useEffect(() => {
    if (product?.price_amount) {
      const formatted = (product.price_amount / 100).toFixed(2);
      setPriceInputValue(formatted);
    } else if (!product) {
      // New product - reset to empty
      setPriceInputValue('');
    }
  }, [product?.id]); // Only sync when product ID changes (new product or different product selected)

  // Fetch pricing recommendation when service category or duration changes (KAN-70)
  useEffect(() => {
    const category = getSafeServiceCategory();
    if (!category) {
      setPricingRecommendation(null);
      return;
    }
    let cancelled = false;
    setLoadingRecommendation(true);
    setPricingRecommendation(null);
    getPricingRecommendation(category, {
      durationMinutes: formData.duration_minutes,
      experienceYears: userProfile?.experience_years ?? undefined,
    })
      .then((rec) => {
        if (!cancelled && rec) setPricingRecommendation(rec);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecommendation(false);
      });
    return () => { cancelled = true; };
  }, [formData.service_category, formData.duration_minutes, userProfile?.experience_years]);

  // KAN-71: Market analysis for current service type
  useEffect(() => {
    const category = getSafeServiceCategory();
    if (!category) {
      setMarketAnalysis(null);
      return;
    }
    let cancelled = false;
    setLoadingMarketAnalysis(true);
    setMarketAnalysis(null);
    getMarketAnalysisForService(category)
      .then((data) => {
        if (!cancelled && data) setMarketAnalysis(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingMarketAnalysis(false);
      });
    return () => { cancelled = true; };
  }, [formData.service_category]);


  // Load practitioner's services_offered (optional, for backward compatibility)
  const loadServices = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('services_offered')
        .eq('id', user.id)
        .single();
      
      if (!error && data && data.services_offered) {
        // Filter to ensure only strings are included
        const services = Array.isArray(data.services_offered) 
          ? data.services_offered.filter((s): s is string => typeof s === 'string')
          : [];
        setAvailableServices(services);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoadingServices(false);
    }
  };
    
  useEffect(() => {
    loadServices();

    // Subscribe to real-time changes for services_offered
    if (user?.id) {
      const subscription = supabase
        .channel('user-services-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            // Reload services when user data changes
            loadServices();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate with Zod
      const validation = validateData(productSchema, {
        name: formData.name,
        description: formData.description,
        price_amount: formData.price_amount,
        duration_minutes: formData.duration_minutes,
        currency: 'gbp' as const
      });

      if (!validation.success) {
        validation.errors?.forEach(err => toast.error(err));
        setIsSubmitting(false);
        return;
      }

      let result;
      if (product) {
        // Update existing product
        result = await updatePractitionerProduct(product.id, formData);
      } else {
        // Create new product
        result = await createPractitionerProduct(practitionerId, formData);
      }

      if (result.success && result.product) {
        toast.success(product ? 'Product updated successfully!' : 'Product created successfully!');
        onSuccess(result.product);
      } else {
        const msg = result.error || 'We couldn\'t save this service.';
        toast.error(msg, { description: 'Your entries are kept. You can try saving again.' });
      }
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Something went wrong. Your entries are kept—try saving again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceChange = (value: string) => {
    // Allow free-form typing - update local state immediately
    setPriceInputValue(value);
    
    // Parse and update formData in real-time for fee breakdown calculation
    const pounds = parseFloat(value) || 0;
    if (pounds >= 0) {
      setFormData(prev => ({
        ...prev,
        price_amount: parseAmount(pounds),
      }));
    }
  };

  const handlePriceBlur = () => {
    // Format the value on blur to ensure proper formatting
    const pounds = parseFloat(priceInputValue) || 0;
    if (pounds > 0) {
      const formatted = pounds.toFixed(2);
      setPriceInputValue(formatted);
      setFormData(prev => ({
        ...prev,
        price_amount: parseAmount(pounds),
      }));
    } else {
      setPriceInputValue('');
      setFormData(prev => ({
        ...prev,
        price_amount: 0,
      }));
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {product ? 'Edit Product' : 'Create New Product'}
        </CardTitle>
        <CardDescription>
          {product 
            ? 'Update your service details and pricing'
            : 'Add a new service that clients can book and pay for'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 60-minute Sports Massage"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your service, what clients can expect, and any special requirements..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (£) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceInputValue}
                onChange={(e) => handlePriceChange(e.target.value)}
                onBlur={handlePriceBlur}
                placeholder="60.00"
                required
              />
              {/* KAN-70: Pricing recommendation */}
              {loadingRecommendation && (
                <p className="text-xs text-muted-foreground">Loading recommendation…</p>
              )}
              {!loadingRecommendation && pricingRecommendation && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Recommended: {formatAmount(pricingRecommendation.recommendedPricePence)} based on market and experience
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex text-muted-foreground hover:text-foreground" aria-label="Why this recommendation?">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <ul className="list-disc list-inside space-y-1">
                          {pricingRecommendation.factors.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const pounds = pricingRecommendation.recommendedPricePence / 100;
                      setPriceInputValue(pounds.toFixed(2));
                      setFormData(prev => ({ ...prev, price_amount: pricingRecommendation.recommendedPricePence }));
                    }}
                  >
                    Use recommended
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={formData.duration_minutes?.toString() || '60'}
                onValueChange={(value) => {
                  const newDuration = parseInt(value);
                  setFormData(prev => ({ 
                    ...prev, 
                    duration_minutes: newDuration 
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="75">75 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KAN-71: Market Analysis */}
          {getSafeServiceCategory() && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Market Analysis
              </h4>
              {loadingMarketAnalysis && (
                <p className="text-xs text-muted-foreground">Loading market data…</p>
              )}
              {!loadingMarketAnalysis && marketAnalysis && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">
                      Average for this service type: <span className="font-medium text-foreground">{formatAmount(marketAnalysis.averagePence)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Price range: <span className="font-medium text-foreground">{formatAmount(marketAnalysis.minPence)} – {formatAmount(marketAnalysis.maxPence)}</span>
                    </p>
                  </div>
                  {formData.price_amount > 0 && (
                    <p className="text-sm">
                      Your price:{' '}
                      <span className={
                        getYourPriceVsMarket(formData.price_amount, marketAnalysis.averagePence) === 'above'
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : getYourPriceVsMarket(formData.price_amount, marketAnalysis.averagePence) === 'below'
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-muted-foreground font-medium'
                      }>
                        {getYourPriceVsMarket(formData.price_amount, marketAnalysis.averagePence) === 'above'
                          ? 'Above'
                          : getYourPriceVsMarket(formData.price_amount, marketAnalysis.averagePence) === 'below'
                            ? 'Below'
                            : 'At'}
                        {' '}market average
                      </span>
                    </p>
                  )}
                  <Collapsible
                    open={marketBreakdownOpen}
                    onOpenChange={(o) => {
                      setMarketBreakdownOpen(o);
                      if (o && marketBreakdownRows.length === 0) getMarketAnalysisBreakdown().then(setMarketBreakdownRows);
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                      >
                        {marketBreakdownOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        View market analysis
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-1.5 pr-4 font-medium">Service type</th>
                              <th className="py-1.5 pr-4 font-medium">Average</th>
                              <th className="py-1.5 pr-4 font-medium">Range</th>
                              <th className="py-1.5 font-medium">Listings</th>
                            </tr>
                          </thead>
                          <tbody>
                            {marketBreakdownRows.map((row) => (
                              <tr key={row.serviceCategory} className="border-b border-border/50">
                                <td className="py-1.5 pr-4 capitalize">{row.serviceCategory.replace(/_/g, ' ')}</td>
                                <td className="py-1.5 pr-4">{formatAmount(row.averagePence)}</td>
                                <td className="py-1.5 pr-4">{formatAmount(row.minPence)} – {formatAmount(row.maxPence)}</td>
                                <td className="py-1.5">{row.sampleSize}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </div>
          )}

          {/* Service Type Selection - Show for mobile and hybrid therapists */}
          {(userProfile?.therapist_type === 'mobile' || userProfile?.therapist_type === 'hybrid') && (
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Delivery Type *</Label>
              <Select
                value={formData.service_type || 'clinic'}
                onValueChange={(value: 'clinic' | 'mobile' | 'both') => {
                  setFormData(prev => ({ ...prev, service_type: value }));
                }}
                required
              >
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {userProfile?.therapist_type === 'hybrid' && (
                    <>
                      <SelectItem value="clinic">Clinic-Based Only</SelectItem>
                      <SelectItem value="mobile">Mobile Only</SelectItem>
                      <SelectItem value="both">Both (Clinic & Mobile)</SelectItem>
                    </>
                  )}
                  {userProfile?.therapist_type === 'mobile' && (
                    <SelectItem value="mobile">Mobile Service</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.service_type === 'clinic' && 'Service will be provided at your clinic location'}
                {formData.service_type === 'mobile' && 'Service will be provided at the client\'s location'}
                {formData.service_type === 'both' && 'Service can be provided at either your clinic or client\'s location'}
              </p>
            </div>
          )}

          {/* KAN-72: Revenue calculator */}
          <PricingCalculator priceAmountPence={formData.price_amount} />

          {/* KAN-73: Pricing tips */}
          <PricingTips experienceYears={userProfile?.experience_years ?? undefined} />

          {/* Fee breakdown */}
          {formData.price_amount > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Fee Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Service Price:</span>
                  <span>{formatAmount(formData.price_amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee (0.5%):</span>
                  <span>-{formatAmount(calculateApplicationFee(formData.price_amount))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Stripe Fee (~1.4%):</span>
                  <span>-{formatAmount(Math.round(formData.price_amount * 0.014))}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>You Receive:</span>
                  <span>{formatAmount(formData.price_amount - Math.round(formData.price_amount * 0.019))}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
