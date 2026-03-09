import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  PoundSterling, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  Building2,
  Car
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  PractitionerProduct, 
  getPractitionerProducts, 
  deletePractitionerProduct 
} from '@/lib/stripe-products';
import { formatAmount } from '@/config/platform-fees';
import { ProductForm } from './ProductForm';

// Service code to display name mapping (matches ProductForm)
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

export const ProductManager: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [products, setProducts] = useState<PractitionerProduct[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PractitionerProduct | undefined>();
  const [preSelectServiceCategory, setPreSelectServiceCategory] = useState<string | undefined>();
  const [preSelectServiceType, setPreSelectServiceType] = useState<'clinic' | 'mobile' | 'both' | undefined>();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [hasConnectAccount, setHasConnectAccount] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'mobile' | 'clinic' | 'all'>('all');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      // Load services_offered
      const loadServices = async () => {
        const { data } = await supabase
          .from('users')
          .select('services_offered')
          .eq('id', user.id)
          .single();
        
        if (data?.services_offered && Array.isArray(data.services_offered)) {
          setServicesOffered(data.services_offered);
        }
      };
      loadServices();

      // Check if user has Stripe Connect account
      const checkConnectAccount = async () => {
        if (userProfile?.stripe_connect_account_id) {
          setHasConnectAccount(true);
          loadProducts();
        } else {
          setHasConnectAccount(false);
          setLoading(false);
        }
      };
      checkConnectAccount();
      
      // Subscribe to real-time changes for this practitioner's products
      const subscription = supabase
        .channel('product-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'practitioner_products',
            filter: `practitioner_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Product changed:', payload);
            if (hasConnectAccount) {
              loadProducts(); // Refresh the list
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, userProfile?.stripe_connect_account_id]);

  const loadProducts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setLoadError(null);
      const result = await getPractitionerProducts(user.id, true); // Include inactive products
      
      if (result.success && result.products) {
        setProducts(result.products);
      } else {
        const msg = result.error || 'We couldn\'t load your services.';
        setLoadError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      const msg = err instanceof Error ? err.message : 'We couldn\'t load your services. Check your connection and try again.';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by service type for hybrid therapists
  const filteredProducts = useMemo(() => {
    if (userProfile?.therapist_type !== 'hybrid') {
      return products;
    }
    
    if (activeTab === 'mobile') {
      return products.filter(p => p.service_type === 'mobile' || p.service_type === 'both');
    } else if (activeTab === 'clinic') {
      return products.filter(p => p.service_type === 'clinic' || p.service_type === 'both');
    }
    
    return products;
  }, [products, activeTab, userProfile?.therapist_type]);

  const handleCreateProduct = (serviceCategory?: string, serviceType?: 'clinic' | 'mobile' | 'both') => {
    setEditingProduct(undefined);
    setPreSelectServiceCategory(serviceCategory);
    setPreSelectServiceType(serviceType);
    setShowForm(true);
  };

  const handleEditProduct = (product: PractitionerProduct) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingProductId(productId);
      const result = await deletePractitionerProduct(productId);
      
      if (result.success) {
        toast.success('Product deleted successfully');
        loadProducts(); // Reload products
      } else {
        toast.error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleFormSuccess = (product: PractitionerProduct) => {
    setShowForm(false);
    setEditingProduct(undefined);
    setPreSelectServiceCategory(undefined);
    setPreSelectServiceType(undefined);
    loadProducts(); // Reload products
    // Set active tab based on product service_type for hybrid therapists
    if (userProfile?.therapist_type === 'hybrid' && product.service_type) {
      if (product.service_type === 'mobile') {
        setActiveTab('mobile');
      } else if (product.service_type === 'clinic') {
        setActiveTab('clinic');
      }
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(undefined);
    setPreSelectServiceCategory(undefined);
    setPreSelectServiceType(undefined);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading products...
        </CardContent>
      </Card>
    );
  }

  if (loadError && !showForm) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Couldn&apos;t load your services</AlertTitle>
            <AlertDescription>
              <p className="mb-3">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => loadProducts()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <ProductForm
        practitionerId={user?.id || ''}
        product={editingProduct}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
        initialServiceCategory={preSelectServiceCategory}
        initialServiceType={preSelectServiceType}
      />
    );
  }

  // Show alert if no Stripe Connect account
  if (!hasConnectAccount) {
    return (
      <div className="space-y-4">
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Stripe Connect Setup Required</AlertTitle>
          <AlertDescription>
            <p className="mb-4 text-amber-800">
              Before you can create services and accept payments, you need to connect your bank account through Stripe.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => window.location.href = '/profile#subscription'} size="sm">
                Set Up Payments
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://stripe.com/connect" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Learn More
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Consolidated empty state component
  const renderEmptyState = () => (
    <div className="text-center py-12 px-4">
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">No packages yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Create your first package to start accepting bookings
      </p>
      <Button size="lg" onClick={() => handleCreateProduct()}>
        <Plus className="h-5 w-5 mr-2" />
        Create Your First Package
      </Button>
    </div>
  );

  // Unified product card component
  const renderProductCard = (product: PractitionerProduct) => (
    <Card 
      key={product.id} 
      className="bg-card border transition-[border-color,background-color] duration-200 ease-out"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-semibold text-base">{product.name}</h4>
              <Badge variant={product.is_active ? 'default' : 'secondary'}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            {product.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <PoundSterling className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{formatAmount(product.price_amount)}</span>
              </div>
              
              {product.duration_minutes && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{product.duration_minutes} minutes</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditProduct(product)}
              className="h-9"
              aria-label={`Edit service: ${product.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteProduct(product.id)}
              disabled={deletingProductId === product.id}
              className="h-9"
              aria-label={`Delete service: ${product.name}`}
            >
              {deletingProductId === product.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header with prominent Create Package button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Service Packages</h2>
          <p className="text-muted-foreground mt-1">
            Manage the services clients can book and pay for directly
          </p>
        </div>
        <Button size="lg" onClick={handleCreateProduct} className="h-11 w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          Create Package
        </Button>
      </div>

      {/* Tabs for Hybrid Therapists */}
      {userProfile?.therapist_type === 'hybrid' ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'mobile' | 'clinic' | 'all')}>
          <TabsList className="w-full flex overflow-x-auto whitespace-nowrap gap-2 p-1">
            <TabsTrigger value="mobile" className="shrink-0 flex items-center gap-2">
              <Car className="h-4 w-4" />
              Mobile Services
            </TabsTrigger>
            <TabsTrigger value="clinic" className="shrink-0 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Clinic-Based Services
            </TabsTrigger>
            <TabsTrigger value="all" className="shrink-0">All Services</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mobile" className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No mobile services yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first mobile service package
                </p>
                <Button size="lg" onClick={() => handleCreateProduct(undefined, 'mobile')}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Mobile Service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(renderProductCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="clinic" className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No clinic-based services yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first clinic-based service package
                </p>
                <Button size="lg" onClick={() => handleCreateProduct(undefined, 'clinic')}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Clinic Service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(renderProductCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            {products.length === 0 ? renderEmptyState() : (
              <div className="space-y-3">
                {products.map(renderProductCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Empty State */}
          {products.length === 0 && renderEmptyState()}

          {/* Products List - Flat list, no grouping */}
          {products.length > 0 && (
            <div className="space-y-3">
              {products.map(renderProductCard)}
            </div>
          )}
        </>
      )}

      {/* Info Alert */}
      {products.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Clients can book and pay for your services directly. 
            You'll receive payments automatically (minus 0.5% platform fee and 1.5% Stripe processing fee - total 2% fees). 
            Payments are processed securely through Stripe.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
