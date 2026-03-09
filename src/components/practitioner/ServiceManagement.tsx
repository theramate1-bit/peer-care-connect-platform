/**
 * Service Management Component
 * Allows practitioners to create, edit, and manage their custom services
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Clock, 
  PoundSterling,
  Percent,
  TrendingUp
} from 'lucide-react';
import { 
  PractitionerService, 
  ServiceCategory, 
  getPractitionerServices, 
  getServiceCategories,
  createPractitionerService,
  updatePractitionerService,
  deletePractitionerService,
  toggleServiceStatus
} from '@/services/practitionerServices';
import { formatPrice, generatePricingSummary } from '@/utils/pricing';
import { toast } from 'sonner';

interface ServiceManagementProps {
  practitionerId: string;
}

interface ServiceFormData {
  serviceName: string;
  serviceType: 'sports_therapy' | 'massage_therapy' | 'osteopathy';
  durationMinutes: number;
  basePricePence: number;
  description: string;
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({ practitionerId }) => {
  const [services, setServices] = useState<PractitionerService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<PractitionerService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    serviceName: '',
    serviceType: 'sports_therapy',
    durationMinutes: 60,
    basePricePence: 5000, // £50 default
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [practitionerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, categoriesData] = await Promise.all([
        getPractitionerServices(practitionerId),
        getServiceCategories()
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to load services');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.serviceName.trim()) {
      toast.error('Service name is required');
      return;
    }
    
    if (!formData.serviceType) {
      toast.error('Service type is required');
      return;
    }
    
    if (formData.basePricePence < 1000) {
      toast.error('Price must be at least £10.00');
      return;
    }
    
    try {
      if (editingService) {
        await updatePractitionerService(editingService.id, practitionerId, formData);
        toast.success('Service updated successfully');
      } else {
        await createPractitionerService(practitionerId, formData);
        toast.success('Service created successfully');
      }
      
      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save service';
      toast.error(errorMessage, {
        description: 'Please check all fields and try again',
        duration: 5000
      });
    }
  };

  const handleEdit = (service: PractitionerService) => {
    setEditingService(service);
    setFormData({
      serviceName: service.service_name,
      serviceType: service.service_type,
      durationMinutes: service.duration_minutes,
      basePricePence: service.base_price_pence,
      description: service.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await deletePractitionerService(serviceId, practitionerId);
      toast.success('Service deleted successfully');
      await loadData();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleToggleStatus = async (serviceId: string, isActive: boolean) => {
    try {
      await toggleServiceStatus(serviceId, practitionerId, isActive);
      toast.success(`Service ${isActive ? 'activated' : 'deactivated'} successfully`);
      await loadData();
    } catch (error) {
      toast.error('Failed to update service status');
    }
  };

  const resetForm = () => {
    setFormData({
      serviceName: '',
      serviceType: 'sports_therapy',
      durationMinutes: 60,
      basePricePence: 5000,
      description: ''
    });
    setEditingService(null);
    setShowForm(false);
  };

  const handlePriceChange = (value: string) => {
    const pounds = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      basePricePence: Math.round(pounds * 100)
    }));
  };

  const getPriceInPounds = (pence: number) => (pence / 100).toFixed(2);

  if (loading) {
    return <div className="flex justify-center p-8">Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Service Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Service Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceName">Service Name</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceName: e.target.value }))}
                    placeholder="e.g., Sports Massage, Deep Tissue Therapy"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value: 'sports_therapy' | 'massage_therapy' | 'osteopathy') => {
                      setFormData(prev => ({ ...prev, serviceType: value }));
                    }}
                    required
                  >
                    <SelectTrigger id="serviceType">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="sports_therapy" disabled>Loading categories...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">Loading service categories...</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select
                    value={formData.durationMinutes.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(value) }))}
                    required
                  >
                    <SelectTrigger id="duration">
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
                
                <div>
                  <Label htmlFor="price">Price (£)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={getPriceInPounds(formData.basePricePence)}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    min="10"
                    max="500"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your service, techniques used, benefits, etc."
                  rows={3}
                />
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Pricing Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Your Price:</span>
                    <div className="font-semibold">{formatPrice(formData.basePricePence)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Platform Fee (4%):</span>
                    <div className="font-semibold">{formatPrice(Math.round(formData.basePricePence * 0.04))}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">You Earn:</span>
                    <div className="font-semibold text-green-600">{formatPrice(formData.basePricePence - Math.round(formData.basePricePence * 0.04))}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Client Pays:</span>
                    <div className="font-semibold">{formatPrice(formData.basePricePence)}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      <div className="grid gap-4">
        {services.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No services created yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          services.map(service => (
            <Card key={service.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{service.service_name}</h3>
                      <Badge variant={service.is_active ? 'default' : 'secondary'}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {service.duration_minutes} min
                      </div>
                      <div className="flex items-center gap-1">
                        <PoundSterling className="w-4 h-4" />
                        {formatPrice(service.base_price_pence)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        {service.platform_fee_percentage}% fee
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {formatPrice(service.practitioner_earnings_pence)} earned
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(service.id, !service.is_active)}
                    >
                      {service.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiceManagement;
