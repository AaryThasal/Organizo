import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import OrganizoLogo from '../../assets/logo/OrganizoLogo.png';

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
        <div className="min-h-screen bg-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4">
                        <img src={OrganizoLogo} alt="Organizo" className="w-10 h-10 object-contain rounded-lg" />
                        <span className="text-3xl font-bold text-gradient">Organizo</span>
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary">Welcome back</h1>
                    <p className="text-text-secondary mt-2">Sign in to your account</p>
                </div>

                <div className="bg-dark-card rounded-2xl shadow-medium border border-dark-border p-8">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
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
                        <p className="text-text-secondary">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-400 font-medium hover:text-primary-300">
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
