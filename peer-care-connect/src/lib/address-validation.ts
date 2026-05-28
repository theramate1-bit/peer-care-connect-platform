export interface AddressData {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  address: AddressData;
}

export interface AddressValidationResult {
  isValid: boolean;
  normalized?: AddressData;
  message?: string;
}

const UK_POSTCODE_PATTERN =
  /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/;

/**
 * Ensures an address is detailed enough for geocoding/travel radius calculations.
 * Rejects generic place-only values (e.g. just a town/city).
 */
export function validateDetailedStreetAddress(address: string | null | undefined): AddressValidationResult {
  const value = address?.trim() || '';

  if (!value) {
    return {
      isValid: false,
      message: 'Address is required.',
    };
  }

  const hasStreetNumber = /\d/.test(value);
  const hasUkPostcode = UK_POSTCODE_PATTERN.test(value);
  const hasCommaParts = value.split(',').map((part) => part.trim()).filter(Boolean).length >= 2;

  if (!hasStreetNumber && !hasUkPostcode) {
    return {
      isValid: false,
      message: 'Please enter a full base address (street + postcode), not just a town/city.',
    };
  }

  if (!hasCommaParts && !hasUkPostcode) {
    return {
      isValid: false,
      message: 'Please select a full address from the suggestions for accurate results.',
    };
  }

  return { isValid: true };
}

/**
 * AddressValidationService
 *
 * Initial implementation is provider-agnostic and uses existing
 * Photon/Nominatim-style data to build structured address fields.
 * This can later be swapped to a provider like Loqate/GetAddress.io
 * behind the same interface.
 */
export class AddressValidationService {
  static async autocomplete(query: string): Promise<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    // Use proxy in production, direct API in development
    const isDev = import.meta.env.DEV;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiUrl = isDev
      ? `/api/photon/?q=${encodeURIComponent(query)}&limit=5&lang=en`
      : `${supabaseUrl}/functions/v1/location-proxy?q=${encodeURIComponent(query)}&limit=5&lang=en`;
    
    const response = await fetch(apiUrl, {
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

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const features = data.features || [];

    // Filter and prioritize UK addresses
    const ukFeatures = features.filter((feature: any) => {
      const country = feature.properties?.country?.toLowerCase() || '';
      return country === 'united kingdom' || country === 'gb' || country === 'great britain';
    });
    
    const resultsToUse = ukFeatures.length > 0 ? ukFeatures : features.slice(0, 5);

    return resultsToUse.map((feature: any, index: number) => {
      const props = feature.properties || {};
      const name = props.name || '';
      const street = props.street || '';
      const housenumber = props.housenumber || '';
      const city = props.city || props.town || props.village || props.district || '';
      const state = props.state || props.county || '';
      const country = props.country || 'United Kingdom';
      const postcode = props.postcode || '';

      // UK address formatting - line1 for street address
      const line1Parts: string[] = [];
      if (housenumber && street) line1Parts.push(`${housenumber} ${street}`);
      else if (street) line1Parts.push(street);
      else if (name) line1Parts.push(name);

      const line1 = line1Parts.join(' ').trim();

      // Display format for UK addresses
      const displayParts: string[] = [];
      if (line1) displayParts.push(line1);
      if (city) displayParts.push(city);
      if (state && state !== city) displayParts.push(state);
      if (postcode) displayParts.push(postcode);
      if (country && country.toLowerCase() !== 'united kingdom') displayParts.push(country);

      const formattedAddress =
        displayParts.length > 0 ? displayParts.join(', ') : props.name || 'Location';

      const coordinates = feature.geometry?.coordinates || [];
      const lon = coordinates[0];
      const lat = coordinates[1];

      const address: AddressData = {
        line1,
        line2: undefined,
        city,
        county: state || undefined,
        postcode,
        country: country || 'United Kingdom',
        latitude: typeof lat === 'number' ? lat : undefined,
        longitude: typeof lon === 'number' ? lon : undefined,
        formattedAddress,
      };

      return {
        id: `${props.osm_id || props.place_id || 'addr'}-${index}`,
        label: formattedAddress,
        address,
      };
    });
  }

  static async validate(address: AddressData): Promise<AddressValidationResult> {
    // Initial implementation: basic completeness + postcode format check.
    // This can be replaced with a provider-backed validation later.
    if (!address.line1 || !address.city || !address.postcode) {
      return {
        isValid: false,
        message: 'Address is incomplete. Please provide street, city and postcode.',
      };
    }

    // Simple UK postcode pattern (not exhaustive but prevents obvious errors)
    const isUk = address.country.toUpperCase() === 'GB' || address.country.toLowerCase().includes('united kingdom');

    if (isUk && !UK_POSTCODE_PATTERN.test(address.postcode.trim())) {
      return {
        isValid: false,
        message: 'Postcode does not appear to be a valid UK postcode format.',
      };
    }

    return {
      isValid: true,
      normalized: address,
    };
  }
}
