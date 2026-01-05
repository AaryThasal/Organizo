// Project Controller - handles project CRUD and member management

const db = require('../config/db');
const { isEmpty } = require('../utils/helpers');

// GET /api/projects
async function getProjects(req, res) {
    try {
        const { organization_id, role, id: userId } = req.user;
        const { status } = req.query;

        let query;
        let params = [organization_id];

        if (role === 'employee') {
            // Employees only see projects they're assigned to
            query = `
        SELECT p.*, 
               u.first_name as creator_first_name, 
               u.last_name as creator_last_name,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
               (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        INNER JOIN project_members pm ON p.id = pm.project_id
        WHERE p.organization_id = $1 AND pm.user_id = $2
      `;
            params.push(userId);
        } else {
            // Admin and Manager see all projects
            query = `
        SELECT p.*, 
               u.first_name as creator_first_name, 
               u.last_name as creator_last_name,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
               (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.organization_id = $1
      `;
        }

        // Filter by status if provided
        if (status && ['active', 'completed', 'on-hold'].includes(status)) {
            params.push(status);
            query += ` AND p.status = $${params.length}`;
        }

        query += ' ORDER BY p.created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get projects.'
        });
    }
}

/**
 * Get a single project by ID
 * GET /api/projects/:id
 */
async function getProjectById(req, res) {
    try {
        const { id } = req.params;
        const { organization_id, role, id: userId } = req.user;

        // Get project details
        const projectResult = await db.query(
            `SELECT p.*, 
              u.first_name as creator_first_name, 
              u.last_name as creator_last_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const project = projectResult.rows[0];

        // For employees, verify they're a member of this project
        if (role === 'employee') {
            const memberCheck = await db.query(
                'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
                [id, userId]
            );

            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this project.'
                });
            }
        }

        // Get project members
        const membersResult = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.role, pm.added_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.added_at ASC`,
            [id]
        );

        // Get task statistics
        const taskStats = await db.query(
            `SELECT status, COUNT(*) as count 
       FROM tasks 
       WHERE project_id = $1 
       GROUP BY status`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...project,
                members: membersResult.rows,
                taskStats: taskStats.rows
            }
        });

    } catch (error) {
        console.error('Get project by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get project.'
        });
    }
}

/**
 * Create a new project
 * POST /api/projects
 * Admin and Manager only
 */
async function createProject(req, res) {
    try {
        const { name, description, dueDate, status } = req.body;
        const { organization_id, id: userId } = req.user;

        // Validate required fields
        if (isEmpty(name)) {
            return res.status(400).json({
                success: false,
                message: 'Project name is required.'
            });
        }

        // Validate status if provided
        const projectStatus = status || 'active';
        if (!['active', 'completed', 'on-hold'].includes(projectStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: active, completed, or on-hold.'
            });
        }

        // Create the project
        const result = await db.query(
            `INSERT INTO projects (organization_id, created_by, name, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [organization_id, userId, name.trim(), description?.trim() || null, projectStatus, dueDate || null]
        );

        const project = result.rows[0];

        // Automatically add the creator as a project member
        await db.query(
            'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
            [project.id, userId]
        );

        res.status(201).json({
            success: true,
            message: 'Project created successfully!',
            data: project
        });

    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create project.'
        });
    }
}

/**
 * Update a project
 * PUT /api/projects/:id
 * Admin and Manager only
 */
async function updateProject(req, res) {
    try {
        const { id } = req.params;
        const { name, description, status, dueDate } = req.body;
        const { organization_id } = req.user;

        // Verify project exists and belongs to the organization
        const existingProject = await db.query(
            'SELECT * FROM projects WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );

        if (existingProject.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (!isEmpty(name)) {
            params.push(name.trim());
            updates.push(`name = $${paramIndex++}`);
        }

        if (description !== undefined) {
            params.push(description?.trim() || null);
            updates.push(`description = $${paramIndex++}`);
        }

        if (status) {
            if (!['active', 'completed', 'on-hold'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: active, completed, or on-hold.'
                });
            }
            params.push(status);
            updates.push(`status = $${paramIndex++}`);
        }

        if (dueDate !== undefined) {
            params.push(dueDate || null);
            updates.push(`due_date = $${paramIndex++}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update.'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const query = `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, params);

        res.json({
            success: true,
            message: 'Project updated successfully!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project.'
        });
    }
}

