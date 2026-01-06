// Project Routes

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

router.use(authenticateToken);
router.use(requireOrganization);
router.use(requireApproved);

// Get all projects (filtered by role)
router.get('/', projectController.getProjects);

// Create a new project
router.post(
    '/',
    requireRole(['admin', 'manager']),
    projectController.createProject
);

// Get a single project by ID
router.get('/:id', projectController.getProjectById);

// Update a project
router.put(
    '/:id',
    requireRole(['admin', 'manager']),
    projectController.updateProject
);

// Delete a project and tasks
router.delete(
    '/:id',
    requireRole(['admin', 'manager']),
    projectController.deleteProject
);

// Get project members
router.get('/:id/members', projectController.getProjectMembers);

// Add a member to a project
router.post(
    '/:id/members',
    requireRole(['admin', 'manager']),
    projectController.addProjectMember
);

// Remove a member from a project
router.delete(
    '/:id/members/:userId',
    requireRole(['admin', 'manager']),
    projectController.removeProjectMember
);

module.exports = router;
