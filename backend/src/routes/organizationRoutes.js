// ===========================================
// Organization Routes
// ===========================================

const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);

// GET /api/organization
// Get organization details
// Any approved user can view
router.get(
    '/',
    requireOrganization,
    requireApproved,
    organizationController.getOrganization
);

// PUT /api/organization
// Update organization name
// Admin only
router.put(
    '/',
    requireOrganization,
    requireRole(['admin']),
    organizationController.updateOrganization
);

// GET /api/organization/join-code
// Get the organization join code
// Admin only
router.get(
    '/join-code',
    requireOrganization,
    requireRole(['admin']),
    organizationController.getJoinCode
);

// POST /api/organization/regenerate-code
// Regenerate the organization join code
// Admin only
router.post(
    '/regenerate-code',
    requireOrganization,
    requireRole(['admin']),
    organizationController.regenerateJoinCode
);

module.exports = router;
