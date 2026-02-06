import React from 'react';

const taskStatusConfig = {
    'to-do': {
        label: 'To Do',
        className: 'bg-dark-elevated text-text-secondary',
    },
    'in-progress': {
        label: 'In Progress',
        className: 'bg-info/20 text-blue-400',
    },
    'completed': {
        label: 'Completed',
        className: 'bg-success/20 text-green-400',
    },
    'on-hold': {
        label: 'On Hold',
        className: 'bg-warning/20 text-amber-400',
    },
};

const projectStatusConfig = {
    'active': {
        label: 'Active',
        className: 'bg-success/20 text-green-400',
    },
    'completed': {
        label: 'Completed',
        className: 'bg-info/20 text-blue-400',
    },
    'on-hold': {
        label: 'On Hold',
        className: 'bg-warning/20 text-amber-400',
    },
};

const userStatusConfig = {
    'pending': {
        label: 'Pending',
        className: 'bg-warning/20 text-amber-400',
    },
    'approved': {
        label: 'Approved',
        className: 'bg-success/20 text-green-400',
    },
    'rejected': {
        label: 'Rejected',
        className: 'bg-danger/20 text-red-400',
    },
};

const roleConfig = {
    'admin': {
        label: 'Admin',
        className: 'bg-primary-500/20 text-primary-400',
    },
    'manager': {
        label: 'Manager',
        className: 'bg-info/20 text-blue-400',
    },
    'employee': {
        label: 'Employee',
        className: 'bg-dark-elevated text-text-secondary',
    },
};

function StatusBadge({ status, type = 'task', className = '' }) {
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

    if (!config) {
        config = {
            label: status,
            className: 'bg-dark-elevated text-text-secondary',
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
