import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { Mail, Lock, Shield, ArrowLeft, Eye, EyeOff, User } from 'react-feather';

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').refine((email) => {
        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;
        return allowedDomainsRegex.test(email);
    }, 'Email must be from gmail.com, outlook.com, yahoo.com, or hotmail.com'),
    password: z.string()
        .min(7, 'Password must be at least 7 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{7,}$/,
            'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const SuperAdminRegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    // Watch password for strength indicator
    const password = form.watch('password');

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { strength: 0, label: '', color: '', canSubmit: false };

        let strength = 0;
        let label = '';
        let color = '';
        let canSubmit = false;

        const hasLower = /[a-z]/.test(pwd);
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

        // Must have ALL requirements to submit
        if (hasLower && hasUpper && hasNumber && hasSpecial && pwd.length >= 7) {
            strength = 4;
            label = 'Super Strong - Ready to Submit';
            color = 'bg-green-500';
            canSubmit = true;
        } else {
            // Calculate partial strength but cannot submit
            let criteriaMet = 0;
            if (hasLower) criteriaMet++;
            if (hasUpper) criteriaMet++;
            if (hasNumber) criteriaMet++;
            if (hasSpecial) criteriaMet++;

            if (criteriaMet === 0) {
                strength = 0;
                label = 'Very Weak - Missing all requirements';
                color = 'bg-gray-300';
            } else if (criteriaMet === 1) {
                strength = 1;
                label = 'Weak - Missing 3 requirements';
                color = 'bg-red-500';
            } else if (criteriaMet === 2) {
                strength = 2;
                label = 'Fair - Missing 2 requirements';
                color = 'bg-orange-500';
            } else if (criteriaMet === 3) {
                strength = 3;
                label = 'Good - Missing 1 requirement';
                color = 'bg-yellow-500';
            }
            canSubmit = false;
        }

        return { strength, label, color, canSubmit };
    };

    const passwordStrength = getPasswordStrength(password || '');

    const handleRegister = async (data: RegisterFormData) => {
        // Additional validation before submission
        if (!passwordStrength.canSubmit) {
            setError('Password must contain lowercase letters, uppercase letters, numbers, and special characters to register.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authApi.registerSuperAdmin(data);
            setSuccess(true);
            setTimeout(() => {
                navigate('/superadmin/login');
            }, 2000);
        } catch (err: unknown) {
            console.log('Super admin registration error:', err);
            let errorMessage = getErrorMessage(err);

            // Provide more specific error messages for super admin creation
            const axiosError = err as { response?: { status?: number; data?: { code?: string } } };
            if (axiosError.response?.status === 401) {
                errorMessage = 'Authentication required. Please log in as a super admin to create additional accounts.';
            } else if (axiosError.response?.status === 403) {
                errorMessage = 'Super admin access required to create additional super admin accounts.';
            }

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
                    <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
                </div>

                <div className="relative z-10 container mx-auto px-2 sm:px-4 py-8 sm:py-16">
                    <div className="max-w-sm sm:max-w-lg mx-auto">
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                                Super Admin Registered Successfully!
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
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

            <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
                {/* Navigation */}
                <div className="mb-4 sm:mb-8">
                    <Link
                        to="/mosques"
                        className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 hover:bg-white/90 shadow-lg text-sm sm:text-base"
                    >
                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Back to Home</span>
                        <span className="sm:hidden">Back</span>
                    </Link>
                </div>

                <div className="max-w-sm sm:max-w-lg mx-auto">
                    <div className="text-center mb-6 sm:mb-12">
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2 sm:mb-4">
                            <span className="hidden sm:inline">Super Admin Registration</span>
                            <span className="sm:hidden">Super Admin</span>
                        </h1>
                        <p className="text-sm sm:text-xl text-gray-600 leading-relaxed px-2">
                            <span className="hidden sm:inline">Create your super admin account to manage the mosque system</span>
                            <span className="sm:hidden">Create your account</span>
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                <p className="text-red-700 font-medium text-sm sm:text-base">{error}</p>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4 sm:space-y-6">
                            <div>
                                <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                                    <span className="hidden sm:inline">Full Name</span>
                                    <span className="sm:hidden">Name</span>
                                </label>
                                <input
                                    {...form.register('name')}
                                    type="text"
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100 text-sm sm:text-base"
                                    placeholder="Enter your full name"
                                />
                                {form.formState.errors.name && (
                                    <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                        {form.formState.errors.name.message}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                                    <span className="hidden sm:inline">Email Address</span>
                                    <span className="sm:hidden">Email</span>
                                </label>
                                <input
                                    {...form.register('email')}
                                    type="email"
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100 text-sm sm:text-base"
                                    placeholder="Enter your email"
                                />
                                {form.formState.errors.email && (
                                    <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                        {form.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        {...form.register('password')}
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100 text-sm sm:text-base"
                                        placeholder="Create a secure password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-2 sm:mt-3">
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
                                            <span>Strength: {passwordStrength.label}</span>
                                            <span>{passwordStrength.strength}/4</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                                            <div
                                                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                                            ></div>
                                        </div>
                                        {!passwordStrength.canSubmit && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-red-700 text-xs sm:text-sm font-medium">
                                                    Password must include: lowercase letters, uppercase letters, numbers, and special characters
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {form.formState.errors.password && (
                                    <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                        {form.formState.errors.password.message}
                                    </p>
                                )}
                                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                    Must include lowercase, uppercase, numbers, and special characters
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                                    <span className="hidden sm:inline">Confirm Password</span>
                                    <span className="sm:hidden">Confirm</span>
                                </label>
                                <div className="relative">
                                    <input
                                        {...form.register('confirm_password')}
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100 text-sm sm:text-base"
                                        placeholder="Confirm your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                    </button>
                                </div>
                                {form.formState.errors.confirm_password && (
                                    <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                        {form.formState.errors.confirm_password.message}
                                    </p>
                                )}
                                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                    Must match the password entered above
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !passwordStrength.canSubmit}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg text-sm sm:text-base"
                            >
                                <span className="hidden sm:inline">{loading ? 'Creating Account...' : 'Create Super Admin Account'}</span>
                                <span className="sm:hidden">{loading ? 'Creating...' : 'Create Account'}</span>
                            </button>
                        </form>

                        <div className="mt-4 sm:mt-6 text-center">
                            <p className="text-xs sm:text-sm text-gray-600">
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