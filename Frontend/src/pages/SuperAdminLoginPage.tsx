import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { Mail, Lock, Shield, ArrowLeft, Eye, EyeOff } from 'react-feather';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const SuperAdminLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const handleLogin = async (data: LoginFormData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.loginSuperAdmin(data);
            console.log('Login response:', response.data);

            // Store token and user info
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
            localStorage.setItem('superadmin', JSON.stringify(response.data.super_admin));
            localStorage.setItem('user_type', 'superadmin');

            console.log('Stored token:', localStorage.getItem('token'));
            console.log('Stored user:', localStorage.getItem('superadmin'));

            // Redirect to super admin dashboard
            navigate('/superadmin/dashboard');
        } catch (err) {
            console.log('Super admin login error:', err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log('Error response:', (err as any)?.response?.data);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
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

            <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
                {/* Modern Islamic Navigation */}
                <div className="mb-4 sm:mb-8">
                    <Link
                        to="/mosques"
                        className="group inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl text-green-600 hover:text-green-700 font-medium transition-all duration-300 hover:bg-white/90 shadow-xl hover:shadow-2xl transform hover:scale-105"
                    >
                        <div className="relative mr-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <ArrowLeft className="relative w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                        </div>
                        <span className="text-sm sm:text-base">
                            <span className="hidden sm:inline">Back to Home</span>
                            <span className="sm:hidden">Back</span>
                        </span>
                    </Link>
                </div>

                <div className="max-w-sm sm:max-w-lg mx-auto">
                    <div className="text-center mb-6 sm:mb-12">
                        <div className="relative mb-4 sm:mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl blur-lg opacity-30"></div>
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 via-emerald-100/10 to-teal-100/20 rounded-2xl blur-3xl"></div>
                            <div className="relative">
                                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 sm:mb-4 px-2">
                                    <span className="hidden sm:inline">Super Admin Login</span>
                                    <span className="sm:hidden">Super Admin</span>
                                </h1>
                                <p className="text-base sm:text-sm lg:text-xl text-gray-600 leading-relaxed px-2">
                                    <span className="hidden sm:inline">Access the mosque management system</span>
                                    <span className="sm:hidden">System Access</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-hidden">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10">
                            {/* Modern Islamic Error Message */}
                            {error && (
                                <div className="bg-gradient-to-r from-red-50/80 via-rose-50/60 to-pink-50/40 border-2 border-red-200/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 backdrop-blur-sm">
                                    <div className="flex items-center">
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 sm:mr-3 flex-shrink-0"></div>
                                        <p className="text-red-700 font-medium text-sm sm:text-base leading-relaxed">{error}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4 sm:space-y-6">
                                <div>
                                    <label className="flex items-center text-sm sm:text-base font-semibold text-gray-700 mb-2 sm:mb-3">
                                        <div className="relative mr-2">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                            <Mail className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                        </div>
                                        <span className="hidden sm:inline">Email Address</span>
                                        <span className="sm:hidden">Email</span>
                                    </label>
                                    <input
                                        {...form.register('email')}
                                        type="email"
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                        placeholder="Enter your email"
                                    />
                                    {form.formState.errors.email && (
                                        <p className="text-red-500 text-sm sm:text-base mt-1 sm:mt-2 font-medium flex items-center">
                                            <div className="w-3 h-3 mr-1 flex-shrink-0"></div>
                                            {form.formState.errors.email.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center text-sm sm:text-base font-semibold text-gray-700 mb-2 sm:mb-3">
                                        <div className="relative mr-2">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                            <Lock className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                        </div>
                                        <span>Password</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...form.register('password')}
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete={showPassword ? 'off' : 'current-password'}
                                            className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1"
                                            key={showPassword ? 'login-eye-off' : 'login-eye-on'}
                                        >
                                            {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                        </button>
                                    </div>
                                    {form.formState.errors.password && (
                                        <p className="text-red-500 text-sm sm:text-base mt-1 sm:mt-2 font-medium flex items-center">
                                            <div className="w-3 h-3 mr-1 flex-shrink-0"></div>
                                            {form.formState.errors.password.message}
                                        </p>
                                    )}

                                    {/* Forgot Password Link */}
                                    <div className="text-right mt-2">
                                        <Link
                                            to="/forgot-password/superadmin"
                                            className="text-sm sm:text-base text-green-600 hover:text-emerald-700 font-medium transition-colors hover:underline"
                                        >
                                            Forgot Password?
                                        </Link>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 disabled:from-green-300 disabled:via-emerald-300 disabled:to-teal-300 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl disabled:transform-none overflow-hidden text-sm sm:text-base"
                                >
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    <div className="relative flex items-center justify-center">
                                        <Shield className="w-4 h-4 mr-2" />
                                        <span>{loading ? 'Logging in...' : 'Login'}</span>
                                    </div>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default SuperAdminLoginPage;