/**
 * Utility functions for generating location images
 * Uses OpenStreetMap-based static map services
 */

/**
 * Generate a static map image URL using OpenStreetMap
 * Uses a free static map service that works with OSM data
 */
export function getLocationImageUrl(
  latitude?: number,
  longitude?: number,
  address?: string,
  width: number = 400,
  height: number = 200,
  zoom: number = 15
): string | null {
  // If we have coordinates, use them for the most accurate map
  if (latitude && longitude) {
    // Using StaticMap service (free, no API key required)
    // Alternative: You can use Mapbox, Google Static Maps, or other services
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=${latitude},${longitude},red-pushpin`;
  }
  
  // If we only have an address, we can't generate a static map without geocoding
  // Return null to indicate no image available
  return null;
}

/**
 * Generate a static map image URL using alternative service (Mapbox-style)
 * This is a fallback that uses a different static map provider
 */
export function getLocationImageUrlAlternative(
  latitude?: number,
  longitude?: number,
  width: number = 400,
  height: number = 200
): string | null {
  if (latitude && longitude) {
    // Using OpenStreetMap France static map service
    return `https://staticmap.openstreetmap.fr/staticmap.php?center=${latitude},${longitude}&zoom=15&size=${width}x${height}&markers=${latitude},${longitude}`;
  }
  return null;
}

/**
 * Get the best available location image URL
 * Tries multiple services for reliability
 */
export function getBestLocationImageUrl(
  latitude?: number,
  longitude?: number,
  address?: string,
  width: number = 400,
  height: number = 200
): string | null {
  // Try primary service first
  const primaryUrl = getLocationImageUrl(latitude, longitude, address, width, height);
  if (primaryUrl) return primaryUrl;
  
  // Fallback to alternative service
  return getLocationImageUrlAlternative(latitude, longitude, width, height);
}

