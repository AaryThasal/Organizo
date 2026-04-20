-- Migration: Add logo_url to organizations table

-- Add the logo_url column for organization branding
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

SELECT 'Migration completed! logo_url column added to organizations.' as status;
