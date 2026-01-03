// ===========================================
// Register Page
// ===========================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerAdmin, registerUser, clearError } from '../../store/authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

function RegisterPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, user, isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'employee', // Default role
        organizationName: '', // Only for admin
    });

    const [validationError, setValidationError] = useState('');

    // Redirect after registration
    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'admin') {
                navigate('/dashboard');
            } else {
                navigate('/join-organization');
            }
        }
    }, [isAuthenticated, user, navigate]);

    // Clear errors on unmount
    useEffect(() => {
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setValidationError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setValidationError('Passwords do not match');
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            setValidationError('Password must be at least 6 characters');
            return;
        }

        if (formData.role === 'admin') {
            // Admin registration
            dispatch(registerAdmin({
                organizationName: formData.organizationName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
            }));
        } else {
            // Manager/Employee registration
            dispatch(registerUser({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            }));
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
                    <h1 className="text-3xl font-bold text-white">Create Account</h1>
                    <p className="text-primary-200 mt-2">Get started with Organizo</p>
                </div>

                {/* Register Form */}
                <div className="bg-white rounded-2xl shadow-medium p-8">
                    <form onSubmit={handleSubmit}>
                        {(error || validationError) && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                {error || validationError}
                            </div>
                        )}

                        {/* Role Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-secondary-700 mb-3">
                                I want to register as
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['admin', 'manager', 'employee'].map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role })}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${formData.role === role
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
                                            }`}
                                    >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Organization name (only for admin) */}
                        {formData.role === 'admin' && (
                            <Input
                                label="Organization Name"
                                type="text"
                                name="organizationName"
                                value={formData.organizationName}
                                onChange={handleChange}
                                placeholder="Acme Corporation"
                                required
                            />
                        )}

                        {/* Name fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                placeholder="John"
                                required
                            />
                            <Input
                                label="Last Name"
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                placeholder="Doe"
                                required
                            />
                        </div>

                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                        />

                        <Button
                            type="submit"
                            loading={isLoading}
                            className="w-full mt-4"
                        >
                            {formData.role === 'admin' ? 'Create Organization' : 'Create Account'}
                        </Button>

                        {formData.role !== 'admin' && (
                            <p className="mt-3 text-xs text-secondary-500 text-center">
                                After registration, you'll need to join an organization using a code from your admin.
                            </p>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-secondary-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
