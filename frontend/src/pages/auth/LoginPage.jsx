import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// Login page with email/password form
function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, user, isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    // Redirect after successful login based on user state
    useEffect(() => {
        if (isAuthenticated && user) {
            if (!user.organization_id && user.role !== 'admin') {
                navigate('/join-organization');
            } else if (user.status === 'pending') {
                navigate('/pending-approval');
            } else {
                navigate('/dashboard');
            }
        }
    }, [isAuthenticated, user, navigate]);

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
    };

    // Submit login form
    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(login(formData));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
                        <span className="text-3xl font-bold text-white">O</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Welcome back</h1>
                    <p className="text-primary-200 mt-2">Sign in to your account</p>
                </div>

                <div className="bg-white rounded-2xl shadow-medium p-8">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

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

                        <Button
                            type="submit"
                            loading={isLoading}
                            className="w-full mt-4"
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-secondary-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
