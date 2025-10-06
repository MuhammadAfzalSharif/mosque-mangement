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
    };    // Success Screen
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>

                        {/* Success Message */}
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                            Application Submitted!
                        </h2>
                        <p className="text-lg text-gray-700 mb-6">
                            Your reapplication for <span className="font-semibold text-green-600">{mosqueName}</span> has been submitted successfully.
                        </p>

                        {/* Status Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <AlertCircle className="text-blue-600" size={18} />
                                <span className="font-semibold text-blue-900">Status: Pending Approval</span>
                            </div>
                            <p className="text-sm text-blue-800">
                                The super admin will review your application soon.
                            </p>
                        </div>

                        {/* Redirecting Message */}
                        <div className="flex items-center justify-center gap-3 text-gray-600 mb-4">
                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm">Redirecting to login page...</p>
                        </div>

                        {/* Manual Navigation */}
                        <p className="text-sm text-gray-500">
                            Login again to check your application status
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Back Button */}
                <Link
                    to="/admin/status"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Status
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <RefreshCw className="text-blue-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Reapply for Mosque Admin
                    </h1>
                    <p className="text-gray-600">
                        You've been given permission to reapply. Enter the verification code for the mosque you want to manage.
                    </p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border-b border-blue-100 p-6">
                        <div className="flex items-start gap-3">
                            <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-1">Important Information</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
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
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Verification Code Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <span className="flex items-center gap-2">
                                    <Key size={16} />
                                    Mosque Verification Code *
                                </span>
                            </label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                placeholder="Enter verification code (e.g., ABC12345)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono uppercase"
                                maxLength={16}
                                required
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Enter the unique verification code provided by the mosque
                            </p>
                        </div>

                        {/* Application Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <span className="flex items-center gap-2">
                                    <FileText size={16} />
                                    Application Notes (Optional)
                                </span>
                            </label>
                            <textarea
                                value={applicationNotes}
                                onChange={(e) => setApplicationNotes(e.target.value)}
                                placeholder="Why do you want to be the admin for this mosque? (Optional)"
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                maxLength={500}
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                {applicationNotes.length}/500 characters
                            </p>
                        </div>

                        {/* Warning for Multiple Rejections */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="text-sm font-semibold text-orange-900 mb-1">
                                    Reapplication Notice
                                </p>
                                <p className="text-sm text-orange-800">
                                    Please ensure you meet all requirements before submitting. Multiple rejections may result in a ban from the system.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/status')}
                                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !verificationCode.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Submit Reapplication
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Help Section */}
                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle size={18} className="text-green-600" />
                        What happens next?
                    </h3>
                    <ol className="text-sm text-gray-700 space-y-2">
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span>Your reapplication will be submitted with "Pending" status</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span>The super admin will review your application</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span>You'll be notified when your application is approved or needs changes</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                            <span>Once approved, you can access the admin dashboard</span>
                        </li>
                    </ol>
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
