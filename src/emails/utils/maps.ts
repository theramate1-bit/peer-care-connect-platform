/**
 * Generate Google Maps URL for a location
 */
export function generateGoogleMapsUrl(location: string): string {
  if (!location || location.trim() === '') {
    return '#';
  }
  
  const encodedLocation = encodeURIComponent(location);
  return `https://maps.google.com/maps?q=${encodedLocation}`;
}

/**
 * Generate Apple Maps URL for a location
 * This will open in Apple Maps on iOS devices, and fallback to web on other platforms
 */
export function generateAppleMapsUrl(location: string): string {
  if (!location || location.trim() === '') {
    return '#';
  }
  
  const encodedLocation = encodeURIComponent(location);
  // Apple Maps URL scheme - opens in Apple Maps on iOS, web version on other platforms
  return `https://maps.apple.com/?q=${encodedLocation}`;
}

/**
 * Generate a universal maps URL that works on both iOS and other platforms
 * iOS devices will open in Apple Maps, others will open in Google Maps
 */
export function generateMapsUrl(location: string): string {
  if (!location || location.trim() === '') {
    return '#';
  }
  
  // Use Apple Maps URL as it's universal - opens Apple Maps on iOS, Google Maps web on others
  return generateAppleMapsUrl(location);
}

