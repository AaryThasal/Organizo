// Organization Controller - handles organization CRUD

const db = require('../config/db');
const { generateJoinCode } = require('../utils/helpers');

async function getOrganization(req, res) {
    try {
        const organizationId = req.user.organization_id;

        if (!organizationId) {
            return res.status(404).json({
                success: false,
                message: 'You do not belong to any organization.'
            });
        }

        const orgResult = await db.query(
            'SELECT id, name, created_at, updated_at FROM organizations WHERE id = $1',
            [organizationId]
        );

        if (orgResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        // Get member count
        const memberCount = await db.query(
            "SELECT COUNT(*) FROM users WHERE organization_id = $1 AND status = 'approved'",
            [organizationId]
        );

        // Get project count
        const projectCount = await db.query(
            'SELECT COUNT(*) FROM projects WHERE organization_id = $1',
            [organizationId]
        );

        res.json({
            success: true,
            data: {
                ...orgResult.rows[0],
                memberCount: parseInt(memberCount.rows[0].count),
                projectCount: parseInt(projectCount.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get organization details.'
        });
    }
}

async function updateOrganization(req, res) {
    try {
        const { name } = req.body;
        const organizationId = req.user.organization_id;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Organization name is required.'
            });
        }

        const result = await db.query(
            'UPDATE organizations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [name.trim(), organizationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        res.json({
            success: true,
            message: 'Organization updated successfully!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization.'
        });
    }
}

async function getJoinCode(req, res) {
    try {
        const organizationId = req.user.organization_id;

        const result = await db.query(
            'SELECT join_code FROM organizations WHERE id = $1',
            [organizationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        res.json({
            success: true,
            data: {
                joinCode: result.rows[0].join_code
            }
        });

    } catch (error) {
        console.error('Get join code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get join code.'
        });
    }
}

async function regenerateJoinCode(req, res) {
    try {
        const organizationId = req.user.organization_id;

        // Generate a new unique join code
        let newCode = generateJoinCode();

        // Make sure code is unique
        let codeExists = await db.query('SELECT id FROM organizations WHERE join_code = $1', [newCode]);
        while (codeExists.rows.length > 0) {
            newCode = generateJoinCode();
            codeExists = await db.query('SELECT id FROM organizations WHERE join_code = $1', [newCode]);
        }

        // Update the organization with the new code
        const result = await db.query(
            'UPDATE organizations SET join_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING join_code',
            [newCode, organizationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        res.json({
            success: true,
            message: 'Join code regenerated successfully!',
            data: {
                joinCode: result.rows[0].join_code
            }
        });

    } catch (error) {
        console.error('Regenerate join code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate join code.'
        });
    }
}

module.exports = {
    getOrganization,
    updateOrganization,
    getJoinCode,
    regenerateJoinCode
};
