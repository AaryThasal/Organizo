import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

function EmployeesPage() {
    const { user } = useSelector((state) => state.auth);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    // Search query for filtering by name or email
    const [searchQuery, setSearchQuery] = useState('');

    // Admin reset password state
    const [resetModal, setResetModal] = useState({ open: false, employee: null });
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState(null); // { type: 'success' | 'error', message }

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users?status=approved');
            setEmployees(res.data.data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    // useMemo avoids re-filtering on every render — better for large lists
    const filteredEmployees = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        return employees.filter((e) => {
            // Role filter
            const matchesRole = filter === 'all' || e.role === filter;
            // Search filter — match first name, last name, or email
            const matchesSearch =
                !query ||
                e.first_name.toLowerCase().includes(query) ||
                e.last_name.toLowerCase().includes(query) ||
                e.email.toLowerCase().includes(query);

            return matchesRole && matchesSearch;
        });
    }, [employees, filter, searchQuery]);

    // Admin reset password handler
    const handleResetPassword = async () => {
        if (!resetModal.employee) return;

        setResetLoading(true);
        setResetResult(null);

        try {
            const res = await api.post(`/users/${resetModal.employee.id}/reset-password`);
            setResetResult({ type: 'success', message: res.data.message });
        } catch (error) {
            setResetResult({
                type: 'error',
                message: error.response?.data?.message || 'Failed to reset password.',
            });
        } finally {
            setResetLoading(false);
        }
    };

    const closeResetModal = () => {
        setResetModal({ open: false, employee: null });
        setResetResult(null);
    };

    if (loading) {
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
                <h1 className="page-title">Team Members</h1>
                <p className="page-description">View all members in your organization</p>
            </div>

            {/* Controls row: role filter tabs + search bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                {/* Role filter tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'admin', label: 'Admins' },
                        { value: 'manager', label: 'Managers' },
                        { value: 'employee', label: 'Employees' },
                    ].map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                filter === f.value
                                    ? 'bg-primary-500/10 text-primary-400'
                                    : 'bg-dark-elevated text-text-secondary hover:bg-dark-border'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-72">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10 py-2 text-sm"
                    />
                </div>
            </div>

            {/* Employee table or empty state */}
            {filteredEmployees.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                    title="No team members found"
                    description={
                        searchQuery
                            ? `No results for "${searchQuery}"`
                            : 'No members match the selected filter'
                    }
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined</th>
                                {isAdmin && <th className="text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((employee) => (
                                <tr key={employee.id}>
                                    {/* Name cell — avatar + full name */}
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                firstName={employee.first_name}
                                                lastName={employee.last_name}
                                                size="sm"
                                            />
                                            <span className="font-medium text-text-primary whitespace-nowrap">
                                                {employee.first_name} {employee.last_name}
                                                {employee.id === user?.id && (
                                                    <span className="text-xs text-text-muted ml-1.5">(You)</span>
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    {/* Email */}
                                    <td className="text-text-secondary">{employee.email}</td>
                                    {/* Role badge — reuses existing StatusBadge styles */}
                                    <td>
                                        <StatusBadge status={employee.role} type="role" />
                                    </td>
                                    {/* Joined date */}
                                    <td className="text-text-secondary whitespace-nowrap">
                                        {new Date(employee.created_at).toLocaleDateString()}
                                    </td>
                                    {/* Actions column — admin only, not for self or other admins */}
                                    {isAdmin && (
                                        <td className="text-right">
                                            {employee.id !== user?.id && employee.role !== 'admin' && (
                                                <button
                                                    onClick={() => setResetModal({ open: true, employee })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-200"
                                                    title="Reset this user's password"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                                    </svg>
                                                    Reset Password
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reset Password Confirmation Modal */}
            <Modal
                isOpen={resetModal.open}
                onClose={closeResetModal}
                title="Reset User Password"
                size="sm"
            >
                {resetResult?.type === 'success' ? (
                    // Success state
                    <div className="text-center py-4">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success/10 border-2 border-success flex items-center justify-center">
                            <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <p className="text-text-primary font-medium mb-2">Password Reset Sent</p>
                        <p className="text-text-secondary text-sm">{resetResult.message}</p>
                        <Button onClick={closeResetModal} variant="secondary" className="mt-6 w-full">
                            Done
                        </Button>
                    </div>
                ) : (
                    // Confirmation state
                    <div className="py-2">
                        {resetResult?.type === 'error' && (
                            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                                {resetResult.message}
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-dark-elevated border border-dark-border">
                            <Avatar
                                firstName={resetModal.employee?.first_name}
                                lastName={resetModal.employee?.last_name}
                                size="md"
                            />
                            <div>
                                <p className="font-medium text-text-primary">
                                    {resetModal.employee?.first_name} {resetModal.employee?.last_name}
                                </p>
                                <p className="text-sm text-text-secondary">{resetModal.employee?.email}</p>
                            </div>
                        </div>

                        <p className="text-sm text-text-secondary mb-2">This will:</p>
                        <ul className="text-sm text-text-secondary space-y-1 mb-6 ml-4 list-disc">
                            <li>Generate a secure temporary password</li>
                            <li>Send it directly to the user's email</li>
                            <li>The user will need to change it after logging in</li>
                        </ul>

                        <div className="flex gap-3">
                            <Button onClick={closeResetModal} variant="secondary" className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleResetPassword}
                                loading={resetLoading}
                                variant="primary"
                                className="flex-1"
                            >
                                Reset Password
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default EmployeesPage;
