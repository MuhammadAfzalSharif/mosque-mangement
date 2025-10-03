import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mosqueApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import MosqueCard from '../components/MosqueCard';

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
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0
    });

    const fetchMosques = async (search: string = '', page: number = 1) => {
        setLoading(true);
        setError(null);

        try {
            const response = await mosqueApi.getMosques({
                search: search || undefined,
                page,
                limit: 10
            });

            setMosques(response.data.mosques);
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
    };

    useEffect(() => {
        fetchMosques();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMosques(searchTerm, 1);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handlePageChange = (newPage: number) => {
        fetchMosques(searchTerm, newPage);
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
            {/* Navigation Header */}
            <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4 sm:py-6">
                        <div className="flex items-center">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-2 mr-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Mosque Finder
                            </span>
                        </div>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <Link
                                to="/"
                                className="hidden sm:flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Home
                            </Link>

                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Hero Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-medium text-blue-800 mb-6">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Discover Your Spiritual Community
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                        <span className="block">Find Your Local</span>
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mosque</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                        Connect with mosques in your area, check accurate prayer times, and join your Islamic community.
                    </p>
                </div>

                {/* Enhanced Search Bar */}
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search mosques by name, location, or area..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 text-lg bg-white/90 border border-gray-200/50 rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-lg"
                            />
                            {searchTerm && (
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-16">
                        <div className="relative">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                        <p className="mt-6 text-lg text-gray-600 font-medium">Discovering mosques in your area...</p>
                        <div className="mt-4 flex justify-center space-x-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200/50 rounded-2xl p-6 sm:p-8 mb-8 shadow-lg">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <div className="bg-red-500 rounded-xl p-2">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Mosques</h3>
                                <p className="text-red-700 mb-4">{error}</p>
                                <button
                                    onClick={() => fetchMosques(searchTerm, pagination.page)}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {!loading && !error && (
                    <>
                        {mosques.length > 0 ? (
                            <>
                                {/* Results Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-white/60 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                            {searchTerm ? `Search Results for "${searchTerm}"` : 'All Mosques'}
                                        </h2>
                                        <p className="text-gray-600">
                                            Found {pagination.total} mosque{pagination.total !== 1 ? 's' : ''}
                                            {searchTerm && ' matching your search'}
                                        </p>
                                    </div>
                                    <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        <span>Page {pagination.page} of {totalPages}</span>
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
                                        />
                                    ))}
                                </div>

                                {/* Enhanced Pagination */}
                                {totalPages > 1 && (
                                    <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg">
                                        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                            <div className="text-sm text-gray-600">
                                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handlePageChange(pagination.page - 1)}
                                                    disabled={pagination.page === 1}
                                                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white/80 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                    Previous
                                                </button>

                                                <div className="hidden sm:flex items-center space-x-1">
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        const page = i + Math.max(1, pagination.page - 2);
                                                        if (page > totalPages) return null;

                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => handlePageChange(page)}
                                                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pagination.page === page
                                                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                                                    : 'text-gray-700 bg-white/80 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    onClick={() => handlePageChange(pagination.page + 1)}
                                                    disabled={pagination.page === totalPages}
                                                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white/80 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                                                >
                                                    Next
                                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-12 border border-white/20 shadow-lg max-w-lg mx-auto">
                                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                                        {searchTerm ? 'No Mosques Found' : 'No Mosques Available'}
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        {searchTerm
                                            ? 'Try adjusting your search terms or browse all available mosques.'
                                            : 'No mosques are currently registered in our database.'
                                        }
                                    </p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Navigation Footer */}
                <div className="text-center mt-16">
                    <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Need Help Finding Your Mosque?</h3>
                        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                            Can't find your local mosque? We're constantly adding new locations to help connect the Islamic community.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                            <Link
                                to="/"
                                className="inline-flex items-center text-blue-600 hover:text-blue-500 font-medium px-6 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Back to Home
                            </Link>
                            <Link
                                to="/"
                                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Register Your Mosque
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MosqueFinderPage;