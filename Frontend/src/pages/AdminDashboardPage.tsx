import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { mosqueApi, authApi } from '../lib/api';
import { useAdminMosque, mosqueQueryKeys } from '../lib/queries';
import { getErrorMessage } from '../lib/types';
import { useQueryClient } from '@tanstack/react-query';
import {
    Search, AlertTriangle, BarChart, Home, Bell, TrendingUp, Settings,
    Zap, Users, Clock, MapPin, FileText, Shield, LogOut, Upload,
    Star, Activity, Award, X
} from 'react-feather';

// Validation schemas
const prayerTimesSchema = z.object({
    fajr: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, 'Please use format: HH:MM AM/PM'),
    dhuhr: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, 'Please use format: HH:MM AM/PM'),
    asr: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, 'Please use format: HH:MM AM/PM'),
    maghrib: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, 'Please use format: HH:MM AM/PM'),
    isha: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, 'Please use format: HH:MM AM/PM'),
    jummah: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, 'Please use format: HH:MM AM/PM'),
});

const mosqueInfoSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    location: z.string().min(5, 'Location must be at least 5 characters'),
    description: z.string().optional(),
});

type PrayerTimesFormData = z.infer<typeof prayerTimesSchema>;
type MosqueInfoFormData = z.infer<typeof mosqueInfoSchema>;

// Confirmation Modal Component
interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onCancel}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 backdrop-blur-xl shadow-2xl rounded-2xl border border-green-200/50 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Islamic background orbs */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>

                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                                {title}
                            </h3>
                            <button
                                onClick={onCancel}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-gray-600 text-base">{message}</p>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                                onClick={onCancel}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white/70 backdrop-blur-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    confirmText
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AdminUser {
    id: string;
    name: string;
    email: string;
    mosque_id: string;
}

