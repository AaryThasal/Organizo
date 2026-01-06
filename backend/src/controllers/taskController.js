// Task Controller - handles task CRUD with multiple assignees support

const db = require('../config/db');
const { isEmpty } = require('../utils/helpers');

// Get assignees for a task
async function getTaskAssignees(taskId) {
    const result = await db.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role
         FROM task_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = $1
         ORDER BY ta.assigned_at ASC`,
        [taskId]
    );
    return result.rows;
}

// Set assignees for a task (replaces existing)
async function setTaskAssignees(taskId, assigneeIds, projectId) {
    // Validate assignees are project members
    if (assigneeIds && assigneeIds.length > 0) {
        const memberCheck = await db.query(
            `SELECT user_id FROM project_members 
             WHERE project_id = $1 AND user_id = ANY($2::uuid[])`,
            [projectId, assigneeIds]
        );
        
        if (memberCheck.rows.length !== assigneeIds.length) {
            throw new Error('One or more assigned users are not members of this project.');
        }
    }

    // Remove existing assignees
    await db.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);

    // Add new assignees
    if (assigneeIds && assigneeIds.length > 0) {
        const values = assigneeIds.map((userId, index) => 
            `($1, $${index + 2})`
        ).join(', ');
        
        await db.query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ${values}`,
            [taskId, ...assigneeIds]
        );
    }
}

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
             c.first_name as creator_first_name,
             c.last_name as creator_last_name
      FROM tasks t
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = $1
    `;
        const params = [projectId];

        // For employees, only show tasks they're assigned to
        if (role === 'employee') {
            query = `
        SELECT DISTINCT t.*, 
               c.first_name as creator_first_name,
               c.last_name as creator_last_name
        FROM tasks t
        LEFT JOIN users c ON t.created_by = c.id
        LEFT JOIN task_assignees ta ON t.id = ta.task_id
        WHERE t.project_id = $1 AND (ta.user_id = $2 OR ta.user_id IS NULL)
      `;
            params.push(userId);
        }

        // Filter by status if provided
        if (status && ['to-do', 'in-progress', 'completed', 'on-hold'].includes(status)) {
            params.push(status);
            query += ` AND t.status = $${params.length}`;
        }

        // Filter by assigned user if provided (admin/manager only)
        if (assignedTo && role !== 'employee') {
            params.push(assignedTo);
            query += ` AND EXISTS (SELECT 1 FROM task_assignees ta2 WHERE ta2.task_id = t.id AND ta2.user_id = $${params.length})`;
        }

        query += ' ORDER BY t.created_at DESC';

        const result = await db.query(query, params);

        // Fetch assignees for each task
        const tasksWithAssignees = await Promise.all(
            result.rows.map(async (task) => {
                const assignees = await getTaskAssignees(task.id);
                return { ...task, assignees };
            })
        );

        res.json({
            success: true,
            data: tasksWithAssignees
        });

    } catch (error) {
        console.error('Get project tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tasks.'
        });
    }
}

async function getMyTasks(req, res) {
    try {
        const { id: userId, organization_id } = req.user;
        const { status, projectId } = req.query;

        let query = `
      SELECT DISTINCT t.*, 
             p.name as project_name,
             c.first_name as creator_first_name,
             c.last_name as creator_last_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE ta.user_id = $1 AND p.organization_id = $2
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

        // Fetch all assignees for each task
        const tasksWithAssignees = await Promise.all(
            result.rows.map(async (task) => {
                const assignees = await getTaskAssignees(task.id);
                return { ...task, assignees };
            })
        );

        res.json({
            success: true,
            data: tasksWithAssignees
        });

    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tasks.'
        });
    }
}

