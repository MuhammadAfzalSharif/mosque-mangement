import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, mosqueApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { ArrowLeft, Phone, Mail, User, Lock, Shield, FileText, CheckCircle, Eye, EyeOff } from 'react-feather';

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
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                                Application Submitted Successfully!
                            </h2>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Your application is pending review by the super admin. You will be notified once it's approved or Login with in 24 hours.
                            </p>
                            <div className="space-y-3">
                                <Link
                                    to={`/mosques/${id}`}
                                    className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    Back to Mosque
                                </Link>
                                <Link
                                    to="/mosques"
                                    className="block w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    Browse Other Mosques
                                </Link>
                            </div>
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
                        to={`/mosques/${id}`}
                        className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-lg border border-white/20 rounded-xl text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 hover:bg-white/90 shadow-lg"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Mosque
                    </Link>
                </div>

                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                            Mosque Admin Access
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            Login or register to manage mosque prayer times and information
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Contact Info Card */}
                        {mosqueInfo && (
                            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                                <div className="flex items-center mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                                        <Phone className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        Need Verification Code?
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                                        <span className="font-semibold text-gray-800 block mb-1">Mosque:</span>
                                        <p className="text-gray-700 font-medium">{mosqueInfo.name}</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                                        <span className="font-semibold text-gray-800 block mb-1">Location:</span>
                                        <p className="text-gray-700">{mosqueInfo.location}</p>
                                    </div>
                                    {mosqueInfo.contact_phone && (
                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 flex items-center">
                                            <Phone className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                                            <div>
                                                <span className="font-semibold text-gray-800 block">Phone:</span>
                                                <p className="text-gray-700">{mosqueInfo.contact_phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {mosqueInfo.contact_email && (
                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 flex items-center">
                                            <Mail className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                                            <div>
                                                <span className="font-semibold text-gray-800 block">Email:</span>
                                                <p className="text-gray-700">{mosqueInfo.contact_email}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                                        <p className="text-amber-800 text-sm leading-relaxed">
                                            {mosqueInfo.admin_instructions}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                            {/* Mode Toggle */}
                            <div className="flex mb-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-2">
                                <button
                                    onClick={() => setMode('register')}
                                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'register'
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                                        }`}
                                >
                                    Register
                                </button>
                                <button
                                    onClick={() => setMode('login')}
                                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'login'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                                        }`}
                                >
                                    Login
                                </button>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 mb-6">
                                    <p className="text-red-700 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Register Form */}
                            {mode === 'register' && (
                                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-6">
                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <User className="w-4 h-4 mr-2 text-blue-600" />
                                            Full Name
                                        </label>
                                        <input
                                            {...registerForm.register('name')}
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                            placeholder="Enter your full name"
                                        />
                                        {registerForm.formState.errors.name && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {registerForm.formState.errors.name.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Mail className="w-4 h-4 mr-2 text-blue-600" />
                                            Email Address
                                        </label>
                                        <input
                                            {...registerForm.register('email')}
                                            type="email"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                            placeholder="Enter your email"
                                        />
                                        {registerForm.formState.errors.email && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {registerForm.formState.errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Lock className="w-4 h-4 mr-2 text-blue-600" />
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...registerForm.register('password')}
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                                placeholder="Create a password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {password && (
                                            <div className="mt-2">
                                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                    <span>Strength: {passwordStrength.label}</span>
                                                    <span>{passwordStrength.strength}/4</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                        style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                        {registerForm.formState.errors.password && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {registerForm.formState.errors.password.message}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            Use letters, numbers, special characters, and capital letters for maximum security
                                        </p>
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Lock className="w-4 h-4 mr-2 text-blue-600" />
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...registerForm.register('confirm_password')}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                                placeholder="Confirm your password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {registerForm.formState.errors.confirm_password && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {registerForm.formState.errors.confirm_password.message}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            Must match the password entered above
                                        </p>
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Phone className="w-4 h-4 mr-2 text-blue-600" />
                                            Phone Number
                                        </label>
                                        <input
                                            {...registerForm.register('phone')}
                                            type="tel"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                            placeholder="+923001234567"
                                        />
                                        {registerForm.formState.errors.phone && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {registerForm.formState.errors.phone.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Shield className="w-4 h-4 mr-2 text-blue-600" />
                                            Mosque Verification Code
                                        </label>
                                        <input
                                            {...registerForm.register('mosque_verification_code')}
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                            placeholder="Enter verification code"
                                        />
                                        {registerForm.formState.errors.mosque_verification_code && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {registerForm.formState.errors.mosque_verification_code.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                            Application Notes (Optional)
                                        </label>
                                        <textarea
                                            {...registerForm.register('application_notes')}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100 resize-none"
                                            placeholder="Any additional information..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-blue-300 disabled:to-purple-300 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none"
                                    >
                                        {loading ? 'Submitting...' : 'Submit Application'}
                                    </button>
                                </form>
                            )}

                            {/* Login Form */}
                            {mode === 'login' && (
                                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                                            Email Address
                                        </label>
                                        <input
                                            {...loginForm.register('email')}
                                            type="email"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                            placeholder="Enter your email"
                                        />
                                        {loginForm.formState.errors.email && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {loginForm.formState.errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                            <Lock className="w-4 h-4 mr-2 text-emerald-600" />
                                            Password
                                        </label>
                                        <input
                                            {...loginForm.register('password')}
                                            type="password"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100"
                                            placeholder="Enter your password"
                                        />
                                        {loginForm.formState.errors.password && (
                                            <p className="text-red-500 text-sm mt-2 font-medium">
                                                {loginForm.formState.errors.password.message}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-emerald-300 disabled:to-green-300 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none"
                                    >
                                        {loading ? 'Logging in...' : 'Login'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminApplicationPage;