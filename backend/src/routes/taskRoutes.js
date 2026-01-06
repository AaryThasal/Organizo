const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);
router.use(requireOrganization);
router.use(requireApproved);

// Get tasks assigned to the current user
router.get('/my-tasks', taskController.getMyTasks);

// Get a single task by ID
router.get('/:id', taskController.getTaskById);

// Update a task (full update)
router.put(
    '/:id',
    requireRole(['admin', 'manager']),
    taskController.updateTask
);

// Update task status only
router.patch('/:id/status', taskController.updateTaskStatus);

// Delete a task
router.delete(
    '/:id',
    requireRole(['admin', 'manager']),
    taskController.deleteTask
);

module.exports = router;
