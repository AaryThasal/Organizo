import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toggleSidebar } from '../../store/uiSlice';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { logout } from '../../store/authSlice';
import Avatar from '../ui/Avatar';
import { getNotificationRoute, formatRelativeTime } from '../../utils/notificationHelpers';

// Top navigation bar with notifications and user menu
function Navbar() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, organization } = useSelector((state) => state.auth);
    const { notifications, unreadCount } = useSelector((state) => state.notifications);
    const { sidebarOpen } = useSelector((state) => state.ui);

    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const notificationRef = useRef(null);
    const userMenuRef = useRef(null);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notificationRef.current && !notificationRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle logout and redirect to login
    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Mark notification as read and navigate to relevant page
    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            dispatch(markAsRead(notification.id));
        }
        setShowNotifications(false);

        const route = getNotificationRoute(notification);
        if (route) {
            navigate(route);
        }
    };

    return (
        <header
            className={`fixed top-0 right-0 h-[72px] bg-dark-card border-b border-dark-border z-30 transition-all duration-300 ${sidebarOpen ? 'left-64' : 'left-20'
                }`}
        >
            <div className="h-full flex items-center justify-between px-8">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => dispatch(toggleSidebar())}
                        className="p-2.5 rounded-xl text-text-secondary hover:bg-dark-elevated hover:text-text-primary transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-text-primary tracking-tight">
                            {user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : 'Employee'} Dashboard
                        </h1>
                        {organization && (
                            <>
                                <span className="text-dark-border text-lg select-none">•</span>
                                {organization.logo_url && (
                                    <img
                                        src={organization.logo_url}
                                        alt={organization.name}
                                        className="w-7 h-7 rounded-full object-cover ring-1 ring-dark-border/50 flex-shrink-0"
                                    />
                                )}
                                <span className="text-base text-text-muted font-semibold">{organization.name}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2.5 rounded-xl text-text-secondary hover:bg-dark-elevated hover:text-text-primary transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-dark-card rounded-xl shadow-medium border border-dark-border py-2 z-50 animate-scale-in">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border">
                                    <h3 className="font-semibold text-text-primary">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={() => dispatch(markAllAsRead())}
                                            className="text-xs text-primary-400 hover:text-primary-300"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-text-muted">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((notification) => (
                                            <button
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`w-full px-4 py-3 text-left hover:bg-dark-elevated transition-colors ${!notification.is_read ? 'bg-primary-500/5' : ''
                                                    }`}
                                            >
                                                <p className={`text-sm ${!notification.is_read ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-text-muted mt-1">
                                                    {formatRelativeTime(notification.created_at)}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* View all link */}
                                <div className="border-t border-dark-border px-4 py-2">
                                    <Link
                                        to="/notifications"
                                        onClick={() => setShowNotifications(false)}
                                        className="block text-center text-sm text-primary-400 hover:text-primary-300 font-medium py-1"
                                    >
                                        View all notifications
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-dark-elevated transition-colors"
                        >
                            <Avatar
                                firstName={user?.first_name}
                                lastName={user?.last_name}
                                profileImageUrl={user?.profile_image_url}
                                size="sm"
                            />
                            <span className="text-sm font-medium text-text-secondary hidden sm:block">
                                {user?.first_name} {user?.last_name}
                            </span>
                            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-dark-card rounded-xl shadow-medium border border-dark-border py-2 z-50 animate-scale-in">
                                <div className="px-4 py-2 border-b border-dark-border">
                                    <p className="text-sm font-medium text-text-primary">
                                        {user?.first_name} {user?.last_name}
                                    </p>
                                    <p className="text-xs text-text-muted">{user?.email}</p>
                                </div>

                                <Link
                                    to="/settings"
                                    onClick={() => setShowUserMenu(false)}
                                    className="block w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-dark-elevated hover:text-text-primary transition-colors"
                                >
                                    Profile Settings
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Navbar;
