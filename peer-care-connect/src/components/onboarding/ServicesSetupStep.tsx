import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Clock, 
  DollarSign, 
  Package,
  Info,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_minor: number;
  description: string;
  active: boolean;
}

interface ServicesSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const ServicesSetupStep: React.FC<ServicesSetupStepProps> = ({ onComplete, onSkip }) => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({
    name: '',
    duration_minutes: 60,
    price_minor: 0,
    description: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExistingServices();
  }, []);

  const loadExistingServices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('practitioner_services')
        .select('*')
        .eq('practitioner_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading services:', error);
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!user) return;

    if (!newService.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    if (newService.price_minor <= 0) {
      toast.error('Service price must be greater than £0');
      return;
    }

    try {
      setIsAdding(true);

      const { data, error } = await supabase
        .from('practitioner_services')
        .insert({
          practitioner_id: user.id,
          service_name: newService.name.trim(),
          duration_minutes: newService.duration_minutes,
          base_price_pence: newService.price_minor,
          description: newService.description.trim(),
          active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding service:', error);
        toast.error('Failed to add service. Please try again.');
        return;
      }

      setServices([...services, data]);
      setNewService({ name: '', duration_minutes: 60, price_minor: 0, description: '' });
      toast.success('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('practitioner_services')
        .update({ active: false })
        .eq('id', serviceId);

      if (error) {
        console.error('Error deleting service:', error);
        toast.error('Failed to delete service');
        return;
      }

      setServices(services.filter(s => s.id !== serviceId));
      toast.success('Service deleted');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const formatPrice = (priceMinor: number) => {
    return `£${(priceMinor / 100).toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Add Custom Services (Optional)</span>
        </CardTitle>
        <CardDescription>
          Create packages with fixed pricing, or skip and use hourly rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Why Add Custom Services?</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Offer specific treatment packages (e.g., "Sports Injury Assessment")</li>
              <li>• Set fixed prices for different session types</li>
              <li>• Make it easier for clients to understand your offerings</li>
              <li>• You can always add more services later</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Add New Service Form */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-medium">Add New Service</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Sports Injury Assessment"
              />
            </div>
            
            <div>
              <Label htmlFor="service-duration">Duration (minutes) *</Label>
              <Input
                id="service-duration"
                type="number"
                value={newService.duration_minutes}
                onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                min="15"
                max="240"
              />
            </div>
            
            <div>
              <Label htmlFor="service-price">Price (£) *</Label>
              <Input
                id="service-price"
                type="number"
                step="0.01"
                value={(newService.price_minor / 100).toString()}
                onChange={(e) => setNewService(prev => ({ ...prev, price_minor: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="service-description">Description</Label>
              <Textarea
                id="service-description"
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this service includes..."
                rows={2}
              />
            </div>
          </div>
          
          <Button onClick={handleAddService} disabled={isAdding} className="w-full">
            {isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Service...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </>
            )}
          </Button>
        </div>

        {/* Existing Services */}
        <div className="space-y-4">
          <h4 className="font-medium">Your Services</h4>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom services added yet</p>
              <p className="text-sm">Add your first service above or skip to use hourly rates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="font-medium">{service.service_name}</h5>
                      <Badge variant="secondary">{formatDuration(service.duration_minutes)}</Badge>
                      <Badge variant="outline">{formatPrice(service.base_price_pence)}</Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-4 border-t">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Ready to Continue</h4>
                <p className="text-sm text-green-700 mt-1">
                  You can always add more services later from your practice dashboard.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={onSkip} variant="outline" className="flex-1">
              Skip for Now
            </Button>
            <Button onClick={onComplete} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServicesSetupStep;
