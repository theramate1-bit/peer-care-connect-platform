-- Add avatar_preferences column to user_profiles table
-- This will store client avatar customization preferences

ALTER TABLE user_profiles 
ADD COLUMN avatar_preferences JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN user_profiles.avatar_preferences IS 'Stores avatar customization preferences for clients (hair color, clothing, accessories, etc.)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_preferences 
ON user_profiles USING GIN (avatar_preferences);
