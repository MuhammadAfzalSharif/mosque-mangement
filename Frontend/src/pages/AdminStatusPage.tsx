import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import type { AdminProfile } from '../lib/types';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Home,
    LogOut,
    RefreshCw,
    FileText,
    UserCheck
} from 'react-feather';

const AdminStatusPage: React.FC = () => {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchAdminStatus = useCallback(async () => {
        try {
            setLoading(true);

            // Debug: Check what we have in localStorage
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            console.log('AdminStatusPage - Token exists:', !!token);
            console.log('AdminStatusPage - User data:', user);
            console.log('AdminStatusPage - Calling getAdminProfile...');

            const response = await authApi.getAdminProfile();
            console.log('AdminStatusPage - Profile response:', response.data);

            setProfile(response.data.admin);

            // If approved, redirect to dashboard
            if (response.data.admin.status === 'approved') {
                navigate('/admin/dashboard');
            }
        } catch (err) {
            console.error('Failed to fetch admin status:', err);
            console.error('Error details:', err);

            const errorResponse = err as { response?: { data?: { error?: string }; status?: number } };
            console.log('Error response status:', errorResponse.response?.status);
            console.log('Error response data:', errorResponse.response?.data);

            setError(errorResponse.response?.data?.error || 'Failed to load status');

            // If unauthorized, don't redirect - show helpful message instead
            if (errorResponse.response?.status === 401) {
                console.log('401 Unauthorized - no valid token, showing login prompt');
                setError('To check your account status, please try logging in first. You will be redirected to this page if your account has special status.');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAdminStatus();
    }, [fetchAdminStatus]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    // Loading Screen with Islamic Design
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-4">
                {/* Islamic background orbs */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full blur-xl animate-pulse delay-500"></div>

                <div className="relative text-center">
                    <div className="relative mb-6 w-16 h-16 mx-auto">
                        {/* Base ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-green-200/50"></div>
                        {/* Spinning arc (top border colored) */}
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 animate-spin"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Loading your status...</p>
                </div>
            </div>
        );
    }

    // Error/Login Prompt Screen with Islamic Design
    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-4">
                {/* Islamic background orbs */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>

                <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border border-green-200/50">
                    {/* Local Islamic orbs */}
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-lg animate-pulse"></div>
                    <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-lg animate-pulse delay-500"></div>

                    <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <UserCheck className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                            Account Status Check
                        </h2>
                        <p className="text-gray-600 mb-6 text-sm sm:text-base px-2">
                            {error || 'Unable to load your account status'}
                        </p>
                        <button
                            onClick={() => navigate('/admin/login')}
                            className="inline-flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Helper function to render status cards with Islamic theme
    const renderStatusCard = (
        title: string,
        description: string,
        icon: React.ReactNode,
        gradientFrom: string,
        gradientTo: string,
        children: React.ReactNode
    ) => (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 relative overflow-hidden">
            {/* Islamic Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className={`absolute top-0 left-0 w-96 h-96 bg-gradient-to-br ${gradientFrom} rounded-full filter blur-3xl animate-pulse`}></div>
                <div className={`absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br ${gradientTo} rounded-full filter blur-3xl animate-pulse delay-1000`}></div>
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full filter blur-2xl animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 container mx-auto px-3 sm:px-4 py-8 sm:py-16">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white/70 backdrop-blur-xl border border-green-200/50 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
                        {/* Local Islamic orbs */}
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-lg animate-pulse delay-1000"></div>

                        <div className="relative">
                            {/* Status Icon */}
                            <div className={`w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl`}>
                                {icon}
                            </div>

                            {/* Header */}
                            <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${gradientFrom.replace('from-', 'from-').replace('/20', '-600')} ${gradientTo.replace('to-', 'to-').replace('/20', '-600')} bg-clip-text text-transparent text-center mb-3`}>
                                {title}
                            </h1>
                            <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base px-2">
                                {description}
                            </p>

                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // PENDING STATUS
    if (profile.status === 'pending') {
        return renderStatusCard(
            'Application Pending Review',
            'Your application is being reviewed by the Super Admin',
            <Clock className="w-10 sm:w-12 h-10 sm:h-12 text-white" />,
            'from-green-500',
            'to-emerald-600',
            <>
                {/* Info Card */}
                <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Your Name</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{profile.name}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Email</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-all">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Phone</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{profile.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Status</p>
                            <span className="inline-flex items-center gap-2 bg-green-100/80 backdrop-blur-sm text-green-800 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border border-green-200/50">
                                <Clock size={12} className="sm:w-4 sm:h-4" />
                                Pending
                            </span>
                        </div>
                        {profile.mosque && (
                            <>
                                <div>
                                    <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Mosque</p>
                                    <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{profile.mosque.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Location</p>
                                    <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{profile.mosque.location}</p>
                                </div>
                            </>
                        )}
                        <div className="sm:col-span-2">
                            <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">Applied On</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                {new Date(profile.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                            <FileText size={14} className="text-white" />
                        </div>
                        What Happens Next?
                    </h3>
                    <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>The Super Admin will review your application and documents</span>
                        </li>
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>You will receive an email notification once a decision is made</span>
                        </li>
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>You can try logging in after 24 hours to check your status</span>
                        </li>
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>Once approved, you'll have full access to the admin dashboard</span>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={fetchAdminStatus}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <RefreshCw size={16} className="sm:w-5 sm:h-5" />
                        Check Status Again
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <LogOut size={16} className="sm:w-5 sm:h-5" />
                        Logout
                    </button>
                </div>
            </>
        );
    }

    // REJECTED STATUS
    if (profile.status === 'rejected' && profile.rejection_info) {
        const { rejection_reason, rejection_date, rejection_count, can_reapply } = profile.rejection_info;

        return renderStatusCard(
            'Application Rejected',
            'Your application was not approved',
            <XCircle className="w-10 sm:w-12 h-10 sm:h-12 text-white" />,
            'from-red-500',
            'to-rose-600',
            <>
                {/* Rejection Details */}
                <div className="bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Rejection Details</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs sm:text-sm text-red-600 mb-1 font-medium">Reason</p>
                            <p className="font-medium text-gray-800 bg-white/70 p-3 rounded-lg text-sm sm:text-base">
                                {rejection_reason}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs sm:text-sm text-red-600 mb-1 font-medium">Rejection Date</p>
                                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                    {new Date(rejection_date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-red-600 mb-1 font-medium">Rejection Count</p>
                                <p className="font-semibold text-gray-800 text-sm sm:text-base">{rejection_count}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Your Account Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Name</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{profile.name}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Email</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-all">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Phone</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{profile.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
                            <span className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                                <XCircle size={12} className="sm:w-4 sm:h-4" />
                                Rejected
                            </span>
                        </div>
                    </div>
                </div>

                {/* Reapplication Status */}
                {can_reapply ? (
                    <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reapplication Allowed</h3>
                                <p className="text-xs sm:text-sm text-gray-700 mb-4">
                                    The Super Admin has allowed you to reapply. You can submit a new application with updated information.
                                </p>
                                <Link
                                    to="/admin/reapply"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-300 text-sm sm:text-base"
                                >
                                    <RefreshCw size={16} />
                                    Reapply Now
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-orange-50/80 to-yellow-50/80 backdrop-blur-sm border border-orange-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-orange-600 flex-shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reapplication Not Available</h3>
                                <p className="text-xs sm:text-sm text-gray-700">
                                    {rejection_count >= 3
                                        ? 'You have been rejected multiple times and cannot reapply at this time. Please contact support for assistance.'
                                        : 'You are not currently allowed to reapply. Please contact the Super Admin for more information.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/mosques"
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <Home size={16} className="sm:w-5 sm:h-5" />
                        Back to Home
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <LogOut size={16} className="sm:w-5 sm:h-5" />
                        Logout
                    </button>
                </div>
            </>
        );
    }

    // MOSQUE DELETED STATUS
    if (profile.status === 'mosque_deleted' && profile.mosque_deletion_info) {
        const { mosque_deletion_reason, mosque_deletion_date, deleted_mosque_name, deleted_mosque_location, can_reapply } = profile.mosque_deletion_info;

        return renderStatusCard(
            'Mosque Deleted',
            'Your associated mosque has been removed from the system',
            <AlertCircle className="w-10 sm:w-12 h-10 sm:h-12 text-white" />,
            'from-orange-500',
            'to-amber-600',
            <>
                {/* Deletion Details */}
                <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-sm border border-orange-200/50 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Mosque Deletion Details</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs sm:text-sm text-orange-600 mb-1 font-medium">Deleted Mosque</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{deleted_mosque_name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 break-words">{deleted_mosque_location}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-orange-600 mb-1 font-medium">Deletion Reason</p>
                            <p className="font-medium text-gray-800 bg-white/70 p-3 rounded-lg text-sm sm:text-base">
                                {mosque_deletion_reason}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-orange-600 mb-1 font-medium">Deletion Date</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                {new Date(mosque_deletion_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Your Account Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Name</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{profile.name}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Email</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-all">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Phone</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{profile.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
                            <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                                <AlertCircle size={12} className="sm:w-4 sm:h-4" />
                                Mosque Deleted
                            </span>
                        </div>
                    </div>
                </div>

                {/* Reapplication Option */}
                {can_reapply ? (
                    <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reapplication Available</h3>
                                <p className="text-xs sm:text-sm text-gray-700 mb-4">
                                    You can apply to manage a different mosque. Get a new verification code from another mosque to continue.
                                </p>
                                <Link
                                    to="/admin/reapply"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-300 text-sm sm:text-base"
                                >
                                    <RefreshCw size={16} />
                                    Apply for Another Mosque
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                        <div className="flex items-start gap-3">
                            <XCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reapplication Not Available</h3>
                                <p className="text-xs sm:text-sm text-gray-700">
                                    You are not currently allowed to apply for another mosque. Please contact the Super Admin for more information.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/mosques"
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <Home size={16} className="sm:w-5 sm:h-5" />
                        Back to Home
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <LogOut size={16} className="sm:w-5 sm:h-5" />
                        Logout
                    </button>
                </div>
            </>
        );
    }

    // ADMIN REMOVED STATUS
    if (profile.status === 'admin_removed' && profile.admin_removal_info) {
        const { admin_removal_reason, admin_removal_date, removed_from_mosque_name, removed_from_mosque_location, can_reapply } = profile.admin_removal_info;

        return renderStatusCard(
            'Admin Removed',
            'You have been removed from your mosque by the Super Admin',
            <AlertCircle className="w-10 sm:w-12 h-10 sm:h-12 text-white" />,
            'from-purple-500',
            'to-violet-600',
            <>
                {/* Removal Details */}
                <div className="bg-gradient-to-r from-purple-50/80 to-violet-50/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Removal Details</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs sm:text-sm text-purple-600 mb-1 font-medium">Removed From Mosque</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{removed_from_mosque_name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 break-words">{removed_from_mosque_location}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-purple-600 mb-1 font-medium">Removal Reason</p>
                            <p className="font-medium text-gray-800 bg-white/70 p-3 rounded-lg text-sm sm:text-base">
                                {admin_removal_reason}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-purple-600 mb-1 font-medium">Removal Date</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                {new Date(admin_removal_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Your Account Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Name</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{profile.name}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Email</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-all">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Phone</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{profile.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
                            <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                                <AlertCircle size={12} className="sm:w-4 sm:h-4" />
                                Admin Removed
                            </span>
                        </div>
                    </div>
                </div>

                {/* Reapplication Option */}
                {can_reapply ? (
                    <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reapplication Available</h3>
                                <p className="text-xs sm:text-sm text-gray-700 mb-4">
                                    You can apply to manage for this mosque again or a different mosque. Get a verification code to continue.
                                </p>
                                <Link
                                    to="/admin/reapply"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-300 text-sm sm:text-base"
                                >
                                    <RefreshCw size={16} />
                                    Apply for Mosque
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                        <div className="flex items-start gap-3">
                            <XCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Reapplication Not Available</h3>
                                <p className="text-xs sm:text-sm text-gray-700">
                                    You are not currently allowed to apply for a mosque. Please contact the Super Admin for more information.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/mosques"
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <Home size={16} className="sm:w-5 sm:h-5" />
                        Back to Home
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <LogOut size={16} className="sm:w-5 sm:h-5" />
                        Logout
                    </button>
                </div>
            </>
        );
    }

    // CODE REGENERATED STATUS
    if (profile.status === 'code_regenerated' && profile.code_regeneration_info) {
        const { code_regeneration_reason, code_regeneration_date, code_regenerated_mosque_name, code_regenerated_mosque_location, can_reapply } = profile.code_regeneration_info;

        return renderStatusCard(
            'Mosque Code Regenerated',
            'Your mosque verification code has been regenerated by the Super Admin',
            <RefreshCw className="w-10 sm:w-12 h-10 sm:h-12 text-white" />,
            'from-cyan-500',
            'to-blue-600',
            <>
                {/* Info Card */}
                <div className="bg-gradient-to-r from-cyan-50/80 to-blue-50/80 backdrop-blur-sm border border-cyan-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Your Name</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{profile.name}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Email</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base break-all">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Phone</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{profile.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Status</p>
                            <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                                <RefreshCw size={12} className="sm:w-4 sm:h-4" />
                                Code Regenerated
                            </span>
                        </div>
                        {code_regenerated_mosque_name && (
                            <>
                                <div>
                                    <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Mosque</p>
                                    <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{code_regenerated_mosque_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Location</p>
                                    <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{code_regenerated_mosque_location}</p>
                                </div>
                            </>
                        )}
                        <div className="sm:col-span-2">
                            <p className="text-xs sm:text-sm text-cyan-600 mb-1 font-medium">Code Regenerated On</p>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">
                                {new Date(code_regeneration_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reason Card */}
                <div className="bg-orange-50/80 backdrop-blur-sm border border-orange-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <AlertCircle size={14} className="text-white" />
                        </div>
                        Reason for Code Regeneration
                    </h3>
                    <p className="text-gray-700 bg-white/50 rounded-xl p-4 text-xs sm:text-sm">
                        {code_regeneration_reason || 'No specific reason provided'}
                    </p>
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                            <FileText size={14} className="text-white" />
                        </div>
                        What You Can Do
                    </h3>
                    <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>Contact the Super Admin to get the new mosque verification code</span>
                        </li>
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>Login again with your email, password, and the new mosque code</span>
                        </li>
                        <li className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                            <span>Once validated, you'll regain full access to the admin dashboard</span>
                        </li>
                        {can_reapply && (
                            <li className="flex items-start gap-2 sm:gap-3">
                                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
                                <span>Alternatively, you can reapply for a different mosque</span>
                            </li>
                        )}
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/admin/login"
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <RefreshCw size={16} className="sm:w-5 sm:h-5" />
                        Try Login Again
                    </Link>
                    {can_reapply && (
                        <Link
                            to="/admin/reapply"
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                        >
                            <FileText size={16} className="sm:w-5 sm:h-5" />
                            Reapply
                        </Link>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                        <LogOut size={16} className="sm:w-5 sm:h-5" />
                        Logout
                    </button>
                </div>
            </>
        );
    }

    // Fallback for any unhandled statuses
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-4">
            <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border border-green-200/50">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                    Status Unknown
                </h2>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                    Your account status is not recognized. Please contact support.
                </p>
                <button
                    onClick={() => navigate('/admin/login')}
                    className="inline-flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Login
                </button>
            </div>
        </div>
    );
};

export default AdminStatusPage;