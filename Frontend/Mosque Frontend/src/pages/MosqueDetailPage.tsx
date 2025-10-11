import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mosqueApi } from '../lib/api';
import PrayerClock from '../components/PrayerClock';
import {
    ArrowLeft,
    MapPin,
    Clock,
    Users,
    Star,
    Navigation,
    Heart,
    Home,
    Info,
    AlertTriangle,
    RefreshCw
} from 'react-feather';

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
    const [isFavorited, setIsFavorited] = useState(false);

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

    useEffect(() => {
        // Check if this mosque is in favorites
        const favorites = JSON.parse(localStorage.getItem('favoriteMosques') || '[]');
        setIsFavorited(favorites.includes(id));
    }, [id]);

    const toggleFavorite = () => {
        const favorites = JSON.parse(localStorage.getItem('favoriteMosques') || '[]');
        let updatedFavorites;

        if (isFavorited) {
            // Remove from favorites
            updatedFavorites = favorites.filter((favId: string) => favId !== id);
        } else {
            // Add to favorites
            updatedFavorites = [...favorites, id];
        }

        localStorage.setItem('favoriteMosques', JSON.stringify(updatedFavorites));
        setIsFavorited(!isFavorited);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-2 sm:p-4">
                <div className="text-center">
                    <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl max-w-sm mx-auto">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10">
                            {/* Loading Spinner */}
                            <div className="relative mb-4 sm:mb-6 lg:mb-8">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto shadow-lg"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-sm opacity-30"></div>
                                        <Home className="relative w-4 h-4 sm:w-6 sm:h-6 text-green-600 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Loading Content */}
                            <div>
                                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-1 sm:mb-2">
                                    <span className="hidden sm:inline">Loading Mosque Details</span>
                                    <span className="sm:hidden">Loading Details</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                                    <span className="hidden sm:inline">Please wait while we fetch the information...</span>
                                    <span className="sm:hidden">Please wait...</span>
                                </p>

                                {/* Loading Dots */}
                                <div className="flex justify-center space-x-1">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-bounce shadow-sm"></div>
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-teal-500 to-green-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 p-2 sm:p-4">
                <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
                    <div className="max-w-sm sm:max-w-lg mx-auto">
                        <div className="relative bg-gradient-to-br from-white via-red-50/50 to-rose-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-rose-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                {/* Error Header */}
                                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    <div className="flex items-center">
                                        <div className="relative mr-2 sm:mr-3">
                                            <div className="absolute inset-0 bg-white/30 rounded-full blur-sm"></div>
                                            <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
                                                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                                            </div>
                                        </div>
                                        <h3 className="text-sm sm:text-base lg:text-xl font-bold text-white">
                                            <span className="hidden sm:inline">Unable to Load Mosque</span>
                                            <span className="sm:hidden">Loading Error</span>
                                        </h3>
                                    </div>
                                </div>

                                {/* Error Content */}
                                <div className="p-3 sm:p-4 lg:p-6">
                                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-3 sm:mb-4 lg:mb-6 leading-relaxed">
                                        <span className="hidden sm:inline">{error}</span>
                                        <span className="sm:hidden">Could not load mosque details. Please try again.</span>
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <Link
                                            to="/mosques"
                                            className="flex-1 group relative bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center"
                                        >
                                            <ArrowLeft className="mr-1 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                                            <span>Back</span>
                                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </Link>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="flex-1 group relative bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm lg:text-base transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105"
                                        >
                                            <RefreshCw className="mr-1 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4 group-hover:rotate-180 transition-transform duration-500" />
                                            <span className="hidden sm:inline">Try Again</span>
                                            <span className="sm:hidden">Retry</span>
                                        </button>
                                    </div>
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
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center p-2 sm:p-4">
                <div className="text-center">
                    <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-green-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl max-w-sm sm:max-w-md mx-auto">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-green-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10">
                            <div className="mb-3 sm:mb-4 lg:mb-6">
                                <div className="relative mb-3 sm:mb-4">
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full blur-md opacity-30"></div>
                                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                        <Home className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                                    </div>
                                </div>

                                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                                    <span className="hidden sm:inline">Mosque Not Found</span>
                                    <span className="sm:hidden">Not Found</span>
                                </h3>
                                <p className="text-xs sm:text-sm lg:text-base text-gray-600 px-2">
                                    <span className="hidden sm:inline">The mosque you're looking for doesn't exist or has been removed.</span>
                                    <span className="sm:hidden">This mosque no longer exists</span>
                                </p>
                            </div>

                            <Link
                                to="/mosques"
                                className="group relative inline-flex items-center bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <ArrowLeft className="mr-1 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                                <span>Back</span>
                                <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20">
            {/* Modern Islamic Navigation Header */}
            <nav className="bg-gradient-to-r from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-b border-white/40 shadow-xl sticky top-0 z-50">
                {/* 3D Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-60"></div>
                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
                    <div className="flex justify-between items-center py-2 sm:py-3 lg:py-4">
                        {/* Back Button */}
                        <Link
                            to="/mosques"
                            className="group inline-flex items-center text-gray-600 hover:text-green-600 font-medium transition-all duration-300 transform hover:scale-105"
                        >
                            <div className="relative mr-2 sm:mr-3">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                                <div className="relative bg-gray-100 group-hover:bg-green-100 rounded-lg p-1.5 sm:p-2 transition-all duration-300 shadow-sm group-hover:shadow-md">
                                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                                </div>
                            </div>
                            <span className="text-sm sm:text-base">
                                <span className="hidden sm:inline">Back</span>
                                <span className="sm:hidden">Back</span>
                            </span>
                        </Link>

                        {/* Title Section */}
                        <div className="flex items-center">
                            <div className="relative mr-2 sm:mr-3">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg sm:rounded-xl blur-sm opacity-30"></div>
                                <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg sm:rounded-xl p-1.5 sm:p-2 lg:p-3 shadow-lg">
                                    <Home className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <span className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                    <span className="hidden sm:inline">Mosque Details</span>
                                    <span className="sm:hidden">Details</span>
                                </span>
                                <p className="text-xs text-green-600 font-medium hidden lg:block">Prayer Times & Information</p>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-1 sm:px-3 lg:px-6 py-2 sm:py-4 lg:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Modern Islamic Hero Section */}
                    <div className="relative text-center mb-4 sm:mb-6 lg:mb-12">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 via-emerald-100/10 to-teal-100/20 rounded-2xl blur-3xl"></div>
                        <div className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-green-200/30 to-transparent rounded-full blur-2xl"></div>
                        <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-xl"></div>

                        <div className="relative z-10 p-2 sm:p-4 lg:p-6">
                            <div className="mb-3 sm:mb-6 lg:mb-8">
                                {/* Mosque Icon */}
                                <div className="relative mb-3 sm:mb-4 lg:mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl blur-lg opacity-30"></div>
                                    <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                                        <Home className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                                    </div>
                                </div>

                                {/* Mosque Name */}
                                <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 leading-tight px-2">
                                    {mosque.name}
                                </h1>

                                {/* Location */}
                                <div className="flex items-center justify-center text-xs sm:text-sm lg:text-base xl:text-lg text-gray-600 px-2">
                                    <div className="relative mr-2 sm:mr-3">
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-30"></div>
                                        <div className="relative bg-gray-100 rounded-full p-1.5 sm:p-2 shadow-sm">
                                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-500" />
                                        </div>
                                    </div>
                                    <span className="line-clamp-2 max-w-md sm:max-w-lg">{mosque.location}</span>
                                </div>

                                {/* Status Badge */}
                                <div className="mt-2 sm:mt-3 lg:mt-4">
                                    <div className="inline-flex items-center bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse mr-1 sm:mr-2"></div>
                                        <span className="text-xs sm:text-sm text-green-700 font-medium">
                                            <span className="hidden sm:inline">Active Community</span>
                                            <span className="sm:hidden">Active</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-8 mb-4 sm:mb-8 lg:mb-12">
                        {/* Modern Islamic Prayer Clock - Main Feature */}
                        <div className="lg:col-span-2">
                            <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
                                {/* 3D Background Effects */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                                <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
                                        <div className="flex items-center">
                                            <div className="relative mr-2 sm:mr-3">
                                                <div className="absolute inset-0 bg-white/30 rounded-lg blur-sm"></div>
                                                <div className="relative bg-white/20 backdrop-blur-sm rounded-lg p-1 sm:p-1.5">
                                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                                                </div>
                                            </div>
                                            <h2 className="text-sm sm:text-base lg:text-xl font-bold text-white">
                                                <span className="hidden sm:inline">Prayer Times</span>
                                                <span className="sm:hidden">Prayers</span>
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Prayer Clock Content */}
                                    <div className="p-3 sm:p-4 lg:p-6">
                                        <PrayerClock prayerTimes={mosque.prayer_times} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modern Islamic Sidebar */}
                        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                            {/* Quick Actions */}
                            <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl shadow-xl">
                                {/* 3D Background Effects */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>
                                <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-6 h-6 sm:w-12 sm:h-12 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-sm sm:blur-md"></div>

                                <div className="relative z-10 p-3 sm:p-4 lg:p-6">
                                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center">
                                        <div className="relative mr-1.5 sm:mr-2">
                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-sm opacity-30"></div>
                                            <Star className="relative w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-500" />
                                        </div>
                                        <span>
                                            <span className="hidden sm:inline">Quick Actions</span>
                                            <span className="sm:hidden">Actions</span>
                                        </span>
                                    </h3>

                                    <div className="space-y-2 sm:space-y-3">
                                        {/* Get Directions */}
                                        <button className="group relative w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center">
                                            <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                                            <span className="hidden sm:inline">Get Directions</span>
                                            <span className="sm:hidden">Directions</span>
                                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </button>

                                        {/* Favorite Toggle */}
                                        <button
                                            onClick={toggleFavorite}
                                            className={`group relative w-full ${isFavorited
                                                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                                                : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'
                                                } text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center`}
                                        >
                                            <Heart className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200 ${isFavorited ? 'fill-current' : ''}`} />
                                            <span className="hidden sm:inline">{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                                            <span className="sm:hidden">{isFavorited ? 'Remove' : 'Favorite'}</span>
                                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </button>

                                        {/* Become Admin */}
                                        <Link
                                            to={`/mosques/${mosque.id}/apply`}
                                            className="group relative w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center text-center"
                                        >
                                            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                                            <span className="hidden sm:inline">Become an Admin</span>
                                            <span className="sm:hidden">Admin</span>
                                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Islamic Description Section */}
                    {mosque.description && (
                        <div className="relative bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-indigo-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                <div className="flex items-center mb-3 sm:mb-4 lg:mb-6">
                                    <div className="relative mr-2 sm:mr-3 lg:mr-4">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg sm:rounded-xl blur-sm opacity-30"></div>
                                        <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl p-2 sm:p-2.5 lg:p-3 shadow-lg">
                                            <Info className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                                        </div>
                                    </div>
                                    <h2 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-gray-900">
                                        <span className="hidden sm:inline">About This Mosque</span>
                                        <span className="sm:hidden">About</span>
                                    </h2>
                                </div>
                                <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-700 leading-relaxed">{mosque.description}</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default MosqueDetailPage;