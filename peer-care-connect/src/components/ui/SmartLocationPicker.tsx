import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationManager } from '@/lib/location';

interface LocationSuggestion {
  id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

const DEBOUNCE_MS = 200;

interface SmartLocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (lat: number, lon: number, address: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
}

export const SmartLocationPicker: React.FC<SmartLocationPickerProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Start typing your location...",
  className,
  error,
  id
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when parent value changes (e.g. initial load or external update)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce parent onChange so parent doesn't re-render on every keystroke (smooth 60fps typing)
  const flushOnChange = useCallback((newValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onChange(newValue);
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounced search function
  useEffect(() => {
    if (!localValue || localValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await searchLocations(localValue);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [localValue]);

  const searchLocations = async (query: string) => {
    setIsLoading(true);
    try {
      // Use LocationManager which is the official way used throughout the app
      // This ensures consistency and proper error handling
      const locationSuggestions = await LocationManager.getLocationSuggestions(query);
      
      // Filter UK results if available, prioritize them
      const ukResults = locationSuggestions.filter((item: any) => {
        const country = item.country?.toLowerCase() || '';
        return country === 'united kingdom' || country === 'gb' || country.includes('britain');
      });
      
      const resultsToUse = ukResults.length > 0 ? ukResults : locationSuggestions.slice(0, 5);
      
      // Convert LocationManager format to SmartLocationPicker format
      const formattedSuggestions: LocationSuggestion[] = resultsToUse.map((item: any, index: number) => ({
        id: `loc-${index}-${item.latitude}-${item.longitude}`,
        display_name: item.display_name || `${item.city || ''}, ${item.country || 'United Kingdom'}`.trim(),
        lat: item.latitude?.toString() || '0',
        lon: item.longitude?.toString() || '0',
        type: 'location',
        importance: 0
      }));
      
      setSuggestions(formattedSuggestions);
      // Only show suggestions if user has actively typed
      if (hasUserInteracted) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Location search error:', error);
      // Better error handling for Chrome
      if (error instanceof TypeError) {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        if (isChrome) {
          console.warn('Chrome CORS error detected. Ensure Supabase Edge Function proxy is deployed for production.');
        }
      }
      setSuggestions([]);
      // Try fallback to Photon API if LocationManager fails
      try {
        const isDev = import.meta.env.DEV;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const fallbackUrl = isDev
          ? `/api/photon/?q=${encodeURIComponent(query)}&limit=5&lang=en`
          : `${supabaseUrl}/functions/v1/location-proxy?q=${encodeURIComponent(query)}&limit=5&lang=en`;
        
        const response = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(isDev ? {} : {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
            }),
          },
          mode: 'cors',
          cache: 'default',
        });
        
        if (response.ok) {
          const data = await response.json();
          const features = data.features || [];
          
          // Filter and prioritize UK addresses
          const ukFeatures = features.filter((feature: any) => {
            const country = feature.properties?.country?.toLowerCase() || '';
            return country === 'united kingdom' || country === 'gb' || country === 'great britain';
          });
          
          const resultsToUse = ukFeatures.length > 0 ? ukFeatures : features.slice(0, 5);
          
          const formattedSuggestions: LocationSuggestion[] = resultsToUse.map((feature: any, index: number) => {
            const props = feature.properties || {};
            const name = props.name || '';
            const street = props.street || '';
            const housenumber = props.housenumber || '';
            const city = props.city || props.town || props.village || props.district || '';
            const state = props.state || props.county || '';
            const country = props.country || 'United Kingdom';
            const postcode = props.postcode || '';
            
            // UK address formatting
            const parts = [];
            if (housenumber && street) parts.push(`${housenumber} ${street}`);
            else if (street) parts.push(street);
            else if (name) parts.push(name);
            
            if (city) parts.push(city);
            if (state && state !== city) parts.push(state);
            if (postcode) parts.push(postcode);
            if (country && country.toLowerCase() !== 'united kingdom') parts.push(country);
            
            const displayName = parts.length > 0 ? parts.join(', ') : name || 'Location';
            const coordinates = feature.geometry?.coordinates || [];
            const lon = coordinates[0];
            const lat = coordinates[1];
            
            return {
              id: `${props.osm_id || props.place_id || 'loc'}-${index}`,
              display_name: displayName,
              lat: lat?.toString() || '0',
              lon: lon?.toString() || '0',
              type: props.osm_value || props.type || 'location',
              importance: props.importance || 0
            };
          });
          
          setSuggestions(formattedSuggestions);
          if (hasUserInteracted) {
            setShowSuggestions(true);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback location search also failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setShowSuggestions(newValue.length >= 3);
    // Clear any pending debounced call and call onChange immediately for validation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Call onChange immediately so validation can run right away
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setLocalValue(suggestion.display_name);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onChange(suggestion.display_name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onLocationSelect) {
      onLocationSelect(
        parseFloat(suggestion.lat),
        parseFloat(suggestion.lon),
        suggestion.display_name
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    // Re-open suggestions reliably on first focus, including prefilled values.
    if (localValue.length >= 3) {
      setShowSuggestions(true);
      if (suggestions.length === 0) {
        void searchLocations(localValue);
      }
    }
  };

  const handleInputBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      flushOnChange(localValue);
      debounceRef.current = null;
    }
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={cn(
            "pl-10 pr-10",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && localValue && (
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-[1200] w-full mt-1 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{ transform: 'translateZ(0)' }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={cn(
                "px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50",
                index === selectedIndex && "bg-blue-50"
              )}
              // Use mousedown so selection wins before input blur closes suggestions.
              onPointerDown={(event) => {
                event.preventDefault();
                handleSuggestionClick(suggestion);
              }}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.display_name.split(',')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.display_name.split(',').slice(1).join(',').trim()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};

export default SmartLocationPicker;
