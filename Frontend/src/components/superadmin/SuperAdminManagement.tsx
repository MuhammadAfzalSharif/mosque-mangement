import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi, superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import Toast from '../Toast';
import { Eye, EyeOff, Shield, UserPlus, Users } from 'react-feather';
import { FaUser, FaEnvelope, FaCalendarAlt, FaExclamationTriangle, FaTrash, FaPlus } from 'react-icons/fa';

const superAdminSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').refine((email) => {
        const allowedDomainsRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com)$/i;
        return allowedDomainsRegex.test(email);
    }, 'Email must be from gmail.com, outlook.com, yahoo.com, or hotmail.com'),
    password: z.string().min(7, 'Password must be at least 7 characters'),
    confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

type SuperAdminFormData = z.infer<typeof superAdminSchema>;

interface SuperAdmin {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
}

interface ToastState {
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
}

const SuperAdminManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState<SuperAdmin | null>(null);

    const form = useForm<SuperAdminFormData>({
        resolver: zodResolver(superAdminSchema),
    });

    // Watch password for strength indicator
    const password = form.watch('password');

    const fetchSuperAdmins = useCallback(async () => {
        setLoadingAdmins(true);
        try {
            const response = await superAdminApi.getSuperAdmins();
            setSuperAdmins(response.data.super_admins || []);
        } catch (err) {
            console.error('Error fetching super admins:', err);
            showToast('error', 'Failed to load super admins');
        } finally {
            setLoadingAdmins(false);
        }
    }, []);

    // Fetch super admins on component mount
    useEffect(() => {
        fetchSuperAdmins();
    }, [fetchSuperAdmins]);

    const handleDeleteSuperAdmin = (admin: SuperAdmin) => {
        setAdminToDelete(admin);
        setShowDeleteModal(true);
    };

    const confirmDeleteSuperAdmin = async () => {
        if (!adminToDelete) return;

        setDeletingId(adminToDelete._id);
        setShowDeleteModal(false);
        try {
            await superAdminApi.deleteSuperAdmin(adminToDelete._id);
            showToast('success', 'Super admin deleted successfully');
            // Refresh the list
            fetchSuperAdmins();
        } catch (err) {
            console.error('Error deleting super admin:', err);
            const errorMessage = getErrorMessage(err);
            showToast('error', errorMessage);
        } finally {
            setDeletingId(null);
            setAdminToDelete(null);
        }
    };

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

    const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
        setToast({ show: true, type, message });
        setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 5000);
    };

    const handleCreateSuperAdmin = async (data: SuperAdminFormData) => {
        setLoading(true);
        try {
            await authApi.registerSuperAdmin(data);
            showToast('success', 'Super admin created successfully!');
            form.reset();
            fetchSuperAdmins(); // Refresh the list
        } catch (err) {
            console.log('Super admin creation error:', err);
            const errorMessage = getErrorMessage(err);
            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-2 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 lg:space-y-6 xl:space-y-8">
                {toast.show && (
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast({ show: false, type: 'success', message: '' })}
                    />
                )}

                {/* Header */}
                <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4 lg:mb-6">
                        <div className="mb-2 sm:mb-0">
                            <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent mb-1 sm:mb-2">
                                Super Admin Management
                            </h1>
                            <p className="text-gray-600 text-sm sm:text-base">Manage and monitor all super administrator accounts</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 lg:gap-3">
                            <button
                                onClick={() => fetchSuperAdmins()}
                                className="group relative overflow-hidden px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                <span className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                    <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-sm sm:text-base">Refresh</span>
                                </span>
                            </button>
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2 lg:space-x-3 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 bg-purple-100/80 backdrop-blur-sm border border-purple-200 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg w-full sm:w-auto">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-pulse"></div>
                                <Shield className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-purple-600" />
                                <span className="text-purple-700 font-semibold text-sm sm:text-base">{superAdmins.length} Super Admins</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-4 lg:gap-6 xl:gap-8">
                    {/* Create Super Admin Form */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-2xl"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 xl:p-8 transform hover:scale-[1.01] transition-all duration-300">
                            <div className="relative mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg opacity-90"></div>
                                <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl">
                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center">
                                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold">Create New Super Admin</h2>
                                            <p className="text-purple-100 text-sm sm:text-base mt-1 hidden sm:block">
                                                Add new super admin accounts with secure credentials
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={form.handleSubmit(handleCreateSuperAdmin)} className="space-y-3 sm:space-y-4 lg:space-y-6">
                                {/* Name Field */}
                                <div className="group">
                                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-1 sm:mb-2 lg:mb-3">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center">
                                            <input
                                                {...form.register('name')}
                                                type="text"
                                                className="w-full pl-2 sm:pl-3 lg:pl-4 pr-8 sm:pr-10 lg:pr-12 xl:pr-14 py-2 sm:py-3 lg:py-4 border border-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm text-base placeholder-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                                                placeholder="Enter full name"
                                            />
                                            <div className="absolute right-2 sm:right-3 lg:right-4 top-1/2 transform -translate-y-1/2 z-10">
                                                <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                                                    <FaUser className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>










                                    {form.formState.errors.name && (
                                        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-red-600 flex items-center gap-1 sm:gap-2">
                                            <FaExclamationTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                                            {form.formState.errors.name.message}
                                        </p>
                                    )}
                                </div>

                                {/* Email Field */}
                                <div className="group">
                                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-1 sm:mb-2 lg:mb-3">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center">
                                            <input
                                                {...form.register('email')}
                                                type="email"
                                                className="w-full pl-2 sm:pl-3 lg:pl-4 pr-8 sm:pr-10 lg:pr-12 xl:pr-14 py-2 sm:py-3 lg:py-4 border border-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm text-base placeholder-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                                                placeholder="Enter email address"
                                            />
                                            <div className="absolute right-2 sm:right-3 lg:right-4 top-1/2 transform -translate-y-1/2 z-10">
                                                <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                                                    <FaEnvelope className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {form.formState.errors.email && (
                                        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-red-600 flex items-center gap-1 sm:gap-2">
                                            <FaExclamationTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                                            {form.formState.errors.email.message}
                                        </p>
                                    )}
                                    <div className="mt-1 sm:mt-2 p-1.5 sm:p-2 lg:p-3 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-lg sm:rounded-xl">
                                        <p className="text-sm sm:text-base text-blue-600 font-medium">
                                            Allowed domains: gmail.com, outlook.com, yahoo.com, hotmail.com
                                        </p>
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="group">
                                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-1 sm:mb-2 lg:mb-3">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center">
                                            <input
                                                {...form.register('password')}
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-2 sm:pl-3 lg:pl-4 pr-8 sm:pr-10 lg:pr-12 xl:pr-14 py-2 sm:py-3 lg:py-4 border border-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/70 backdrop-blur-sm text-base placeholder-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                                                placeholder="Enter password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 sm:right-3 lg:right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl text-white hover:scale-110 transition-all duration-200"
                                            >
                                                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                    {form.formState.errors.password && (
                                        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-red-600 flex items-center gap-1 sm:gap-2">
                                            <FaExclamationTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                                            {form.formState.errors.password.message}
                                        </p>
                                    )}

                                    {/* Password Strength Indicator */}
                                    {password && (
                                        <div className="mt-2 sm:mt-3 lg:mt-4 p-2 sm:p-3 lg:p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-lg sm:rounded-xl">
                                            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 mb-1 sm:mb-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 sm:h-2 lg:h-3 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 sm:h-2 lg:h-3 rounded-full transition-all duration-500 ${passwordStrength.color} shadow-lg`}
                                                        style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-sm font-bold ${passwordStrength.strength === 1 ? 'bg-red-100 text-red-600' :
                                                    passwordStrength.strength === 2 ? 'bg-blue-100 text-blue-600' :
                                                        passwordStrength.strength === 3 ? 'bg-purple-100 text-purple-600' :
                                                            'bg-green-100 text-green-600'
                                                    }`}>
                                                    <span className="hidden sm:inline">{passwordStrength.label}</span>
                                                    <span className="sm:hidden">{passwordStrength.strength === 1 ? 'Weak' :
                                                        passwordStrength.strength === 2 ? 'Good' :
                                                            passwordStrength.strength === 3 ? 'Strong' : 'Super'}</span>
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed hidden sm:block">
                                                <strong>Security Tip:</strong> Use at least 7 characters with letters, numbers, and special characters for maximum protection.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password Field */}
                                <div className="group">
                                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-1 sm:mb-2 lg:mb-3">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center">
                                            <input
                                                {...form.register('confirm_password')}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="w-full pl-2 sm:pl-3 lg:pl-4 pr-8 sm:pr-10 lg:pr-12 xl:pr-14 py-2 sm:py-3 lg:py-4 border border-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/70 backdrop-blur-sm text-base placeholder-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                                                placeholder="Confirm password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-2 sm:right-3 lg:right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl text-white hover:scale-110 transition-all duration-200"
                                            >
                                                {showConfirmPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                    {form.formState.errors.confirm_password && (
                                        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-red-600 flex items-center gap-1 sm:gap-2">
                                            <FaExclamationTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                                            {form.formState.errors.confirm_password.message}
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="pt-2 sm:pt-3 lg:pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group relative overflow-hidden w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold py-2 sm:py-3 lg:py-4 px-4 sm:px-6 lg:px-8 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                        <span className="relative flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span className="text-sm sm:text-base">
                                                        <span className="hidden sm:inline">Creating Super Admin...</span>
                                                        <span className="sm:hidden">Creating...</span>
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center">
                                                        <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                                    </div>
                                                    <span className="text-sm sm:text-base xl:text-xl">Create Super Admin</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Super Admins List */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-2xl"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 xl:p-8 transform hover:scale-[1.01] transition-all duration-300">
                            <div className="relative mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg opacity-90"></div>
                                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl">
                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center">
                                            <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold">Existing Super Admins</h2>
                                            <p className="text-indigo-100 text-sm sm:text-base mt-1 hidden sm:block">
                                                Manage and monitor all super admin accounts
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {loadingAdmins ? (
                                <div className="flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-lg"></div>
                                        <div className="relative bg-white/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-xl">
                                            <div className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-2 sm:mb-4 lg:mb-6 shadow-lg">
                                                <div className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 border-2 sm:border-3 lg:border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            </div>
                                            <h3 className="text-sm sm:text-base lg:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                                                Loading Super Admins
                                            </h3>
                                            <p className="text-gray-600 text-sm sm:text-base">Please wait while we fetch the data...</p>
                                        </div>
                                    </div>
                                </div>
                            ) : superAdmins.length === 0 ? (
                                <div className="text-center py-8 sm:py-12 lg:py-16">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-lg"></div>
                                        <div className="relative bg-white/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-xl">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-2 sm:mb-4 lg:mb-6 shadow-lg">
                                                <Users className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                                            </div>
                                            <h3 className="text-sm sm:text-base lg:text-xl font-bold text-gray-700 mb-1 sm:mb-2">No Super Admins Found</h3>
                                            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                                                Create your first super admin account to get started with system management.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-4 lg:space-y-6 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto pr-1 sm:pr-2">
                                    {superAdmins.map((admin) => (
                                        <div key={admin._id} className="group relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-2 sm:p-4 lg:p-6 transform hover:scale-[1.02]">
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Admin Name */}
                                                        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3 lg:mb-4">
                                                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                                                                <FaUser className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">
                                                                    {admin.name}
                                                                </h3>
                                                                <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                                                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                    <span className="text-sm text-green-600 font-medium">Active</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Admin Email */}
                                                        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-indigo-50/80 backdrop-blur-sm border border-indigo-200/50 rounded-lg sm:rounded-xl mb-2 sm:mb-3 lg:mb-4">
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                                                                <FaEnvelope className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm text-gray-500 font-medium">Email Address</p>
                                                                <p className="text-sm sm:text-base font-semibold text-gray-700 truncate">{admin.email}</p>
                                                            </div>
                                                        </div>

                                                        {/* Created Date */}
                                                        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-lg sm:rounded-xl">
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                                                                <FaCalendarAlt className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 font-medium">Created</p>
                                                                <p className="text-sm sm:text-base font-semibold text-gray-700">
                                                                    {new Date(admin.createdAt).toLocaleDateString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Delete Button */}
                                                    <div className="flex-shrink-0 mt-2 sm:mt-0">
                                                        <button
                                                            onClick={() => handleDeleteSuperAdmin(admin)}
                                                            disabled={deletingId === admin._id}
                                                            className="group relative overflow-hidden w-full sm:w-auto px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                                            <span className="relative flex items-center space-x-1 sm:space-x-2">
                                                                {deletingId === admin._id ? (
                                                                    <>
                                                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                        <span className="text-sm sm:text-base font-bold">Deleting...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FaTrash className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                                                        <span className="text-sm sm:text-base font-bold">Delete</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && adminToDelete && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-2xl"></div>
                            <div className="relative bg-white/95 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl max-w-md w-full p-3 sm:p-4 lg:p-6 xl:p-8 transform hover:scale-105 transition-all duration-300 max-h-[95vh] overflow-y-auto">
                                <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                                    <div className="relative mx-auto mb-2 sm:mb-3 lg:mb-4">
                                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"></div>
                                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-xl">
                                            <FaExclamationTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 text-white" />
                                        </div>
                                    </div>
                                    <h3 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-1 sm:mb-2 lg:mb-3 xl:mb-4">
                                        Delete Super Admin
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                        Are you sure you want to delete{' '}
                                        <span className="font-bold text-red-600">"{adminToDelete.name}"</span>?{' '}
                                        This action cannot be undone.
                                    </p>
                                </div>

                                <div className="relative mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                                    <div className="absolute inset-0 bg-red-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg"></div>
                                    <div className="relative bg-red-50/90 backdrop-blur-sm border border-red-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4">
                                        <div className="flex items-start gap-1.5 sm:gap-2 lg:gap-3">
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-white text-sm font-bold">!</span>
                                            </div>
                                            <p className="text-red-800 text-sm sm:text-base leading-relaxed">
                                                This will permanently remove the super admin account and all associated permissions.
                                                Make sure this action is intentional.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteSuperAdmin}
                                        disabled={deletingId === adminToDelete._id}
                                        className="group relative overflow-hidden flex-1 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <span className="relative flex items-center space-x-1 sm:space-x-2">
                                            {deletingId === adminToDelete._id ? (
                                                <>
                                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Deleting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaTrash className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                                    <span>Delete</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminManagement;
