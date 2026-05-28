/**
 * Avatar Generator Utility
 * 
 * Generates customized avatar URLs using DiceBear API
 * with user preferences for clients
 */

export interface AvatarPreferences {
  hairColor?: string;
  clothingColor?: string;
  accessories?: string[];
  backgroundColor?: string;
  skinColor?: string;
  clothing?: string;
  hairStyle?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  flip?: boolean;
  rotate?: number;
  scale?: number;
}

export interface AvatarStyle {
  name: string;
  displayName: string;
  url: string;
  description: string;
}

// Available avatar styles - Updated to use stable v7 API
export const AVATAR_STYLES: AvatarStyle[] = [
  {
    name: 'avataaars',
    displayName: 'Cartoon Style',
    url: 'https://api.dicebear.com/7.x/avataaars/svg',
    description: 'Friendly cartoon avatars with lots of customization options'
  },
  {
    name: 'personas',
    displayName: 'Professional Style',
    url: 'https://api.dicebear.com/7.x/personas/svg',
    description: 'More professional-looking avatars'
  },
  {
    name: 'pixelart',
    displayName: 'Pixel Art Style',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg',
    description: 'Retro pixel art avatars'
  },
  {
    name: 'initials',
    displayName: 'Initials Style',
    url: 'https://api.dicebear.com/7.x/initials/svg',
    description: 'Simple initials-based avatars'
  }
];

// Default avatar preferences - Updated with hex color codes
export const DEFAULT_AVATAR_PREFERENCES: AvatarPreferences = {
  hairColor: '8B4513', // Brown
  clothingColor: '0066CC', // Blue
  accessories: [],
  backgroundColor: 'f0f0f0',
  skinColor: 'FDBB2D', // Light
  clothing: undefined, // Remove invalid clothing value
  hairStyle: 'short',
  eyes: 'default',
  eyebrows: 'default',
  mouth: 'default',
  flip: false,
  rotate: 0,
  scale: 1
};

// Test function to debug avatar generation
export function testAvatarGeneration() {
  const testUrl = generateAvatarUrl('testuser', DEFAULT_AVATAR_PREFERENCES);
  console.log('Test avatar URL:', testUrl);
  return testUrl;
}

// Simple test with minimal parameters
export function testSimpleAvatar() {
  const simpleUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser';
  console.log('Simple test URL:', simpleUrl);
  return simpleUrl;
}

// Available customization options - Updated with hex color codes for DiceBear v7
export const AVATAR_OPTIONS = {
  hairColors: [
    { value: 'A55728', label: 'Auburn' },
    { value: '2C1B18', label: 'Black' },
    { value: 'F8D25C', label: 'Blonde' },
    { value: '8B4513', label: 'Brown' },
    { value: 'FFB6C1', label: 'Pastel Pink' },
    { value: 'DC143C', label: 'Red' },
    { value: '808080', label: 'Gray' }
  ],
  clothingColors: [
    { value: '000000', label: 'Black' },
    { value: '0066CC', label: 'Blue' },
    { value: '808080', label: 'Gray' },
    { value: '00AA00', label: 'Green' },
    { value: 'CC0000', label: 'Red' },
    { value: 'FFFFFF', label: 'White' },
    { value: 'FFD700', label: 'Yellow' }
  ],
  accessories: [
    { value: 'sunglasses', label: 'Sunglasses' },
    { value: 'eyepatch', label: 'Eyepatch' },
    { value: 'hat', label: 'Hat' },
    { value: 'mask', label: 'Mask' },
    { value: 'prescription01', label: 'Glasses' },
    { value: 'prescription02', label: 'Reading Glasses' }
  ],
  skinColors: [
    { value: 'FDBB2D', label: 'Light' },
    { value: 'FD8D3C', label: 'Tanned' },
    { value: 'FED976', label: 'Yellow' },
    { value: 'F7F7F7', label: 'Pale' },
    { value: 'D08B5B', label: 'Brown' },
    { value: '8D5524', label: 'Dark' }
  ],
  clothing: [
    // Note: Clothing options are disabled until we find valid values
    // { value: 'blazer', label: 'Blazer' },
    // { value: 'hoodie', label: 'Hoodie' },
    // { value: 'sweater', label: 'Sweater' },
    // { value: 'tank', label: 'Tank Top' },
    // { value: 'graphicShirt', label: 'Graphic Shirt' }
  ],
  hairStyles: [
    { value: 'short', label: 'Short' },
    { value: 'long', label: 'Long' },
    { value: 'bun', label: 'Bun' },
    { value: 'buzz', label: 'Buzz Cut' },
    { value: 'curly', label: 'Curly' },
    { value: 'straight', label: 'Straight' }
  ]
};

