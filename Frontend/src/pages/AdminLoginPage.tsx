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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 relative overflow-hidden">
            {/* Modern Islamic 3D Background Effects */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-green-300/40 via-emerald-400/30 to-teal-300/20 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-80 sm:h-80 bg-gradient-to-br from-emerald-300/30 via-teal-400/25 to-green-300/20 rounded-full filter blur-2xl transform translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-teal-200/20 to-green-200/15 rounded-full filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-1/3 right-1/4 w-24 h-24 sm:w-36 sm:h-36 bg-gradient-to-br from-green-200/15 to-emerald-200/10 rounded-full filter blur-lg animate-pulse" style={{ animationDelay: '3s' }}></div>
            </div>

            {/* Modern Islamic Navigation Header */}
            <nav className="bg-gradient-to-r from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-b border-white/40 shadow-xl sticky top-0 z-50">
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-60"></div>
                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
                    <div className="flex justify-between items-center py-2 sm:py-3 lg:py-4">
                        <div className="flex items-center">
                            <img src="/images/logo.png" alt="Mosque Finder" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-contain mr-2 sm:mr-3" />
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                <span className="hidden sm:inline">Mosque Finder</span>
                                <span className="sm:hidden">Mosque Finder</span>
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
                            <Link
                                to="/mosques"
                                className="group flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-green-600 hover:text-green-700 rounded-lg hover:bg-green-50 transition-all duration-300 text-xs sm:text-sm font-medium transform hover:scale-105"
                            >
                                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" />
                                <span className="hidden sm:inline">Back to Home</span>
                                <span className="sm:hidden">Back</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Modern Islamic Main Content */}
            <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-2 sm:px-4 py-6 sm:py-12">
                <div className="w-full max-w-xs sm:max-w-md">
                    {/* Islamic Login Card */}
                    <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-hidden">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10">
                            {/* Modern Islamic Header */}
                            <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                                <div className="relative mb-3 sm:mb-4">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl blur-lg opacity-30"></div>
                                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                                        <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    </div>
                                </div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                                    <span className="hidden sm:inline">Admin Login</span>
                                    <span className="sm:hidden">Admin Login</span>
                                </h1>
                                <p className="text-gray-600 text-xs sm:text-sm">
                                    <span className="hidden sm:inline">Access your mosque management dashboard</span>
                                    <span className="sm:hidden">Mosque Dashboard Access</span>
                                </p>
                            </div>

                            {/* Modern Islamic Error Message */}
                            {error && (
                                <div className="bg-gradient-to-r from-red-50/80 via-rose-50/60 to-pink-50/40 border-2 border-red-200/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 backdrop-blur-sm">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 sm:mr-3"></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs sm:text-sm text-red-800 leading-relaxed">{error}</p>
                                            {hadTimeout && (
                                                <button
                                                    onClick={() => window.location.href = '/admin/dashboard'}
                                                    className="mt-2 inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-red-300/50 text-xs font-medium rounded-md text-red-700 bg-red-50/80 hover:bg-red-100/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500/50 transition-all duration-300 backdrop-blur-sm"
                                                >
                                                    <span className="hidden sm:inline">Check if Login Succeeded</span>
                                                    <span className="sm:hidden">Check Login</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modern Islamic Login Form */}
                            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4 sm:space-y-6">
                                {/* Email Field */}
                                <div>
                                    <label htmlFor="email" className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                                        <div className="relative mr-2">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                            <Mail className="relative h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                        </div>
                                        <span className="hidden sm:inline">Email Address</span>
                                        <span className="sm:hidden">Email</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            className={`block w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base ${errors.email ? 'border-red-300/50 bg-red-50/40' : 'border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-green-50/40 hover:bg-gray-100/80'
                                                }`}
                                            placeholder="Enter your email"
                                            {...register('email')}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                                            <div className="w-3 h-3 mr-1 flex-shrink-0"></div>
                                            {errors.email.message}
                                        </p>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label htmlFor="password" className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                                        <div className="relative mr-2">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                            <Lock className="relative h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                        </div>
                                        <span>Password</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete={showPassword ? 'off' : 'current-password'}
                                            className={`block w-full px-3 sm:px-4 pr-10 sm:pr-12 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base ${errors.password ? 'border-red-300/50 bg-red-50/40' : 'border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-green-50/40 hover:bg-gray-100/80'
                                                }`}
                                            placeholder="Enter your password"
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                                            ) : (
                                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                                            <div className="w-3 h-3 mr-1 flex-shrink-0"></div>
                                            {errors.password.message}
                                        </p>
                                    )}

                                    {/* Forgot Password Link */}
                                    <div className="text-right mt-2">
                                        <Link
                                            to="/forgot-password/admin"
                                            className="text-xs sm:text-sm text-green-600 hover:text-green-500 font-medium transition-colors hover:underline"
                                        >
                                            Forgot Password?
                                        </Link>
                                    </div>
                                </div>

                                {/* Islamic Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex items-center justify-center px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden text-sm sm:text-base"
                                >
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    <div className="relative flex items-center justify-center">
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2 sm:mr-3"></div>
                                                <span className="hidden sm:inline">Signing In...</span>
                                                <span className="sm:hidden">Signing In...</span>
                                            </>
                                        ) : (
                                            <>
                                                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                                <span className="hidden sm:inline">Sign In</span>
                                                <span className="sm:hidden">Sign In</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>

                            {/* Modern Islamic Additional Links */}
                            <div className="mt-4 sm:mt-6 lg:mt-8 text-center space-y-2 sm:space-y-3">
                                <p className="text-xs sm:text-sm text-gray-600">
                                    <Link
                                        to="/admin/status"
                                        className="font-medium text-green-600 hover:text-green-500 transition-colors"
                                    >
                                        <span className="hidden sm:inline">Check Account Status</span>
                                        <span className="sm:hidden">Check Status</span>
                                    </Link>
                                </p>
                                <p className="text-xs sm:text-sm text-gray-600">
                                    <span className="hidden sm:inline">Don't have an account? </span>
                                    <Link
                                        to="/mosques"
                                        className="font-medium text-green-600 hover:text-green-500 transition-colors"
                                    >
                                        <span className="hidden sm:inline">Find a mosque to apply</span>
                                        <span className="sm:hidden">Find Mosque</span>
                                    </Link>
                                </p>
                                <div className="flex items-center justify-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                                    <Link
                                        to="/superadmin/login"
                                        className="text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
                                    >
                                        <span className="hidden sm:inline">Super Admin Login</span>
                                        <span className="sm:hidden">Super Admin</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;