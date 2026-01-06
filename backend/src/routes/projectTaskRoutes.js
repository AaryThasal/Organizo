// Project Task Routes (nested under projects)
// These routes are mounted at /api/projects/:projectId/tasks

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :projectId
const taskController = require('../controllers/taskController');
const { requireRole } = require('../middlewares/roleMiddleware');


// Get all tasks for a project
router.get('/', taskController.getProjectTasks);

// Create a new task in the project
router.post(
    '/',
    requireRole(['admin', 'manager']),
    taskController.createTask
);

module.exports = router;
