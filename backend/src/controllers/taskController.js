// ===========================================
// Task Controller
// ===========================================
// Handles task CRUD operations and status updates

const db = require('../config/db');
const { isEmpty } = require('../utils/helpers');

/**
 * Get all tasks for a project
 * GET /api/projects/:projectId/tasks
 */
async function getProjectTasks(req, res) {
    try {
        const { projectId } = req.params;
        const { organization_id, role, id: userId } = req.user;
        const { status, assignedTo } = req.query;

        // Verify project exists and belongs to the organization
        const projectCheck = await db.query(
            'SELECT id, name FROM projects WHERE id = $1 AND organization_id = $2',
            [projectId, organization_id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // For employees, verify they're a member of this project
        if (role === 'employee') {
            const memberCheck = await db.query(
                'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this project.'
                });
            }
        }

        // Build query
        let query = `
      SELECT t.*, 
             u.first_name as assignee_first_name, 
             u.last_name as assignee_last_name,
             c.first_name as creator_first_name,
             c.last_name as creator_last_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = $1
    `;
        const params = [projectId];

        // For employees, only show their tasks
        if (role === 'employee') {
            params.push(userId);
            query += ` AND (t.assigned_to = $${params.length} OR t.assigned_to IS NULL)`;
        }

        // Filter by status if provided
        if (status && ['to-do', 'in-progress', 'completed', 'on-hold'].includes(status)) {
            params.push(status);
            query += ` AND t.status = $${params.length}`;
        }

        // Filter by assigned user if provided (admin/manager only)
        if (assignedTo && role !== 'employee') {
            params.push(assignedTo);
            query += ` AND t.assigned_to = $${params.length}`;
        }

        query += ' ORDER BY t.created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get project tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tasks.'
        });
    }
}

/**
 * Get tasks assigned to the current user
 * GET /api/tasks/my-tasks
 */
async function getMyTasks(req, res) {
    try {
        const { id: userId, organization_id } = req.user;
        const { status, projectId } = req.query;

        let query = `
      SELECT t.*, 
             p.name as project_name,
             c.first_name as creator_first_name,
             c.last_name as creator_last_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.assigned_to = $1 AND p.organization_id = $2
    `;
        const params = [userId, organization_id];

        // Filter by status if provided
        if (status && ['to-do', 'in-progress', 'completed', 'on-hold'].includes(status)) {
            params.push(status);
            query += ` AND t.status = $${params.length}`;
        }

        // Filter by project if provided
        if (projectId) {
            params.push(projectId);
            query += ` AND t.project_id = $${params.length}`;
        }

        query += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tasks.'
        });
    }
}

/**
 * Get a single task by ID
 * GET /api/tasks/:id
 */
async function getTaskById(req, res) {
    try {
        const { id } = req.params;
        const { organization_id, role, id: userId } = req.user;

        const result = await db.query(
            `SELECT t.*, 
              p.name as project_name,
              u.first_name as assignee_first_name, 
              u.last_name as assignee_last_name,
              c.first_name as creator_first_name,
              c.last_name as creator_last_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users c ON t.created_by = c.id
       WHERE t.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found.'
            });
        }

        const task = result.rows[0];

        // For employees, verify they're assigned to this task or are a project member
        if (role === 'employee') {
            const memberCheck = await db.query(
                'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
                [task.project_id, userId]
            );

            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this task.'
                });
            }

            // Employees can only see their own tasks
            if (task.assigned_to !== userId && task.assigned_to !== null) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this task.'
                });
            }
        }

        res.json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error('Get task by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get task.'
        });
    }
}

/**
 * Create a new task
 * POST /api/projects/:projectId/tasks
 * Admin and Manager only
 */
async function createTask(req, res) {
    try {
        const { projectId } = req.params;
        const { title, description, assignedTo, dueDate, status } = req.body;
        const { organization_id, id: userId } = req.user;

        // Validate required fields
        if (isEmpty(title)) {
            return res.status(400).json({
                success: false,
                message: 'Task title is required.'
            });
        }

        // Verify project exists and belongs to the organization
        const projectCheck = await db.query(
            'SELECT id, name FROM projects WHERE id = $1 AND organization_id = $2',
            [projectId, organization_id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Validate status if provided
        const taskStatus = status || 'to-do';
        if (!['to-do', 'in-progress', 'completed', 'on-hold'].includes(taskStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: to-do, in-progress, completed, or on-hold.'
            });
        }

        // If assignedTo is provided, verify user exists and is a project member
        if (assignedTo) {
            const memberCheck = await db.query(
                'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, assignedTo]
            );

            if (memberCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'The assigned user is not a member of this project.'
                });
            }
        }

        // Create the task
        const result = await db.query(
            `INSERT INTO tasks (project_id, created_by, assigned_to, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [projectId, userId, assignedTo || null, title.trim(), description?.trim() || null, taskStatus, dueDate || null]
        );

        const task = result.rows[0];

        // Create notification for assigned user (if different from creator)
        if (assignedTo && assignedTo !== userId) {
            const projectName = projectCheck.rows[0].name;
            await db.query(
                `INSERT INTO notifications (user_id, type, message, metadata)
         VALUES ($1, 'task_assigned', $2, $3)`,
                [assignedTo, `You have been assigned a new task: "${title}" in project "${projectName}".`, JSON.stringify({ taskId: task.id, projectId })]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Task created successfully!',
            data: task
        });

    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create task.'
        });
    }
}

