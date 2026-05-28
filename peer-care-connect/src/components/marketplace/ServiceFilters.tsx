import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ServiceFiltersProps {
  filters: {
    category: string;
    priceMin: number;
    priceMax: number;
    durationMin: number;
    durationMax: number;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const ServiceFilters: React.FC<ServiceFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'category') return value !== 'all';
    if (key === 'priceMin') return value !== 0;
    if (key === 'priceMax') return value !== 200;
    if (key === 'durationMin') return value !== 15;
    if (key === 'durationMax') return value !== 180;
    return false;
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filter Services</CardTitle>
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80" 
              onClick={onClearFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Clear ({activeFilterCount})
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Select 
            value={filters.category} 
            onValueChange={(value) => onFilterChange({ ...filters, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="massage">Massage Therapy</SelectItem>
              <SelectItem value="osteopathy">Osteopathy</SelectItem>
              <SelectItem value="sports_therapy">Sports Therapy</SelectItem>
              <SelectItem value="general">General Treatment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range Filter */}
        <div className="space-y-3">
          <Label>Price Range: £{filters.priceMin} - £{filters.priceMax}</Label>
          <Slider
            min={0}
            max={200}
            step={5}
            value={[filters.priceMax]}
            onValueChange={([max]) => 
              onFilterChange({ ...filters, priceMin: 0, priceMax: max })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>£0</span>
            <span>£200</span>
          </div>
        </div>

        {/* Duration Filter */}
        <div className="space-y-3">
          <Label>Duration: {filters.durationMin} - {filters.durationMax} mins</Label>
          <Slider
            min={15}
            max={180}
            step={15}
            value={[filters.durationMax]}
            onValueChange={([max]) => 
              onFilterChange({ ...filters, durationMin: 15, durationMax: max })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15 min</span>
            <span>180 min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
