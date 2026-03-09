import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  AddressData,
  AddressSuggestion,
  AddressValidationService,
} from '@/lib/address-validation';

interface AddressInputProps {
  value: AddressData | null;
  onChange: (address: AddressData | null) => void;
  onValidationChange?: (isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
  country?: 'GB' | 'US' | 'CA' | string;
}

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  onValidationChange,
  placeholder = 'Start typing your address…',
  className,
  error,
  id,
  country = 'GB',
}) => {
  const [query, setQuery] = useState(value?.formattedAddress || '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value?.formattedAddress || '');
  }, [value?.formattedAddress]);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await AddressValidationService.autocomplete(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const applySelection = async (suggestion: AddressSuggestion) => {
    const address: AddressData = {
      ...suggestion.address,
      country: country || suggestion.address.country,
    };

    const result = await AddressValidationService.validate(address);
    setValidationMessage(result.isValid ? null : result.message || null);
    onValidationChange?.(result.isValid);
    onChange(result.normalized || address);
    setQuery(address.formattedAddress);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    if (!newValue.trim()) {
      onChange(null);
      onValidationChange?.(false);
      setValidationMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          void applySelection(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            'pl-10 pr-10',
            (error || validationMessage) &&
              'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {suggestions.map((s, index) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                'flex w-full items-start px-3 py-2 text-left text-sm hover:bg-muted',
                index === selectedIndex && 'bg-muted',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                void applySelection(s);
              }}
            >
              <span className="line-clamp-2">{s.label}</span>
            </button>
          ))}
        </div>
      )}
      {(error || validationMessage) && (
        <p className="mt-1 text-xs text-red-500">
          {validationMessage || error}
        </p>
      )}
    </div>
  );
};

export default AddressInput;

