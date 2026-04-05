import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function EmployeesPage() {
    const { user } = useSelector((state) => state.auth);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    // Search query for filtering by name or email
    const [searchQuery, setSearchQuery] = useState('');

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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default EmployeesPage;

