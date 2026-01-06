-- Migration: Add profile_image_url to users table

-- Add the profile_image_url column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

SELECT 'Migration completed! profile_image_url column added.' as status;
