// This file sets up Cloudinary for image uploads

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

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

// Configure storage for organization logos (separate folder, no face gravity)
const logoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'organizo-logos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'center' }
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

// Create multer upload middleware for organization logos
const logoUpload = multer({
    storage: logoStorage,
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
    
    // Match both profile and logo folders
    const profileMatch = url.match(/\/organizo-profiles\/([^.]+)/);
    if (profileMatch) return `organizo-profiles/${profileMatch[1]}`;
    
    const logoMatch = url.match(/\/organizo-logos\/([^.]+)/);
    if (logoMatch) return `organizo-logos/${logoMatch[1]}`;
    
    return null;
};

module.exports = {
    cloudinary,
    upload,
    logoUpload,
    deleteImage,
    getPublicIdFromUrl,
};
