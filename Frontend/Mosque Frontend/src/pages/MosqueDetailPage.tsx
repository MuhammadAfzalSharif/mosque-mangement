import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mosqueApi } from '../lib/api';
import PrayerClock from '../components/PrayerClock';
import {
    FiArrowLeft,
    FiMapPin,
    FiClock,
    // FiInfo,
    FiUsers,
    FiStar,
    FiPhone,
    // FiGlobe,
    FiNavigation,
    FiHeart
} from 'react-icons/fi';
import {
    HiOutlineInformationCircle
} from 'react-icons/hi';
import { MdOutlineMosque } from 'react-icons/md';

interface MosqueDetails {
    id: string;
    name: string;
    location: string;
    description: string;
    prayer_times: {
        fajr: string | null;
        dhuhr: string | null;
        asr: string | null;
        maghrib: string | null;
        isha: string | null;
        jummah: string | null;
    };
}

const MosqueDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [mosque, setMosque] = useState<MosqueDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMosqueDetails = async () => {
            if (!id) return;

            try {
                setLoading(true);
                setError(null);

                // Fetch mosque details
                const response = await mosqueApi.getPrayerTimes(id);
                console.log('API Response:', response.data); // Debug log
                setMosque({
                    id: response.data.mosque.id,
                    name: response.data.mosque.name,
                    location: response.data.mosque.location,
                    description: '', // No description available from prayer times endpoint
                    prayer_times: response.data.prayer_times || {
                        fajr: null,
                        dhuhr: null,
                        asr: null,
                        maghrib: null,
                        isha: null,
                        jummah: null
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch mosque details');
            } finally {
                setLoading(false);
            }
        };

        fetchMosqueDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative mb-8">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <MdOutlineMosque className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Mosque Details</h3>
                        <p className="text-gray-600">Please wait while we fetch the information...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-lg mx-auto">
                        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4">
                                <div className="flex items-center">
                                    <div className="bg-white/20 rounded-full p-2 mr-3">
                                        <HiOutlineInformationCircle className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Unable to Load Mosque</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Link
                                        to="/mosques"
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                                    >
                                        <FiArrowLeft className="mr-2" />
                                        Back
                                    </Link>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!mosque) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md mx-auto">
                        <div className="mb-6">
                            <div className="bg-gradient-to-r from-gray-400 to-gray-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MdOutlineMosque className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Mosque Not Found</h3>
                            <p className="text-gray-600">The mosque you're looking for doesn't exist or has been removed.</p>
                        </div>
                        <Link
                            to="/mosques"
                            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <FiArrowLeft className="mr-2" />
                            Back
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
            {/* Navigation Header */}
            <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <Link
                            to="/mosques"
                            className="inline-flex items-center text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200 group"
                        >
                            <div className="bg-gray-100 group-hover:bg-blue-100 rounded-lg p-2 mr-3 transition-colors duration-200">
                                <FiArrowLeft className="w-4 h-4" />
                            </div>
                            <span>Back </span>
                        </Link>

                        <div className="flex items-center">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-2 mr-3">
                                <MdOutlineMosque className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Mosque Details
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="max-w-6xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-12">
                        <div className="mb-8">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                <MdOutlineMosque className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
                                {mosque.name}
                            </h1>
                            <div className="flex items-center justify-center text-lg sm:text-xl text-gray-600">
                                <div className="bg-gray-100 rounded-full p-2 mr-3">
                                    <FiMapPin className="w-5 h-5 text-gray-500" />
                                </div>
                                {mosque.location}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        {/* Prayer Clock - Main Feature */}
                        <div className="lg:col-span-2">
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                                    <div className="flex items-center">
                                        <FiClock className="w-6 h-6 text-white mr-3" />
                                        <h2 className="text-xl font-bold text-white">Prayer Times</h2>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <PrayerClock prayerTimes={mosque.prayer_times} />
                                </div>
                            </div>
                        </div>

                        {/* Mosque Info Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Actions */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <FiStar className="w-5 h-5 text-yellow-500 mr-2" />
                                    Quick Actions
                                </h3>
                                <div className="space-y-3">
                                    <button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center">
                                        <FiNavigation className="w-4 h-4 mr-2" />
                                        Get Directions
                                    </button>
                                    <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center">
                                        <FiPhone className="w-4 h-4 mr-2" />
                                        Contact Mosque
                                    </button>
                                    <button className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center">
                                        <FiHeart className="w-4 h-4 mr-2" />
                                        Add to Favorites
                                    </button>
                                </div>
                            </div>

                            {/* Mosque Stats */}
                            {/* <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <FiInfo className="w-5 h-5 text-blue-500 mr-2" />
                                    Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Status</span>
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                            Active
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Community</span>
                                        <div className="flex items-center text-gray-800">
                                            <FiUsers className="w-4 h-4 mr-1" />
                                            <span className="text-sm font-medium">Local</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Website</span>
                                        <button className="flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                                            <FiGlobe className="w-4 h-4 mr-1" />
                                            <span className="text-sm font-medium">Visit</span>
                                        </button>
                                    </div>
                                </div>
                            </div> */}
                        </div>
                    </div>

                    {/* Description Section */}
                    {mosque.description && (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 mb-8">
                            <div className="flex items-center mb-6">
                                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 mr-4">
                                    <HiOutlineInformationCircle className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">About This Mosque</h2>
                            </div>
                            <p className="text-gray-700 leading-relaxed text-lg">{mosque.description}</p>
                        </div>
                    )}

                    {/* Admin Application CTA */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-8 py-12 text-center text-white">
                            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <FiUsers className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                                Are you an admin of this mosque?
                            </h3>
                            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
                                If you're authorized to manage this mosque's prayer times and information,
                                you can apply to become an admin and help keep the community informed.
                            </p>
                            <Link
                                to={`/mosques/${mosque.id}/apply`}
                                className="inline-flex items-center bg-white hover:bg-gray-50 text-blue-600 px-8 py-4 rounded-xl text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
                            >
                                <FiUsers className="w-5 h-5 mr-2" />
                                Become an Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MosqueDetailPage;