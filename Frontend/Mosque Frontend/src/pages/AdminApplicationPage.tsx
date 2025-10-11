import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, mosqueApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import {
    ArrowLeft,
    Phone,
    Mail,
    User,
    Lock,
    Shield,
    FileText,
    CheckCircle,
    Eye,
    EyeOff,
    AlertTriangle,
    LogIn,
    UserPlus
} from 'react-feather';

// Validation schemas
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(7, 'Password must be at least 7 characters'),
    confirm_password: z.string(),
    phone: z.string().regex(/^\+923[0-9]{9}$/, 'Phone number must be in format +923xxxxxxxxx'),
    mosque_verification_code: z.string().min(1, 'Verification code is required'),
    application_notes: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

interface MosqueContactInfo {
    name: string;
    location: string;
    contact_phone: string;
    contact_email: string;
    admin_instructions: string;
}

const AdminApplicationPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [mode, setMode] = useState<'register' | 'login'>('register');
    const [mosqueInfo, setMosqueInfo] = useState<MosqueContactInfo | null>(null);
    const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const registerForm = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const loginForm = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    // Watch password for strength indicator
    const password = registerForm.watch('password');

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { strength: 0, label: '', color: '' };

        let strength = 0;
        let label = '';
        let color = '';

        // Only letters = weak
        if (/^[a-zA-Z]+$/.test(pwd)) {
            strength = 1;
            label = 'Weak';
            color = 'bg-red-500';
        }
        // Numbers added = good
        else if (/[a-zA-Z]/.test(pwd) && /\d/.test(pwd) && !/[A-Z]/.test(pwd) && !/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            strength = 2;
            label = 'Good';
            color = 'bg-blue-500';
        }
        // Special characters = enhanced security
        else if (/[a-zA-Z]/.test(pwd) && /\d/.test(pwd) && /[A-Z]/.test(pwd) && !/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            strength = 3;
            label = 'Enhanced Security';
            color = 'bg-purple-500';
        }
        // Capital letters = super strong
        else if (/[a-zA-Z]/.test(pwd) && /\d/.test(pwd) && /[A-Z]/.test(pwd) && /[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            strength = 4;
            label = 'Super Strong';
            color = 'bg-green-500';
        }
        // Mixed but not meeting all criteria
        else {
            strength = 1;
            label = 'Weak';
            color = 'bg-red-500';
        }

        return { strength, label, color };
    };

    const passwordStrength = getPasswordStrength(password || '');

    useEffect(() => {
        const fetchMosqueInfo = async () => {
            if (!id) return;

            try {
                const response = await mosqueApi.getMosqueVerificationInfo(id);
                setMosqueInfo(response.data.mosque);
            } catch (err) {
                console.error('Failed to fetch mosque info:', err);
            }
        };

        fetchMosqueInfo();
    }, [id]);

    const handleRegister = async (data: RegisterFormData) => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            await authApi.registerAdmin({
                name: data.name,
                email: data.email,
                password: data.password,
                phone: data.phone,
                mosque_id: id,
                verification_code: data.mosque_verification_code,
                application_notes: data.application_notes,
            });

            setApplicationStatus('pending');
            registerForm.reset();
        } catch (err) {
            console.log('Registration error:', err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (data: LoginFormData) => {
        setLoading(true);
        setError(null);

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
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (applicationStatus === 'pending') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 relative overflow-hidden">
                {/* Modern Islamic 3D Background Effects */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-green-300/40 via-emerald-400/30 to-teal-300/20 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-80 sm:h-80 bg-gradient-to-br from-emerald-300/30 via-teal-400/25 to-green-300/20 rounded-full filter blur-2xl transform translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-teal-200/20 to-green-200/15 rounded-full filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="relative z-10 container mx-auto px-2 sm:px-4 py-8 sm:py-16">
                    <div className="max-w-sm sm:max-w-lg mx-auto">
                        <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 text-center overflow-hidden">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                <div className="relative mb-4 sm:mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-30"></div>
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                    </div>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                                    <span className="hidden sm:inline">Application Submitted Successfully!</span>
                                    <span className="sm:hidden">Application Submitted!</span>
                                </h2>
                                <p className="text-xs sm:text-base text-gray-600 mb-4 sm:mb-8 leading-relaxed px-2">
                                    <span className="hidden sm:inline">Your application is pending review by the super admin. You will be notified once it's approved or Login within 24 hours.</span>
                                    <span className="sm:hidden">Application pending review. Check back in 24 hours.</span>
                                </p>
                                <div className="space-y-2 sm:space-y-3">
                                    <Link
                                        to={`/mosques/${id}`}
                                        className="group relative block w-full bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        <span className="relative text-sm sm:text-base">
                                            <span className="hidden sm:inline">Back to Mosque</span>
                                            <span className="sm:hidden">Back to Mosque</span>
                                        </span>
                                    </Link>
                                    <Link
                                        to="/mosques"
                                        className="group relative block w-full bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        <span className="relative text-sm sm:text-base">
                                            <span className="hidden sm:inline">Browse Other Mosques</span>
                                            <span className="sm:hidden">Browse Mosques</span>
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                        to={`/mosques/${id}`}
                        className="group inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl text-green-600 hover:text-green-700 font-medium transition-all duration-300 hover:bg-white/90 shadow-xl hover:shadow-2xl transform hover:scale-105"
                    >
                        <div className="relative mr-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <ArrowLeft className="relative w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                        </div>
                        <span className="text-sm sm:text-base">
                            <span className="hidden sm:inline">Back to Mosque</span>
                            <span className="sm:hidden">Back</span>
                        </span>
                    </Link>
                </div>

                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-6 sm:mb-12">
                        <div className="relative mb-4 sm:mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 via-emerald-100/10 to-teal-100/20 rounded-2xl blur-3xl"></div>
                            <div className="relative">
                                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 sm:mb-4 px-2">
                                    <span className="hidden sm:inline">Mosque Admin Access</span>
                                    <span className="sm:hidden">Admin Access</span>
                                </h1>
                                <p className="text-sm sm:text-lg lg:text-xl text-gray-600 max-w-md sm:max-w-2xl mx-auto leading-relaxed px-2">
                                    <span className="hidden sm:inline">Login or register to manage mosque prayer times and information</span>
                                    <span className="sm:hidden">Manage mosque prayer times</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {/* Modern Islamic Contact Info Card */}
                        {mosqueInfo && (
                            <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-hidden">
                                {/* 3D Background Effects */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                                <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center mb-4 sm:mb-6">
                                        <div className="relative mr-3 sm:mr-4">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg sm:rounded-xl blur-sm opacity-30"></div>
                                            <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                                                <Phone className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                        </div>
                                        <h3 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                            <span className="hidden sm:inline">Need Verification Code?</span>
                                            <span className="sm:hidden">Verification Code?</span>
                                        </h3>
                                    </div>
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 border border-green-100/50 rounded-lg sm:rounded-xl p-3 sm:p-4 backdrop-blur-sm">
                                            <span className="font-semibold text-gray-800 block mb-1 text-sm sm:text-base">Mosque:</span>
                                            <p className="text-gray-700 font-medium text-sm sm:text-base break-words">{mosqueInfo.name}</p>
                                        </div>
                                        <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 border border-green-100/50 rounded-lg sm:rounded-xl p-3 sm:p-4 backdrop-blur-sm">
                                            <span className="font-semibold text-gray-800 block mb-1 text-sm sm:text-base">Location:</span>
                                            <p className="text-gray-700 text-sm sm:text-base break-words leading-relaxed">{mosqueInfo.location}</p>
                                        </div>
                                        <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/60 border-2 border-amber-200/50 rounded-lg sm:rounded-xl p-3 sm:p-4 backdrop-blur-sm">
                                            <p className="text-amber-800 text-xs sm:text-sm leading-relaxed">
                                                {mosqueInfo.admin_instructions}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-hidden">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                {/* Modern Islamic Mode Toggle */}
                                <div className="flex mb-4 sm:mb-6 lg:mb-8 bg-gradient-to-r from-gray-100/80 via-green-50/50 to-emerald-50/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1 sm:p-2 border border-white/30">
                                    <button
                                        onClick={() => setMode('register')}
                                        className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${mode === 'register'
                                            ? 'bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 text-white shadow-lg transform scale-105'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                                            }`}
                                    >
                                        <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
                                        <span className="hidden sm:inline">Register</span>
                                        <span className="sm:hidden">Register</span>
                                    </button>
                                    <button
                                        onClick={() => setMode('login')}
                                        className={`flex-1 py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${mode === 'login'
                                            ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg transform scale-105'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                                            }`}
                                    >
                                        <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
                                        <span className="hidden sm:inline">Login</span>
                                        <span className="sm:hidden">Login</span>
                                    </button>
                                </div>

                                {/* Modern Islamic Error Message */}
                                {error && (
                                    <div className="bg-gradient-to-r from-red-50/80 via-rose-50/60 to-pink-50/40 border-2 border-red-200/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 backdrop-blur-sm">
                                        <div className="flex items-center">
                                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 sm:mr-3 flex-shrink-0" />
                                            <p className="text-red-700 font-medium text-sm sm:text-base leading-relaxed">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Modern Islamic Register Form */}
                                {mode === 'register' && (
                                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4 sm:space-y-6">
                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <User className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span className="hidden sm:inline">Full Name</span>
                                                <span className="sm:hidden">Name</span>
                                            </label>
                                            <input
                                                {...registerForm.register('name')}
                                                type="text"
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Enter your full name"
                                            />
                                            {registerForm.formState.errors.name && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {registerForm.formState.errors.name.message}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <Mail className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span className="hidden sm:inline">Email Address</span>
                                                <span className="sm:hidden">Email</span>
                                            </label>
                                            <input
                                                {...registerForm.register('email')}
                                                type="email"
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Enter your email"
                                            />
                                            {registerForm.formState.errors.email && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {registerForm.formState.errors.email.message}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <Lock className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span>Password</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    {...registerForm.register('password')}
                                                    type={showPassword ? 'text' : 'password'}
                                                    className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                    placeholder="Create a password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1"
                                                >
                                                    {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                                </button>
                                            </div>
                                            {password && (
                                                <div className="mt-2">
                                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                        <span className="text-xs">Strength: {passwordStrength.label}</span>
                                                        <span className="text-xs">{passwordStrength.strength}/4</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200/50 backdrop-blur-sm rounded-full h-1.5 sm:h-2 border border-gray-300/30">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                            style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                            {registerForm.formState.errors.password && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {registerForm.formState.errors.password.message}
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                                                <span className="hidden sm:inline">Use letters, numbers, special characters, and capital letters for maximum security</span>
                                                <span className="sm:hidden">Use letters, numbers, symbols for security</span>
                                            </p>
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <Lock className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span className="hidden sm:inline">Confirm Password</span>
                                                <span className="sm:hidden">Confirm</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    {...registerForm.register('confirm_password')}
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                    placeholder="Confirm your password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                                </button>
                                            </div>
                                            {registerForm.formState.errors.confirm_password && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {registerForm.formState.errors.confirm_password.message}
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-500">
                                                <span className="hidden sm:inline">Must match the password entered above</span>
                                                <span className="sm:hidden">Must match password above</span>
                                            </p>
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <Phone className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span className="hidden sm:inline">Phone Number</span>
                                                <span className="sm:hidden">Phone</span>
                                            </label>
                                            <input
                                                {...registerForm.register('phone')}
                                                type="tel"
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="+923001234567"
                                            />
                                            {registerForm.formState.errors.phone && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {registerForm.formState.errors.phone.message}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <Shield className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span className="hidden sm:inline">Mosque Verification Code</span>
                                                <span className="sm:hidden">Verification Code</span>
                                            </label>
                                            <input
                                                {...registerForm.register('mosque_verification_code')}
                                                type="text"
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Enter verification code"
                                            />
                                            {registerForm.formState.errors.mosque_verification_code && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {registerForm.formState.errors.mosque_verification_code.message}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                    <FileText className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                </div>
                                                <span className="hidden sm:inline">Application Notes (Optional)</span>
                                                <span className="sm:hidden">Notes (Optional)</span>
                                            </label>
                                            <textarea
                                                {...registerForm.register('application_notes')}
                                                rows={3}
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm resize-none text-sm sm:text-base"
                                                placeholder="Any additional information..."
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 disabled:from-green-300 disabled:via-emerald-300 disabled:to-teal-300 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl disabled:transform-none overflow-hidden text-sm sm:text-base"
                                        >
                                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                            <div className="relative flex items-center justify-center">
                                                <UserPlus className="w-4 h-4 mr-2" />
                                                <span className="hidden sm:inline">{loading ? 'Submitting Application...' : 'Submit Application'}</span>
                                                <span className="sm:hidden">{loading ? 'Submitting...' : 'Submit'}</span>
                                            </div>
                                        </button>
                                    </form>
                                )}

                                {/* Modern Islamic Login Form */}
                                {mode === 'login' && (
                                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 sm:space-y-6">
                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-sm opacity-30"></div>
                                                    <Mail className="relative w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                                                </div>
                                                <span className="hidden sm:inline">Email Address</span>
                                                <span className="sm:hidden">Email</span>
                                            </label>
                                            <input
                                                {...loginForm.register('email')}
                                                type="email"
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-emerald-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Enter your email"
                                            />
                                            {loginForm.formState.errors.email && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {loginForm.formState.errors.email.message}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                                <div className="relative mr-2">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-sm opacity-30"></div>
                                                    <Lock className="relative w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                                                </div>
                                                <span>Password</span>
                                            </label>
                                            <input
                                                {...loginForm.register('password')}
                                                type="password"
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-emerald-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Enter your password"
                                            />
                                            {loginForm.formState.errors.password && (
                                                <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                    {loginForm.formState.errors.password.message}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="group relative w-full bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:via-green-700 hover:to-teal-700 disabled:from-emerald-300 disabled:via-green-300 disabled:to-teal-300 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl disabled:transform-none overflow-hidden text-sm sm:text-base"
                                        >
                                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                            <div className="relative flex items-center justify-center">
                                                <LogIn className="w-4 h-4 mr-2" />
                                                <span>{loading ? 'Logging in...' : 'Login'}</span>
                                            </div>
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminApplicationPage;