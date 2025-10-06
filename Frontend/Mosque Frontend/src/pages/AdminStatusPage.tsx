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
    FileText
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

            // If unauthorized, redirect to home
            if (errorResponse.response?.status === 401) {
                console.log('401 Unauthorized - clearing localStorage and redirecting');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your status...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Error Loading Status</h2>
                    <p className="text-gray-600 mb-6">{error || 'Unable to load your account status'}</p>
                    <Link
                        to="/"
                        className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    // PENDING STATUS
    if (profile.status === 'pending') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full filter blur-3xl"></div>
                </div>

                <div className="relative z-10 container mx-auto px-4 py-16">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                            {/* Status Icon */}
                            <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
                                <Clock className="w-12 h-12 text-white" />
                            </div>

                            {/* Header */}
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent text-center mb-3">
                                Application Pending Review
                            </h1>
                            <p className="text-gray-600 text-center mb-8">
                                Your application is being reviewed by the Super Admin
                            </p>

                            {/* Info Card */}
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-8">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Your Name</p>
                                        <p className="font-semibold text-gray-800">{profile.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Email</p>
                                        <p className="font-semibold text-gray-800">{profile.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                                        <p className="font-semibold text-gray-800">{profile.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Status</p>
                                        <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                                            <Clock size={14} />
                                            Pending
                                        </span>
                                    </div>
                                    {profile.mosque && (
                                        <>
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Mosque</p>
                                                <p className="font-semibold text-gray-800">{profile.mosque.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Location</p>
                                                <p className="font-semibold text-gray-800">{profile.mosque.location}</p>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Applied On</p>
                                        <p className="font-semibold text-gray-800">
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
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <FileText size={18} className="text-blue-600" />
                                    What Happens Next?
                                </h3>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>The Super Admin will review your application and documents</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>You will receive an email notification once a decision is made</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>You can try logging in after 24 hours to check your status</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>Once approved, you'll have full access to the admin dashboard</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={fetchAdminStatus}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    <RefreshCw size={18} />
                                    Check Status Again
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // REJECTED STATUS
    if (profile.status === 'rejected' && profile.rejection_info) {
        const { rejection_reason, rejection_date, rejection_count, can_reapply } = profile.rejection_info;

        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-red-400 to-pink-400 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full filter blur-3xl"></div>
                </div>

                <div className="relative z-10 container mx-auto px-4 py-16">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                            {/* Status Icon */}
                            <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <XCircle className="w-12 h-12 text-white" />
                            </div>

                            {/* Header */}
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent text-center mb-3">
                                Application Rejected
                            </h1>
                            <p className="text-gray-600 text-center mb-8">
                                Your application was not approved
                            </p>

                            {/* Rejection Details */}
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 mb-6">
                                <h3 className="font-semibold text-gray-800 mb-3">Rejection Details</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Reason</p>
                                        <p className="font-medium text-gray-800 bg-white/70 p-3 rounded-lg">
                                            {rejection_reason}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Rejection Date</p>
                                            <p className="font-semibold text-gray-800">
                                                {new Date(rejection_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Rejection Count</p>
                                            <p className="font-semibold text-gray-800">{rejection_count}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Info */}
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
                                <h3 className="font-semibold text-gray-800 mb-3">Your Account Information</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Name</p>
                                        <p className="font-semibold text-gray-800">{profile.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Email</p>
                                        <p className="font-semibold text-gray-800">{profile.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                                        <p className="font-semibold text-gray-800">{profile.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Status</p>
                                        <span className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                                            <XCircle size={14} />
                                            Rejected
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Reapplication Status */}
                            {can_reapply ? (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
                                        <div>
                                            <h3 className="font-semibold text-gray-800 mb-2">Reapplication Allowed</h3>
                                            <p className="text-sm text-gray-700 mb-4">
                                                The Super Admin has allowed you to reapply. You can submit a new application with updated information.
                                            </p>
                                            <Link
                                                to="/admin/reapply"
                                                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"
                                            >
                                                <RefreshCw size={18} />
                                                Reapply Now
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-6 mb-8">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-orange-600 flex-shrink-0 mt-1" size={24} />
                                        <div>
                                            <h3 className="font-semibold text-gray-800 mb-2">Reapplication Not Available</h3>
                                            <p className="text-sm text-gray-700">
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
                                    to="/"
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    <Home size={18} />
                                    Back to Home
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
};

export default AdminStatusPage;
