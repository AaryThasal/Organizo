// ===========================================
// Status Badge Component
// ===========================================
// Displays colored badges for status values

import React from 'react';

// Status configurations for tasks
const taskStatusConfig = {
    'to-do': {
        label: 'To Do',
        className: 'bg-secondary-100 text-secondary-700',
    },
    'in-progress': {
        label: 'In Progress',
        className: 'bg-blue-100 text-blue-700',
    },
    'completed': {
        label: 'Completed',
        className: 'bg-emerald-100 text-emerald-700',
    },
    'on-hold': {
        label: 'On Hold',
        className: 'bg-amber-100 text-amber-700',
    },
};

// Status configurations for projects
const projectStatusConfig = {
    'active': {
        label: 'Active',
        className: 'bg-emerald-100 text-emerald-700',
    },
    'completed': {
        label: 'Completed',
        className: 'bg-blue-100 text-blue-700',
    },
    'on-hold': {
        label: 'On Hold',
        className: 'bg-amber-100 text-amber-700',
    },
};

// User status configurations
const userStatusConfig = {
    'pending': {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-700',
    },
    'approved': {
        label: 'Approved',
        className: 'bg-emerald-100 text-emerald-700',
    },
    'rejected': {
        label: 'Rejected',
        className: 'bg-red-100 text-red-700',
    },
};

// Role configurations
const roleConfig = {
    'admin': {
        label: 'Admin',
        className: 'bg-purple-100 text-purple-700',
    },
    'manager': {
        label: 'Manager',
        className: 'bg-blue-100 text-blue-700',
    },
    'employee': {
        label: 'Employee',
        className: 'bg-secondary-100 text-secondary-700',
    },
};

function StatusBadge({ status, type = 'task', className = '' }) {
    // Get the right config based on type
    let config;
    switch (type) {
        case 'project':
            config = projectStatusConfig[status];
            break;
        case 'user':
            config = userStatusConfig[status];
            break;
        case 'role':
            config = roleConfig[status];
            break;
        case 'task':
        default:
            config = taskStatusConfig[status];
    }

    // Fallback for unknown status
    if (!config) {
        config = {
            label: status,
            className: 'bg-secondary-100 text-secondary-700',
        };
    }

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
        >
            {config.label}
        </span>
    );
}

export default StatusBadge;
