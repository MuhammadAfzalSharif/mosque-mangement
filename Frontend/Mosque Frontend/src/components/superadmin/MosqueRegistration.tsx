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
    FaSpinner
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
            admin_phone: '+923'
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
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                    Mosque Registration
                </h1>
                <p className="text-gray-600">
                    Choose your registration method
                </p>
            </div>

            {/* Simple Single Form for Testing */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Error Display - Enhanced */}
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl p-6 shadow-lg animate-shake">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                                        <FaTimes className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <h4 className="text-lg font-bold text-red-900 mb-3 flex items-center">
                                        Please Fix the Following Errors
                                    </h4>
                                    <div className="bg-white/80 rounded-lg p-4 backdrop-blur">
                                        <ul className="space-y-2">
                                            {errors.mosque_name && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Mosque Name:</span>
                                                    <span>{errors.mosque_name.message}</span>
                                                </li>
                                            )}
                                            {errors.location && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Location:</span>
                                                    <span>{errors.location.message}</span>
                                                </li>
                                            )}
                                            {errors.contact_phone && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Contact Phone:</span>
                                                    <span>{errors.contact_phone.message}</span>
                                                </li>
                                            )}
                                            {errors.contact_email && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Contact Email:</span>
                                                    <span>{errors.contact_email.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_name && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Admin Name:</span>
                                                    <span>{errors.admin_name.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_email && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Admin Email:</span>
                                                    <span>{errors.admin_email.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_phone && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Admin Phone:</span>
                                                    <span>{errors.admin_phone.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_password && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Password:</span>
                                                    <span>{errors.admin_password.message}</span>
                                                </li>
                                            )}
                                            {errors.confirm_password && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Confirm Password:</span>
                                                    <span>{errors.confirm_password.message}</span>
                                                </li>
                                            )}
                                            {errors.description && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Description:</span>
                                                    <span>{errors.description.message}</span>
                                                </li>
                                            )}
                                            {errors.admin_instructions && (
                                                <li className="flex items-start text-sm text-red-800">
                                                    <span className="font-semibold mr-2 text-red-600">Admin Instructions:</span>
                                                    <span>{errors.admin_instructions.message}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800 font-medium">
                                            Note: Please correct all errors above before submitting the form.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Registration Code Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <FaCode className="w-5 h-5 mr-2 text-blue-600" />
                                Registration Code
                            </h3>
                            <button
                                type="button"
                                onClick={generateRegistrationCode}
                                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                <FaCode className="w-4 h-4 mr-2" />
                                Generate Code
                            </button>
                        </div>
                        {registrationCode && (
                            <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                                <p className="text-sm text-gray-600 mb-2">Generated Registration Code:</p>
                                <p className="font-mono text-lg font-bold text-blue-800">{registrationCode}</p>
                            </div>
                        )}
                    </div>

                    {/* Mosque Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <FaBuilding className="w-5 h-5 mr-2 text-green-600" />
                            Mosque Information
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mosque Name *
                                </label>
                                <div className="relative">
                                    <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('mosque_name')}
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.mosque_name
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Enter mosque name"
                                    />
                                </div>
                                {errors.mosque_name && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.mosque_name.message}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location *
                                </label>
                                <div className="relative">
                                    <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('location')}
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.location
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="City, Province/State"
                                    />
                                </div>
                                {errors.location && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.location.message}</span>
                                    </p>
                                )}
                            </div>

                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    {...register('description')}
                                    rows={3}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.description
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-300'
                                        }`}
                                    placeholder="Brief description of the mosque and its facilities"
                                />
                                {errors.description && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.description.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Provide a brief description of the mosque (max 500 characters) or leave empty
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mosque Contact Phone (Optional)
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('contact_phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.contact_phone
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="+923001234567"
                                    />
                                </div>
                                {errors.contact_phone && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.contact_phone.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Format: +923xxxxxxxxx (Pakistani mobile number) or leave empty
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mosque Contact Email (Optional)
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('contact_email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.contact_email
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="example@gmail.com"
                                    />
                                </div>
                                {errors.contact_email && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.contact_email.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Allowed providers: Gmail, Outlook, Yahoo, Hotmail, iCloud, ProtonMail or leave empty
                                </p>
                            </div>

                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin Instructions (Optional)
                                </label>
                                <textarea
                                    {...register('admin_instructions')}
                                    rows={3}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.admin_instructions
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-300'
                                        }`}
                                    placeholder="Instructions for potential admins on how to get verification code from mosque management"
                                />
                                {errors.admin_instructions && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.admin_instructions.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Provide instructions for future admins (max 300 characters) or leave empty
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <FaUser className="w-5 h-5 mr-2 text-purple-600" />
                            Admin Information
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin Name *
                                </label>
                                <div className="relative">
                                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('admin_name')}
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.admin_name
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Enter admin name"
                                    />
                                </div>
                                {errors.admin_name && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.admin_name.message}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address *
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('admin_email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.admin_email
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="admin@gmail.com"
                                    />
                                </div>
                                {errors.admin_email && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.admin_email.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Allowed providers: Gmail, Outlook, Yahoo, Hotmail, iCloud, ProtonMail
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('admin_phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.admin_phone
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="+923001234567"
                                    />
                                </div>
                                {errors.admin_phone && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.admin_phone.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Pakistani mobile format: +923xxxxxxxxx (11 digits after +92)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <FaLock className="w-5 h-5 mr-2 text-red-600" />
                            Security
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password *
                                </label>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('admin_password')}
                                        type="password"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.admin_password
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Enter password"
                                    />
                                </div>
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                            <span>Strength: {passwordStrength.label}</span>
                                            <span>{passwordStrength.strength}/5</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {errors.admin_password && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.admin_password.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Must include: uppercase, lowercase, number, special character (8+ chars)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password *
                                </label>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        {...register('confirm_password')}
                                        type="password"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.confirm_password
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="Confirm password"
                                    />
                                </div>
                                {errors.confirm_password && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.confirm_password.message}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Must match the password entered above
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting || !registrationCode}
                            className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <FaSpinner className="w-5 h-5 mr-3 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <FaSave className="w-5 h-5 mr-3" />
                                    Register Mosque
                                </>
                            )}
                        </button>
                    </div>

                    {!registrationCode && (
                        <div className="text-center">
                            <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg inline-block">
                                Please generate a registration code before submitting
                            </p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default MosqueRegistration;