import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import OrganizoLogo from '../../assets/logo/OrganizoLogo.png';

// Forgot Password page - user enters email to receive OTP
function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.post('/auth/forgot-password', { email });
            setSuccess(true);
            // Navigate to reset page after a brief delay, passing email as state
            setTimeout(() => {
                navigate('/reset-password', { state: { email } });
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4">
                        <img src={OrganizoLogo} alt="Organizo" className="w-10 h-10 object-contain rounded-lg" />
                        <span className="text-3xl font-bold text-gradient">Organizo</span>
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary">Forgot Password</h1>
                    <p className="text-text-secondary mt-2">
                        Enter your email and we'll send you a reset code
                    </p>
                </div>

                <div className="bg-dark-card rounded-2xl shadow-medium border border-dark-border p-8">
                    {success ? (
                        <div className="text-center">
                            {/* Success checkmark animation */}
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 border-2 border-success flex items-center justify-center animate-bounce">
                                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-text-primary mb-2">Check your email</h2>
                            <p className="text-text-secondary text-sm mb-4">
                                If an account with <span className="text-primary-400 font-medium">{email}</span> exists, we've sent a 6-digit reset code.
                            </p>
                            <p className="text-text-muted text-xs">Redirecting to reset page...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Email icon */}
                            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                                <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>

                            <Input
                                label="Email Address"
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />

                            <Button
                                type="submit"
                                loading={isLoading}
                                className="w-full mt-4"
                            >
                                Send Reset Code
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-text-secondary">
                            Remember your password?{' '}
                            <Link to="/login" className="text-primary-400 font-medium hover:text-primary-300">
                                Back to Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;
