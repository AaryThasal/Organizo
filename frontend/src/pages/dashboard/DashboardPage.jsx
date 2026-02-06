import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchProjects } from '../../store/projectSlice';
import { fetchMyTasks } from '../../store/taskSlice';
import api from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';

// Reusable stats card for dashboard metrics
function StatsCard({ icon, label, value, colorClass }) {
    return (
        <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-sm text-text-secondary">{label}</p>
            </div>
        </div>
    );
}

// Main dashboard with role-specific content
function DashboardPage() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { projects, isLoading: projectsLoading } = useSelector((state) => state.projects);
    const { myTasks, isLoading: tasksLoading } = useSelector((state) => state.tasks);

    const [stats, setStats] = React.useState({
        totalProjects: 0,
        totalEmployees: 0,
        pendingRequests: 0,
        completedTasks: 0,
        pendingTasks: 0,
    });
    const [recentActivity, setRecentActivity] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Fetch all dashboard data
    const refreshDashboardData = useCallback(async () => {
        dispatch(fetchProjects());
        if (user?.role === 'employee') {
            dispatch(fetchMyTasks());
        }
        await fetchStats();
    }, [dispatch, user]);

    useEffect(() => {
        refreshDashboardData();
    }, [refreshDashboardData]);

    // Refetch on focus to keep data fresh
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshDashboardData();
            }
        };

        const handleFocus = () => {
            refreshDashboardData();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [refreshDashboardData]);

    // Fetch team and pending request counts
    const fetchStats = async () => {
        try {
            if (user?.role === 'admin' || user?.role === 'manager') {
                const usersRes = await api.get('/users?status=approved');
                setStats(prev => ({
                    ...prev,
                    totalEmployees: usersRes.data.data.length,
                }));
            }

            if (user?.role === 'admin') {
                const pendingRes = await api.get('/users/pending');
                setStats(prev => ({
                    ...prev,
                    pendingRequests: pendingRes.data.data.length,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate task counts by status
    const taskStats = {
        todo: myTasks.filter(t => t.status === 'to-do').length,
        inProgress: myTasks.filter(t => t.status === 'in-progress').length,
        completed: myTasks.filter(t => t.status === 'completed').length,
        onHold: myTasks.filter(t => t.status === 'on-hold').length,
    };

    // Calculate project counts by status
    const projectStats = {
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on-hold').length,
    };

    if (loading || projectsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">
                    Welcome back, {user?.first_name}! 👋
                </h1>
                <p className="page-description">
                    Here's what's happening in your organization today.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    icon={
                        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    }
                    label="Total Projects"
                    value={projects.length}
                    colorClass="bg-primary-500/10"
                />
                <StatsCard
                    icon={
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    label="Active Projects"
                    value={projectStats.active}
                    colorClass="bg-success/10"
                />
                {(user?.role === 'admin' || user?.role === 'manager') && (
                    <StatsCard
                        icon={
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        }
                        label="Team Members"
                        value={stats.totalEmployees}
                        colorClass="bg-info/10"
                    />
                )}
                {user?.role === 'admin' && (
                    <StatsCard
                        icon={
                            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        label="Pending Requests"
                        value={stats.pendingRequests}
                        colorClass="bg-warning/10"
                    />
                )}
                {user?.role === 'employee' && (
                    <>
                        <StatsCard
                            icon={
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            }
                            label="My Tasks"
                            value={myTasks.length}
                            colorClass="bg-info/10"
                        />
                        <StatsCard
                            icon={
                                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                            label="In Progress"
                            value={taskStats.inProgress}
                            colorClass="bg-warning/10"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Recent Projects</h2>
                        <Link to="/projects" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                            View all
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <p className="text-text-secondary text-center py-8">No projects yet</p>
                    ) : (
                        <div className="space-y-3">
                            {projects.slice(0, 5).map((project) => (
                                <Link
                                    key={project.id}
                                    to={`/projects/${project.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-elevated transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-text-primary">{project.name}</p>
                                            <p className="text-xs text-text-secondary">
                                                {project.member_count || 0} members • {project.task_count || 0} tasks
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={project.status} type="project" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {user?.role === 'employee' ? (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-text-primary">My Tasks</h2>
                            <Link to="/my-tasks" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                                View all
                            </Link>
                        </div>

                        {myTasks.length === 0 ? (
                            <p className="text-text-secondary text-center py-8">No tasks assigned</p>
                        ) : (
                            <div className="space-y-3">
                                {myTasks.slice(0, 5).map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-dark-elevated"
                                    >
                                        <div>
                                            <p className="font-medium text-text-primary">{task.title}</p>
                                            <p className="text-xs text-text-secondary">{task.project_name}</p>
                                        </div>
                                        <StatusBadge status={task.status} type="task" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card">
                        <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                to="/projects"
                                className="p-4 rounded-xl border-2 border-dashed border-dark-border hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-center"
                            >
                                <svg className="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <p className="text-sm font-medium text-text-secondary">New Project</p>
                            </Link>
                            <Link
                                to="/employees"
                                className="p-4 rounded-xl border-2 border-dashed border-dark-border hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-center"
                            >
                                <svg className="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                <p className="text-sm font-medium text-text-secondary">View Team</p>
                            </Link>
                            {user?.role === 'admin' && (
                                <>
                                    <Link
                                        to="/pending-requests"
                                        className="p-4 rounded-xl border-2 border-dashed border-dark-border hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-center"
                                    >
                                        <svg className="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-medium text-text-secondary">Pending Requests</p>
                                    </Link>
                                    <Link
                                        to="/settings"
                                        className="p-4 rounded-xl border-2 border-dashed border-dark-border hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-center"
                                    >
                                        <svg className="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-sm font-medium text-text-secondary">Settings</p>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DashboardPage;