async function getTaskById(req, res) {
    try {
        const { id } = req.params;
        const { organization_id, role, id: userId } = req.user;

        const result = await db.query(
            `SELECT t.*, 
              p.name as project_name,
              c.first_name as creator_first_name,
              c.last_name as creator_last_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
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
        
        // Get all assignees for this task
        const assignees = await getTaskAssignees(task.id);
        task.assignees = assignees;

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

            // Check if user is assigned to this task
            const isAssigned = assignees.some(a => a.id === userId);
            if (!isAssigned && assignees.length > 0) {
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


async function createTask(req, res) {
    try {
        const { projectId } = req.params;
        const { title, description, assignedTo, assignees, dueDate, status } = req.body;
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

        // Determine assignee list 
        let assigneeIds = [];
        if (assignees && Array.isArray(assignees)) {
            assigneeIds = assignees.filter(id => id); 
        } else if (assignedTo) {
            assigneeIds = [assignedTo];
        }

        // Validate assignees are project members
        if (assigneeIds.length > 0) {
            const memberCheck = await db.query(
                `SELECT user_id FROM project_members 
                 WHERE project_id = $1 AND user_id = ANY($2::uuid[])`,
                [projectId, assigneeIds]
            );

            if (memberCheck.rows.length !== assigneeIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more assigned users are not members of this project.'
                });
            }
        }

        // Create the task
        const result = await db.query(
            `INSERT INTO tasks (project_id, created_by, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [projectId, userId, title.trim(), description?.trim() || null, taskStatus, dueDate || null]
        );

        const task = result.rows[0];

        // Add assignees to junction table
        if (assigneeIds.length > 0) {
            await setTaskAssignees(task.id, assigneeIds, projectId);
        }

        // Fetch the assignees to return
        const taskAssignees = await getTaskAssignees(task.id);
        task.assignees = taskAssignees;

        // Create notifications for assigned users (if different from creator)
        const projectName = projectCheck.rows[0].name;
        for (const assigneeId of assigneeIds) {
            if (assigneeId !== userId) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, message, metadata)
             VALUES ($1, 'task_assigned', $2, $3)`,
                    [assigneeId, `You have been assigned a new task: "${title}" in project "${projectName}".`, JSON.stringify({ taskId: task.id, projectId })]
                );
            }
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

async function updateTask(req, res) {
    try {
        const { id } = req.params;
        const { title, description, assignedTo, assignees, dueDate, status } = req.body;
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

        // Build update query for task fields
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

        // Handle assignees update
        let newAssigneeIds = null;
        if (assignees !== undefined && Array.isArray(assignees)) {
            newAssigneeIds = assignees.filter(id => id);
        } else if (assignedTo !== undefined) {
            // Backward compatibility: single assignee
            newAssigneeIds = assignedTo ? [assignedTo] : [];
        }

        // Update assignees if provided
        if (newAssigneeIds !== null) {
            // Get current assignees for comparison
            const currentAssignees = await getTaskAssignees(id);
            const currentAssigneeIds = currentAssignees.map(a => a.id);
            
            try {
                await setTaskAssignees(id, newAssigneeIds, existingTask.project_id);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            // Find newly added assignees for notifications
            const newlyAdded = newAssigneeIds.filter(id => !currentAssigneeIds.includes(id));
            
            for (const assigneeId of newlyAdded) {
                await db.query(
                    `INSERT INTO notifications (user_id, type, message, metadata)
             VALUES ($1, 'task_assigned', $2, $3)`,
                    [assigneeId, `You have been assigned a task: "${existingTask.title}" in project "${existingTask.project_name}".`, JSON.stringify({ taskId: id, projectId: existingTask.project_id })]
                );
            }
        }

        // Update task if there are field changes
        let updatedTask;
        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
            const result = await db.query(query, params);
            updatedTask = result.rows[0];
        } else {
            updatedTask = existingTask;
        }

        // Get updated assignees
        updatedTask.assignees = await getTaskAssignees(id);

        res.json({
            success: true,
            message: 'Task updated successfully!',
            data: updatedTask
        });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task.'
        });
    }
}

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

        // For employees, verify they're assigned to this task
        if (role === 'employee') {
            const assigneeCheck = await db.query(
                'SELECT id FROM task_assignees WHERE task_id = $1 AND user_id = $2',
                [id, userId]
            );
            
            if (assigneeCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only update the status of tasks assigned to you.'
                });
            }
        }

        const oldStatus = task.status;

        // Update the status
        const result = await db.query(
            'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );

        // If an employee updates a task, notify the project creator/managers
        if (role === 'employee' && oldStatus !== status) {
            
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
