// Project Controller - handles project CRUD and member management

const db = require('../config/db');
const { isEmpty } = require('../utils/helpers');

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


async function addProjectMember(req, res) {
    try {
        const { id: projectId } = req.params;
        const { userId, userIds } = req.body;
        const { organization_id } = req.user;

        // Support both single userId and bulk userIds array
        const idsToAdd = userIds || (userId ? [userId] : []);

        if (idsToAdd.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User ID(s) required. Provide userId or userIds array.'
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

        const projectName = projectCheck.rows[0].name;

        // Verify all users exist and belong to the same organization
        const userCheck = await db.query(
            `SELECT id, first_name, last_name FROM users 
             WHERE id = ANY($1::uuid[]) AND organization_id = $2 AND status = 'approved'`,
            [idsToAdd, organization_id]
        );

        if (userCheck.rows.length !== idsToAdd.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more users not found or not approved.'
            });
        }

        // Insert members (ON CONFLICT DO NOTHING handles duplicates)
        const insertValues = idsToAdd.map((_, i) => `($1, $${i + 2})`).join(', ');
        await db.query(
            `INSERT INTO project_members (project_id, user_id) 
             VALUES ${insertValues}
             ON CONFLICT (project_id, user_id) DO NOTHING`,
            [projectId, ...idsToAdd]
        );

        // Create notifications for added users
        for (const addedUserId of idsToAdd) {
            await db.query(
                `INSERT INTO notifications (user_id, type, message, metadata)
                 VALUES ($1, 'project_added', $2, $3)`,
                [addedUserId, `You have been added to the project "${projectName}".`, JSON.stringify({ projectId })]
            );
        }

        const addedCount = idsToAdd.length;
        res.json({
            success: true,
            message: `${addedCount} member(s) added to the project.`
        });

    } catch (error) {
        console.error('Add project member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add member(s) to project.'
        });
    }
}

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
