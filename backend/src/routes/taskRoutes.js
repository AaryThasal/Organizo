// ===========================================
// Task Routes
// ===========================================

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);
router.use(requireOrganization);
router.use(requireApproved);

// GET /api/tasks/my-tasks
// Get tasks assigned to the current user
// All approved users can access
router.get('/my-tasks', taskController.getMyTasks);

// GET /api/tasks/:id
// Get a single task by ID
// All approved users can access (employees only see their tasks)
router.get('/:id', taskController.getTaskById);

// PUT /api/tasks/:id
// Update a task (full update)
// Admin and Manager only
router.put(
    '/:id',
    requireRole(['admin', 'manager']),
    taskController.updateTask
);

// PATCH /api/tasks/:id/status
// Update task status only
// Any approved user can update status of tasks assigned to them
router.patch('/:id/status', taskController.updateTaskStatus);

// DELETE /api/tasks/:id
// Delete a task
// Admin and Manager only
router.delete(
    '/:id',
    requireRole(['admin', 'manager']),
    taskController.deleteTask
);

module.exports = router;
