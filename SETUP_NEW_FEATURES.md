# Setup Guide for New Features

This guide explains how to set up the two new features:
1. Bulk Employee Assignment to Projects
2. Profile Picture Upload with Cloudinary

---

## 1. BULK EMPLOYEE ASSIGNMENT

This feature is ready to use! No additional setup required.

### How it works:
- When adding members to a project, you can now select **multiple employees** at once
- Uses checkboxes instead of a dropdown
- Duplicates are automatically ignored by the database

---

## 2. PROFILE PICTURE UPLOAD WITH CLOUDINARY

### Step 1: Install Required Packages

Run this command in the backend folder:

```bash
cd backend
npm install multer cloudinary multer-storage-cloudinary
```

**Package explanations:**
- `multer` - Handles file uploads in Express
- `cloudinary` - Cloudinary SDK for Node.js
- `multer-storage-cloudinary` - Connects multer directly to Cloudinary

---

### Step 2: Create a Cloudinary Account

1. Go to https://cloudinary.com and sign up (free tier available)
2. After signup, go to your **Dashboard**
3. You'll see your credentials:
   - Cloud Name
   - API Key
   - API Secret

---

### Step 3: Add Environment Variables

Add these lines to your `backend/.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

Replace the values with your actual Cloudinary credentials from Step 2.

---

### Step 4: Run Database Migration

Run this SQL command to add the profile_image_url column:

**Option A: Using psql**
```bash
psql -d your_database_name -f backend/src/config/migration_profile_image.sql
```

**Option B: Run manually in your database client**
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
```

---

### Step 5: Restart the Backend Server

```bash
cd backend
npm run dev
```

---

## Testing the Features

### Test Bulk Assignment:
1. Go to any project detail page
2. Click "Add Member"
3. Select multiple employees using checkboxes
4. Click "Add Members"
5. All selected employees should be added at once

### Test Profile Image Upload:
1. Go to Settings page
2. Click "Upload Photo" button
3. Select an image from your computer
4. Preview will appear
5. Click "Upload Image"
6. Your profile picture should update in the navbar and settings

---

## Files Changed

### Backend:
- `src/config/cloudinary.js` - NEW: Cloudinary configuration
- `src/config/init.sql` - Added profile_image_url column
- `src/config/migration_profile_image.sql` - NEW: Migration file
- `src/controllers/projectController.js` - Updated addProjectMember for bulk
- `src/controllers/userController.js` - Added image upload/remove functions
- `src/routes/userRoutes.js` - Added image routes
- `src/middlewares/authMiddleware.js` - Include profile_image_url in user data

### Frontend:
- `src/components/ui/Avatar.jsx` - Shows image if available
- `src/components/navigation/Navbar.jsx` - Pass profileImageUrl to Avatar
- `src/pages/settings/SettingsPage.jsx` - Image upload UI
- `src/pages/projects/ProjectDetailPage.jsx` - Multi-select for members
- `src/store/projectSlice.js` - Support userIds array

---

## Troubleshooting

### "Cannot find module 'cloudinary'"
Run: `npm install cloudinary multer multer-storage-cloudinary`

### "CLOUDINARY_CLOUD_NAME is undefined"
Check your `.env` file has the correct variable names

### Image upload fails with "Only image files allowed"
Make sure you're selecting a valid image file (JPG, PNG, GIF, WebP)

### Database error about profile_image_url column
Run the migration SQL command from Step 4
