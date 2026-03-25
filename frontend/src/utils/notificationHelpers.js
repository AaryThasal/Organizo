// Returns the appropriate route path for a notification based on its type and metadata
export function getNotificationRoute(notification) {
    const metadata = notification.metadata
        ? (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata)
        : {};

    switch (notification.type) {
        case 'task_assigned':
        case 'task_status_changed':
            return metadata.projectId ? `/projects/${metadata.projectId}` : null;

        case 'project_added':
            return metadata.projectId ? `/projects/${metadata.projectId}` : '/projects';

        case 'join_request':
            return '/pending-requests';

        case 'approval':
        case 'rejection':
            return '/dashboard';

        default:
            return null;
    }
}

// Returns a display-friendly label and color class for a notification type
export function getNotificationTypeInfo(type) {
    switch (type) {
        case 'task_assigned':
            return { label: 'Task Assigned', color: 'text-blue-400', bg: 'bg-blue-500/10' };
        case 'task_status_changed':
            return { label: 'Status Update', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        case 'project_added':
            return { label: 'Project', color: 'text-green-400', bg: 'bg-green-500/10' };
        case 'join_request':
            return { label: 'Join Request', color: 'text-purple-400', bg: 'bg-purple-500/10' };
        case 'approval':
            return { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        case 'rejection':
            return { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10' };
        default:
            return { label: 'Notification', color: 'text-text-secondary', bg: 'bg-dark-elevated' };
    }
}

// Returns an SVG icon for a notification type
export function getNotificationIcon(type) {
    switch (type) {
        case 'task_assigned':
            return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4';
        case 'task_status_changed':
            return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
        case 'project_added':
            return 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z';
        case 'join_request':
            return 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z';
        case 'approval':
            return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
        case 'rejection':
            return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
        default:
            return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
    }
}

// Format a timestamp as a relative time string (e.g., "2 hours ago")
export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
