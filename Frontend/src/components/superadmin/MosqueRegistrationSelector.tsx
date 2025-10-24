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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 sm:p-4 lg:p-6 xl:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-3 sm:mb-4 lg:mb-6">
                        <button
                            onClick={handleBackToSelection}
                            className="group flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-white/70 backdrop-blur-lg border border-white/20 text-blue-600 hover:text-blue-800 hover:bg-white/90 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            <FaArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
                            <span className="font-semibold text-xs sm:text-sm lg:text-base">
                                <span className="hidden sm:inline">Back to Registration Options</span>
                                <span className="sm:hidden">Back</span>
                            </span>
                        </button>
                    </div>

                    <MosqueRegistration onRegister={onCompleteRegister} />
                </div>
            </div>
        );
    }

    if (registrationType === 'simple') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 sm:p-4 lg:p-6 xl:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-3 sm:mb-4 lg:mb-6">
                        <button
                            onClick={handleBackToSelection}
                            className="group flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-white/70 backdrop-blur-lg border border-white/20 text-blue-600 hover:text-blue-800 hover:bg-white/90 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            <FaArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
                            <span className="font-semibold text-xs sm:text-sm lg:text-base">
                                <span className="hidden sm:inline">Back to Registration Options</span>
                                <span className="sm:hidden">Back</span>
                            </span>
                        </button>
                    </div>

                    <SimpleMosqueRegistration onRegister={onSimpleRegister} />
                </div>
            </div>
        );
    }

    // Selection View
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-4 sm:mb-8 lg:mb-12 xl:mb-16">
                    <div className="relative mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 rounded-lg sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                            <FaBuilding className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-white" />
                        </div>
                        <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 rounded-lg sm:rounded-2xl lg:rounded-3xl mx-auto blur-xl opacity-30 animate-pulse"></div>
                    </div>
                    <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-800 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4 xl:mb-6 tracking-tight">
                        Mosque Registration
                    </h1>
                    <p className="text-slate-600 text-xs sm:text-sm lg:text-base xl:text-xl max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
                        Choose your preferred registration method.
                        <span className="hidden sm:inline"> You can register a mosque with an admin immediately, or create a mosque entry first and assign an admin later.</span>
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
                    {/* Complete Registration Option */}
                    <div className="group relative bg-white/70 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 xl:p-8 hover:bg-white/80 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent rounded-lg sm:rounded-2xl lg:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 text-center">
                            {/* Icon */}
                            <div className="relative mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
                                    <FaUserPlus className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-white group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg sm:rounded-xl lg:rounded-2xl mx-auto blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                            </div>

                            {/* Title and Description */}
                            <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4 xl:mb-6">
                                Complete Registration
                            </h2>
                            <p className="text-slate-600 mb-3 sm:mb-4 lg:mb-6 xl:mb-8 leading-relaxed text-xs sm:text-sm lg:text-base xl:text-lg">
                                Register a mosque along with its admin details.
                                <span className="hidden lg:inline"> Perfect when you have all the information ready and want to set up everything at once.</span>
                            </p>

                            {/* Features */}
                            <div className="space-y-2 sm:space-y-3 lg:space-y-4 mb-4 sm:mb-6 lg:mb-8 xl:mb-10">
                                <div className="flex items-center justify-start text-green-600 bg-green-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Mosque + Admin Registration</span>
                                </div>
                                <div className="flex items-center justify-start text-green-600 bg-green-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Immediate Admin Access</span>
                                </div>
                                <div className="flex items-center justify-start text-green-600 bg-green-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm hidden sm:flex">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Single Step Process</span>
                                </div>
                                <div className="flex items-center justify-start text-green-600 bg-green-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm hidden lg:flex">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Auto-Generated Verification Code</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => setRegistrationType('complete')}
                                className="group w-full py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 text-white font-bold text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <FaUserPlus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 lg:mr-4 group-hover:scale-110 transition-transform duration-300" />
                                <span>Register with Admin</span>
                            </button>

                            {/* Best For */}
                            <div className="mt-3 sm:mt-4 lg:mt-6 xl:mt-8 p-2 sm:p-3 lg:p-4 xl:p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-sm">
                                <p className="text-xs sm:text-sm lg:text-base text-green-800 font-semibold">
                                    <strong className="text-green-900">Best for:</strong> <span className="hidden sm:inline">When you have </span>Complete admin details<span className="hidden sm:inline"> ready</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Simple Registration Option */}
                    <div className="group relative bg-white/70 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 xl:p-8 hover:bg-white/80 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent rounded-lg sm:rounded-2xl lg:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 text-center">
                            {/* Icon */}
                            <div className="relative mb-3 sm:mb-4 lg:mb-6 xl:mb-8">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
                                    <FaBuilding className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-white group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg sm:rounded-xl lg:rounded-2xl mx-auto blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                            </div>

                            {/* Title and Description */}
                            <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4 xl:mb-6">
                                Simple Registration
                            </h2>
                            <p className="text-slate-600 mb-3 sm:mb-4 lg:mb-6 xl:mb-8 leading-relaxed text-xs sm:text-sm lg:text-base xl:text-lg">
                                Register only the mosque details first.
                                <span className="hidden lg:inline"> Admin can be assigned later using the generated verification code. Ideal for quick mosque entry.</span>
                            </p>

                            {/* Features */}
                            <div className="space-y-2 sm:space-y-3 lg:space-y-4 mb-4 sm:mb-6 lg:mb-8 xl:mb-10">
                                <div className="flex items-center justify-start text-blue-600 bg-blue-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Mosque Details Only</span>
                                </div>
                                <div className="flex items-center justify-start text-blue-600 bg-blue-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Quick Registration</span>
                                </div>
                                <div className="hidden sm:flex items-center justify-start text-orange-600 bg-orange-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm">
                                    <FaClock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Admin Assignment Later</span>
                                </div>
                                <div className="hidden lg:flex items-center justify-start text-blue-600 bg-blue-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 backdrop-blur-sm">
                                    <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm lg:text-base font-medium">Verification Code Generated</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => setRegistrationType('simple')}
                                className="group w-full py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white font-bold text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <FaBuilding className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 lg:mr-4 group-hover:scale-110 transition-transform duration-300" />
                                <span>Register Mosque Only</span>
                            </button>

                            {/* Best For */}
                            <div className="mt-3 sm:mt-4 lg:mt-6 xl:mt-8 p-2 sm:p-3 lg:p-4 xl:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-sm">
                                <p className="text-xs sm:text-sm lg:text-base text-blue-800 font-semibold">
                                    <strong className="text-blue-900">Best for:</strong> <span className="hidden sm:inline">Quick mosque setup without </span>No admin details
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Information */}
                <div className="mt-4 sm:mt-8 lg:mt-12 xl:mt-16 bg-white/60 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 xl:p-10 hidden lg:block">
                    <div className="text-center">
                        <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4 sm:mb-6 lg:mb-8">
                            Need Help Choosing?
                        </h3>
                        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 text-left">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-green-200/50">
                                <h4 className="font-bold text-sm sm:text-base lg:text-lg xl:text-xl text-green-800 mb-2 sm:mb-3 lg:mb-4 flex items-center">
                                    <FaUserPlus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 text-green-600" />
                                    Choose Complete Registration if:
                                </h4>
                                <ul className="text-xs sm:text-sm lg:text-base text-slate-700 space-y-2 sm:space-y-3">
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-green-600 flex-shrink-0" />
                                        You have admin contact details ready
                                    </li>
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-green-600 flex-shrink-0" />
                                        You want immediate mosque access
                                    </li>
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-green-600 flex-shrink-0" />
                                        You prefer a one-time setup process
                                    </li>
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-green-600 flex-shrink-0" />
                                        Admin is available to receive credentials
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-blue-200/50">
                                <h4 className="font-bold text-sm sm:text-base lg:text-lg xl:text-xl text-blue-800 mb-2 sm:mb-3 lg:mb-4 flex items-center">
                                    <FaBuilding className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 text-blue-600" />
                                    Choose Simple Registration if:
                                </h4>
                                <ul className="text-xs sm:text-sm lg:text-base text-slate-700 space-y-2 sm:space-y-3">
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-blue-600 flex-shrink-0" />
                                        You only have mosque information
                                    </li>
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-blue-600 flex-shrink-0" />
                                        Admin will be assigned later
                                    </li>
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-blue-600 flex-shrink-0" />
                                        You want to quickly add multiple mosques
                                    </li>
                                    <li className="flex items-start">
                                        <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 mt-0.5 sm:mt-1 text-blue-600 flex-shrink-0" />
                                        Admin contact details are not available
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MosqueRegistrationSelector;