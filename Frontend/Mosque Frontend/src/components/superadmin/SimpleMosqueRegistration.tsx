import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    FaBuilding,
    FaMapMarkerAlt,
    FaPhone,
    FaEnvelope,
    FaSave,
    FaTimes,
    FaSpinner,
    FaInfoCircle
} from 'react-icons/fa';

// Email domain validation - only allow specific providers
const allowedEmailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@(${allowedEmailDomains.join('|').replace(/\./g, '\\.')})$`, 'i');

// Validation schema for simple mosque registration (mosque only)
const simpleMosqueSchema = z.object({
    name: z.string()
        .min(3, 'Mosque name must be at least 3 characters')
        .max(100, 'Mosque name must not exceed 100 characters')
        .refine(val => val.trim().length >= 3, 'Mosque name must be at least 3 characters after removing spaces')
        .refine(val => /^[a-zA-Z0-9\s\-']+$/.test(val), 'Mosque name can only contain letters, numbers, spaces, hyphens and apostrophes'),
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
        .optional()
});

type SimpleMosqueForm = z.infer<typeof simpleMosqueSchema>;

interface Props {
    onRegister: (data: SimpleMosqueForm) => Promise<{ mosque?: { verification_code?: string }; verification_code?: string } | void>;
}

const SimpleMosqueRegistration: React.FC<Props> = ({ onRegister }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form for simple mosque registration
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<SimpleMosqueForm>({
        resolver: zodResolver(simpleMosqueSchema)
    });

    const onSubmit = async (data: SimpleMosqueForm) => {
        try {
            setIsSubmitting(true);

            // Parent component will handle toast notifications
            await onRegister(data);

        } catch (error: unknown) {
            console.error('Registration failed:', error);
            // Parent component will handle error toast
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FaBuilding className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Simple Mosque Registration
                    </h1>
                    <p className="text-gray-600">
                        Register a new mosque with basic information. Admin can be assigned later.
                    </p>
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 mb-8 shadow-md">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <FaInfoCircle className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="ml-4">
                            <h4 className="font-bold text-blue-900 mb-2 text-lg">Registration Information</h4>
                            <p className="text-sm text-blue-800 leading-relaxed">
                                This form creates a mosque entry <strong>without an admin</strong>. A verification code will be generated
                                that can be shared with mosque management for later admin registration.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Display - Enhanced */}
                {Object.keys(errors).length > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl p-6 mb-8 shadow-lg animate-shake">
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
                                        {errors.name && (
                                            <li className="flex items-start text-sm text-red-800">
                                                <span className="font-semibold mr-2 text-red-600">Mosque Name:</span>
                                                <span>{errors.name.message}</span>
                                            </li>
                                        )}
                                        {errors.location && (
                                            <li className="flex items-start text-sm text-red-800">
                                                <span className="font-semibold mr-2 text-red-600">Location:</span>
                                                <span>{errors.location.message}</span>
                                            </li>
                                        )}
                                        {errors.description && (
                                            <li className="flex items-start text-sm text-red-800">
                                                <span className="font-semibold mr-2 text-red-600">Description:</span>
                                                <span>{errors.description.message}</span>
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                            Mosque Information
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Mosque Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mosque Name *
                                </label>
                                <div className="relative">
                                    <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        {...register('name')}
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.name
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-200'
                                            }`}
                                        placeholder="Enter mosque name"
                                    />
                                </div>
                                {errors.name && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.name.message}</span>
                                    </p>
                                )}
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location *
                                </label>
                                <div className="relative">
                                    <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        {...register('location')}
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.location
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-200'
                                            }`}
                                        placeholder="Enter mosque location"
                                    />
                                </div>
                                {errors.location && (
                                    <p className="mt-2 text-sm text-red-700 flex items-center bg-red-50 px-3 py-2 rounded-lg">
                                        <FaTimes className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>{errors.location.message}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                {...register('description')}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                rows={4}
                                placeholder="Enter mosque description"
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                            Contact Information (Optional)
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Contact Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contact Phone
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        {...register('contact_phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.contact_phone
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-200'
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
                            </div>

                            {/* Contact Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contact Email
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        {...register('contact_email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${errors.contact_email
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-200'
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
                            </div>
                        </div>
                    </div>

                    {/* Admin Instructions */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                            Admin Instructions (Optional)
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Instructions for Future Admin
                            </label>
                            <textarea
                                {...register('admin_instructions')}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                rows={4}
                                placeholder="Enter instructions for mosque admin (e.g., how to get verification code)"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                These instructions will be shown to potential admins. If left empty, default instructions will be generated.
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-8">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg flex items-center"
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
                </form>
            </div>
        </div>
    );
};

export default SimpleMosqueRegistration;