/**
 * Delete a project (and all its tasks)
 * DELETE /api/projects/:id
 * Admin and Manager only
 */
async function deleteProject(req, res) {
    try {
        const { id } = req.params;
        const { organization_id } = req.user;

        // Verify project exists and belongs to the organization
        const existingProject = await db.query(
            'SELECT * FROM projects WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );

        if (existingProject.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Delete the project (cascading will delete tasks and members)
        await db.query('DELETE FROM projects WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Project and all associated tasks deleted successfully.'
        });

    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete project.'
        });
    }
}

/**
 * Add a member to a project
 * POST /api/projects/:id/members
 * Admin and Manager only
 */
async function addProjectMember(req, res) {
    try {
        const { id: projectId } = req.params;
        const { userId } = req.body;
        const { organization_id } = req.user;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required.'
            });
        }

        // Verify project exists and belongs to the organization
        const projectCheck = await db.query(
            'SELECT id FROM projects WHERE id = $1 AND organization_id = $2',
            [projectId, organization_id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Verify user exists and belongs to the same organization
        const userCheck = await db.query(
            "SELECT id, first_name, last_name FROM users WHERE id = $1 AND organization_id = $2 AND status = 'approved'",
            [userId, organization_id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or not approved.'
            });
        }

        const user = userCheck.rows[0];

        // Check if user is already a member
        const memberCheck = await db.query(
            'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (memberCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User is already a member of this project.'
            });
        }

        // Add the member
        await db.query(
            'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
            [projectId, userId]
        );

        // Create notification for the user
        const projectName = (await db.query('SELECT name FROM projects WHERE id = $1', [projectId])).rows[0].name;
        await db.query(
            `INSERT INTO notifications (user_id, type, message, metadata)
       VALUES ($1, 'project_added', $2, $3)`,
            [userId, `You have been added to the project "${projectName}".`, JSON.stringify({ projectId })]
        );

        res.json({
            success: true,
            message: `${user.first_name} ${user.last_name} has been added to the project.`
        });

    } catch (error) {
        console.error('Add project member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add member to project.'
        });
    }
}

/**
 * Remove a member from a project
 * DELETE /api/projects/:id/members/:userId
 * Admin and Manager only
 * Note: This does NOT delete the user's tasks - they become unassigned
 */
async function removeProjectMember(req, res) {
    try {
        const { id: projectId, userId } = req.params;
        const { organization_id } = req.user;

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

        // Check if user is a member
        const memberCheck = await db.query(
            `SELECT pm.id, u.first_name, u.last_name 
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
            [projectId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User is not a member of this project.'
            });
        }

        const member = memberCheck.rows[0];

        // Remove the member (tasks are NOT deleted, just become unassigned)
        await db.query(
            'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        // Unassign tasks (set assigned_to to null)
        await db.query(
            'UPDATE tasks SET assigned_to = NULL, updated_at = CURRENT_TIMESTAMP WHERE project_id = $1 AND assigned_to = $2',
            [projectId, userId]
        );

        res.json({
            success: true,
            message: `${member.first_name} ${member.last_name} has been removed from the project. Their tasks are now unassigned.`
        });

    } catch (error) {
        console.error('Remove project member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member from project.'
        });
    }
}

/**
 * Get project members
 * GET /api/projects/:id/members
 */
async function getProjectMembers(req, res) {
    try {
        const { id: projectId } = req.params;
        const { organization_id, role, id: userId } = req.user;

        // Verify project exists
        const projectCheck = await db.query(
            'SELECT id FROM projects WHERE id = $1 AND organization_id = $2',
            [projectId, organization_id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // For employees, verify they're a member
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

        // Get members
        const result = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.role, pm.added_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.added_at ASC`,
            [projectId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get project members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get project members.'
        });
    }
}

module.exports = {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    addProjectMember,
    removeProjectMember,
    getProjectMembers
};
