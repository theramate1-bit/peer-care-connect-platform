import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, MapPin, Clock, Star, Heart, X } from 'lucide-react';

interface SearchFilters {
  query: string;
  specialization: string;
  location: string;
  priceRange: [number, number];
  experience: string;
  rating: number;
  availability: string;
  verified: boolean;
}

interface EnhancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  initialFilters?: Partial<SearchFilters>;
  className?: string;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onSearch,
  onClear,
  initialFilters = {},
  className = ''
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    specialization: '',
    location: '',
    priceRange: [0, 200],
    experience: '',
    rating: 0,
    availability: '',
    verified: false,
    ...initialFilters
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const specializations = [
    'sports_injury',
    'rehabilitation',
    'massage_therapy',
    'osteopathy',
    'physiotherapy',
    'chiropractic',
    'acupuncture',
    'mental_health'
  ];

  const experienceLevels = [
    { value: '0-2', label: 'New (0-2 years)' },
    { value: '2-5', label: 'Experienced (2-5 years)' },
    { value: '5-10', label: 'Senior (5-10 years)' },
    { value: '10+', label: 'Expert (10+ years)' }
  ];

  const availabilityOptions = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This Week' },
    { value: 'next-week', label: 'Next Week' }
  ];

  const popularSearches = [
    'Sports injury recovery',
    'Back pain relief',
    'Stress management',
    'Post-surgery rehab',
    'Chronic pain management'
  ];

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = () => {
    onSearch(filters);
    
    // Save to recent searches
    if (filters.query && !recentSearches.includes(filters.query)) {
      const newRecent = [filters.query, ...recentSearches].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    }
  };

  const handleClear = () => {
    setFilters({
      query: '',
      specialization: '',
      location: '',
      priceRange: [0, 200],
      experience: '',
      rating: 0,
      availability: '',
      verified: false
    });
    onClear();
  };

  const handleQuickSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    onSearch({ ...filters, query });
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== 0 && value !== false && 
    !(Array.isArray(value) && value[0] === 0 && value[1] === 200)
  ).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Find Your Perfect Therapist</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by condition, therapist name, or specialty..."
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            className="pl-10 pr-4"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Quick search suggestions */}
        {filters.query === '' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSearch(search)}
                  className="text-xs"
                >
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && filters.query === '' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Recent searches:</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickSearch(search)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Basic filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Specialization</label>
            <Select
              value={filters.specialization}
              onValueChange={(value) => setFilters(prev => ({ ...prev, specialization: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any specialization</SelectItem>
                {specializations.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="City or postcode"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Experience</label>
            <Select
              value={filters.experience}
              onValueChange={(value) => setFilters(prev => ({ ...prev, experience: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any experience</SelectItem>
                {experienceLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced filters toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Advanced Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear All
            </Button>
            <Button size="sm" onClick={handleSearch}>
              Search
            </Button>
          </div>
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Price Range: £{filters.priceRange[0]} - £{filters.priceRange[1]}
                </label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                  max={200}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Minimum Rating: {filters.rating > 0 ? `${filters.rating}+ stars` : 'Any rating'}
                </label>
                <Slider
                  value={[filters.rating]}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value[0] }))}
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Availability</label>
                <Select
                  value={filters.availability}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, availability: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    {availabilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={filters.verified}
                  onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="verified" className="text-sm font-medium text-gray-700">
                  Verified professionals only
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Active filters:</p>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.query && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Search: {filters.query}</span>
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, query: '' }))}
                  />
                </Badge>
              )}
              {filters.specialization && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Specialty: {filters.specialization.replace('_', ' ')}</span>
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, specialization: '' }))}
                  />
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Location: {filters.location}</span>
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, location: '' }))}
                  />
                </Badge>
              )}
              {filters.verified && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Verified only</span>
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, verified: false }))}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedSearch;
