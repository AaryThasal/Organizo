// ===========================================
// Project Task Routes (nested under projects)
// ===========================================
// These routes are mounted at /api/projects/:projectId/tasks

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :projectId
const taskController = require('../controllers/taskController');
const { requireRole } = require('../middlewares/roleMiddleware');

// GET /api/projects/:projectId/tasks
// Get all tasks for a project
// All approved project members can access
router.get('/', taskController.getProjectTasks);

// POST /api/projects/:projectId/tasks
// Create a new task in the project
// Admin and Manager only
router.post(
    '/',
    requireRole(['admin', 'manager']),
    taskController.createTask
);

module.exports = router;
