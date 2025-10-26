import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { Mail, ArrowLeft, AlertCircle, Key } from 'react-feather';
import Toast from '../components/Toast';

const verifyCodeSchema = z.object({
    code: z.string().min(6, 'Code must be 6 digits').max(6, 'Code must be 6 digits'),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

const EmailVerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'error' | 'warning' | 'success'>('error');

    // Get data from navigation state
    const email = location.state?.email || '';
    const userType = location.state?.userType || '';

    const form = useForm<VerifyCodeFormData>({
        resolver: zodResolver(verifyCodeSchema),
    });

    const handleVerifyCode = async (data: VerifyCodeFormData) => {
        if (!email || !userType) {
            setError('Missing verification information. Please restart the registration process.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authApi.verifyRegistrationCode({
                email: email.toLowerCase().trim(),
                code: data.code,
                userType: userType as 'admin' | 'superadmin'
            });

            // Success - show success toast and redirect
            setToastType('success');
            setToastMessage('Email verification successful! Redirecting to login page...');
            setShowToast(true);

            // Redirect after a short delay
            setTimeout(() => {
                if (userType === 'admin') {
                    navigate('/admin/login', {
                        state: { message: 'Registration completed! Please wait for super admin approval.' }
                    });
                } else {
                    navigate('/superadmin/login', {
                        state: { message: 'Super admin account created successfully!' }
                    });
                }
            }, 2000);

        } catch (err: unknown) {
            console.error('Verification error:', err);
            const errorMessage = getErrorMessage(err);

            // Show error toast for verification failures
            setToastType('error');
            setToastMessage(errorMessage);
            setShowToast(true);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToRegistration = () => {
        if (userType === 'admin') {
            navigate('/admin/apply');
        } else {
            navigate('/superadmin/register');
        }
    };

    const handleResendCode = async () => {
        if (!email || !userType) return;

        // Redirect back to registration page
        if (userType === 'admin') {
            navigate('/admin/apply');
        } else {
            navigate('/superadmin/register');
        }
    };

    if (!email || !userType) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Access</h1>
                    <p className="text-gray-600 mb-4">Verification information is missing. Please restart the registration process.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    const isAdmin = userType === 'admin';

    const backgroundGradient = isAdmin
        ? 'from-green-50 via-emerald-50/30 to-teal-50/20'
        : 'from-purple-50 via-indigo-50 to-blue-50';

    return (
        <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient} relative overflow-hidden`}>
            {/* Toast Notification */}
            {showToast && (
                <Toast
                    type={toastType}
                    message={toastMessage}
                    onClose={() => setShowToast(false)}
                    duration={5000}
                />
            )}

            {/* Islamic 3D Background Effects */}
            <div className="absolute inset-0 opacity-30">
                <div className={`absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 ${isAdmin ? 'bg-gradient-to-br from-green-300/40 via-emerald-400/30 to-teal-300/20' : 'bg-gradient-to-br from-purple-300/40 via-indigo-400/30 to-blue-300/20'} rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse`}></div>
                <div className={`absolute bottom-0 right-0 w-48 h-48 sm:w-80 sm:h-80 ${isAdmin ? 'bg-gradient-to-br from-emerald-300/30 via-teal-400/25 to-green-300/20' : 'bg-gradient-to-br from-indigo-300/30 via-purple-400/25 to-blue-300/20'} rounded-full filter blur-2xl transform translate-x-1/2 translate-y-1/2 animate-pulse`} style={{ animationDelay: '1s' }}></div>
                <div className={`absolute top-1/2 left-1/4 w-32 h-32 sm:w-48 sm:h-48 ${isAdmin ? 'bg-gradient-to-br from-teal-200/20 to-green-200/15' : 'bg-gradient-to-br from-blue-200/20 to-purple-200/15'} rounded-full filter blur-xl animate-pulse`} style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
                {/* Navigation */}
                <div className="mb-4 sm:mb-8">
                    <button
                        onClick={handleBackToRegistration}
                        className={`group inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-white via-${isAdmin ? 'green' : 'purple'}-50/50 to-${isAdmin ? 'emerald' : 'indigo'}-50/30 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl ${isAdmin ? 'text-green-600 hover:text-green-700' : 'text-purple-600 hover:text-purple-700'} font-medium transition-all duration-300 hover:bg-white/90 shadow-xl hover:shadow-2xl transform hover:scale-105`}
                    >
                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 transition-transform group-hover:-translate-x-1" />
                        <span className="hidden sm:inline">Back to Registration</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                </div>

                <div className="max-w-sm sm:max-w-lg mx-auto">
                    {/* Header */}
                    <div className="text-center mb-6 sm:mb-12">
                        <div className="relative mb-3 sm:mb-4 lg:mb-6">
                            <div className="text-4xl sm:text-6xl md:text-7xl mb-2 sm:mb-4">🕌</div>
                            <div className={`absolute inset-0 bg-gradient-to-r ${isAdmin ? 'from-green-400/20 to-emerald-400/20' : 'from-purple-400/20 to-indigo-400/20'} rounded-full filter blur-2xl animate-pulse`}></div>
                        </div>
                        <h1 className={`text-lg sm:text-3xl md:text-4xl font-bold bg-gradient-to-r ${isAdmin ? 'from-green-600 via-emerald-600 to-teal-600' : 'from-purple-600 via-indigo-600 to-blue-600'} bg-clip-text text-transparent mb-2 sm:mb-4 tracking-tight`}>
                            Verify Your Email
                        </h1>
                        <p className="text-gray-600 text-xs sm:text-lg leading-relaxed max-w-md mx-auto px-2">
                            We've sent a 6-digit code to <strong>{email}</strong>
                        </p>
                    </div>

                    {/* Form */}
                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8">
                        {/* Error Display */}
                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                <div className="flex items-center">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mr-2 flex-shrink-0" />
                                    <p className="text-red-700 font-medium text-xs sm:text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                            <div className="flex items-start">
                                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                                <div className="text-left">
                                    <p className="text-blue-800 font-medium text-xs sm:text-sm mb-1">Important:</p>
                                    <ul className="text-blue-700 text-xs sm:text-sm space-y-1">
                                        <li>• Code expires in 15 minutes</li>
                                        <li>• Check your spam folder if not received</li>
                                        <li>• Code is valid only for this registration</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={form.handleSubmit(handleVerifyCode)} className="space-y-4 sm:space-y-6">
                            <div>
                                <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                    <Key className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                                    Verification Code
                                </label>
                                <input
                                    {...form.register('code')}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-gray-100 text-center text-lg font-mono tracking-widest"
                                    placeholder="000000"
                                />
                                {form.formState.errors.code && (
                                    <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                        {form.formState.errors.code.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-gradient-to-r ${isAdmin ? 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' : 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'} disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg text-sm sm:text-base`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                                        <span className="hidden sm:inline">Verifying Code...</span>
                                        <span className="sm:hidden">Verifying...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="hidden sm:inline">Verify & Complete Registration</span>
                                        <span className="sm:hidden">Verify Code</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-4 sm:mt-6 text-center">
                            <p className="text-xs sm:text-sm text-gray-600 mb-2">
                                Didn't receive the code?
                            </p>
                            <button
                                onClick={handleResendCode}
                                disabled={loading}
                                className={`text-xs sm:text-sm ${isAdmin ? 'text-green-600 hover:text-green-700' : 'text-purple-600 hover:text-purple-700'} font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Restart Registration Process
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;