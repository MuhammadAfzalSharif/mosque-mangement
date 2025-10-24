import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import { ArrowLeft, AlertCircle, Lock, Key, Eye, EyeOff } from 'react-feather';
import Toast from '../components/Toast';

const verifyCodeSchema = z.object({
    code: z.string().min(6, 'Code must be 6 digits').max(6, 'Code must be 6 digits'),
});

const resetPasswordSchema = z.object({
    newPassword: z.string().min(7, 'Password must be at least 7 characters'),
    confirmPassword: z.string().min(7, 'Password must be at least 7 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { userType } = useParams<{ userType: 'admin' | 'superadmin' }>();
    const location = useLocation();
    const email = location.state?.email || '';

    const [step, setStep] = useState<'verify' | 'reset'>('verify');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'error' | 'warning' | 'success'>('success');

    const verifyForm = useForm<VerifyCodeFormData>({
        resolver: zodResolver(verifyCodeSchema),
    });

    const resetForm = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const handleVerifyCode = async (data: VerifyCodeFormData) => {
        if (!userType || !email) {
            setError('Missing required information');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await authApi.verifyResetCode({
                email: email.toLowerCase().trim(),
                code: data.code,
                userType: userType as 'admin' | 'superadmin'
            });

            setResetToken(response.data.resetToken);
            setStep('reset');
        } catch (err: unknown) {
            console.error('Verify code error:', err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (data: ResetPasswordFormData) => {
        setLoading(true);
        setError(null);

        try {
            await authApi.resetPassword({
                resetToken,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword
            });

            // Show success toast
            setToastType('success');
            setToastMessage('Password reset successfully! Redirecting to login...');
            setShowToast(true);

            // Success - redirect to login after a short delay
            setTimeout(() => {
                navigate(userType === 'admin' ? '/admin/login' : '/superadmin/login', {
                    state: { message: 'Password reset successfully. Please login with your new password.' }
                });
            }, 2000);
        } catch (err: unknown) {
            console.error('Reset password error:', err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate(userType === 'admin' ? '/admin/login' : '/superadmin/login');
    };

    const backgroundGradient = 'from-green-50 via-emerald-50/30 to-teal-50/20';

    if (!email) {
        return (
            <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient} flex items-center justify-center`}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Access</h1>
                    <p className="text-gray-600 mb-4">Please start the password reset process from the forgot password page.</p>
                    <button
                        onClick={handleBackToLogin}
                        className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg transition-all duration-300"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient} relative overflow-hidden`}>
            {/* Toast Notification */}
            {showToast && (
                <Toast
                    type={toastType}
                    message={toastMessage}
                    onClose={() => setShowToast(false)}
                    duration={3000}
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
                                {step === 'verify' ? <Key className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> : <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />}
                            </div>
                        </div>
                        <h1 className="text-lg sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 sm:mb-4 tracking-tight">
                            {step === 'verify' ? 'Enter Reset Code' : 'Set New Password'}
                        </h1>
                        <p className="text-gray-600 text-xs sm:text-lg leading-relaxed max-w-md mx-auto px-2">
                            {step === 'verify'
                                ? `Enter the 6-digit code sent to ${email}`
                                : 'Enter your new password'
                            }
                        </p>
                    </div>

                    {/* Form */}
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
                                        <p className="text-red-700 font-medium text-xs sm:text-sm">{error}</p>
                                    </div>
                                </div>
                            )}

                            {step === 'verify' ? (
                                /* Verify Code Form */
                                <form onSubmit={verifyForm.handleSubmit(handleVerifyCode)} className="space-y-4 sm:space-y-6">
                                    <div>
                                        <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                            <div className="relative mr-2">
                                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                <Key className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                            </div>
                                            Reset Code
                                        </label>
                                        <input
                                            {...verifyForm.register('code')}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={6}
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-center text-lg font-mono tracking-widest"
                                            placeholder="000000"
                                        />
                                        {verifyForm.formState.errors.code && (
                                            <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                                {verifyForm.formState.errors.code.message}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-green-700 via-emerald-800 to-teal-900 hover:from-green-800 hover:via-emerald-900 hover:to-teal-950 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg text-sm sm:text-base"
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                                                <span className="hidden sm:inline">Verifying Code...</span>
                                                <span className="sm:hidden">Verifying...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="hidden sm:inline">Verify Code</span>
                                                <span className="sm:hidden">Verify</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                /* Reset Password Form */
                                <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4 sm:space-y-6">
                                    <div>
                                        <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                            <div className="relative mr-2">
                                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                <Lock className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                            </div>
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...resetForm.register('newPassword')}
                                                type={showPassword ? 'text' : 'password'}
                                                autoComplete={showPassword ? 'off' : 'new-password'}
                                                className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Enter new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1"
                                                key={showPassword ? 'new-password-eye-off' : 'new-password-eye-on'}
                                            >
                                                {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                            </button>
                                        </div>
                                        {resetForm.formState.errors.newPassword && (
                                            <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                                {resetForm.formState.errors.newPassword.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                            <div className="relative mr-2">
                                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                                <Lock className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                            </div>
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...resetForm.register('confirmPassword')}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                autoComplete={showConfirmPassword ? 'off' : 'new-password'}
                                                className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50/80 to-green-50/40 border-2 border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 hover:bg-gray-100/80 backdrop-blur-sm text-sm sm:text-base"
                                                placeholder="Confirm new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1"
                                                key={showConfirmPassword ? 'confirm-password-eye-off' : 'confirm-password-eye-on'}
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                            </button>
                                        </div>
                                        {resetForm.formState.errors.confirmPassword && (
                                            <p className="text-red-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                                                {resetForm.formState.errors.confirmPassword.message}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-green-700 via-emerald-800 to-teal-900 hover:from-green-800 hover:via-emerald-900 hover:to-teal-950 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg text-sm sm:text-base"
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                                                <span className="hidden sm:inline">Resetting Password...</span>
                                                <span className="sm:hidden">Resetting...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="hidden sm:inline">Reset Password</span>
                                                <span className="sm:hidden">Reset</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <div className="mt-4 sm:mt-6 text-center">
                                <p className="text-xs sm:text-sm text-gray-600">
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
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;