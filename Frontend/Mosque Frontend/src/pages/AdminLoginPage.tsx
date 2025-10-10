import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, ArrowLeft, Mail, Lock } from 'react-feather';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const AdminLoginPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hadTimeout, setHadTimeout] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const handleLogin = async (data: LoginFormData) => {
        setLoading(true);
        setError(null);
        setHadTimeout(false); // Clear timeout state on new attempt

        try {
            const response = await authApi.loginAdmin(data);

            // Store token and user info
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
            localStorage.setItem('user', JSON.stringify(response.data.admin));
            localStorage.setItem('user_type', 'admin');

            // Check status and redirect accordingly
            if (response.data.admin.status === 'approved') {
                window.location.href = '/admin/dashboard';
            } else {
                // Redirect to status page for pending/rejected
                window.location.href = '/admin/status';
            }
        } catch (err) {
            console.log('Login error:', err);

            // Check if it's a status-related error (rejected/pending)
            const errorResponse = err as {
                response?: {
                    data?: {
                        code?: string;
                        status?: string;
                        error?: string;
                        token?: string;
                        admin?: {
                            _id: string;
                            name: string;
                            email: string;
                            phone: string;
                            status: string;
                            mosque_id?: string;
                        };
                        rejection_reason?: string;
                        rejection_date?: string;
                        rejection_count?: number;
                        can_reapply?: boolean;
                        require_mosque_code?: boolean;
                        code_regeneration_reason?: string;
                        code_regeneration_date?: string;
                        code_regenerated_mosque_name?: string;
                        code_regenerated_mosque_location?: string;
                        message?: string;
                    };
                    status?: number;
                }
            };

            if (errorResponse.response?.data?.code === 'ACCOUNT_REJECTED') {
                const data = errorResponse.response.data;

                // CRITICAL: Clear ALL storage first to remove old tokens
                localStorage.clear();
                sessionStorage.clear();

                // Store token and user info for status page access
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('Saved rejected admin token:', data.token);
                }
                if (data.admin) {
                    localStorage.setItem('user', JSON.stringify(data.admin));
                    console.log('Saved rejected admin user:', data.admin);
                }
                localStorage.setItem('user_type', 'admin');

                // Redirect to status page where full profile will be loaded
                window.location.href = '/admin/status';
                return;
            }

            if (errorResponse.response?.data?.code === 'MOSQUE_DELETED') {
                const data = errorResponse.response.data;

                // CRITICAL: Clear ALL storage first to remove old tokens
                localStorage.clear();
                sessionStorage.clear();

                // Store token and user info for status page access
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('Saved mosque_deleted admin token:', data.token);
                }
                if (data.admin) {
                    localStorage.setItem('user', JSON.stringify(data.admin));
                    console.log('Saved mosque_deleted admin user:', data.admin);
                }
                localStorage.setItem('user_type', 'admin');

                // Redirect to status page where full profile will be loaded
                window.location.href = '/admin/status';
                return;
            }

            if (errorResponse.response?.data?.code === 'ADMIN_REMOVED') {
                const data = errorResponse.response.data;

                // CRITICAL: Clear ALL storage first to remove old tokens
                localStorage.clear();
                sessionStorage.clear();

                // Store token and user info for status page access
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('Saved admin_removed admin token:', data.token);
                }
                if (data.admin) {
                    localStorage.setItem('user', JSON.stringify(data.admin));
                    console.log('Saved admin_removed admin user:', data.admin);
                }
                localStorage.setItem('user_type', 'admin');

                // Redirect to status page where full profile will be loaded
                window.location.href = '/admin/status';
                return;
            }

            if (errorResponse.response?.data?.code === 'CODE_REGENERATED_NEEDS_CODE') {
                const data = errorResponse.response.data;

                // For admins with regenerated codes, always redirect to status page
                // so they can see their regenerated status and get instructions
                // CRITICAL: Clear ALL storage first to remove old tokens
                localStorage.clear();
                sessionStorage.clear();

                // Store token and user info for status page access
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('Saved code_regenerated admin token:', data.token);
                }
                if (data.admin) {
                    localStorage.setItem('user', JSON.stringify(data.admin));
                    console.log('Saved code_regenerated admin user:', data.admin);
                }
                localStorage.setItem('user_type', 'admin');

                // Always redirect to status page for regenerated code admins
                window.location.href = '/admin/status';
                return;
            }

            if (errorResponse.response?.data?.code === 'PENDING_APPROVAL') {
                const data = errorResponse.response.data;

                // CRITICAL: Clear ALL storage first to remove old tokens
                localStorage.clear();
                sessionStorage.clear();

                // Store token and user info for status page access
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('Saved pending admin token:', data.token);
                }
                if (data.admin) {
                    localStorage.setItem('user', JSON.stringify(data.admin));
                    console.log('Saved pending admin user:', data.admin);
                }
                localStorage.setItem('user_type', 'admin');

                // Redirect to status page where full profile will be loaded
                window.location.href = '/admin/status';
                return;
            }

            const errorMessage = getErrorMessage(err);

            // Check if this is a timeout error
            if (err instanceof Error && err.name === 'TimeoutError') {
                setHadTimeout(true);
                setError('Login request timed out, but the server may still be processing your request. Please wait a moment and check if you were logged in successfully by refreshing the page or checking the dashboard.');
            } else {
                setError(errorMessage);
                setHadTimeout(false);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Navigation Header */}
            <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4 sm:py-6">
                        <div className="flex items-center">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-2 mr-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Mosque Finder
                            </span>
                        </div>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <Link
                                to="/"
                                className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Login Card */}
                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <LogIn className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                Admin Login
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Access your mosque management dashboard
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 mb-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm text-red-800">{error}</p>
                                        {hadTimeout && (
                                            <button
                                                onClick={() => window.location.href = '/admin/dashboard'}
                                                className="mt-2 inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                            >
                                                Check if Login Succeeded
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit(handleLogin)} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        className={`block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white/50'
                                            }`}
                                        placeholder="Enter your email"
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        className={`block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white/50'
                                            }`}
                                        placeholder="Enter your password"
                                        {...register('password')}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing In...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5 mr-2" />
                                        Sign In
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Additional Links */}
                        <div className="mt-8 text-center space-y-3">
                            <p className="text-sm text-gray-600">
                                <Link
                                    to="/admin/status"
                                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                                >
                                    Check Account Status
                                </Link>
                            </p>
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link
                                    to="/mosques"
                                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                                >
                                    Find a mosque to apply
                                </Link>
                            </p>
                            <div className="flex items-center justify-center space-x-4 text-sm">
                                <Link
                                    to="/superadmin/login"
                                    className="text-purple-600 hover:text-purple-500 font-medium transition-colors"
                                >
                                    Super Admin Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;