// Utility functions for time conversion
const convertTo12Hour = (time24: string): string => {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':');
    let hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 should be 12

    return `${hour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const convertTo24Hour = (time12: string): string => {
    if (!time12) return '';

    const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12; // Return as-is if not in expected format

    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3].toUpperCase();

    if (ampm === 'PM' && hours !== 12) {
        hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const AdminDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const prayerTimesForm = useForm<PrayerTimesFormData>({
        resolver: zodResolver(prayerTimesSchema),
    });

    const mosqueInfoForm = useForm<MosqueInfoFormData>({
        resolver: zodResolver(mosqueInfoSchema),
    });

    // Use React Query for fetching mosque data
    const {
        data: mosque,
        isLoading: loading,
        error: queryError
    } = useAdminMosque(user?.mosque_id || '');

    // Handle query errors
    useEffect(() => {
        if (queryError) {
            setError(getErrorMessage(queryError));
        }
    }, [queryError]);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');

            if (!token || !userData) {
                navigate('/');
                return;
            }

            try {
                setUser(JSON.parse(userData));
            } catch {
                navigate('/');
            }
        };

        checkAuth();
    }, [navigate]);

    // Handle query errors
    useEffect(() => {
        if (queryError) {
            setError(getErrorMessage(queryError));
        }
    }, [queryError]);

    // Pre-fill forms when mosque data is available
    useEffect(() => {
        if (mosque) {
            // Pre-fill forms with existing data (convert to 12-hour format for display)
            prayerTimesForm.reset({
                fajr: convertTo12Hour(mosque.prayer_times?.fajr || ''),
                dhuhr: convertTo12Hour(mosque.prayer_times?.dhuhr || ''),
                asr: convertTo12Hour(mosque.prayer_times?.asr || ''),
                maghrib: convertTo12Hour(mosque.prayer_times?.maghrib || ''),
                isha: convertTo12Hour(mosque.prayer_times?.isha || ''),
                jummah: convertTo12Hour(mosque.prayer_times?.jummah || ''),
            });

            mosqueInfoForm.reset({
                name: mosque.name || '',
                location: mosque.location || '',
                description: mosque.description || '',
            });
        }
    }, [mosque, prayerTimesForm, mosqueInfoForm]);

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await authApi.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setLogoutLoading(false);
            setShowLogoutModal(false);
            navigate('/');
        }
    };

    const handleUpdatePrayerTimes = async (data: PrayerTimesFormData) => {
        if (!user?.mosque_id) return;

        setUpdateLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Convert 12-hour format to 24-hour format for API
            const convertedData = {
                fajr: convertTo24Hour(data.fajr),
                dhuhr: convertTo24Hour(data.dhuhr),
                asr: convertTo24Hour(data.asr),
                maghrib: convertTo24Hour(data.maghrib),
                isha: convertTo24Hour(data.isha),
                jummah: convertTo24Hour(data.jummah),
            };

            await mosqueApi.updatePrayerTimes(user.mosque_id, convertedData);
            setSuccessMessage('Prayer times updated successfully!');

            // Auto-hide success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);

            // Invalidate all related caches to ensure data freshness across the app
            queryClient.invalidateQueries({ queryKey: mosqueQueryKeys.detail(user.mosque_id) });
            queryClient.invalidateQueries({ queryKey: mosqueQueryKeys.prayerTimes(user.mosque_id) });
            queryClient.invalidateQueries({ queryKey: mosqueQueryKeys.lists() }); // Invalidate list cache
        } catch (err) {
            const errorMessage = err instanceof Error && 'response' in err &&
                typeof err.response === 'object' && err.response !== null &&
                'data' in err.response && typeof err.response.data === 'object' &&
                err.response.data !== null && 'error' in err.response.data
                ? String(err.response.data.error)
                : 'Failed to update prayer times';
            setError(errorMessage);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleUpdateMosqueInfo = async (data: MosqueInfoFormData) => {
        if (!user?.mosque_id) return;

        setUpdateLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await mosqueApi.updateMosque(user.mosque_id, data);
            setSuccessMessage('Mosque information updated successfully!');

            // Auto-hide success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);

            // Invalidate all related caches to ensure data freshness across the app
            queryClient.invalidateQueries({ queryKey: mosqueQueryKeys.detail(user.mosque_id) });
            queryClient.invalidateQueries({ queryKey: mosqueQueryKeys.prayerTimes(user.mosque_id) });
            queryClient.invalidateQueries({ queryKey: mosqueQueryKeys.lists() }); // Invalidate list cache
        } catch (err) {
            const errorMessage = err instanceof Error && 'response' in err &&
                typeof err.response === 'object' && err.response !== null &&
                'data' in err.response && typeof err.response.data === 'object' &&
                err.response.data !== null && 'error' in err.response.data
                ? String(err.response.data.error)
                : 'Failed to update mosque information';
            setError(errorMessage);
        } finally {
            setUpdateLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-4">
                {/* Islamic background orbs */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full blur-xl animate-pulse delay-500"></div>

                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-green-200/50">
                    <div className="flex flex-col items-center">
                        <div className="relative mb-6">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200"></div>
                            <div className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-green-600"></div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                            Loading Dashboard
                        </h2>
                        <p className="text-gray-600 text-center text-base">Preparing your mosque management interface...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || !mosque) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-4">
                {/* Islamic background orbs */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>

                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-red-200/50">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-red-700 to-rose-600 bg-clip-text text-transparent">
                            Unable to load dashboard
                        </h2>
                        <p className="text-gray-600 mb-6 text-base">There was a problem loading your dashboard. Please try logging in again.</p>
                        <Link
                            to="/mosques"
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Go to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20">
            {/* Islamic background orbs */}
            <div className="fixed top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="fixed bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-teal-400/10 to-green-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-emerald-400/5 to-teal-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>

            {/* Header */}
            <div className="relative bg-white/70 backdrop-blur-xl shadow-xl border-b border-green-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4 sm:py-6">
                        <div className="flex items-center min-w-0 flex-1">
                            <Link to="/mosques" className="flex items-center min-w-0 group">
                                <img src="/images/logo.png" alt="Mosque Finder" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-contain mr-2 sm:mr-3 flex-shrink-0 group-hover:scale-105 transition-all duration-200" />
                                <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent truncate">
                                    Mosque Finder
                                </span>
                            </Link>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                            <Link
                                to="/mosques"
                                className="hidden sm:flex text-gray-600 hover:text-green-600 px-3 sm:px-4 py-2 rounded-xl hover:bg-green-50/70 backdrop-blur-sm transition-all duration-200 text-base font-medium items-center group"
                            >
                                <Search className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                                <span className="ml-1 hidden md:inline">Find Mosques</span>
                            </Link>
                            {/* Mobile menu for Find Mosques */}
                            <Link
                                to="/mosques"
                                className="sm:hidden text-gray-600 hover:text-green-600 p-2 rounded-xl hover:bg-green-50/70 backdrop-blur-sm transition-all duration-200 group"
                                title="Find Mosques"
                            >
                                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </Link>
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-3 sm:px-6 py-2 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
                            >
                                <LogOut className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 lg:py-8 max-w-7xl">
                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="relative bg-gradient-to-r from-green-50 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-lg overflow-hidden">
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-lg animate-pulse"></div>
                        <div className="relative flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm sm:text-base font-semibold text-green-800 break-words">{successMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="relative bg-gradient-to-r from-red-50 to-rose-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-lg overflow-hidden">
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full blur-lg animate-pulse"></div>
                        <div className="relative flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-3 w-3 text-white" />
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm sm:text-base font-semibold text-red-800 break-words">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Welcome Section */}
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-green-200/50">
                    {/* Local Islamic orbs for this section */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>

                    <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2 flex items-center">
                                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-3 animate-pulse" />
                                Welcome back, {user.name}!
                            </h2>
                            <p className="text-gray-600 text-base sm:text-sm lg:text-xl">Manage your mosque efficiently with our comprehensive Islamic dashboard</p>
                        </div>
                        <div className="mt-4 lg:mt-0">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 shadow-lg border border-green-200/50 backdrop-blur-sm">
                                <div className="text-base text-green-600 mb-1 font-medium flex items-center">
                                    <Shield className="w-4 h-4 mr-1" />
                                    Admin since
                                </div>
                                <div className="text-lg font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">Today</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-green-200/50 shadow-xl">
                            <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-lg animate-pulse"></div>

                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                                <Home className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2" />
                                Mosque Information
                            </h3>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-start group">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl mr-3 mt-0.5 group-hover:scale-110 transition-transform">
                                        <FileText className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-green-600 mb-1">Name</div>
                                        <span className="text-gray-700 font-semibold break-words">{mosque.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-start group">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl mr-3 mt-0.5 group-hover:scale-110 transition-transform">
                                        <MapPin className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-emerald-600 mb-1">Location</div>
                                        <span className="text-gray-700 break-words">{mosque.location}</span>
                                    </div>
                                </div>
                                <div className="flex items-start group">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-teal-100 to-green-100 rounded-xl mr-3 mt-0.5 group-hover:scale-110 transition-transform">
                                        <FileText className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-teal-600 mb-1">About</div>
                                        <span className="text-gray-700 break-words">{mosque.description || 'No description available'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-2xl overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse delay-1000"></div>

                            <div className="relative">
                                <h3 className="text-xl font-bold mb-4 flex items-center">
                                    <Shield className="w-6 h-6 mr-2" />
                                    Admin Verification Code
                                </h3>
                                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
                                    <div className="text-2xl lg:text-3xl font-mono font-bold mb-2 tracking-wider break-all">
                                        {mosque.verification_code}
                                    </div>
                                    <div className="text-green-100 text-base">
                                        Share this code with trusted individuals who want to become admins
                                    </div>
                                </div>
                                <div className="flex items-start text-green-100 text-base">
                                    <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>Keep this code secure and share only with authorized personnel</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl mb-8 border border-green-200/50 overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-xl animate-pulse"></div>

                    <div className="border-b border-green-200/50">
                        {/* Mobile/Desktop responsive tab navigation */}
                        <nav
                            className="flex overflow-x-auto relative z-10"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                    nav::-webkit-scrollbar {
                                        display: none;
                                    }
                                `
                            }} />
                            {[
                                { id: 'overview', name: 'Overview', icon: BarChart, description: 'Dashboard overview' },
                                { id: 'prayer-times', name: 'Prayer Times', icon: Clock, description: 'Manage prayer schedules' },
                                { id: 'mosque-info', name: 'Mosque Info', icon: Home, description: 'Update mosque details' },
                                { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Manage alerts' },
                                { id: 'users', name: 'Users', icon: Users, description: 'User management' },
                                { id: 'analytics', name: 'Analytics', icon: TrendingUp, description: 'View statistics' },
                                { id: 'settings', name: 'Settings', icon: Settings, description: 'System settings' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group relative flex-shrink-0 whitespace-nowrap px-3 sm:px-6 py-4 sm:py-6 text-sm sm:text-base font-medium text-center hover:bg-green-50/70 backdrop-blur-sm focus:z-10 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 min-w-max ${activeTab === tab.id
                                        ? 'text-green-700 border-b-2 border-green-500 bg-green-50/70'
                                        : 'text-gray-500 hover:text-green-600'
                                        }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <tab.icon className={`w-6 h-6 mb-1 transition-all duration-200 ${activeTab === tab.id ? 'scale-110 text-green-600' : 'group-hover:scale-105'}`} />
                                        <span className={`font-semibold ${activeTab === tab.id ? 'text-green-700' : ''}`}>{tab.name}</span>
                                        <span className={`text-sm hidden lg:block mt-1 ${activeTab === tab.id ? 'text-green-600' : 'text-gray-400'}`}>{tab.description}</span>
                                    </div>
                                    {activeTab === tab.id && (
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-t-full"></div>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6 lg:p-8">
                        {activeTab === 'overview' && (
                            <div className="relative space-y-4 sm:space-y-6">
                                {/* Local Islamic orbs */}
                                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-xl animate-pulse"></div>

                                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-4 sm:mb-6 flex items-center">
                                    <BarChart className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-3" />
                                    Dashboard Overview
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="relative bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6 rounded-2xl border border-green-200/50 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-lg animate-pulse"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div>
                                                <p className="text-green-700 text-sm sm:text-base font-semibold mb-1">Total Visitors</p>
                                                <p className="text-xl sm:text-2xl font-bold text-green-900">1,234</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 sm:p-3 rounded-xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative bg-gradient-to-br from-emerald-50 to-teal-100 p-4 sm:p-6 rounded-2xl border border-emerald-200/50 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-lg animate-pulse delay-200"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div>
                                                <p className="text-emerald-700 text-sm sm:text-base font-semibold mb-1">Prayer Times Updated</p>
                                                <p className="text-xl sm:text-2xl font-bold text-emerald-900">Today</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 sm:p-3 rounded-xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative bg-gradient-to-br from-teal-50 to-green-100 p-4 sm:p-6 rounded-2xl border border-teal-200/50 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-lg animate-pulse delay-400"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div>
                                                <p className="text-teal-700 text-sm sm:text-base font-semibold mb-1">Admin Status</p>
                                                <p className="text-xl sm:text-2xl font-bold text-teal-900">Active</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-teal-500 to-green-600 p-2 sm:p-3 rounded-xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6 rounded-2xl border border-green-200/50 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-lg animate-pulse delay-600"></div>
                                        <div className="relative flex items-center justify-between">
                                            <div>
                                                <p className="text-green-700 text-sm sm:text-base font-semibold mb-1">Mosque Rating</p>
                                                <p className="text-xl sm:text-2xl font-bold text-green-900 flex items-center">
                                                    4.8
                                                    <Star className="w-5 h-5 text-yellow-500 ml-1 fill-current" />
                                                </p>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 sm:p-3 rounded-xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative bg-gradient-to-br from-green-50/50 to-emerald-100/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-green-200/30 shadow-lg">
                                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
                                    <Activity className="w-12 h-12 text-green-600 mx-auto mb-3 animate-pulse" />
                                    <p className="text-gray-600 font-medium text-base">Quick actions and recent activity will appear here</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'prayer-times' && (
                            <div className="max-w-2xl mx-auto">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2 flex items-center justify-center">
                                        <Clock className="w-8 h-8 text-green-600 mr-3" />
                                        Update Prayer Times
                                    </h3>
                                    <p className="text-gray-600">Keep your community informed with accurate prayer schedules</p>
                                </div>
                                <div className="relative bg-gradient-to-br from-green-50 to-emerald-100/80 backdrop-blur-xl rounded-3xl p-8 border border-green-200/50 shadow-2xl overflow-hidden">
                                    {/* Islamic background orbs */}
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>

                                    <form onSubmit={prayerTimesForm.handleSubmit(handleUpdatePrayerTimes)} className="relative space-y-4 sm:space-y-6">
                                        {[
                                            { name: 'fajr', label: 'Fajr', icon: Clock, color: 'green' },
                                            { name: 'dhuhr', label: 'Dhuhr', icon: Clock, color: 'emerald' },
                                            { name: 'asr', label: 'Asr', icon: Clock, color: 'teal' },
                                            { name: 'maghrib', label: 'Maghrib', icon: Clock, color: 'green' },
                                            { name: 'isha', label: 'Isha', icon: Clock, color: 'emerald' },
                                            { name: 'jummah', label: 'Jummah', icon: Home, color: 'teal' },
                                        ].map((prayer) => (
                                            <div key={prayer.name} className="group">
                                                <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                                                    <div className={`flex items-center justify-center w-8 h-8 bg-gradient-to-br from-${prayer.color}-100 to-${prayer.color}-200 rounded-xl mr-3 group-hover:scale-110 transition-transform shadow-sm`}>
                                                        <prayer.icon className={`w-4 h-4 text-${prayer.color}-600`} />
                                                    </div>
                                                    {prayer.label}
                                                </label>
                                                <input
                                                    {...prayerTimesForm.register(prayer.name as keyof PrayerTimesFormData)}
                                                    type="text"
                                                    placeholder="Example: 05:30 AM"
                                                    className="w-full px-4 py-3 text-sm sm:text-base bg-white/80 backdrop-blur-sm border border-green-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-lg hover:shadow-xl font-mono"
                                                />
                                                {prayerTimesForm.formState.errors[prayer.name as keyof PrayerTimesFormData] && (
                                                    <p className="text-red-500 text-xs mt-2 ml-2 flex items-center">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        {prayerTimesForm.formState.errors[prayer.name as keyof PrayerTimesFormData]?.message}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="submit"
                                            disabled={updateLoading}
                                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-xl border border-green-400/20"
                                        >
                                            {updateLoading ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                                                    Updating Prayer Times...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <Upload className="w-5 h-5 mr-2" />
                                                    Update Prayer Times
                                                </div>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mosque-info' && (
                            <div className="max-w-2xl mx-auto">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2 flex items-center justify-center">
                                        <Home className="w-8 h-8 text-green-600 mr-3" />
                                        Update Mosque Information
                                    </h3>
                                    <p className="text-gray-600">Keep your mosque details current and accurate</p>
                                </div>
                                <div className="relative bg-gradient-to-br from-green-50 to-emerald-100/80 backdrop-blur-xl rounded-3xl p-8 border border-green-200/50 shadow-2xl overflow-hidden">
                                    {/* Islamic background orbs */}
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>

                                    <form onSubmit={mosqueInfoForm.handleSubmit(handleUpdateMosqueInfo)} className="relative space-y-6">
                                        <div className="group">
                                            <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-200 rounded-xl mr-3 group-hover:scale-110 transition-transform shadow-sm">
                                                    <Home className="w-4 h-4 text-green-600" />
                                                </div>
                                                Mosque Name
                                            </label>
                                            <input
                                                {...mosqueInfoForm.register('name')}
                                                type="text"
                                                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-green-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-lg hover:shadow-xl"
                                                placeholder="Enter mosque name"
                                            />
                                            {mosqueInfoForm.formState.errors.name && (
                                                <p className="text-red-500 text-xs mt-2 ml-2 flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    {mosqueInfoForm.formState.errors.name.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="group">
                                            <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl mr-3 group-hover:scale-110 transition-transform shadow-sm">
                                                    <MapPin className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                Location
                                            </label>
                                            <input
                                                {...mosqueInfoForm.register('location')}
                                                type="text"
                                                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-green-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-lg hover:shadow-xl"
                                                placeholder="Enter mosque location"
                                            />
                                            {mosqueInfoForm.formState.errors.location && (
                                                <p className="text-red-500 text-xs mt-2 ml-2 flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    {mosqueInfoForm.formState.errors.location.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="group">
                                            <label className="flex items-center text-sm font-bold text-gray-700 mb-3">
                                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-teal-100 to-green-200 rounded-xl mr-3 group-hover:scale-110 transition-transform shadow-sm">
                                                    <FileText className="w-4 h-4 text-teal-600" />
                                                </div>
                                                Description
                                            </label>
                                            <textarea
                                                {...mosqueInfoForm.register('description')}
                                                rows={4}
                                                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-green-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-lg hover:shadow-xl resize-none"
                                                placeholder="Enter mosque description (optional)"
                                            />
                                            {mosqueInfoForm.formState.errors.description && (
                                                <p className="text-red-500 text-xs mt-2 ml-2 flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    {mosqueInfoForm.formState.errors.description.message}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updateLoading}
                                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-xl border border-green-400/20"
                                        >
                                            {updateLoading ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                                                    Updating Information...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <Upload className="w-5 h-5 mr-2" />
                                                    Update Mosque Information
                                                </div>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Placeholder tabs for future features */}
                        {['notifications', 'users', 'analytics', 'settings'].map((tabId) => (
                            activeTab === tabId && (
                                <div key={tabId} className="text-center py-12">
                                    <div className="relative bg-gradient-to-br from-green-50/50 to-emerald-100/50 backdrop-blur-sm rounded-3xl p-12 border border-green-200/30 shadow-xl overflow-hidden">
                                        {/* Islamic background orbs */}
                                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
                                        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-teal-400/10 to-green-500/10 rounded-full blur-lg animate-pulse delay-1000"></div>

                                        <div className="relative mb-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                                                <Zap className="w-10 h-10 text-white animate-pulse" />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-4 capitalize">
                                            {tabId.replace('-', ' ')} Feature
                                        </h3>
                                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                            This feature is coming soon! We're working hard to bring you the best Islamic mosque management experience.
                                        </p>
                                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 inline-block border border-green-200/50 shadow-lg">
                                            <p className="text-sm text-green-600 font-medium flex items-center">
                                                <Settings className="w-4 h-4 mr-2 animate-spin" />
                                                Feature in development
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLogoutModal}
                title="Confirm Logout"
                message="Are you sure you want to logout? You will need to sign in again to access your dashboard."
                confirmText="Yes, Logout"
                cancelText="Cancel"
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutModal(false)}
                isLoading={logoutLoading}
            />
        </div>
    );
};

export default AdminDashboardPage;