import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchProjects, createProject, deleteProject } from '../../store/projectSlice';
import { showToast, openModal, closeModal } from '../../store/uiSlice';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

// Projects list with create, filter, and delete
function ProjectsPage() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { projects, isLoading } = useSelector((state) => state.projects);
    const { activeModal } = useSelector((state) => state.ui);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dueDate: '',
        status: 'active',
    });
    const [filter, setFilter] = useState('all');
    const [creating, setCreating] = useState(false);

    const canCreateProject = user?.role === 'admin' || user?.role === 'manager';

    useEffect(() => {
        dispatch(fetchProjects());
    }, [dispatch]);

    // Create new project
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setCreating(true);

        const result = await dispatch(createProject(formData));

        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Project created successfully!' }));
            dispatch(closeModal());
            setFormData({ name: '', description: '', dueDate: '', status: 'active' });
        } else {
            dispatch(showToast({ type: 'error', message: result.payload || 'Failed to create project' }));
        }

        setCreating(false);
    };

    // Delete project with confirmation
    const handleDeleteProject = async (projectId, projectName) => {
        if (window.confirm(`Are you sure you want to delete "${projectName}"? This will also delete all tasks.`)) {
            const result = await dispatch(deleteProject(projectId));
            if (!result.error) {
                dispatch(showToast({ type: 'success', message: 'Project deleted successfully' }));
            }
        }
    };

    // Filter projects by status
    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter(p => p.status === filter);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title">Projects</h1>
                    <p className="page-description">Manage your organization's projects</p>
                </div>

                {canCreateProject && (
                    <Button onClick={() => dispatch(openModal({ modal: 'createProject' }))}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Project
                    </Button>
                )}
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'on-hold', label: 'On Hold' },
                ].map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.value
                            ? 'bg-primary-500/10 text-primary-400'
                            : 'bg-dark-elevated text-text-secondary hover:bg-dark-border'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filteredProjects.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    }
                    title="No projects found"
                    description={canCreateProject ? "Create your first project to get started" : "No projects have been assigned to you yet"}
                    actionLabel={canCreateProject ? "Create Project" : undefined}
                    onAction={canCreateProject ? () => dispatch(openModal({ modal: 'createProject' })) : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div key={project.id} className="card-hover group">
                            <div className="flex items-start justify-between mb-3">
                                <StatusBadge status={project.status} type="project" />
                                {canCreateProject && (
                                    <button
                                        onClick={() => handleDeleteProject(project.id, project.name)}
                                        className="p-1.5 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <Link to={`/projects/${project.id}`}>
                                <h3 className="text-lg font-semibold text-text-primary mb-2 hover:text-primary-400 transition-colors">
                                    {project.name}
                                </h3>
                            </Link>

                            {project.description && (
                                <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                                    {project.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between text-sm text-text-secondary">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        {project.member_count || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        {project.task_count || 0}
                                    </span>
                                </div>
                                {project.due_date && (
                                    <span className="text-xs">
                                        Due: {new Date(project.due_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={activeModal === 'createProject'}
                onClose={() => dispatch(closeModal())}
                title="Create New Project"
            >
                <form onSubmit={handleCreateProject}>
                    <Input
                        label="Project Name"
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter project name"
                        required
                    />

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter project description"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-dark-border bg-dark-card text-text-primary placeholder:text-text-muted transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                        />
                    </div>

                    <Input
                        label="Due Date"
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />

                    <Select
                        label="Status"
                        name="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[
                            { value: 'active', label: 'Active' },
                            { value: 'on-hold', label: 'On Hold' },
                        ]}
                    />

                    <div className="flex gap-3 mt-6">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => dispatch(closeModal())}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={creating}
                            className="flex-1"
                        >
                            Create Project
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default ProjectsPage;
