import React, { useState } from 'react';
import {
    FaBuilding,
    FaUserPlus,
    FaArrowLeft,
    FaCheck,
    FaClock
} from 'react-icons/fa';
import MosqueRegistration from './MosqueRegistration';
import SimpleMosqueRegistration from './SimpleMosqueRegistration';

type RegistrationType = 'select' | 'complete' | 'simple';

interface Props {
    onCompleteRegister: (data: Record<string, unknown>) => Promise<void>;
    onSimpleRegister: (data: Record<string, unknown>) => Promise<void>;
}

const MosqueRegistrationSelector: React.FC<Props> = ({
    onCompleteRegister,
    onSimpleRegister
}) => {
    const [registrationType, setRegistrationType] = useState<RegistrationType>('select');

    const handleBackToSelection = () => {
        setRegistrationType('select');
    };

    if (registrationType === 'complete') {
        return (
            <div>
                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={handleBackToSelection}
                        className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <FaArrowLeft className="w-4 h-4 mr-2" />
                        Back to Registration Options
                    </button>
                </div>

                <MosqueRegistration onRegister={onCompleteRegister} />
            </div>
        );
    }

    if (registrationType === 'simple') {
        return (
            <div>
                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={handleBackToSelection}
                        className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <FaArrowLeft className="w-4 h-4 mr-2" />
                        Back to Registration Options
                    </button>
                </div>

                <SimpleMosqueRegistration onRegister={onSimpleRegister} />
            </div>
        );
    }

    // Selection View
    return (
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FaBuilding className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                    Mosque Registration
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Choose your preferred registration method. You can register a mosque with an admin immediately,
                    or create a mosque entry first and assign an admin later.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Complete Registration Option */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                    <div className="text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <FaUserPlus className="w-10 h-10 text-white" />
                        </div>

                        {/* Title and Description */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            Complete Registration
                        </h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Register a mosque along with its admin details. Perfect when you have all the
                            information ready and want to set up everything at once.
                        </p>

                        {/* Features */}
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center text-green-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Mosque + Admin Registration</span>
                            </div>
                            <div className="flex items-center text-green-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Immediate Admin Access</span>
                            </div>
                            <div className="flex items-center text-green-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Single Step Process</span>
                            </div>
                            <div className="flex items-center text-green-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Auto-Generated Verification Code</span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={() => setRegistrationType('complete')}
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
                        >
                            <FaUserPlus className="w-5 h-5 mr-3" />
                            Register with Admin
                        </button>

                        {/* Best For */}
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="text-sm text-green-800 font-medium">
                                <strong>Best for:</strong> When you have complete admin details ready
                            </p>
                        </div>
                    </div>
                </div>

                {/* Simple Registration Option */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                    <div className="text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <FaBuilding className="w-10 h-10 text-white" />
                        </div>

                        {/* Title and Description */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            Simple Registration
                        </h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Register only the mosque details first. Admin can be assigned later using the
                            generated verification code. Ideal for quick mosque entry.
                        </p>

                        {/* Features */}
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center text-blue-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Mosque Details Only</span>
                            </div>
                            <div className="flex items-center text-blue-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Quick Registration</span>
                            </div>
                            <div className="flex items-center text-orange-500">
                                <FaClock className="w-4 h-4 mr-3" />
                                <span className="text-sm">Admin Assignment Later</span>
                            </div>
                            <div className="flex items-center text-blue-600">
                                <FaCheck className="w-4 h-4 mr-3" />
                                <span className="text-sm">Verification Code Generated</span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={() => setRegistrationType('simple')}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
                        >
                            <FaBuilding className="w-5 h-5 mr-3" />
                            Register Mosque Only
                        </button>

                        {/* Best For */}
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-800 font-medium">
                                <strong>Best for:</strong> Quick mosque setup without admin details
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Information */}
            <div className="mt-12 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8">
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        Need Help Choosing?
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-green-700">Choose Complete Registration if:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• You have admin contact details ready</li>
                                <li>• You want immediate mosque access</li>
                                <li>• You prefer a one-time setup process</li>
                                <li>• Admin is available to receive credentials</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-blue-700">Choose Simple Registration if:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• You only have mosque information</li>
                                <li>• Admin will be assigned later</li>
                                <li>• You want to quickly add multiple mosques</li>
                                <li>• Admin contact details are not available</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MosqueRegistrationSelector;