/**
 * Generates a customized avatar URL using DiceBear API v7
 */
export function generateAvatarUrl(
  seed: string,
  preferences: AvatarPreferences = DEFAULT_AVATAR_PREFERENCES,
  style: string = 'avataaars'
): string {
  const baseUrl = AVATAR_STYLES.find(s => s.name === style)?.url || AVATAR_STYLES[0].url;
  const params = new URLSearchParams();
  
  // Add seed
  params.append('seed', seed);
  
  // Add preferences with correct DiceBear v7 parameter names
  if (preferences.hairColor) {
    params.append('hair', preferences.hairColor);
  }
  if (preferences.clothingColor) {
    params.append('clothingColor', preferences.clothingColor);
  }
  if (preferences.skinColor) {
    params.append('skin', preferences.skinColor);
  }
  if (preferences.backgroundColor) {
    params.append('backgroundColor', preferences.backgroundColor);
  }
  if (preferences.clothing) {
    params.append('clothing', preferences.clothing);
  }
  if (preferences.hairStyle) {
    params.append('hairStyle', preferences.hairStyle);
  }
  if (preferences.accessories && preferences.accessories.length > 0) {
    // For v7 API, accessories are comma-separated
    params.append('accessories', preferences.accessories.join(','));
  }
  
  // Add cache-busting parameter to force browser reload
  params.append('_t', Date.now().toString());
  
  const finalUrl = `${baseUrl}?${params.toString()}`;
  console.log('🎨 Generated avatar URL:', finalUrl);
  console.log('🎨 Preferences:', preferences);
  return finalUrl;
}

/**
 * Generates a simple avatar URL without customization
 */
export function generateSimpleAvatarUrl(firstName: string, lastName: string): string {
  return generateAvatarUrl(`${firstName}${lastName}`, DEFAULT_AVATAR_PREFERENCES);
}

/**
 * Merges user preferences with defaults
 */
export function mergeAvatarPreferences(
  userPreferences: Partial<AvatarPreferences> = {}
): AvatarPreferences {
  return {
    ...DEFAULT_AVATAR_PREFERENCES,
    ...userPreferences
  };
}

/**
 * Validates avatar preferences
 */
export function validateAvatarPreferences(preferences: any): AvatarPreferences {
  const validPreferences: AvatarPreferences = {};
  
  // Validate each preference
  if (preferences.hairColor && typeof preferences.hairColor === 'string') {
    validPreferences.hairColor = preferences.hairColor;
  }
  
  if (preferences.clothingColor && typeof preferences.clothingColor === 'string') {
    validPreferences.clothingColor = preferences.clothingColor;
  }
  
  if (preferences.accessories && Array.isArray(preferences.accessories)) {
    validPreferences.accessories = preferences.accessories;
  }
  
  if (preferences.backgroundColor && typeof preferences.backgroundColor === 'string') {
    validPreferences.backgroundColor = preferences.backgroundColor;
  }
  
  if (preferences.skinColor && typeof preferences.skinColor === 'string') {
    validPreferences.skinColor = preferences.skinColor;
  }
  
  if (preferences.clothing && typeof preferences.clothing === 'string') {
    validPreferences.clothing = preferences.clothing;
  }
  
  if (preferences.hairStyle && typeof preferences.hairStyle === 'string') {
    validPreferences.hairStyle = preferences.hairStyle;
  }
  
  if (preferences.eyes && typeof preferences.eyes === 'string') {
    validPreferences.eyes = preferences.eyes;
  }
  
  if (preferences.eyebrows && typeof preferences.eyebrows === 'string') {
    validPreferences.eyebrows = preferences.eyebrows;
  }
  
  if (preferences.mouth && typeof preferences.mouth === 'string') {
    validPreferences.mouth = preferences.mouth;
  }
  
  if (typeof preferences.flip === 'boolean') {
    validPreferences.flip = preferences.flip;
  }
  
  if (typeof preferences.rotate === 'number') {
    validPreferences.rotate = preferences.rotate;
  }
  
  if (typeof preferences.scale === 'number') {
    validPreferences.scale = preferences.scale;
  }
  
  return validPreferences;
}
