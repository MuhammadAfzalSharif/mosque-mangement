import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { mosqueApi, authApi } from '../lib/api';

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

interface AdminUser {
    id: string;
    name: string;
    email: string;
    mosque_id: string;
}

interface MosqueData {
    id: string;
    name: string;
    location: string;
    description: string;
    verification_code: string;
    prayer_times: {
        fajr: string;
        dhuhr: string;
        asr: string;
        maghrib: string;
        isha: string;
        jummah: string;
    };
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
    const [user, setUser] = useState<AdminUser | null>(null);
    const [mosque, setMosque] = useState<MosqueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('overview');

    const prayerTimesForm = useForm<PrayerTimesFormData>({
        resolver: zodResolver(prayerTimesSchema),
    });

    const mosqueInfoForm = useForm<MosqueInfoFormData>({
        resolver: zodResolver(mosqueInfoSchema),
    });

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

    useEffect(() => {
        const fetchMosqueData = async () => {
            if (!user?.mosque_id) {
                console.log('No user or mosque_id found:', user);
                return;
            }

            try {
                setLoading(true);
                console.log('Fetching mosque data for ID:', user.mosque_id);
                const response = await mosqueApi.getMosque(user.mosque_id);
                console.log('API response:', response);
                const mosqueData = response.data.mosque;
                console.log('Mosque data:', mosqueData);

                setMosque(mosqueData);

                // Pre-fill forms with existing data (convert to 12-hour format for display)
                prayerTimesForm.reset({
                    fajr: convertTo12Hour(mosqueData.prayer_times?.fajr || ''),
                    dhuhr: convertTo12Hour(mosqueData.prayer_times?.dhuhr || ''),
                    asr: convertTo12Hour(mosqueData.prayer_times?.asr || ''),
                    maghrib: convertTo12Hour(mosqueData.prayer_times?.maghrib || ''),
                    isha: convertTo12Hour(mosqueData.prayer_times?.isha || ''),
                    jummah: convertTo12Hour(mosqueData.prayer_times?.jummah || ''),
                });

                mosqueInfoForm.reset({
                    name: mosqueData.name || '',
                    location: mosqueData.location || '',
                    description: mosqueData.description || '',
                });
            } catch (err) {
                console.log('Error fetching mosque data:', err);
                const errorMessage = err instanceof Error && 'response' in err &&
                    typeof err.response === 'object' && err.response !== null &&
                    'data' in err.response && typeof err.response.data === 'object' &&
                    err.response.data !== null && 'error' in err.response.data
                    ? String(err.response.data.error)
                    : 'Failed to fetch mosque data';
                console.log('Error message:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchMosqueData();
        }
    }, [user, prayerTimesForm, mosqueInfoForm]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
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

            // Update local state with 24-hour format
            if (mosque) {
                setMosque({
                    ...mosque,
                    prayer_times: convertedData
                });
            }
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

            // Update local state
            if (mosque) {
                setMosque({
                    ...mosque,
                    ...data
                });
            }
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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
                        <p className="text-gray-600 text-center">Preparing your mosque management interface...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || !mosque) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-red-100">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Unable to load dashboard</h2>
                        <p className="text-gray-600 mb-6">There was a problem loading your dashboard. Please try logging in again.</p>
                        <Link
                            to="/"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Go to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4 sm:py-6">
                        <div className="flex items-center min-w-0 flex-1">
                            <Link to="/" className="flex items-center min-w-0">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-2 mr-2 sm:mr-3 flex-shrink-0">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                                    Mosque Finder
                                </span>
                            </Link>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                            <Link
                                to="/"
                                className="hidden sm:flex text-gray-600 hover:text-blue-600 px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium items-center"
                            >
                                🔍 <span className="ml-1 hidden md:inline">Find Mosques</span>
                            </Link>
                            {/* Mobile menu for Find Mosques */}
                            <Link
                                to="/mosque-finder"
                                className="sm:hidden text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Find Mosques"
                            >
                                🔍
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <span className="hidden sm:inline">Logout</span>
                                <span className="sm:hidden">Exit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{successMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-6 shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Welcome Section */}
                <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-100 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-blue-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                Welcome back, {user.name}! 👋
                            </h2>
                            <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Manage your mosque efficiently with our comprehensive dashboard</p>
                        </div>
                        <div className="mt-4 lg:mt-0">
                            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                                <div className="text-sm text-gray-500 mb-1">Admin since</div>
                                <div className="text-lg font-semibold text-gray-900">Today</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/50 shadow-lg">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Mosque Information
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                                <div className="flex items-start">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3 mt-0.5">Name</span>
                                    <span className="text-gray-700 font-medium break-words">{mosque.name}</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3 mt-0.5">Location</span>
                                    <span className="text-gray-700 break-words">{mosque.location}</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-3 mt-0.5">About</span>
                                    <span className="text-gray-700 break-words">{mosque.description || 'No description available'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                            <h3 className="text-xl font-bold mb-4 flex items-center">
                                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Admin Verification Code
                            </h3>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                                <div className="text-2xl lg:text-3xl font-mono font-bold mb-2 tracking-wider break-all">
                                    {mosque.verification_code}
                                </div>
                                <div className="text-blue-100 text-sm">
                                    Share this code with trusted individuals who want to become admins
                                </div>
                            </div>
                            <div className="flex items-center text-blue-100 text-sm">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Keep this code secure and share only with authorized personnel
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-2xl shadow-xl mb-8 border border-gray-100">
                    <div className="border-b border-gray-200">
                        {/* Mobile/Desktop responsive tab navigation */}
                        <nav
                            className="flex overflow-x-auto"
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
                                { id: 'overview', name: 'Overview', icon: '📊', description: 'Dashboard overview' },
                                { id: 'prayer-times', name: 'Prayer Times', icon: '🕌', description: 'Manage prayer schedules' },
                                { id: 'mosque-info', name: 'Mosque Info', icon: '🏢', description: 'Update mosque details' },
                                { id: 'notifications', name: 'Notifications', icon: '🔔', description: 'Manage alerts' },
                                { id: 'users', name: 'Users', icon: '👥', description: 'User management' },
                                { id: 'analytics', name: 'Analytics', icon: '📈', description: 'View statistics' },
                                { id: 'settings', name: 'Settings', icon: '⚙️', description: 'System settings' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group relative flex-shrink-0 whitespace-nowrap px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm font-medium text-center hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 min-w-max ${activeTab === tab.id
                                        ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl mb-1">{tab.icon}</span>
                                        <span className="font-semibold">{tab.name}</span>
                                        <span className="text-xs text-gray-400 hidden lg:block mt-1">{tab.description}</span>
                                    </div>
                                    {activeTab === tab.id && (
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6 lg:p-8">
                        {activeTab === 'overview' && (
                            <div className="space-y-4 sm:space-y-6">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Dashboard Overview</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl border border-blue-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-600 text-xs sm:text-sm font-medium">Total Visitors</p>
                                                <p className="text-xl sm:text-2xl font-bold text-blue-900">1,234</p>
                                            </div>
                                            <div className="bg-blue-500 p-2 sm:p-3 rounded-lg flex-shrink-0">
                                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-600 text-sm font-medium">Prayer Times Updated</p>
                                                <p className="text-2xl font-bold text-green-900">Today</p>
                                            </div>
                                            <div className="bg-green-500 p-3 rounded-lg">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-purple-600 text-sm font-medium">Admin Status</p>
                                                <p className="text-2xl font-bold text-purple-900">Active</p>
                                            </div>
                                            <div className="bg-purple-500 p-3 rounded-lg">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-orange-600 text-sm font-medium">Mosque Rating</p>
                                                <p className="text-2xl font-bold text-orange-900">4.8★</p>
                                            </div>
                                            <div className="bg-orange-500 p-3 rounded-lg">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-6 text-center">
                                    <p className="text-gray-600">Quick actions and recent activity will appear here</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'prayer-times' && (
                            <div className="max-w-2xl mx-auto">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Update Prayer Times</h3>
                                    <p className="text-gray-600">Keep your community informed with accurate prayer schedules</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border border-green-200 shadow-lg">
                                    <form onSubmit={prayerTimesForm.handleSubmit(handleUpdatePrayerTimes)} className="space-y-4 sm:space-y-6">
                                        {[
                                            { name: 'fajr', label: 'Fajr', icon: '🌅' },
                                            { name: 'dhuhr', label: 'Dhuhr', icon: '☀️' },
                                            { name: 'asr', label: 'Asr', icon: '🌤️' },
                                            { name: 'maghrib', label: 'Maghrib', icon: '🌅' },
                                            { name: 'isha', label: 'Isha', icon: '🌙' },
                                            { name: 'jummah', label: 'Jummah', icon: '🕌' },
                                        ].map((prayer) => (
                                            <div key={prayer.name} className="group">
                                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                                    <span className="mr-2 text-base sm:text-lg">{prayer.icon}</span>
                                                    {prayer.label}
                                                </label>
                                                <input
                                                    {...prayerTimesForm.register(prayer.name as keyof PrayerTimesFormData)}
                                                    type="text"
                                                    placeholder="Example: 05:30 AM"
                                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-sm"
                                                />
                                                {prayerTimesForm.formState.errors[prayer.name as keyof PrayerTimesFormData] && (
                                                    <p className="text-red-500 text-xs mt-1 ml-1">
                                                        {prayerTimesForm.formState.errors[prayer.name as keyof PrayerTimesFormData]?.message}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="submit"
                                            disabled={updateLoading}
                                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg"
                                        >
                                            {updateLoading ? (
                                                <div className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Updating Prayer Times...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
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
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Update Mosque Information</h3>
                                    <p className="text-gray-600">Keep your mosque details current and accurate</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl p-8 border border-purple-200 shadow-lg">
                                    <form onSubmit={mosqueInfoForm.handleSubmit(handleUpdateMosqueInfo)} className="space-y-6">
                                        <div className="group">
                                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                                <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                Mosque Name
                                            </label>
                                            <input
                                                {...mosqueInfoForm.register('name')}
                                                type="text"
                                                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-sm"
                                                placeholder="Enter mosque name"
                                            />
                                            {mosqueInfoForm.formState.errors.name && (
                                                <p className="text-red-500 text-xs mt-1 ml-1">
                                                    {mosqueInfoForm.formState.errors.name.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="group">
                                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                                <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Location
                                            </label>
                                            <input
                                                {...mosqueInfoForm.register('location')}
                                                type="text"
                                                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-sm"
                                                placeholder="Enter mosque location"
                                            />
                                            {mosqueInfoForm.formState.errors.location && (
                                                <p className="text-red-500 text-xs mt-1 ml-1">
                                                    {mosqueInfoForm.formState.errors.location.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="group">
                                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                                <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                                                </svg>
                                                Description
                                            </label>
                                            <textarea
                                                {...mosqueInfoForm.register('description')}
                                                rows={4}
                                                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 group-hover:bg-white/90 shadow-sm resize-none"
                                                placeholder="Enter mosque description (optional)"
                                            />
                                            {mosqueInfoForm.formState.errors.description && (
                                                <p className="text-red-500 text-xs mt-1 ml-1">
                                                    {mosqueInfoForm.formState.errors.description.message}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updateLoading}
                                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg"
                                        >
                                            {updateLoading ? (
                                                <div className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Updating Information...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
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
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 border border-gray-200">
                                        <div className="text-6xl mb-4">🚀</div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-4 capitalize">{tabId.replace('-', ' ')} Feature</h3>
                                        <p className="text-gray-600 mb-6">This feature is coming soon! We're working hard to bring you the best mosque management experience.</p>
                                        <div className="bg-white rounded-lg p-4 inline-block border border-gray-200 shadow-sm">
                                            <p className="text-sm text-gray-500">Feature in development</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;