// Browser-compatible geocoding using OpenStreetMap Nominatim API
// No Node.js dependencies required

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  city?: string;
  country?: string;
  countryCode?: string;
}

export class GeocodingService {
  /**
   * Convert an address string to latitude and longitude coordinates
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  static async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      if (!address || address.trim() === '') {
        return null;
      }

      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TheraMate/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      
      if (results && results.length > 0) {
        const result = results[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name,
          city: result.address?.city || result.address?.town || result.address?.village,
          country: result.address?.country,
          countryCode: result.address?.country_code?.toUpperCase(),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Geocode multiple addresses in batch
   */
  static async geocodeAddresses(addresses: string[]): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();
    
    // Process addresses in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (address) => {
        const result = await this.geocodeAddress(address);
        if (result) {
          results.set(address, result);
        }
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  }

  /**
   * Reverse geocode coordinates to get address
   * Uses OpenStreetMap Nominatim API
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TheraMate/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result && result.lat && result.lon) {
        return result.display_name || null;
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}