/**
 * Update a task
 * PUT /api/tasks/:id
 * Admin and Manager only
 */
async function updateTask(req, res) {
    try {
        const { id } = req.params;
        const { title, description, assignedTo, dueDate, status } = req.body;
        const { organization_id } = req.user;

        // Verify task exists and belongs to the organization
        const taskCheck = await db.query(
            `SELECT t.*, p.organization_id, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found.'
            });
        }

        const existingTask = taskCheck.rows[0];

        // Build update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (!isEmpty(title)) {
            params.push(title.trim());
            updates.push(`title = $${paramIndex++}`);
        }

        if (description !== undefined) {
            params.push(description?.trim() || null);
            updates.push(`description = $${paramIndex++}`);
        }

        if (assignedTo !== undefined) {
            // If assigning to someone, verify they're a project member
            if (assignedTo) {
                const memberCheck = await db.query(
                    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
                    [existingTask.project_id, assignedTo]
                );

                if (memberCheck.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'The assigned user is not a member of this project.'
                    });
                }
            }
            params.push(assignedTo || null);
            updates.push(`assigned_to = $${paramIndex++}`);
        }

        if (dueDate !== undefined) {
            params.push(dueDate || null);
            updates.push(`due_date = $${paramIndex++}`);
        }

        if (status) {
            if (!['to-do', 'in-progress', 'completed', 'on-hold'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: to-do, in-progress, completed, or on-hold.'
                });
            }
            params.push(status);
            updates.push(`status = $${paramIndex++}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update.'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, params);

        // If assignee changed, notify the new assignee
        if (assignedTo && assignedTo !== existingTask.assigned_to) {
            await db.query(
                `INSERT INTO notifications (user_id, type, message, metadata)
         VALUES ($1, 'task_assigned', $2, $3)`,
                [assignedTo, `You have been assigned a task: "${result.rows[0].title}" in project "${existingTask.project_name}".`, JSON.stringify({ taskId: id, projectId: existingTask.project_id })]
            );
        }

        res.json({
            success: true,
            message: 'Task updated successfully!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task.'
        });
    }
}

/**
 * Update task status only
 * PATCH /api/tasks/:id/status
 * Can be done by the assigned user
 */
async function updateTaskStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { organization_id, id: userId, role } = req.user;

        // Validate status
        if (!status || !['to-do', 'in-progress', 'completed', 'on-hold'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: to-do, in-progress, completed, or on-hold.'
            });
        }

        // Verify task exists
        const taskCheck = await db.query(
            `SELECT t.*, p.organization_id, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found.'
            });
        }

        const task = taskCheck.rows[0];

        // For employees, verify they're the assigned user
        if (role === 'employee' && task.assigned_to !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only update the status of tasks assigned to you.'
            });
        }

        const oldStatus = task.status;

        // Update the status
        const result = await db.query(
            'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );

        // If an employee updates a task, notify the project creator/managers
        if (role === 'employee' && oldStatus !== status) {
            // Get managers and admin of the organization
            const managersResult = await db.query(
                "SELECT id FROM users WHERE organization_id = $1 AND role IN ('admin', 'manager') AND status = 'approved'",
                [organization_id]
            );

            const currentUser = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
            const userName = `${currentUser.rows[0].first_name} ${currentUser.rows[0].last_name}`;

            for (const manager of managersResult.rows) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, message, metadata)
           VALUES ($1, 'task_status_changed', $2, $3)`,
                    [manager.id, `${userName} updated task "${task.title}" status to "${status}".`, JSON.stringify({ taskId: id, projectId: task.project_id, oldStatus, newStatus: status })]
                );
            }
        }

        res.json({
            success: true,
            message: `Task status updated to "${status}".`,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task status.'
        });
    }
}

/**
 * Delete a task
 * DELETE /api/tasks/:id
 * Admin and Manager only
 */
async function deleteTask(req, res) {
    try {
        const { id } = req.params;
        const { organization_id } = req.user;

        // Verify task exists and belongs to the organization
        const taskCheck = await db.query(
            `SELECT t.* 
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found.'
            });
        }

        // Delete the task
        await db.query('DELETE FROM tasks WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Task deleted successfully.'
        });

    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete task.'
        });
    }
}

module.exports = {
    getProjectTasks,
    getMyTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask
};
