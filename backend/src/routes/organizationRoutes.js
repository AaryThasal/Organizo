// Organization Routes

const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get organization details
// Any approved user can view
router.get(
    '/',
    requireOrganization,
    requireApproved,
    organizationController.getOrganization
);

// Update organization name
router.put(
    '/',
    requireOrganization,
    requireRole(['admin']),
    organizationController.updateOrganization
);

// Get the organization join code
router.get(
    '/join-code',
    requireOrganization,
    requireRole(['admin']),
    organizationController.getJoinCode
);

// Regenerate the organization join code
router.post(
    '/regenerate-code',
    requireOrganization,
    requireRole(['admin']),
    organizationController.regenerateJoinCode
);

module.exports = router;
