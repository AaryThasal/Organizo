// ===========================================
// Project Routes
// ===========================================

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);
router.use(requireOrganization);
router.use(requireApproved);

// GET /api/projects
// Get all projects (filtered by role)
// All approved users can access
router.get('/', projectController.getProjects);

// POST /api/projects
// Create a new project
// Admin and Manager only
router.post(
    '/',
    requireRole(['admin', 'manager']),
    projectController.createProject
);

// GET /api/projects/:id
// Get a single project by ID
// All approved users can access (employees only see their projects)
router.get('/:id', projectController.getProjectById);

// PUT /api/projects/:id
// Update a project
// Admin and Manager only
router.put(
    '/:id',
    requireRole(['admin', 'manager']),
    projectController.updateProject
);

// DELETE /api/projects/:id
// Delete a project (and all its tasks)
// Admin and Manager only
router.delete(
    '/:id',
    requireRole(['admin', 'manager']),
    projectController.deleteProject
);

// GET /api/projects/:id/members
// Get project members
// All approved users can access (employees only for their projects)
router.get('/:id/members', projectController.getProjectMembers);

// POST /api/projects/:id/members
// Add a member to a project
// Admin and Manager only
router.post(
    '/:id/members',
    requireRole(['admin', 'manager']),
    projectController.addProjectMember
);

// DELETE /api/projects/:id/members/:userId
// Remove a member from a project
// Admin and Manager only
router.delete(
    '/:id/members/:userId',
    requireRole(['admin', 'manager']),
    projectController.removeProjectMember
);

module.exports = router;
