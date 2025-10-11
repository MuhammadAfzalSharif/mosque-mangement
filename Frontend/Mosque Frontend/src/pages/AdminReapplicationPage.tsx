import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import Toast from '../components/Toast';
import {
    RefreshCw,
    Shield,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    Key,
    FileText,
    Send
} from 'react-feather';

interface ToastState {
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
}

const AdminReapplicationPage: React.FC = () => {
    const [verificationCode, setVerificationCode] = useState('');
    const [applicationNotes, setApplicationNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [mosqueName, setMosqueName] = useState('');
    const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!verificationCode.trim()) {
            setToast({ show: true, type: 'warning', message: 'Please enter a verification code' });
            return;
        }

        if (verificationCode.trim().length < 8) {
            setToast({ show: true, type: 'warning', message: 'Verification code must be at least 8 characters' });
            return;
        }

        setLoading(true);

        try {
            console.log('Submitting reapplication...');

            const response = await authApi.requestReapplication({
                mosque_verification_code: verificationCode.trim().toUpperCase(),
                application_notes: applicationNotes.trim() || 'Reapplying for mosque admin position'
            });

            console.log('Reapplication response:', response.data);

            // Extract mosque name from response
            const mosqueNameFromResponse = response.data.admin?.mosque?.name || 'the mosque';
            setMosqueName(mosqueNameFromResponse);

            // Show success state
            setSuccess(true);

            setToast({
                show: true,
                type: 'success',
                message: response.data.message || 'Reapplication submitted successfully!'
            });

            // Clear storage and redirect to login after 3 seconds
            setTimeout(() => {
                // Clear all auth data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('userRole');

                // Redirect to login with message
                navigate('/admin/apply', {
                    state: {
                        message: 'Your reapplication has been submitted. Please login to check your status.'
                    }
                });
            }, 3000);

        } catch (err: unknown) {
            console.error('Reapplication error:', err);

            const error = err as {
                response?: {
                    data?: {
                        error?: string;
                        success?: boolean;
                        code?: string;
                        debug?: unknown;
                        details?: unknown;
                    };
                    status?: number;
                }
            };

            // Log detailed error information
            console.error('Error response:', error.response);
            console.error('Error status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            console.error('Error code:', error.response?.data?.code);
            console.error('Error details:', error.response?.data?.details);

            let errorMessage = 'An unexpected error occurred';

            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error occurred. Please try again later.';
                // Add details if available in development
                if (error.response?.data?.details) {
                    console.error('Server error details:', error.response.data.details);
                }
            } else if (error.response?.status === 404) {
                errorMessage = 'Endpoint not found. Please contact support.';
            } else if (error.response?.status === 403) {
                errorMessage = error.response?.data?.error || 'You are not allowed to reapply. Please contact the super admin.';
            } else if (error.response?.status === 400) {
                errorMessage = error.response?.data?.error || 'Invalid request. Please check your information.';
            } else {
                errorMessage = getErrorMessage(err);
            }

            setToast({ show: true, type: 'error', message: errorMessage });
            setLoading(false);
        }
    };    // Success Screen with Islamic Theme
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 relative overflow-hidden">
                {/* Islamic Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full filter blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full filter blur-2xl animate-pulse delay-500"></div>
                </div>

                <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                    <div className="max-w-md w-full">
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 text-center border border-green-200/50 overflow-hidden">
                            {/* Local Islamic orbs */}
                            <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-lg animate-pulse"></div>
                            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full blur-lg animate-pulse delay-500"></div>

                            <div className="relative">
                                {/* Success Icon */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg animate-bounce">
                                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>

                                {/* Success Message */}
                                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                                    Application Submitted!
                                </h2>
                                <p className="text-base sm:text-lg text-gray-700 mb-6">
                                    Your reapplication for <span className="font-semibold text-green-600">{mosqueName}</span> has been submitted successfully.
                                </p>

                                {/* Status Info */}
                                <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                            <CheckCircle size={14} className="text-white" />
                                        </div>
                                        <span className="font-semibold text-gray-800 text-sm sm:text-base">Status: Pending Approval</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-700">
                                        The super admin will review your application soon.
                                    </p>
                                </div>

                                {/* Redirecting Message */}
                                <div className="flex items-center justify-center gap-3 text-gray-600 mb-4">
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs sm:text-sm">Redirecting to login page...</p>
                                </div>

                                {/* Manual Navigation */}
                                <p className="text-xs sm:text-sm text-gray-500">
                                    Login again to check your application status
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 relative overflow-hidden">
            {/* Islamic Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-green-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full filter blur-2xl animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 container mx-auto px-3 sm:px-4 py-8 sm:py-16">
                <div className="max-w-2xl mx-auto">
                    {/* Back Button */}
                    <Link
                        to="/admin/status"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors text-sm sm:text-base"
                    >
                        <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
                        Back to Status
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-6 sm:mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-lg">
                            <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2">
                            Reapply for Mosque Admin
                        </h1>
                        <p className="text-gray-600 text-sm sm:text-base px-2">
                            You've been given permission to reapply. Enter the verification code for the mosque you want to manage.
                        </p>
                    </div>

                    {/* Main Form Card */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-green-200/50 overflow-hidden">
                        {/* Info Banner */}
                        <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border-b border-green-200/50 p-4 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Shield size={14} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Important Information</h3>
                                    <ul className="text-xs sm:text-sm text-gray-700 space-y-1">
                                        <li>• Get the verification code from the mosque administration</li>
                                        <li>• Ensure the mosque doesn't already have an admin</li>
                                        <li>• Your application will be pending until the super admin approves it</li>
                                        <li>• Verification codes are case-insensitive</li>
                                        <li>• This page is for rejected admins, admins whose mosques were deleted, and admins who were removed from their mosques</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
                            {/* Verification Code Input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Key size={16} className="text-green-600" />
                                        Mosque Verification Code *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                    placeholder="Enter verification code (e.g., ABC12345)"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base sm:text-lg font-mono uppercase transition-all duration-300 bg-white/50 backdrop-blur-sm"
                                    maxLength={16}
                                    required
                                />
                                <p className="mt-2 text-xs sm:text-sm text-gray-500">
                                    Enter the unique verification code provided by the mosque
                                </p>
                            </div>

                            {/* Application Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <FileText size={16} className="text-green-600" />
                                        Application Notes (Optional)
                                    </span>
                                </label>
                                <textarea
                                    value={applicationNotes}
                                    onChange={(e) => setApplicationNotes(e.target.value)}
                                    placeholder="Why do you want to be the admin for this mosque? (Optional)"
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all duration-300 bg-white/50 backdrop-blur-sm"
                                    maxLength={500}
                                />
                                <p className="mt-2 text-xs sm:text-sm text-gray-500">
                                    {applicationNotes.length}/500 characters
                                </p>
                            </div>

                            {/* Warning for Multiple Rejections */}
                            <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-sm border border-orange-200/50 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertCircle size={14} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm font-semibold text-orange-900 mb-1">
                                        Reapplication Notice
                                    </p>
                                    <p className="text-xs sm:text-sm text-orange-800">
                                        Please ensure you meet all requirements before submitting. Multiple rejections may result in a ban from the system.
                                    </p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/status')}
                                    className="flex-1 px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !verificationCode.trim()}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none text-sm sm:text-base flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} className="sm:w-5 sm:h-5" />
                                            Submit Reapplication
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Help Section */}
                    <div className="mt-6 sm:mt-8 bg-white/70 backdrop-blur-xl border border-green-200/50 rounded-3xl p-4 sm:p-6 shadow-lg">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                <CheckCircle size={14} className="text-white" />
                            </div>
                            What happens next?
                        </h3>
                        <ol className="text-xs sm:text-sm text-gray-700 space-y-2 sm:space-y-3">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                <span>Your reapplication will be submitted with "Pending" status</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                <span>The super admin will review your application</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                <span>You'll be notified when your application is approved or needs changes</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                <span>Once approved, you can access the admin dashboard</span>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
        </div>
    );
};

export default AdminReapplicationPage;
