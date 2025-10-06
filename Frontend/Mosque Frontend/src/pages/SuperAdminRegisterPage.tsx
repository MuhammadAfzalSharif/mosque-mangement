import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { Mail, Lock, Shield, ArrowLeft } from 'react-feather';

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(7, 'Password must be at least 7 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const SuperAdminRegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const handleRegister = async (data: RegisterFormData) => {
        setLoading(true);
        setError(null);

        try {
            await authApi.registerSuperAdmin(data);
            setSuccess(true);
            setTimeout(() => {
                navigate('/superadmin/login');
            }, 2000);
        } catch (err) {
            console.log('Super admin registration error:', err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
                </div>

                <div className="relative z-10 container mx-auto px-4 py-16">
                    <div className="max-w-lg mx-auto">
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <Shield className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                                Super Admin Registered Successfully!
                            </h2>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Redirecting to login page...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Navigation */}
                <div className="mb-8">
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-lg border border-white/20 rounded-xl text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 hover:bg-white/90 shadow-lg"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>

                <div className="max-w-lg mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                            Super Admin Registration
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed">
                            Create your super admin account to manage the mosque system
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 mb-6">
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-6">
                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                                    Email Address
                                </label>
                                <input
                                    {...form.register('email')}
                                    type="email"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                    placeholder="Enter your email"
                                />
                                {form.formState.errors.email && (
                                    <p className="text-red-500 text-sm mt-2 font-medium">
                                        {form.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                    <Lock className="w-4 h-4 mr-2 text-blue-600" />
                                    Password
                                </label>
                                <input
                                    {...form.register('password')}
                                    type="password"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                    placeholder="Create a secure password"
                                />
                                {form.formState.errors.password && (
                                    <p className="text-red-500 text-sm mt-2 font-medium">
                                        {form.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-blue-300 disabled:to-purple-300 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none"
                            >
                                {loading ? 'Creating Account...' : 'Create Super Admin Account'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-600">
                                Already have an account?{' '}
                                <Link
                                    to="/superadmin/login"
                                    className="text-blue-600 hover:text-blue-700 font-semibold"
                                >
                                    Login here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminRegisterPage;