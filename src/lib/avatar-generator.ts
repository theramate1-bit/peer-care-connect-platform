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

// Available avatar styles
export const AVATAR_STYLES: AvatarStyle[] = [
  {
    name: 'avataaars',
    displayName: 'Cartoon Style',
    url: 'https://api.dicebear.com/9.x/avataaars/svg',
    description: 'Friendly cartoon avatars with lots of customization options'
  },
  {
    name: 'personas',
    displayName: 'Professional Style',
    url: 'https://api.dicebear.com/9.x/personas/svg',
    description: 'More professional-looking avatars'
  },
  {
    name: 'pixelart',
    displayName: 'Pixel Art Style',
    url: 'https://api.dicebear.com/9.x/pixel-art/svg',
    description: 'Retro pixel art avatars'
  },
  {
    name: 'initials',
    displayName: 'Initials Style',
    url: 'https://api.dicebear.com/9.x/initials/svg',
    description: 'Simple initials-based avatars'
  }
];

// Default avatar preferences
export const DEFAULT_AVATAR_PREFERENCES: AvatarPreferences = {
  hairColor: 'brown',
  clothingColor: 'blue',
  accessories: [],
  backgroundColor: 'f0f0f0',
  skinColor: 'light',
  clothing: 'shirt',
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

// Available customization options
export const AVATAR_OPTIONS = {
  hairColors: [
    { value: 'auburn', label: 'Auburn' },
    { value: 'black', label: 'Black' },
    { value: 'blonde', label: 'Blonde' },
    { value: 'brown', label: 'Brown' },
    { value: 'pastel', label: 'Pastel' },
    { value: 'red', label: 'Red' },
    { value: 'gray', label: 'Gray' }
  ],
  clothingColors: [
    { value: 'black', label: 'Black' },
    { value: 'blue', label: 'Blue' },
    { value: 'gray', label: 'Gray' },
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'white', label: 'White' },
    { value: 'yellow', label: 'Yellow' }
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
    { value: 'light', label: 'Light' },
    { value: 'tanned', label: 'Tanned' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'pale', label: 'Pale' },
    { value: 'brown', label: 'Brown' },
    { value: 'dark', label: 'Dark' }
  ],
  clothing: [
    { value: 'blazer', label: 'Blazer' },
    { value: 'hoodie', label: 'Hoodie' },
    { value: 'shirt', label: 'Shirt' },
    { value: 'sweater', label: 'Sweater' },
    { value: 'tank', label: 'Tank Top' }
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
 * Generates a customized avatar URL using DiceBear API
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
  
  // Add preferences with correct DiceBear parameter names
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
  if (preferences.accessories && preferences.accessories.length > 0) {
    preferences.accessories.forEach(accessory => {
      params.append('accessories[]', accessory);
    });
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
