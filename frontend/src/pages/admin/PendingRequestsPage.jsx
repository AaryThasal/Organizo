// ===========================================
// Pending Requests Page (Admin Only)
// ===========================================

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import api from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function PendingRequestsPage() {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            const res = await api.get('/users/pending');
            setRequests(res.data.data);
        } catch (error) {
            console.error('Failed to fetch pending requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId, userName) => {
        setProcessingId(userId);
        try {
            await api.post(`/users/${userId}/approve`);
            setRequests(requests.filter(r => r.id !== userId));
            dispatch(showToast({ type: 'success', message: `${userName} has been approved` }));
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Failed to approve user' }));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to reject ${userName}'s request?`)) return;

        setProcessingId(userId);
        try {
            await api.post(`/users/${userId}/reject`);
            setRequests(requests.filter(r => r.id !== userId));
            dispatch(showToast({ type: 'success', message: `${userName}'s request has been rejected` }));
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Failed to reject user' }));
        } finally {
            setProcessingId(null);
        }
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
                <h1 className="page-title">Pending Requests</h1>
                <p className="page-description">Review and approve join requests</p>
            </div>

            {/* Requests List */}
            {requests.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    title="No pending requests"
                    description="All join requests have been processed"
                />
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request.id} className="card">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        firstName={request.first_name}
                                        lastName={request.last_name}
                                        size="lg"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-secondary-900">
                                            {request.first_name} {request.last_name}
                                        </h3>
                                        <p className="text-sm text-secondary-500">{request.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <StatusBadge status={request.role} type="role" />
                                            <span className="text-xs text-secondary-400">
                                                Requested {new Date(request.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleReject(request.id, `${request.first_name} ${request.last_name}`)}
                                        loading={processingId === request.id}
                                        disabled={processingId !== null}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleApprove(request.id, `${request.first_name} ${request.last_name}`)}
                                        loading={processingId === request.id}
                                        disabled={processingId !== null}
                                    >
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PendingRequestsPage;
