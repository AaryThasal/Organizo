import React, { useEffect, useState } from 'react';
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

    const filteredEmployees = filter === 'all'
        ? employees
        : employees.filter(e => e.role === filter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Team Members</h1>
                <p className="page-description">View all members in your organization</p>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'admin', label: 'Admins' },
                    { value: 'manager', label: 'Managers' },
                    { value: 'employee', label: 'Employees' },
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

            {filteredEmployees.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                    title="No team members found"
                    description="No members match the selected filter"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((employee) => (
                        <div key={employee.id} className="card-hover">
                            <div className="flex items-start gap-4">
                                <Avatar
                                    firstName={employee.first_name}
                                    lastName={employee.last_name}
                                    size="lg"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-text-primary">
                                        {employee.first_name} {employee.last_name}
                                    </h3>
                                    <p className="text-sm text-text-secondary">{employee.email}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <StatusBadge status={employee.role} type="role" />
                                        {employee.id === user?.id && (
                                            <span className="text-xs text-text-muted">(You)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-dark-border text-xs text-text-secondary">
                                Joined {new Date(employee.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EmployeesPage;
