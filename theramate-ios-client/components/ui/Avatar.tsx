/**
 * Avatar Component
 * User profile pictures with fallback initials
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { Colors } from '@/constants/colors';

interface AvatarProps {
  source?: string | ImageSourcePropType;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  verified?: boolean;
}

const sizeStyles = {
  xs: { container: 'w-6 h-6', text: 'text-xs', badge: 'w-2 h-2' },
  sm: { container: 'w-8 h-8', text: 'text-sm', badge: 'w-2.5 h-2.5' },
  md: { container: 'w-10 h-10', text: 'text-base', badge: 'w-3 h-3' },
  lg: { container: 'w-12 h-12', text: 'text-lg', badge: 'w-3.5 h-3.5' },
  xl: { container: 'w-16 h-16', text: 'text-xl', badge: 'w-4 h-4' },
  '2xl': { container: 'w-24 h-24', text: 'text-2xl', badge: 'w-5 h-5' },
};

// Generate pastel colors based on name
const getInitialsColor = (name: string): string => {
  const colors = [
    '#9BC19F', // Sage light
    '#D9A08E', // Terracotta light
    '#A0C4D9', // Blue light
    '#D9A0C4', // Pink light
    '#C4D9A0', // Green light
    '#D9C4A0', // Yellow light
  ];
  
  const charCode = name ? name.charCodeAt(0) + (name.charCodeAt(1) || 0) : 0;
  return colors[charCode % colors.length];
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0]?.substring(0, 2).toUpperCase() || '?';
};

export function Avatar({
  source,
  name = '',
  size = 'md',
  className = '',
  verified = false,
}: AvatarProps) {
  const sizeStyle = sizeStyles[size];
  const initials = getInitials(name);
  const bgColor = getInitialsColor(name);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [source]);

  const showPhoto =
    !!source && !loadFailed && (typeof source === 'string' ? source.length > 0 : true);

  return (
    <View className={`relative ${className}`}>
      {showPhoto ? (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          className={`${sizeStyle.container} rounded-full`}
          resizeMode="cover"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <View
          className={`${sizeStyle.container} rounded-full items-center justify-center`}
          style={{ backgroundColor: bgColor }}
        >
          <Text
            className={`${sizeStyle.text} font-semibold text-white`}
          >
            {initials}
          </Text>
        </View>
      )}

      {verified && (
        <View
          className={`
            absolute -bottom-0.5 -right-0.5
            ${sizeStyle.badge}
            rounded-full bg-sage-500
            border-2 border-white
            items-center justify-center
          `}
        >
          <Text className="text-white text-[6px]">✓</Text>
        </View>
      )}
    </View>
  );
}

// Avatar Group for showing multiple avatars
export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className = '',
}: {
  avatars: { source?: string; name?: string }[];
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <View className={`flex-row ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          style={{ marginLeft: index > 0 ? -8 : 0, zIndex: max - index }}
        >
          <Avatar
            source={avatar.source}
            name={avatar.name}
            size={size}
            className="border-2 border-white"
          />
        </View>
      ))}
      
      {remaining > 0 && (
        <View
          className={`
            ${sizeStyles[size].container}
            rounded-full bg-charcoal-200
            items-center justify-center
            border-2 border-white
          `}
          style={{ marginLeft: -8 }}
        >
          <Text className="text-xs font-medium text-charcoal-700">
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

export default Avatar;

