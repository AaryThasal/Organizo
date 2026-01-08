// Join Organization Page - for users to enter org code and wait for approval

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { joinOrganization, clearError, getCurrentUser, checkApprovalStatus } from '../../store/authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

function JoinOrganizationPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isLoading, error } = useSelector((state) => state.auth);

    const [joinCode, setJoinCode] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const checkAndRedirect = useCallback(() => {
        if (user?.status === 'approved' && user?.organization_id) {
            navigate('/dashboard', { replace: true });
            return true;
        }
        return false;
    }, [user, navigate]);

    useEffect(() => {
        if (checkAndRedirect()) return;
        if (user?.organization_id && user?.status === 'pending') {
            setSubmitted(true);
        }
    }, [user, checkAndRedirect]);

    // Poll for approval status every 5 seconds (silently without loading state)
    useEffect(() => {
        if (!submitted) return;

        const interval = setInterval(async () => {
            const result = await dispatch(checkApprovalStatus());
            if (result.payload?.data?.user?.status === 'approved') {
                clearInterval(interval);
                navigate('/dashboard', { replace: true });
            }
        }, 5000);

        // Initial check
        dispatch(checkApprovalStatus());
        return () => clearInterval(interval);
    }, [submitted, dispatch, navigate]);

    useEffect(() => {
        return () => { dispatch(clearError()); };
    }, [dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        const result = await dispatch(joinOrganization(joinCode.trim()));
        if (!result.error) {
            setSubmitted(true);
            dispatch(getCurrentUser());
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
                        <span className="text-3xl font-bold text-white">O</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">
                        {submitted ? 'Awaiting Approval' : 'Join Organization'}
                    </h1>
                    <p className="text-primary-200 mt-2">
                        {submitted
                            ? 'Your request has been submitted'
                            : 'Enter the code provided by your admin'}
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-medium p-8">
                    {submitted ? (
                        // Pending approval state
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                                <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>

                            <h2 className="text-xl font-semibold text-secondary-900 mb-2">
                                Waiting for Admin Approval
                            </h2>
                            <p className="text-secondary-600 mb-6">
                                Your request to join the organization has been submitted. Please wait for the admin to approve your request.
                            </p>

                            <div className="p-4 rounded-xl bg-secondary-50 text-secondary-600 text-sm">
                                <p className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Checking status automatically...
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Join form
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <Input
                                label="Organization Join Code"
                                type="text"
                                name="joinCode"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Enter 6-character code"
                                required
                                className="text-center"
                            />

                            <p className="mb-4 text-sm text-secondary-500 text-center">
                                Ask your organization admin for the join code
                            </p>

                            <Button
                                type="submit"
                                loading={isLoading}
                                className="w-full"
                            >
                                Submit Request
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default JoinOrganizationPage;
