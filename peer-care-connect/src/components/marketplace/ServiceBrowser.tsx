/**
 * Service Browser Component
 * Displays available services in the marketplace with filtering and search
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Star, 
  Calendar,
  PoundSterling,
  User as UserIcon
} from 'lucide-react';
import { 
  PractitionerService, 
  ServiceCategory, 
  getActiveServices, 
  getServiceCategories,
  searchServices
} from '@/services/practitionerServices';
import { formatPrice, getServiceTypeDisplayName } from '@/utils/pricing';
import { toast } from 'sonner';

interface ServiceBrowserProps {
  onBookService?: (service: PractitionerService) => void;
}

interface SearchFilters {
  query: string;
  serviceType: string;
  minPrice: number;
  maxPrice: number;
  duration: number;
  location: string;
}

const ServiceBrowser: React.FC<ServiceBrowserProps> = ({ onBookService }) => {
  const [services, setServices] = useState<PractitionerService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    serviceType: 'all',
    minPrice: 0,
    maxPrice: 10000, // £100
    duration: 0,
    location: ''
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 12;

  useEffect(() => {
    loadCategories();
    loadServices();
  }, []);

  useEffect(() => {
    loadServices();
  }, [filters, page]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getServiceCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const result = await searchServices({
        query: filters.query || undefined,
        serviceType: filters.serviceType === 'all' ? undefined : filters.serviceType || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        duration: filters.duration || undefined,
        location: filters.location || undefined,
        limit,
        offset: page * limit
      });
      setServices(result.services);
      setTotal(result.total);
    } catch (error) {
      toast.error('Failed to load services');
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServices();
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      serviceType: 'all',
      minPrice: 0,
      maxPrice: 10000,
      duration: 0,
      location: ''
    });
    setPage(0);
  };

  const getPriceInPounds = (pence: number) => (pence / 100).toFixed(2);

  const handlePriceChange = (key: 'minPrice' | 'maxPrice', value: string) => {
    const pounds = parseFloat(value) || 0;
    handleFilterChange(key, Math.round(pounds * 100));
  };

  if (loading && services.length === 0) {
    return <div className="flex justify-center p-8">Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search services, practitioners, or locations..."
                    value={filters.query}
                    onChange={(e) => handleFilterChange('query', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit">Search</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-1 block">Service Type</label>
                  <Select
                    value={filters.serviceType}
                    onValueChange={(value) => handleFilterChange('serviceType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Min Price (£)</label>
                  <Input
                    type="number"
                    value={getPriceInPounds(filters.minPrice)}
                    onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Max Price (£)</label>
                  <Input
                    type="number"
                    value={getPriceInPounds(filters.maxPrice)}
                    onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Duration (min)</label>
                  <Select
                    value={filters.duration.toString()}
                    onValueChange={(value) => handleFilterChange('duration', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Duration</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {total} services found
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No services found matching your criteria</p>
            <Button onClick={clearFilters}>Clear Filters</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <Card key={service.id} className="transition-[border-color,background-color] duration-200 ease-out">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{service.service_name}</h3>
                    <Badge variant="outline">
                      {getServiceTypeDisplayName(service.service_type)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {service.duration_minutes} min
                    </div>
                    <div className="flex items-center gap-1">
                      <PoundSterling className="w-4 h-4" />
                      {formatPrice(service.base_price_pence)}
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  {/* Practitioner Info */}
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(service as any).users?.first_name} {(service as any).users?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(service as any).users?.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => onBookService?.(service)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.max(0, prev - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(prev => prev + 1)}
            disabled={(page + 1) * limit >= total}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServiceBrowser;
