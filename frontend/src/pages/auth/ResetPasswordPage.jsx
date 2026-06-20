import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import OrganizoLogo from '../../assets/logo/OrganizoLogo.png';

// Reset Password page - user enters OTP and new password
function ResetPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromState = location.state?.email || '';

    const [email, setEmail] = useState(emailFromState);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Refs for OTP input boxes
    const otpRefs = useRef([]);

    // Auto-focus first OTP input on mount
    useEffect(() => {
        if (otpRefs.current[0]) {
            otpRefs.current[0].focus();
        }
    }, []);

    // Handle OTP input - auto-advance to next box
    const handleOtpChange = (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance to next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace - go to previous box
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste - fill all boxes at once
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            otpRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setValidationError('');

        const otpString = otp.join('');

        if (otpString.length !== 6) {
            setValidationError('Please enter the complete 6-digit code.');
            return;
        }

        if (newPassword.length < 6) {
            setValidationError('Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setValidationError('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/auth/reset-password', {
                email,
                otp: otpString,
                newPassword,
            });
            setSuccess(true);
            // Redirect to login after success
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
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
                    <h1 className="text-3xl font-bold text-text-primary">Reset Password</h1>
                    <p className="text-text-secondary mt-2">
                        Enter the code sent to your email
                    </p>
                </div>

                <div className="bg-dark-card rounded-2xl shadow-medium border border-dark-border p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 border-2 border-success flex items-center justify-center animate-bounce">
                                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-text-primary mb-2">Password Reset Successful!</h2>
                            <p className="text-text-secondary text-sm mb-4">
                                Your password has been updated. You can now log in with your new password.
                            </p>
                            <p className="text-text-muted text-xs">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {(error || validationError) && (
                                <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                                    {error || validationError}
                                </div>
                            )}

                            {/* Lock icon */}
                            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                                <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>

                            {/* Email field (pre-filled if coming from forgot password page) */}
                            {!emailFromState && (
                                <Input
                                    label="Email Address"
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            )}

                            {emailFromState && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                                        Email
                                    </label>
                                    <div className="px-4 py-2.5 rounded-xl border border-dark-border bg-dark-elevated text-text-secondary text-sm">
                                        {emailFromState}
                                    </div>
                                </div>
                            )}

                            {/* OTP Input - 6 individual digit boxes */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-primary mb-3">
                                    Reset Code
                                </label>
                                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => (otpRefs.current[index] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-dark-border bg-dark-card text-text-primary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 outline-none"
                                            autoComplete="one-time-code"
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-text-muted mt-2 text-center">
                                    Code expires in 15 minutes
                                </p>
                            </div>

                            <Input
                                label="New Password"
                                type="password"
                                name="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />

                            <Input
                                label="Confirm New Password"
                                type="password"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />

                            <Button
                                type="submit"
                                loading={isLoading}
                                className="w-full mt-4"
                            >
                                Reset Password
                            </Button>

                            {/* Resend code link */}
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
                                >
                                    Didn't receive the code? Send again
                                </button>
                            </div>
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

export default ResetPasswordPage;
