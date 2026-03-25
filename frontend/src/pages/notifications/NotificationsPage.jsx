import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../store/notificationSlice';
import { showToast } from '../../store/uiSlice';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import {
    getNotificationRoute,
    getNotificationTypeInfo,
    getNotificationIcon,
    formatRelativeTime,
} from '../../utils/notificationHelpers';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function NotificationsPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications, unreadCount, isLoading } = useSelector((state) => state.notifications);
    const [filter, setFilter] = useState('all');

    const refreshNotifications = useCallback(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    useEffect(() => {
        refreshNotifications();
    }, [refreshNotifications]);

    useRefreshOnFocus(refreshNotifications);

    const filteredNotifications = filter === 'unread'
        ? notifications.filter((n) => !n.is_read)
        : notifications;

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            dispatch(markAsRead(notification.id));
        }
        const route = getNotificationRoute(notification);
        if (route) {
            navigate(route);
        }
    };

    const handleDelete = async (e, notificationId) => {
        e.stopPropagation();
        const result = await dispatch(deleteNotification(notificationId));
        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Notification deleted' }));
        }
    };

    const handleMarkAllRead = async () => {
        const result = await dispatch(markAllAsRead());
        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'All notifications marked as read' }));
        }
    };

    if (isLoading && notifications.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="page-title">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary-500 text-white">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <p className="page-description">Stay up to date with your activity</p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-dark-elevated rounded-xl w-fit">
                {[
                    { key: 'all', label: 'All', count: notifications.length },
                    { key: 'unread', label: 'Unread', count: unreadCount },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            filter === tab.key
                                ? 'bg-dark-card text-text-primary shadow-soft'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                                filter === tab.key
                                    ? 'bg-primary-500/20 text-primary-400'
                                    : 'bg-dark-card text-text-muted'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notification list */}
            {filteredNotifications.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    }
                    title={filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                    description={filter === 'unread' ? 'You have no unread notifications' : "You'll see notifications here when there's activity"}
                />
            ) : (
                <div className="space-y-2">
                    {filteredNotifications.map((notification) => {
                        const typeInfo = getNotificationTypeInfo(notification.type);
                        const iconPath = getNotificationIcon(notification.type);
                        const route = getNotificationRoute(notification);

                        return (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`group relative flex items-start gap-4 p-4 rounded-xl transition-all duration-200 ${
                                    route ? 'cursor-pointer' : 'cursor-default'
                                } ${
                                    !notification.is_read
                                        ? 'bg-dark-card border border-primary-500/20 shadow-soft'
                                        : 'bg-dark-card border border-dark-border hover:border-dark-elevated'
                                }`}
                            >
                                {/* Unread dot */}
                                {!notification.is_read && (
                                    <div className="absolute top-4 right-14 w-2.5 h-2.5 rounded-full bg-primary-500 shadow-glow" />
                                )}

                                {/* Type icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo.bg}`}>
                                    <svg className={`w-5 h-5 ${typeInfo.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                                    </svg>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                                            {typeInfo.label}
                                        </span>
                                        <span className="text-xs text-text-muted">
                                            {formatRelativeTime(notification.created_at)}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${
                                        !notification.is_read ? 'text-text-primary font-medium' : 'text-text-secondary'
                                    }`}>
                                        {notification.message}
                                    </p>
                                    {route && (
                                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            View details
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    )}
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={(e) => handleDelete(e, notification.id)}
                                    className="flex-shrink-0 p-2 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger transition-all"
                                    title="Delete notification"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default NotificationsPage;
