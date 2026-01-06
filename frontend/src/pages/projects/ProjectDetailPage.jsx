// Project Detail Page - shows project info, team, and tasks

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProjectById, updateProject, addProjectMember, removeProjectMember } from '../../store/projectSlice';
import { fetchProjectTasks, createTask, updateTaskStatus, deleteTask } from '../../store/taskSlice';
import { showToast, openModal, closeModal } from '../../store/uiSlice';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../services/api';

function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user } = useSelector((state) => state.auth);
    const { currentProject, projectMembers, isLoading: projectLoading } = useSelector((state) => state.projects);
    const { tasks, isLoading: tasksLoading } = useSelector((state) => state.tasks);
    const { activeModal, modalData } = useSelector((state) => state.ui);

    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]); // Changed to array for bulk selection
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assignees: [],
        dueDate: '',
        status: 'to-do',
    });
    const [loading, setLoading] = useState(false);

    const canManage = user?.role === 'admin' || user?.role === 'manager';

    const refreshData = useCallback(() => {
        dispatch(fetchProjectById(id));
        dispatch(fetchProjectTasks({ projectId: id }));
    }, [dispatch, id]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useRefreshOnFocus(refreshData);

    useEffect(() => {
        if (canManage) {
            fetchAvailableUsers();
        }
    }, [canManage, projectMembers]);

    const fetchAvailableUsers = async () => {
        try {
            const res = await api.get('/users?status=approved');
            const members = projectMembers.map(m => m.id);
            const available = res.data.data.filter(u => !members.includes(u.id));
            setAvailableUsers(available);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    // Handle bulk member addition
    const handleAddMembers = async () => {
        if (selectedUserIds.length === 0) return;

        setLoading(true);
        const result = await dispatch(addProjectMember({ projectId: id, userIds: selectedUserIds }));

        if (!result.error) {
            const count = selectedUserIds.length;
            dispatch(showToast({ type: 'success', message: `${count} member(s) added successfully!` }));
            dispatch(fetchProjectById(id));
            setSelectedUserIds([]);
            dispatch(closeModal());
        } else {
            dispatch(showToast({ type: 'error', message: result.payload || 'Failed to add members' }));
        }
        setLoading(false);
    };

    const handleRemoveMember = async (userId, userName) => {
        if (!window.confirm(`Remove ${userName} from this project?`)) return;

        const result = await dispatch(removeProjectMember({ projectId: id, userId }));
        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Member removed successfully' }));
            dispatch(fetchProjectById(id));
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await dispatch(createTask({ projectId: id, taskData: taskForm }));

        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Task created successfully!' }));
            dispatch(closeModal());
            setTaskForm({ title: '', description: '', assignees: [], dueDate: '', status: 'to-do' });
        } else {
            dispatch(showToast({ type: 'error', message: result.payload || 'Failed to create task' }));
        }
        setLoading(false);
    };

    const handleStatusChange = async (taskId, newStatus) => {
        const result = await dispatch(updateTaskStatus({ taskId, status: newStatus }));
        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Task status updated' }));
        }
    };

    const handleDeleteTask = async (taskId, taskTitle) => {
        if (!window.confirm(`Delete task "${taskTitle}"?`)) return;

        const result = await dispatch(deleteTask(taskId));
        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Task deleted' }));
        }
    };

    if (projectLoading && !currentProject) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!currentProject) {
        return (
            <EmptyState
                title="Project not found"
                description="The project you're looking for doesn't exist or you don't have access to it."
                actionLabel="Back to Projects"
                onAction={() => navigate('/projects')}
            />
        );
    }

    // Group tasks by status
    const tasksByStatus = {
        'to-do': tasks.filter(t => t.status === 'to-do'),
        'in-progress': tasks.filter(t => t.status === 'in-progress'),
        'completed': tasks.filter(t => t.status === 'completed'),
        'on-hold': tasks.filter(t => t.status === 'on-hold'),
    };

    return (
        <div className="animate-fade-in">
            {/* Project Header */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => navigate('/projects')}
                                className="p-2 rounded-lg text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-secondary-900">{currentProject.name}</h1>
                            <StatusBadge status={currentProject.status} type="project" />
                        </div>
                        {currentProject.description && (
                            <p className="text-secondary-600 ml-11">{currentProject.description}</p>
                        )}
                    </div>

                    {canManage && (
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => dispatch(openModal({ modal: 'addMember' }))}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add Member
                            </Button>
                            <Button onClick={() => dispatch(openModal({ modal: 'createTask' }))}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Task
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Team Members */}
                <div className="lg:col-span-1">
                    <div className="card">
                        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Team Members</h2>
                        <div className="space-y-3">
                            {projectMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar firstName={member.first_name} lastName={member.last_name} size="sm" />
                                        <div>
                                            <p className="text-sm font-medium text-secondary-900">
                                                {member.first_name} {member.last_name}
                                            </p>
                                            <p className="text-xs text-secondary-500">{member.role}</p>
                                        </div>
                                    </div>
                                    {canManage && member.id !== user.id && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id, `${member.first_name} ${member.last_name}`)}
                                            className="p-1.5 rounded-lg text-secondary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {projectMembers.length === 0 && (
                                <p className="text-sm text-secondary-500 text-center py-4">No team members</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tasks Board */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                            <div key={status} className="bg-secondary-100 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <StatusBadge status={status} type="task" />
                                    <span className="text-xs font-medium text-secondary-500 bg-white px-2 py-1 rounded-lg">
                                        {statusTasks.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {statusTasks.map((task) => (
                                        <div key={task.id} className="card p-4 group">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="text-sm font-medium text-secondary-900">{task.title}</h4>
                                                {canManage && (
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id, task.title)}
                                                        className="p-1 rounded text-secondary-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            {task.description && (
                                                <p className="text-xs text-secondary-500 line-clamp-2 mb-3">{task.description}</p>
                                            )}

                                            <div className="flex items-center justify-between">
                                                {/* Show multiple assignees */}
                                                {task.assignees && task.assignees.length > 0 ? (
                                                    <div className="flex -space-x-2">
                                                        {task.assignees.slice(0, 3).map((assignee) => (
                                                            <Avatar
                                                                key={assignee.id}
                                                                firstName={assignee.first_name}
                                                                lastName={assignee.last_name}
                                                                size="sm"
                                                                className="ring-2 ring-white"
                                                            />
                                                        ))}
                                                        {task.assignees.length > 3 && (
                                                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary-200 text-xs font-medium text-secondary-600 ring-2 ring-white">
                                                                +{task.assignees.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-secondary-400">Unassigned</span>
                                                )}

                                                {/* Status dropdown */}
                                                {(canManage || (task.assignees && task.assignees.some(a => a.id === user?.id))) && (
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                        className="text-xs border-0 bg-secondary-100 rounded-lg py-1 pr-6 focus:ring-0 cursor-pointer"
                                                    >
                                                        <option value="to-do">To Do</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="on-hold">On Hold</option>
                                                    </select>
                                                )}
                                            </div>

                                            {task.due_date && (
                                                <p className="text-xs text-secondary-400 mt-2">
                                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    ))}

                                    {statusTasks.length === 0 && (
                                        <p className="text-xs text-secondary-400 text-center py-4">No tasks</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add Member Modal - Multi-select with checkboxes */}
            <Modal
                isOpen={activeModal === 'addMember'}
                onClose={() => {
                    dispatch(closeModal());
                    setSelectedUserIds([]);
                }}
                title="Add Team Members"
                size="sm"
            >
                <p className="text-sm text-secondary-600 mb-3">
                    Select one or more employees to add to this project:
                </p>
                
                <div className="border border-secondary-200 rounded-xl p-3 max-h-64 overflow-y-auto">
                    {availableUsers.length === 0 ? (
                        <p className="text-sm text-secondary-500 text-center py-4">
                            All approved users are already members of this project.
                        </p>
                    ) : (
                        availableUsers.map((u) => (
                            <label
                                key={u.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedUserIds.includes(u.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedUserIds([...selectedUserIds, u.id]);
                                        } else {
                                            setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                />
                                <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
                                <div className="flex-1">
                                    <span className="text-sm text-secondary-700 font-medium">
                                        {u.first_name} {u.last_name}
                                    </span>
                                    <span className="text-xs text-secondary-400 ml-2">
                                        {u.role}
                                    </span>
                                </div>
                            </label>
                        ))
                    )}
                </div>

                {selectedUserIds.length > 0 && (
                    <p className="text-xs text-primary-600 mt-2">
                        {selectedUserIds.length} user(s) selected
                    </p>
                )}

                <div className="flex gap-3 mt-6">
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            dispatch(closeModal());
                            setSelectedUserIds([]);
                        }} 
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddMembers} 
                        loading={loading} 
                        disabled={selectedUserIds.length === 0} 
                        className="flex-1"
                    >
                        Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''} Members
                    </Button>
                </div>
            </Modal>

            {/* Create Task Modal */}
            <Modal
                isOpen={activeModal === 'createTask'}
                onClose={() => dispatch(closeModal())}
                title="Create New Task"
            >
                <form onSubmit={handleCreateTask}>
                    <Input
                        label="Task Title"
                        name="title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="Enter task title"
                        required
                    />

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary-700 mb-1.5">Description</label>
                        <textarea
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            placeholder="Enter task description"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-secondary-900 placeholder:text-secondary-400 transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                        />
                    </div>

                    {/* Multi-select for assignees */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                            Assign To (select multiple)
                        </label>
                        <div className="border border-secondary-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                            {projectMembers.length === 0 ? (
                                <p className="text-sm text-secondary-400 text-center py-2">
                                    No team members available
                                </p>
                            ) : (
                                projectMembers.map((member) => (
                                    <label
                                        key={member.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={taskForm.assignees.includes(member.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setTaskForm({
                                                        ...taskForm,
                                                        assignees: [...taskForm.assignees, member.id]
                                                    });
                                                } else {
                                                    setTaskForm({
                                                        ...taskForm,
                                                        assignees: taskForm.assignees.filter(id => id !== member.id)
                                                    });
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <Avatar firstName={member.first_name} lastName={member.last_name} size="sm" />
                                        <span className="text-sm text-secondary-700">
                                            {member.first_name} {member.last_name}
                                        </span>
                                        <span className="text-xs text-secondary-400 ml-auto">
                                            {member.role}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                        {taskForm.assignees.length > 0 && (
                            <p className="text-xs text-secondary-500 mt-1">
                                {taskForm.assignees.length} member(s) selected
                            </p>
                        )}
                    </div>

                    <Input
                        label="Due Date"
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    />

                    <Select
                        label="Status"
                        value={taskForm.status}
                        onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                        options={[
                            { value: 'to-do', label: 'To Do' },
                            { value: 'in-progress', label: 'In Progress' },
                            { value: 'on-hold', label: 'On Hold' },
                        ]}
                    />

                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={() => dispatch(closeModal())} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" loading={loading} className="flex-1">
                            Create Task
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default ProjectDetailPage;
