// set up and run the Express server
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import route files
const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const projectTaskRoutes = require('./routes/projectTaskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import middleware
const { authenticateToken } = require('./middlewares/authMiddleware');
const { requireOrganization, requireApproved } = require('./middlewares/roleMiddleware');

// Create Express app
const app = express();

// Trust reverse proxy (required for express-rate-limit to correctly read client IPs via X-Forwarded-For)
app.set('trust proxy', 1);

// Enable CORS for frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Organizo API is running!',
        timestamp: new Date().toISOString()
    });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Organization routes
app.use('/api/organization', organizationRoutes);

// User routes
app.use('/api/users', userRoutes);

// Project routes
app.use('/api/projects', projectRoutes);

// Nested task routes under projects
// Mount these AFTER the main project routes
app.use(
    '/api/projects/:projectId/tasks',
    authenticateToken,
    requireOrganization,
    requireApproved,
    projectTaskRoutes
);

// Task routes (for individual task operations)
app.use('/api/tasks', taskRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);


// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found.`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
    });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('');
    console.log('===========================================');
    console.log('  🚀 Organizo API Server');
    console.log('===========================================');
    console.log(`  ✅ Server running on port ${PORT}`);
    console.log(`  📍 Local: http://localhost:${PORT}`);
    console.log(`  📍 Health: http://localhost:${PORT}/api/health`);
    console.log('===========================================');
    console.log('');
});

module.exports = app;
