// This file sets up Cloudinary for image uploads

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with your credentials
// These values come from your Cloudinary dashboard
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage to upload directly to Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'organizo-profiles', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' } // Auto-crop to face
        ],
    },
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create multer upload middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
});

// Helper to delete an image from Cloudinary
const deleteImage = async (publicId) => {
    try {
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
    }
};

// Extract public_id from Cloudinary URL for deletion
const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
    const matches = url.match(/\/organizo-profiles\/([^.]+)/);
    return matches ? `organizo-profiles/${matches[1]}` : null;
};

module.exports = {
    cloudinary,
    upload,
    deleteImage,
    getPublicIdFromUrl,
};
