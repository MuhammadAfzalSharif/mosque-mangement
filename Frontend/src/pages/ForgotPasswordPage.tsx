import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { Mail, ArrowLeft, AlertCircle, Clock, Shield, CheckCircle } from 'react-feather';
import Toast from '../components/Toast';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address').min(1, 'Email is required'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { userType } = useParams<{ userType: 'admin' | 'superadmin' }>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [emailSent, setEmailSent] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'error' | 'warning' | 'success'>('error');
    const [countdown, setCountdown] = useState(5);

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const handleBackToLogin = () => {
        navigate(userType === 'admin' ? '/admin/login' : '/superadmin/login');
    };

    const handleProceedToVerify = useCallback(() => {
        navigate(`/reset-password/${userType}`, {
            state: {
                email: emailSent,
                fromForgotPassword: true
            }
        });
    }, [navigate, userType, emailSent]);

    // Countdown effect for auto-redirect
    useEffect(() => {
        if (success && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (success && countdown === 0) {
            handleProceedToVerify();
        }
    }, [success, countdown, handleProceedToVerify]);

    const handleSubmit = async (data: ForgotPasswordFormData) => {
        if (!userType || !['admin', 'superadmin'].includes(userType)) {
            setError('Invalid user type');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authApi.forgotPassword({
                email: data.email.toLowerCase().trim(),
                userType: userType as 'admin' | 'superadmin'
            });

            setEmailSent(data.email);
            setSuccess(true);
            setCountdown(5); // Reset countdown for auto-redirect

            // Show success toast for email sent
            setToastType('success');
            setToastMessage(`Reset code sent successfully to ${data.email}`);
            setShowToast(true);
        } catch (err: unknown) {
            console.error('Forgot password error:', err);
            const errorMessage = getErrorMessage(err);

            // Check if it's a rate limit error to show toast
            if (errorMessage.includes('limit is exceeded') || errorMessage.includes('try one hour later')) {
                setToastType('error');
                setToastMessage('Your limit is exceeded, try one hour later!');
                setShowToast(true);
                setError(null); // Don't show inline error for rate limit
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = userType === 'admin';
    const title = isAdmin ? 'Admin Portal' : 'Super Admin Portal';
    const backgroundGradient = 'from-green-50 via-emerald-50/30 to-teal-50/20';

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
                <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-green-300/40 via-emerald-400/30 to-teal-300/20 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-80 sm:h-80 bg-gradient-to-br from-emerald-300/30 via-teal-400/25 to-green-300/20 rounded-full filter blur-2xl transform translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-teal-200/20 to-green-200/15 rounded-full filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-1/3 right-1/4 w-24 h-24 sm:w-36 sm:h-36 bg-gradient-to-br from-green-200/15 to-emerald-200/10 rounded-full filter blur-lg animate-pulse" style={{ animationDelay: '3s' }}></div>
            </div>

            <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
                {/* Navigation */}
                <div className="mb-4 sm:mb-8">
                    <button
                        onClick={handleBackToLogin}
                        className="group inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl text-green-600 hover:text-green-700 font-medium transition-all duration-300 hover:bg-white/90 shadow-xl hover:shadow-2xl transform hover:scale-105"
                    >
                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 transition-transform group-hover:-translate-x-1" />
                        <span className="hidden sm:inline">Back to Login</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                </div>

                <div className="max-w-sm sm:max-w-lg mx-auto">
                    {/* Header */}
                    <div className="text-center mb-6 sm:mb-12">
                        <div className="relative mb-4 sm:mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl blur-lg opacity-30"></div>
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                        </div>
                        <h1 className="text-lg sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 sm:mb-4 tracking-tight">
                            Forgot Password
                        </h1>
                        <p className="text-gray-600 text-base sm:text-sm leading-relaxed max-w-md mx-auto px-2">
                            {success
                                ? "Check your email for the reset code"
                                : `Enter your ${title.toLowerCase()} email address and we'll send you a password reset code`
                            }
                        </p>
                    </div>

                    {success ? (
                        /* Success State */
                        <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 text-center overflow-hidden">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
                                    <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>

                                <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2 sm:mb-4">
                                    Reset Code Sent!
                                </h2>

                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                    <div className="flex items-center justify-center mb-2">
                                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
                                        <span className="text-green-800 font-medium text-sm sm:text-base">Email sent to:</span>
                                    </div>
                                    <p className="text-green-700 font-mono text-sm sm:text-base break-all">{emailSent}</p>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
                                    <div className="flex items-start">
                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                                        <div className="text-left">
                                            <p className="text-blue-800 font-medium text-sm sm:text-base mb-1">Important:</p>
                                            <ul className="text-blue-700 text-sm sm:text-base space-y-1">
                                                <li>• Code expires in 15 minutes</li>
                                                <li>• Check your spam folder if not received</li>
                                                <li>• You can only request one reset per hour</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 sm:mb-6">
                                    <p className="text-gray-600 text-sm sm:text-base mb-2">
                                        Auto-redirecting in <span className="font-bold text-green-600">{countdown}</span> seconds...
                                    </p>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                                            style={{ width: `${(countdown / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleProceedToVerify}
                                    className="w-full bg-gradient-to-r from-green-700 via-emerald-800 to-teal-900 hover:from-green-800 hover:via-emerald-900 hover:to-teal-950 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                                >
                                    Enter Reset Code Now
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Form State */
                        <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 overflow-hidden">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-3xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                {/* Error Display */}
                                {error && (
                                    <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                        <div className="flex items-center">
                                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mr-2 flex-shrink-0" />
                                            <p className="text-red-700 font-medium text-sm sm:text-base">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Info Box */}
                                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                    <div className="flex items-start">
                                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                                        <div className="text-left">
                                            <p className="text-amber-800 font-medium text-sm sm:text-base mb-1">Security Notice:</p>
                                            <p className="text-amber-700 text-sm sm:text-base">
                                                For security reasons, we'll only send a reset code if your email exists in our system.
                                                You can only request one reset per hour.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
                                    <div>
                                        <label className="flex items-center text-sm sm:text-base font-semibold text-gray-700 mb-2 sm:mb-3">
                                            <div className="relative mr-2">
                                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                <Mail className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                            </div>
                                            Email Address
                                        </label>
                                        <input
                                            {...form.register('email')}
                                            type="email"
                                            autoComplete="email"
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-base"
                                            placeholder={`Enter your ${title.toLowerCase()} email`}
                                        />
                                        {form.formState.errors.email && (
                                            <p className="text-red-500 text-sm sm:text-base mt-1 sm:mt-2 font-medium">
                                                {form.formState.errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-green-700 via-emerald-800 to-teal-900 hover:from-green-800 hover:via-emerald-900 hover:to-teal-950 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg text-base"
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                                                <span className="hidden sm:inline">Sending Reset Code...</span>
                                                <span className="sm:hidden">Sending...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="hidden sm:inline">Send Reset Code</span>
                                                <span className="sm:hidden">Send Code</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-4 sm:mt-6 text-center">
                                    <p className="text-sm sm:text-base text-gray-600">
                                        Remember your password?{' '}
                                        <button
                                            onClick={handleBackToLogin}
                                            className="text-green-600 hover:text-emerald-700 font-semibold hover:underline"
                                        >
                                            Back to Login
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;