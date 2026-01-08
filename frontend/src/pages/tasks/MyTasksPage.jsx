import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchMyTasks, updateTaskStatus } from '../../store/taskSlice';
import { showToast } from '../../store/uiSlice';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function MyTasksPage() {
    const dispatch = useDispatch();
    const { myTasks, isLoading } = useSelector((state) => state.tasks);
    const [filter, setFilter] = useState('all');

    const refreshTasks = useCallback(() => {
        dispatch(fetchMyTasks());
    }, [dispatch]);

    useEffect(() => {
        refreshTasks();
    }, [refreshTasks]);

    useRefreshOnFocus(refreshTasks);

    const handleStatusChange = async (taskId, newStatus) => {
        const result = await dispatch(updateTaskStatus({ taskId, status: newStatus }));
        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Task status updated' }));
        }
    };

    // Filter tasks
    const filteredTasks = filter === 'all'
        ? myTasks
        : myTasks.filter(t => t.status === filter);

    // Group by project
    const tasksByProject = filteredTasks.reduce((acc, task) => {
        const projectName = task.project_name || 'Unknown Project';
        if (!acc[projectName]) {
            acc[projectName] = [];
        }
        acc[projectName].push(task);
        return acc;
    }, {});

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">My Tasks</h1>
                <p className="page-description">Tasks assigned to you across all projects</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { status: 'to-do', label: 'To Do', color: 'bg-secondary-100 text-secondary-700' },
                    { status: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
                    { status: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
                    { status: 'on-hold', label: 'On Hold', color: 'bg-amber-100 text-amber-700' },
                ].map((item) => (
                    <button
                        key={item.status}
                        onClick={() => setFilter(filter === item.status ? 'all' : item.status)}
                        className={`p-4 rounded-xl transition-all ${filter === item.status ? 'ring-2 ring-primary-500' : ''
                            } ${item.color}`}
                    >
                        <p className="text-2xl font-bold">
                            {myTasks.filter(t => t.status === item.status).length}
                        </p>
                        <p className="text-sm">{item.label}</p>
                    </button>
                ))}
            </div>

            {/* Filter indicator */}
            {filter !== 'all' && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-secondary-500">Filtering by:</span>
                    <StatusBadge status={filter} type="task" />
                    <button
                        onClick={() => setFilter('all')}
                        className="text-sm text-primary-600 hover:text-primary-700"
                    >
                        Clear filter
                    </button>
                </div>
            )}

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    }
                    title={filter === 'all' ? "No tasks assigned" : "No tasks found"}
                    description={filter === 'all' ? "You haven't been assigned any tasks yet" : "No tasks match the selected filter"}
                />
            ) : (
                <div className="space-y-6">
                    {Object.entries(tasksByProject).map(([projectName, tasks]) => (
                        <div key={projectName} className="card">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                {projectName}
                            </h3>

                            <div className="space-y-3">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary-50"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-secondary-900">{task.title}</h4>
                                                <StatusBadge status={task.status} type="task" />
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-secondary-500 line-clamp-1">{task.description}</p>
                                            )}
                                            {task.due_date && (
                                                <p className="text-xs text-secondary-400 mt-1">
                                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <select
                                                value={task.status}
                                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                className="text-sm border border-secondary-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                                            >
                                                <option value="to-do">To Do</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="on-hold">On Hold</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyTasksPage;
