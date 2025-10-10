import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    FaBuilding,
    FaUser,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaLock,
    FaSave,
    FaCode,
    FaTimes,
    FaSpinner,
    FaEye,
    FaEyeSlash
} from 'react-icons/fa';

// Email domain validation - only allow specific providers
const allowedEmailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@(${allowedEmailDomains.join('|').replace(/\./g, '\\.')})$`, 'i');

// Validation schema for complete registration (mosque + admin)
const completeRegistrationSchema = z.object({
    mosque_name: z.string()
        .min(3, 'Mosque name must be at least 3 characters')
        .max(100, 'Mosque name must not exceed 100 characters')
        .refine(val => val.trim().length >= 3, 'Mosque name must be at least 3 characters after removing spaces')
        .refine(val => /^[a-zA-Z0-9\s\-']+$/.test(val), 'Mosque name can only contain letters, numbers, spaces, hyphens and apostrophes'),
    admin_name: z.string()
        .min(2, 'Admin name must be at least 2 characters')
        .max(50, 'Admin name must not exceed 50 characters')
        .refine(val => val.trim().length >= 2, 'Admin name must be at least 2 characters after removing spaces')
        .refine(val => /^[a-zA-Z\s\-']+$/.test(val), 'Admin name can only contain letters, spaces, hyphens and apostrophes'),
    admin_email: z.string()
        .email('Please enter a valid email address')
        .toLowerCase()
        .refine(val => emailDomainRegex.test(val), `Email must be from one of these providers: ${allowedEmailDomains.join(', ')}`),
    admin_phone: z.string()
        .regex(/^\+923[0-9]{9}$/, 'Phone number must be in format +923xxxxxxxxx (e.g., +923001234567)'),
    admin_password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(50, 'Password must not exceed 50 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'),
    confirm_password: z.string(),
    location: z.string()
        .min(5, 'Location must be at least 5 characters')
        .max(200, 'Location must not exceed 200 characters')
        .refine(val => val.trim().length >= 5, 'Location must be at least 5 characters after removing spaces'),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .optional(),
    contact_phone: z.string()
        .optional()
        .refine((val) => {
            if (!val || val.trim() === '') return true; // Allow empty
            return /^\+923[0-9]{9}$/.test(val);
        }, 'Contact phone must be in format +923xxxxxxxxx (e.g., +923001234567) or leave empty'),
    contact_email: z.string()
        .optional()
        .refine((val) => {
            if (!val || val.trim() === '') return true; // Allow empty
            return emailDomainRegex.test(val);
        }, `Contact email must be from one of these providers: ${allowedEmailDomains.join(', ')} or leave empty`),
    admin_instructions: z.string()
        .max(500, 'Admin instructions must not exceed 500 characters')
        .optional(),
    registration_code: z.string().optional()
}).refine((data) => data.admin_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

type CompleteRegistrationForm = z.infer<typeof completeRegistrationSchema>;

interface Props {
    onRegister: (data: CompleteRegistrationForm) => Promise<void>;
    onSimpleMosqueRegister?: (data: Record<string, unknown>) => Promise<void>;
}

const MosqueRegistration: React.FC<Props> = ({ onRegister }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationCode, setRegistrationCode] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form for complete registration (mosque + admin)
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm<CompleteRegistrationForm>({
        resolver: zodResolver(completeRegistrationSchema),
        defaultValues: {
            admin_phone: '+923',
            contact_phone: '+923',
            contact_email: '@gmail.com',
            admin_email: '@gmail.com',
            description: 'A mosque serving the local Muslim community with daily prayers, Friday sermons, and various Islamic activities and events.',
            admin_instructions: 'To become an admin for this mosque, please contact the mosque management committee with your full name, phone number, and email address. They will provide you with a verification code to complete your registration.'
        }
    });

    const generateRegistrationCode = () => {
        const prefix = 'MSQ';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `${prefix}${timestamp}${random}`;
        setRegistrationCode(code);
        setValue('registration_code', code);
        return code;
    };

    const onSubmit = async (data: CompleteRegistrationForm) => {
        // Add registration code to data
        const registrationData = {
            ...data,
            registration_code: registrationCode || generateRegistrationCode()
        };

        try {
            setIsSubmitting(true);

            // Parent component will handle toast notifications
            await onRegister(registrationData);

        } catch (error: unknown) {
            console.error('Registration failed:', error);
            // Parent component will handle error toast
        } finally {
            setIsSubmitting(false);
        }
    };

    // Watch password for strength indicator
    const password = watch('admin_password');

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[a-z]/.test(pwd)) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/\d/.test(pwd)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

        return {
            strength,
            label: labels[strength - 1] || 'Very Weak',
            color: colors[strength - 1] || 'bg-red-500'
        };
    };

    const passwordStrength = getPasswordStrength(password || '');

    return (
        <div className="space-y-2 sm:space-y-4 lg:space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                    Mosque Registration
                </h1>
                <p className="text-gray-600 text-sm sm:text-base hidden sm:block">
                    Choose your registration method
                </p>
            </div>

            {/* Simple Single Form for Testing */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 xl:p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 sm:space-y-4 lg:space-y-6">
                    {/* Error Display - Enhanced */}
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-4 lg:p-6 shadow-lg animate-shake">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-red-500 rounded-full flex items-center justify-center">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                                    </div>
                                </div>
                                <div className="ml-2 sm:ml-3 lg:ml-4 flex-1">
                                    <h4 className="text-sm sm:text-base lg:text-lg font-bold text-red-900 mb-1 sm:mb-2 lg:mb-3 flex items-center">
                                        <span className="hidden sm:inline">Please Fix the Following Errors</span>
                                        <span className="sm:hidden">Fix Errors</span>
                                    </h4>
                                    <div className="bg-white/80 rounded-md sm:rounded-lg p-2 sm:p-3 lg:p-4 backdrop-blur">
                                        <ul className="space-y-1 sm:space-y-2">
                                            {errors.mosque_name && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Mosque:</span>
                                                    <span className="text-xs sm:text-sm">{errors.mosque_name.message}</span>
                                                </li>
                                            )}
                                            {errors.location && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Location:</span>
                                                    <span className="text-xs sm:text-sm">{errors.location.message}</span>
                                                </li>
                                            )}
                                            {errors.contact_phone && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800 hidden sm:flex">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Contact Phone:</span>
                                                    <span className="text-xs sm:text-sm">{errors.contact_phone.message}</span>
                                                </li>
                                            )}
                                            {errors.contact_email && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800 hidden sm:flex">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Contact Email:</span>
                                                    <span className="text-xs sm:text-sm">{errors.contact_email.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_name && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Admin:</span>
                                                    <span className="text-xs sm:text-sm">{errors.admin_name.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_email && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Email:</span>
                                                    <span className="text-xs sm:text-sm">{errors.admin_email.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_phone && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Phone:</span>
                                                    <span className="text-xs sm:text-sm">{errors.admin_phone.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_password && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Password:</span>
                                                    <span className="text-xs sm:text-sm">{errors.admin_password.message}</span>
                                                </li>
                                            )}
                                            {errors.confirm_password && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Confirm:</span>
                                                    <span className="text-xs sm:text-sm">{errors.confirm_password.message}</span>
                                                </li>
                                            )}
                                            {errors.description && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800 hidden lg:flex">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Description:</span>
                                                    <span className="text-xs sm:text-sm">{errors.description.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_instructions && (
                                                <li className="flex items-start text-xs sm:text-sm text-red-800 hidden lg:flex">
                                                    <span className="font-semibold mr-1 sm:mr-2 text-red-600">Instructions:</span>
                                                    <span className="text-xs sm:text-sm">{errors.admin_instructions.message}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                    <div className="mt-2 sm:mt-3 lg:mt-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-md sm:rounded-lg hidden sm:block">
                                        <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                                            Note: Please correct all errors above before submitting the form.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Registration Code Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-md sm:rounded-lg lg:rounded-xl p-2 sm:p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4">
                            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 flex items-center mb-2 sm:mb-0">
                                <FaCode className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 text-blue-600" />
                                <span className="hidden sm:inline">Registration Code</span>
                                <span className="sm:hidden">Code</span>
                            </h3>
                            <button
                                type="button"
                                onClick={generateRegistrationCode}
                                className="flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md sm:rounded-lg transition-colors"
                            >
                                <FaCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm lg:text-base">Generate</span>
                            </button>
                        </div>
                        {registrationCode && (
                            <div className="bg-white rounded-md sm:rounded-lg p-2 sm:p-3 lg:p-4 border-2 border-blue-200">
                                <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 hidden sm:block">Generated Registration Code:</p>
                                <p className="font-mono text-sm sm:text-base lg:text-lg font-bold text-blue-800">{registrationCode}</p>
                            </div>
                        )}
                    </div>

                    {/* Mosque Information */}
                    <div>
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 lg:mb-4 flex items-center">
                            <FaBuilding className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 text-green-600" />
                            <span className="hidden sm:inline">Mosque Information</span>
                            <span className="sm:hidden">Mosque Info</span>
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Mosque Name *
                                </label>
                                <div className="relative">
                                    <FaBuilding className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('mosque_name')}
                                        type="text"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.mosque_name
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Enter mosque name"
                                    />
                                </div>
                                {errors.mosque_name && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.mosque_name.message}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Location *
                                </label>
                                <div className="relative">
                                    <FaMapMarkerAlt className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('location')}
                                        type="text"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.location
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="City, Province/State"
                                    />
                                </div>
                                {errors.location && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.location.message}</span>
                                    </p>
                                )}
                            </div>

                            <div className="lg:col-span-2 hidden sm:block">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    {...register('description')}
                                    rows={2}
                                    className={`w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.description
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-300'
                                        }`}
                                    placeholder="Describe the mosque's facilities, prayer times, community services..."
                                />
                                {errors.description && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.description.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden lg:block">
                                    Provide a brief description of the mosque (max 500 characters) or leave empty
                                </p>
                            </div>

                            <div className="hidden lg:block">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Mosque Contact Phone (Optional)
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('contact_phone')}
                                        type="tel"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.contact_phone
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="+923001234567"
                                    />
                                </div>
                                {errors.contact_phone && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.contact_phone.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden xl:block">
                                    Format: +923xxxxxxxxx (Pakistani mobile number) or leave empty
                                </p>
                            </div>

                            <div className="hidden lg:block">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Mosque Contact Email (Optional)
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('contact_email')}
                                        type="email"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.contact_email
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="example@gmail.com"
                                    />
                                </div>
                                {errors.contact_email && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.contact_email.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden xl:block">
                                    Allowed providers: Gmail, Outlook, Yahoo, Hotmail, iCloud, ProtonMail or leave empty
                                </p>
                            </div>

                            <div className="lg:col-span-2 hidden lg:block">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Admin Instructions (Optional)
                                </label>
                                <textarea
                                    {...register('admin_instructions')}
                                    rows={2}
                                    className={`w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.admin_instructions
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-300'
                                        }`}
                                    placeholder="Provide clear instructions for potential admins..."
                                />
                                {errors.admin_instructions && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.admin_instructions.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden xl:block">
                                    Provide instructions for future admins (max 300 characters) or leave empty
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Information */}
                    <div>
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 lg:mb-4 flex items-center">
                            <FaUser className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 text-purple-600" />
                            <span className="hidden sm:inline">Admin Information</span>
                            <span className="sm:hidden">Admin Info</span>
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Admin Name *
                                </label>
                                <div className="relative">
                                    <FaUser className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('admin_name')}
                                        type="text"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.admin_name
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Enter admin name"
                                    />
                                </div>
                                {errors.admin_name && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.admin_name.message}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Email Address *
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('admin_email')}
                                        type="email"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.admin_email
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="admin@gmail.com"
                                    />
                                </div>
                                {errors.admin_email && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.admin_email.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden lg:block">
                                    Allowed providers: Gmail, Outlook, Yahoo, Hotmail, iCloud, ProtonMail
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('admin_phone')}
                                        type="tel"
                                        className={`w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.admin_phone
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="+923001234567"
                                    />
                                </div>
                                {errors.admin_phone && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.admin_phone.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden lg:block">
                                    Pakistani mobile format: +923xxxxxxxxx (11 digits after +92)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Section */}
                    <div>
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 lg:mb-4 flex items-center">
                            <FaLock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 text-red-600" />
                            Security
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Password *
                                </label>
                                <div className="relative">
                                    <FaLock className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('admin_password')}
                                        type={showPassword ? 'text' : 'password'}
                                        className={`w-full pl-7 sm:pl-10 pr-8 sm:pr-12 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.admin_password
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <FaEyeSlash className="w-3 h-3 sm:w-4 sm:h-4" /> : <FaEye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-1 sm:mt-2 hidden sm:block">
                                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                            <span>Strength: {passwordStrength.label}</span>
                                            <span>{passwordStrength.strength}/5</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                                            <div
                                                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {errors.admin_password && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.admin_password.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden lg:block">
                                    Must include: uppercase, lowercase, number, special character (8+ chars)
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                    Confirm Password *
                                </label>
                                <div className="relative">
                                    <FaLock className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        {...register('confirm_password')}
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className={`w-full pl-7 sm:pl-10 pr-8 sm:pr-12 py-2 sm:py-2.5 lg:py-3 border rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-xs sm:text-sm lg:text-base ${errors.confirm_password
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Confirm password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <FaEyeSlash className="w-3 h-3 sm:w-4 sm:h-4" /> : <FaEye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                    </button>
                                </div>
                                {errors.confirm_password && (
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg">
                                        <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm">{errors.confirm_password.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 hidden lg:block">
                                    Must match the password entered above
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-2 sm:pt-4 lg:pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting || !registrationCode}
                            className="flex items-center px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <FaSpinner className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 animate-spin" />
                                    <span className="hidden sm:inline">Registering...</span>
                                    <span className="sm:hidden">Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <FaSave className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3" />
                                    <span className="hidden sm:inline">Register Mosque</span>
                                    <span className="sm:hidden">Register</span>
                                </>
                            )}
                        </button>
                    </div>

                    {!registrationCode && (
                        <div className="text-center">
                            <p className="text-xs sm:text-sm text-amber-600 bg-amber-50 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg inline-block">
                                <span className="hidden sm:inline">Please generate a registration code before submitting</span>
                                <span className="sm:hidden">Generate code first</span>
                            </p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default MosqueRegistration;