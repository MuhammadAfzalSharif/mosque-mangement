import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { mosqueApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import MosqueCard from '../components/MosqueCard';
import InstallButton from '../components/InstallButton';
import { SiWhatsapp } from 'react-icons/si';
import {
    Search,
    MapPin,
    Heart,
    Users,
    Clock,
    Star,
    Filter,
    ChevronLeft,
    ChevronRight,
    Home,
    User,
    AlertTriangle,
    RefreshCw,
    X,
    MessageCircle,
    Flag
} from 'react-feather';

interface Mosque {
    id: string;
    name: string;
    location: string;
    description?: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
}

const MosqueFinderPage: React.FC = () => {
    const [mosques, setMosques] = useState<Mosque[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0
    });

    const fetchMosques = useCallback(async (search: string = '', page: number = 1) => {
        setLoading(true);
        setError(null);

        try {
            const response = await mosqueApi.getMosques({
                search: search || undefined,
                page,
                limit: 6
            });

            // Sort favorites to the top
            const sortedMosques = response.data.mosques.sort((a: Mosque, b: Mosque) => {
                const aIsFav = favorites.includes(a.id);
                const bIsFav = favorites.includes(b.id);
                if (aIsFav && !bIsFav) return -1;
                if (!aIsFav && bIsFav) return 1;
                return 0;
            });

            setMosques(sortedMosques);
            setPagination({
                page: response.data.pagination.page,
                limit: response.data.pagination.limit,
                total: response.data.pagination.total
            });
        } catch (err) {
            setError(getErrorMessage(err));
            setMosques([]);
        } finally {
            setLoading(false);
        }
    }, [favorites]);

    useEffect(() => {
        fetchMosques();
    }, [fetchMosques]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMosques(searchTerm, 1);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, fetchMosques]);

    useEffect(() => {
        // Load favorites from localStorage
        const storedFavorites = JSON.parse(localStorage.getItem('favoriteMosques') || '[]');
        setFavorites(storedFavorites);
    }, []);

    const toggleFavorite = (mosqueId: string) => {
        const updatedFavorites = favorites.includes(mosqueId)
            ? favorites.filter(id => id !== mosqueId)
            : [...favorites, mosqueId];

        setFavorites(updatedFavorites);
        localStorage.setItem('favoriteMosques', JSON.stringify(updatedFavorites));

        // Re-sort mosques to put favorites at the top
        setMosques(prevMosques => {
            return [...prevMosques].sort((a, b) => {
                const aIsFav = updatedFavorites.includes(a.id);
                const bIsFav = updatedFavorites.includes(b.id);
                if (aIsFav && !bIsFav) return -1;
                if (!aIsFav && bIsFav) return 1;
                return 0;
            });
        });
    };

    const handlePageChange = (newPage: number) => {
        fetchMosques(searchTerm, newPage);
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

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
                        <div className="flex items-center">
                            <img src="/images/logo.png" alt="Mosque Finder" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-contain mr-2 sm:mr-3" />
                            <div>
                                <span className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                    <span className="hidden sm:inline">Mosque Finder</span>
                                    <span className="sm:hidden">Mosque Finder</span>
                                </span>
                                <p className="text-xs text-green-600 font-medium hidden lg:block">Find Your Spiritual Home</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
                            <InstallButton />
                            <Link
                                to="/admin/login"
                                className="group relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <div className="flex items-center">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                                    <span className="hidden sm:inline">Admin Login</span>
                                    <span className="sm:hidden">Admin</span>
                                </div>
                                <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-1 sm:px-3 lg:px-6 py-2 sm:py-4 lg:py-8">
                {/* Modern Islamic Hero Header */}
                <div className="relative text-center mb-4 sm:mb-6 lg:mb-12">
                    {/* 3D Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 via-emerald-100/10 to-teal-100/20 rounded-2xl blur-3xl"></div>
                    <div className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-green-200/30 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-xl"></div>

                    <div className="relative z-10 p-2 sm:p-4 lg:p-6">
                        {/* Islamic Badge */}
                        <div className="inline-flex items-center px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 border-2 border-green-200/50 rounded-full text-xs sm:text-sm lg:text-base font-semibold text-green-800 mb-2 sm:mb-4 lg:mb-6 shadow-lg backdrop-blur-sm">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-sm opacity-20"></div>
                                <MapPin className="relative w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-green-600" />
                            </div>
                            <span className="hidden sm:inline">Discover Your Spiritual Community</span>
                            <span className="sm:hidden">Discover Your Spiritual Community</span>
                        </div>

                        {/* Main Title */}
                        <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-4 lg:mb-6 leading-tight">
                            <span className="block mb-1 sm:mb-2">
                                <span className="hidden sm:inline">Find Your Local </span>
                                <span className="sm:hidden">Find </span>
                            </span>
                            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent font-extrabold">
                                <span className="hidden sm:inline">Mosque</span>
                                <span className="sm:hidden">Mosque</span>
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xs sm:text-base lg:text-lg xl:text-xl text-gray-600 leading-relaxed max-w-2xl lg:max-w-3xl mx-auto mb-3 sm:mb-6 lg:mb-8 px-2">
                            <span className="hidden sm:inline">Connect with mosques in your area, check accurate prayer times, and join your Islamic community.</span>
                            <span className="sm:hidden">Connect with local mosques and prayer times</span>
                        </p>

                        {/* Stats or Features */}
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm text-green-700">
                            <div className="flex items-center bg-green-50 px-2 sm:px-3 py-1 rounded-full border border-green-200">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-green-600" />
                                <span className="hidden sm:inline">Prayer Times</span>
                                <span className="sm:hidden">Times</span>
                            </div>
                            <div className="flex items-center bg-emerald-50 px-2 sm:px-3 py-1 rounded-full border border-emerald-200">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-emerald-600" />
                                <span className="hidden sm:inline">Community</span>
                                <span className="sm:hidden">Community</span>
                            </div>
                            <div className="flex items-center bg-teal-50 px-2 sm:px-3 py-1 rounded-full border border-teal-200">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-teal-600" />
                                <span className="hidden sm:inline">Locations</span>
                                <span className="sm:hidden">Near You</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Islamic Search Bar */}
                <div className="max-w-4xl mx-auto mb-3 sm:mb-6 lg:mb-12">
                    <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-2 sm:p-4 lg:p-6 shadow-2xl">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-lg sm:rounded-xl blur-sm group-focus-within:blur-md transition-all duration-300"></div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 lg:pl-4 flex items-center pointer-events-none">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-sm opacity-30"></div>
                                            <Search className="relative h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600 group-focus-within:text-emerald-600 group-focus-within:scale-110 transition-all duration-300" />
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search mosques by name, location..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full pl-8 sm:pl-10 lg:pl-12 pr-8 sm:pr-10 lg:pr-12 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg bg-white/90 backdrop-blur-sm border-2 border-gray-200/50 rounded-lg sm:rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white transition-all duration-300 shadow-lg font-medium"
                                    />
                                    {searchTerm && (
                                        <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3 lg:pr-4 flex items-center">
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="group/btn relative bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white p-1 sm:p-1.5 rounded-full transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-lg"
                                            >
                                                <X className="h-3 w-3 sm:h-4 sm:w-4 group-hover/btn:rotate-90 transition-transform duration-300" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Search Tips */}
                            <div className="mt-2 sm:mt-3 flex flex-wrap justify-center gap-1 sm:gap-2 text-xs text-gray-600">
                                <span className="hidden sm:inline-flex items-center bg-gray-100 px-2 py-1 rounded-full">
                                    <Filter className="w-3 h-3 mr-1 text-gray-500" />
                                    Try: 'Farida Mosque or Hira Mosque'
                                </span>
                                <span className="sm:hidden flex items-center bg-gray-100 px-2 py-1 rounded-full">
                                    <Filter className="w-3 h-3 mr-1 text-gray-500" />
                                    Try: mosque name or area
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Islamic Loading State */}
                {loading && (
                    <div className="relative text-center py-6 sm:py-12 lg:py-16">
                        <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl max-w-md mx-auto">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                {/* Loading Spinner */}
                                <div className="relative mb-3 sm:mb-4 lg:mb-6">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-4 border-green-200 border-t-green-600 shadow-lg"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-sm opacity-30"></div>
                                            <Home className="relative w-4 h-4 sm:w-6 sm:h-6 text-green-600 animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Loading Text */}
                                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 mb-1 sm:mb-2">
                                    <span className="hidden sm:inline">Discovering mosques in your area...</span>
                                    <span className="sm:hidden">Finding mosques...</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-green-600 mb-2 sm:mb-4">Please wait while we search</p>

                                {/* Loading Dots */}
                                <div className="flex justify-center space-x-1">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-bounce shadow-sm"></div>
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-teal-500 to-green-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Islamic Error State */}
                {error && (
                    <div className="relative bg-gradient-to-br from-white via-red-50/50 to-rose-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8 shadow-2xl">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-rose-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center">
                            <div className="flex-shrink-0 mb-3 sm:mb-0 sm:mr-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl blur-sm opacity-30"></div>
                                    <div className="relative bg-gradient-to-r from-red-500 to-rose-600 rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-lg">
                                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-red-800 mb-1 sm:mb-2">
                                    <span className="hidden sm:inline">Unable to Load Mosques</span>
                                    <span className="sm:hidden">Loading Error</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-red-700 mb-2 sm:mb-3 lg:mb-4">
                                    <span className="hidden sm:inline">{error}</span>
                                    <span className="sm:hidden">Please try again</span>
                                </p>
                                <button
                                    onClick={() => fetchMosques(searchTerm, pagination.page)}
                                    className="group relative bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center">
                                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:rotate-180 transition-transform duration-500" />
                                        <span>Try Again</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Islamic Results Section */}
                {!loading && !error && (
                    <>
                        {mosques.length > 0 ? (
                            <>
                                {/* Modern Results Header */}
                                <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-6 lg:mb-8 shadow-xl">
                                    {/* 3D Background Effects */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                                    <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                                    <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div className="flex-1 mb-2 sm:mb-0">
                                            <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center">
                                                <div className="relative mr-2 sm:mr-3">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-sm opacity-30"></div>
                                                    <MapPin className="relative w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                                                </div>
                                                <span className="bg-gradient-to-r from-gray-800 via-green-700 to-emerald-700 bg-clip-text text-transparent">
                                                    {searchTerm ? (
                                                        <>
                                                            <span className="hidden sm:inline">Search Results for </span>
                                                            <span className="sm:hidden">Results: </span>
                                                            <span className="font-extrabold">"{searchTerm.length > 10 ? `${searchTerm.substring(0, 10)}...` : searchTerm}"</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="hidden sm:inline">All Mosques</span>
                                                            <span className="sm:hidden">All Mosques</span>
                                                        </>
                                                    )}
                                                </span>
                                            </h2>
                                            <p className="text-xs sm:text-sm lg:text-base text-gray-600 flex items-center">
                                                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-emerald-600" />
                                                <span className="hidden sm:inline">
                                                    Found {pagination.total} mosque{pagination.total !== 1 ? 's' : ''}
                                                    {searchTerm && ' matching your search'}
                                                </span>
                                                <span className="sm:hidden">
                                                    {pagination.total} found
                                                </span>
                                            </p>
                                        </div>

                                        {/* Page Info Badge */}
                                        <div className="mt-2 sm:mt-0 flex items-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg blur-sm opacity-30"></div>
                                                <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold text-xs sm:text-sm shadow-lg">
                                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                                        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        <span className="hidden sm:inline">Page {pagination.page} of {totalPages}</span>
                                                        <span className="sm:hidden">{pagination.page}/{totalPages}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mosques Grid */}
                                <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
                                    {mosques.map((mosque) => (
                                        <MosqueCard
                                            key={mosque.id}
                                            id={mosque.id}
                                            name={mosque.name}
                                            location={mosque.location}
                                            description={mosque.description}
                                            isFavorited={favorites.includes(mosque.id)}
                                            onToggleFavorite={toggleFavorite}
                                        />
                                    ))}
                                </div>

                                {/* Modern Islamic Pagination */}
                                {totalPages > 1 && (
                                    <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-2xl">
                                        {/* 3D Background Effects */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                                            {/* Results Info */}
                                            <div className="text-xs sm:text-sm text-gray-600 flex items-center order-2 sm:order-1">
                                                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-green-600" />
                                                <span className="hidden sm:inline">
                                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                                                </span>
                                                <span className="sm:hidden">
                                                    {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                                </span>
                                            </div>

                                            {/* Pagination Controls */}
                                            <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
                                                {/* Previous Button */}
                                                <button
                                                    onClick={() => handlePageChange(pagination.page - 1)}
                                                    disabled={pagination.page === 1}
                                                    className="group relative flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white/80 backdrop-blur-sm border-2 border-gray-300 rounded-lg sm:rounded-xl hover:bg-green-50 hover:border-green-400 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:hover:scale-100"
                                                >
                                                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-0 sm:mr-1 group-hover:-translate-x-0.5 transition-transform duration-200" />
                                                    <span className="hidden sm:inline">Prev</span>
                                                </button>

                                                {/* Page Numbers */}
                                                <div className="hidden sm:flex items-center space-x-1">
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        const page = i + Math.max(1, pagination.page - 2);
                                                        if (page > totalPages) return null;

                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => handlePageChange(page)}
                                                                className={`group relative px-3 py-2 text-sm font-bold rounded-lg transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-lg ${pagination.page === page
                                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                                                    : 'text-gray-700 bg-white/80 border-2 border-gray-300 hover:bg-green-50 hover:border-green-400 hover:text-green-700'
                                                                    }`}
                                                            >
                                                                <span className="relative z-10">{page}</span>
                                                                {pagination.page === page && (
                                                                    <div className="absolute inset-0 bg-white/20 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Mobile Page Indicator */}
                                                <div className="sm:hidden flex items-center px-2 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-lg">
                                                    <span className="text-xs font-semibold text-green-700">{pagination.page}/{totalPages}</span>
                                                </div>

                                                {/* Next Button */}
                                                <button
                                                    onClick={() => handlePageChange(pagination.page + 1)}
                                                    disabled={pagination.page === totalPages}
                                                    className="group relative flex items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white/80 backdrop-blur-sm border-2 border-gray-300 rounded-lg sm:rounded-xl hover:bg-green-50 hover:border-green-400 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:hover:scale-100"
                                                >
                                                    <span className="hidden sm:inline">Next</span>
                                                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0 sm:ml-1 group-hover:translate-x-0.5 transition-transform duration-200" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-4 sm:py-8 lg:py-16">
                                <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-green-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-4 sm:p-8 lg:p-12 shadow-2xl max-w-sm sm:max-w-lg mx-auto">
                                    {/* 3D Background Effects */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                                    <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                                    <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-green-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                                    <div className="relative z-10">
                                        <div className="relative mb-3 sm:mb-4 lg:mb-6">
                                            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full blur-md opacity-30"></div>
                                            <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center mx-auto shadow-lg">
                                                <Search className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-500" />
                                            </div>
                                        </div>

                                        <h3 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 mb-1 sm:mb-2 lg:mb-3">
                                            {searchTerm ? (
                                                <>
                                                    <span className="hidden sm:inline">No Mosques Found</span>
                                                    <span className="sm:hidden">No Results</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="hidden sm:inline">No Mosques Available</span>
                                                    <span className="sm:hidden">None Available</span>
                                                </>
                                            )}
                                        </h3>

                                        <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-3 sm:mb-4 lg:mb-6 px-2">
                                            {searchTerm ? (
                                                <>
                                                    <span className="hidden sm:inline">Try adjusting your search terms or browse all available mosques.</span>
                                                    <span className="sm:hidden">Try different search terms</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="hidden sm:inline">No mosques are currently registered in our database.</span>
                                                    <span className="sm:hidden">No mosques registered yet</span>
                                                </>
                                            )}
                                        </p>

                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="group relative bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                            >
                                                <div className="flex items-center">
                                                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:rotate-90 transition-transform duration-300" />
                                                    <span className="hidden sm:inline">Clear Search</span>
                                                    <span className="sm:hidden">Clear</span>
                                                </div>
                                                <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Modern Islamic Footer */}
                <div className="text-center mt-4 sm:mt-8 lg:mt-16">
                    <div className="relative bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="mb-3 sm:mb-4 lg:mb-6">
                                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center justify-center">
                                    <div className="relative mr-2 sm:mr-3">
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-sm opacity-30"></div>
                                        <Heart className="relative w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                                    </div>
                                    <span className="bg-gradient-to-r from-gray-800 via-green-700 to-emerald-700 bg-clip-text text-transparent">
                                        <span className="hidden sm:inline">Help Improve Our App</span>
                                        <span className="sm:hidden">Improve App</span>
                                    </span>
                                </h3>
                                <p className="text-xs sm:text-sm lg:text-base text-gray-600 max-w-xl sm:max-w-2xl mx-auto px-2">
                                    <span className="hidden sm:inline">Report issues or share your ideas to make the mosque finder better for everyone.</span>
                                    <span className="sm:hidden">Help us make this app better for all Muslims</span>
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 lg:gap-4">
                                {/* Report Issues */}
                                <a
                                    href="YOUR_GOOGLE_FORM_LINK_HERE"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative w-full sm:w-auto bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center justify-center">
                                        <Flag className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                                        <span className="hidden sm:inline">Report Issues</span>
                                        <span className="sm:hidden">Report</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </a>

                                {/* WhatsApp Share Ideas */}
                                <a
                                    href="https://wa.me/923442390406"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center justify-center">
                                        <SiWhatsapp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                                        <span className="hidden sm:inline">Share Ideas</span>
                                        <span className="sm:hidden">Ideas</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </a>

                                {/* Website Feedback */}
                                <a
                                    href="YOUR_FEEDBACK_FORM_LINK_HERE"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center justify-center">
                                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                                        <span className="hidden sm:inline">Website Feedback</span>
                                        <span className="sm:hidden">Feedback</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </a>
                            </div>

                            {/* Islamic Footer Note */}
                            <div className="mt-3 sm:mt-4 lg:mt-6 pt-2 sm:pt-3 lg:pt-4 border-t border-green-200/50">
                                <p className="text-xs text-green-600 flex items-center justify-center">
                                    <Star className="w-3 h-3 mr-1 text-green-500" />
                                    <span className="hidden sm:inline">Serving the Muslim Community with Technology</span>
                                    <span className="sm:hidden">Serving Muslims</span>
                                    <Star className="w-3 h-3 ml-1 text-green-500" />
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MosqueFinderPage;