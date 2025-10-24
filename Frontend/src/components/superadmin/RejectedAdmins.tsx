import React, { useState, useEffect, useCallback, useRef } from 'react';
import { superAdminApi } from '../../lib/api';
import type { RejectedAdmin } from '../../lib/types';
import Toast from '../Toast';
import {
    XCircle,
    CheckCircle,
    Search,
    Calendar,
    User,
    Mail,
    Phone,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    MapPin
} from 'react-feather';

interface ToastState {
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
}

type SortOption = 'none' | 'canReapply' | 'rejectionCount' | 'uniqueMosques';
type SortDirection = 'asc' | 'desc';

const RejectedAdmins: React.FC = () => {
    const [rejectedAdmins, setRejectedAdmins] = useState<RejectedAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
    const [selectedAdminName, setSelectedAdminName] = useState<string>('');
    const [sortBy, setSortBy] = useState<SortOption>('none');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const searchInputRef = useRef<HTMLInputElement>(null);

    const limit = 10;

    // Helper function to get unique mosque count
    const getUniqueMosqueCount = (admin: RejectedAdmin): number => {
        if (!admin.previous_mosques || admin.previous_mosques.length === 0) {
            return 0;
        }
        const uniqueMosqueIds = new Set(
            admin.previous_mosques
                .filter(prev => prev.mosque && prev.mosque.id)
                .map(prev => prev.mosque!.id)
        );
        return uniqueMosqueIds.size;
    };

    // Sorting function
    const sortAdmins = (admins: RejectedAdmin[]): RejectedAdmin[] => {
        if (sortBy === 'none') return admins;

        const sorted = [...admins].sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'canReapply':
                    // Can reapply (true) comes first when descending
                    comparison = (b.can_reapply ? 1 : 0) - (a.can_reapply ? 1 : 0);
                    break;

                case 'rejectionCount':
                    // Higher rejection count comes first when descending
                    comparison = b.rejection_count - a.rejection_count;
                    break;

                case 'uniqueMosques': {
                    // More unique mosques comes first when descending
                    const aUnique = getUniqueMosqueCount(a);
                    const bUnique = getUniqueMosqueCount(b);
                    comparison = bUnique - aUnique;
                    break;
                }
            }

            return sortDirection === 'desc' ? comparison : -comparison;
        });

        return sorted;
    };

    // Apply sorting to the displayed admins
    const sortedAdmins = sortAdmins(rejectedAdmins);

    const fetchRejectedAdmins = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Fetching rejected admins with params:', { searchQuery, currentPage, limit });

            const response = await superAdminApi.getRejectedAdmins({
                search: searchQuery,
                page: currentPage,
                limit,
            });

            console.log('Rejected admins response:', response.data);

            setRejectedAdmins(response.data.rejected_admins || []);
            setTotalPages(response.data.pagination?.pages || 1);
            setTotalCount(response.data.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to fetch rejected admins:', err);
            setError('Failed to load rejected admins');
            setToast({ show: true, type: 'error', message: 'Failed to load rejected admins' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery]);

    // Debounced search effect - waits 500ms after user stops typing
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchRejectedAdmins();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [fetchRejectedAdmins]);

    const handleAllowReapplicationClick = (adminId: string, adminName: string) => {
        setSelectedAdminId(adminId);
        setSelectedAdminName(adminName);
        setShowConfirmModal(true);
    };

    const handleConfirmAllowReapplication = async () => {
        if (!selectedAdminId) return;

        try {
            setProcessingId(selectedAdminId);
            setShowConfirmModal(false);

            const response = await superAdminApi.allowReapplication(selectedAdminId, {
                notes: 'Allowed to reapply by Super Admin',
            });

            console.log('Allow reapplication response:', response.data);

            // Update the admin in the list immediately
            setRejectedAdmins(prevAdmins =>
                prevAdmins.map(admin =>
                    admin.id === selectedAdminId
                        ? { ...admin, can_reapply: true }
                        : admin
                )
            );

            setToast({ show: true, type: 'success', message: 'Admin can now reapply successfully!' });
        } catch (err) {
            console.error('Error allowing reapplication:', err);
            const errorResponse = err as { response?: { data?: { error?: string } } };
            const errorMessage = errorResponse.response?.data?.error || 'Failed to allow reapplication';
            setToast({ show: true, type: 'error', message: errorMessage });
        } finally {
            setProcessingId(null);
            setSelectedAdminId(null);
            setSelectedAdminName('');
        }
    };

    const handleCancelConfirmation = () => {
        setShowConfirmModal(false);
        setSelectedAdminId(null);
        setSelectedAdminName('');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        // Search will trigger automatically via the debounced effect
    };

    if (loading && rejectedAdmins.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading rejected admins...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-pink-50/20 p-2 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
                {/* Modern 3D Header */}
                <div className="relative bg-gradient-to-r from-white via-gray-50/50 to-red-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 mb-3 sm:mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-xl"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-pink-200/20 to-transparent rounded-full blur-lg"></div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                        <div className="text-center sm:text-left">
                            <h1 className="text-lg sm:text-3xl font-bold bg-gradient-to-r from-gray-800 via-red-600 to-pink-600 bg-clip-text text-transparent mb-1">
                                Rejected Admins
                            </h1>
                            <p className="text-gray-600 text-xs sm:text-base hidden sm:block">Manage rejected applications and allow reapplication</p>
                        </div>

                        <div className="flex items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg sm:rounded-xl blur-md opacity-30"></div>
                                <div className="relative bg-gradient-to-r from-red-400 to-pink-500 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm shadow-lg">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">{totalCount} Rejected</span>
                                        <span className="sm:hidden">{totalCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Search & Filters */}
                <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-xl sm:rounded-2xl"></div>
                    <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-red-200/30 to-transparent rounded-full blur-lg"></div>
                    <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-gradient-to-tr from-pink-200/20 to-transparent rounded-full blur-md"></div>

                    <div className="relative z-10 space-y-3 sm:space-y-4">
                        {/* Search Section */}
                        <div className="space-y-2">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center">
                                <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-red-600" />
                                <span className="hidden sm:inline">Search & Filter Rejected Applications</span>
                                <span className="sm:hidden">Search</span>
                            </h3>

                            <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
                                <div className="flex-1 relative group">
                                    <div className="relative bg-gray-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl border-2 border-gray-200 focus-within:border-red-400 focus-within:bg-white transition-all duration-300">
                                        <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4 group-focus-within:text-red-500 transition-colors duration-200" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            placeholder="Search by name, email, phone..."
                                            className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 text-xs sm:text-sm bg-transparent border-0 rounded-lg sm:rounded-xl focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setCurrentPage(1);
                                                }}
                                                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                            >
                                                <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="group relative bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold px-3 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center">
                                        <Search className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Search</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                            </form>
                        </div>

                        {/* Search Hint - Hidden on mobile */}
                        {(searchQuery.toLowerCase().includes('reapply') ||
                            searchQuery.toLowerCase().includes('can apply') ||
                            searchQuery.toLowerCase().trim() === 'apply') && (
                                <div className="hidden sm:flex bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3 items-center gap-2">
                                    <CheckCircle className="text-green-600" size={18} />
                                    <p className="text-sm text-green-800">
                                        <span className="font-semibold">Filtering by reapplication status:</span> Showing only admins who can reapply
                                    </p>
                                </div>
                            )}
                    </div>
                </div>

                {/* Modern Sorting Options - Hidden on mobile */}
                <div className="hidden sm:block relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-2xl shadow-xl p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                    <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-purple-200/30 to-transparent rounded-full blur-lg"></div>
                    <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full blur-md"></div>

                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <ArrowUp size={16} className="text-purple-600" />
                                Sort By:
                            </label>
                            <div className="flex flex-wrap gap-3 flex-1">
                                <button
                                    onClick={() => setSortBy('none')}
                                    className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md ${sortBy === 'none'
                                        ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    None
                                    {sortBy === 'none' && (
                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setSortBy('canReapply')}
                                    className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-2 ${sortBy === 'canReapply'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <CheckCircle size={14} />
                                    <span className="hidden sm:inline">Can Reapply</span>
                                    <span className="sm:hidden">Reapply</span>
                                    {sortBy === 'canReapply' && (
                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setSortBy('rejectionCount')}
                                    className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-2 ${sortBy === 'rejectionCount'
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <AlertTriangle size={14} />
                                    <span className="hidden sm:inline">Rejection Count</span>
                                    <span className="sm:hidden">Count</span>
                                    {sortBy === 'rejectionCount' && (
                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setSortBy('uniqueMosques')}
                                    className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-2 ${sortBy === 'uniqueMosques'
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <Calendar size={14} />
                                    <span className="hidden sm:inline">Unique Mosques</span>
                                    <span className="sm:hidden">Mosques</span>
                                    {sortBy === 'uniqueMosques' && (
                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    )}
                                </button>
                            </div>
                            {sortBy !== 'none' && (
                                <button
                                    onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                                    className="group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                                >
                                    {sortDirection === 'desc' ? (
                                        <>
                                            <ArrowDown size={16} />
                                            <span className="hidden sm:inline">High to Low</span>
                                            <span className="sm:hidden">Desc</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUp size={16} />
                                            <span className="hidden sm:inline">Low to High</span>
                                            <span className="sm:hidden">Asc</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modern Error Message */}
                {error && (
                    <div className="relative bg-gradient-to-r from-red-50 to-pink-50 backdrop-blur-xl border-2 border-red-200/50 rounded-2xl shadow-lg p-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 to-pink-50/60 rounded-2xl"></div>
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                                <AlertTriangle className="text-white" size={20} />
                            </div>
                            <p className="text-red-800 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Modern Rejected Admins List */}
                {rejectedAdmins.length === 0 ? (
                    <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-red-50/30 backdrop-blur-xl border-2 border-white/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 sm:p-8 text-center">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-60 rounded-2xl"></div>
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-pink-200/20 to-transparent rounded-full blur-lg"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                                <XCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">No Rejected Admins Found</h3>
                            <p className="text-gray-600 text-sm">No admins match your search criteria.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {sortedAdmins.map((admin) => {
                            const uniqueMosqueCount = getUniqueMosqueCount(admin);
                            return (
                                <div
                                    key={admin.id}
                                    className="group relative bg-gradient-to-br from-white via-gray-50/50 to-red-50/30 backdrop-blur-xl border-2 border-white/30 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-2 sm:p-4 transform hover:scale-[1.02]"
                                >
                                    {/* 3D Background Effects */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                                    <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-300"></div>
                                    <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-gradient-to-tr from-pink-200/20 to-transparent rounded-full blur-lg group-hover:scale-110 transition-transform duration-300"></div>

                                    <div className="relative z-10">
                                        {/* Header with Status */}
                                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                                            <div className="flex items-start space-x-2 sm:space-x-3">
                                                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                                                    <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{admin.name}</h3>
                                                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200">
                                                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 mr-1 sm:mr-1.5 rounded-full bg-current"></span>
                                                            <span className="hidden sm:inline">Rejected</span>
                                                            <span className="sm:hidden">Rej</span>
                                                        </span>
                                                        {admin.can_reapply && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                                                                <CheckCircle size={8} className="mr-1 sm:hidden" />
                                                                <CheckCircle size={12} className="mr-1 hidden sm:inline" />
                                                                <span className="hidden sm:inline">Can Reapply</span>
                                                                <span className="sm:hidden">Can</span>
                                                            </span>
                                                        )}
                                                        {uniqueMosqueCount > 0 && (
                                                            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                                                                <Calendar size={12} className="mr-1" />
                                                                {uniqueMosqueCount} Mosque{uniqueMosqueCount !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {!admin.can_reapply && admin.rejection_count < 3 && (
                                                <button
                                                    onClick={() => handleAllowReapplicationClick(admin.id, admin.name)}
                                                    disabled={processingId === admin.id}
                                                    className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-1 px-2 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg text-xs sm:text-sm flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2"
                                                >
                                                    {processingId === admin.id ? (
                                                        <>
                                                            <div className="w-2 h-2 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            <span className="hidden sm:inline">Processing...</span>
                                                            <span className="sm:hidden">...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={10} className="sm:hidden" />
                                                            <CheckCircle size={14} className="hidden sm:inline" />
                                                            <span className="hidden sm:inline">Allow Reapply</span>
                                                            <span className="sm:hidden">Allow</span>
                                                        </>
                                                    )}
                                                    <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                </button>
                                            )}
                                        </div>

                                        {/* Contact Information - Hidden on mobile */}
                                        <div className="hidden sm:block space-y-2 mb-4">
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <Mail className="w-3 h-3 mr-2 text-blue-600 flex-shrink-0" />
                                                <span className="truncate">{admin.email}</span>
                                            </div>
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <Phone className="w-3 h-3 mr-2 text-green-600 flex-shrink-0" />
                                                <span className="truncate">{admin.phone}</span>
                                            </div>
                                        </div>

                                        {/* Modern Rejection Details */}
                                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-2 sm:p-4 mb-3 sm:mb-4">
                                            <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 flex items-center">
                                                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-red-600" />
                                                <span className="hidden sm:inline">Rejection Reason:</span>
                                                <span className="sm:hidden">Reason:</span>
                                            </p>
                                            <p className="text-gray-700 mb-2 sm:mb-3 italic text-xs sm:text-sm line-clamp-2 sm:line-clamp-none">{admin.rejection_reason}</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-red-200">
                                                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-1.5 sm:p-2">
                                                    <p className="text-xs text-gray-600 mb-1 hidden sm:block">Rejection Date</p>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1">
                                                        <Calendar size={10} className="text-red-500 sm:hidden" />
                                                        <Calendar size={12} className="text-red-500 hidden sm:inline" />
                                                        <span className="text-xs sm:text-sm">{new Date(admin.rejection_date).toLocaleDateString()}</span>
                                                    </p>
                                                </div>
                                                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-1.5 sm:p-2">
                                                    <p className="text-xs text-gray-600 mb-1 hidden sm:block">Rejection Count</p>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1">
                                                        <AlertTriangle size={10} className="text-orange-500 sm:hidden" />
                                                        <AlertTriangle size={12} className="text-orange-500 hidden sm:inline" />
                                                        <span className="text-xs sm:text-sm">{admin.rejection_count}x</span>
                                                    </p>
                                                </div>
                                                <div className="hidden sm:block bg-white/60 backdrop-blur-sm rounded-lg p-2">
                                                    <p className="text-xs text-gray-600 mb-1">Rejected By</p>
                                                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                                                        <User size={12} className="text-purple-500" />
                                                        {admin.rejected_by ? admin.rejected_by.name : 'System'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Modern Previous Mosques - Hidden on mobile */}
                                        {admin.previous_mosques && admin.previous_mosques.length > 0 && (
                                            <div className="hidden sm:block bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                                                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                                                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                                    Previous Applications ({admin.previous_mosques.length}):
                                                </p>
                                                <div className="space-y-2">
                                                    {admin.previous_mosques.map((prev, index) => (
                                                        <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-sm border border-blue-100">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <p className="font-semibold text-gray-800">
                                                                    {prev.mosque ? prev.mosque.name : 'Unknown Mosque'}
                                                                </p>
                                                                <p className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded-full">
                                                                    {new Date(prev.rejected_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            {prev.mosque && (
                                                                <p className="text-gray-600 text-xs mb-1 flex items-center">
                                                                    <MapPin size={10} className="mr-1 text-blue-500" />
                                                                    {prev.mosque.location}
                                                                </p>
                                                            )}
                                                            <p className="text-gray-700 text-xs italic bg-gray-50 p-2 rounded">"{prev.rejection_reason}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Modern Warning for Multiple Rejections */}
                                        {admin.rejection_count >= 3 && (
                                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg sm:rounded-xl p-2 sm:p-4 flex items-start gap-2 sm:gap-3">
                                                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                                                    <AlertTriangle className="text-white" size={12} />
                                                    <AlertTriangle className="text-white hidden sm:inline" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-orange-800 mb-1 flex items-center text-xs sm:text-sm">
                                                        🚫 <span className="hidden sm:inline">Auto-Banned</span>
                                                        <span className="sm:hidden">Banned</span>
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-orange-700">
                                                        <span className="hidden sm:inline">This admin has been rejected {admin.rejection_count} times and is automatically banned from reapplying.</span>
                                                        <span className="sm:hidden">Rejected {admin.rejection_count}x - Auto-banned</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modern Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 sm:gap-4 pt-4 sm:pt-6">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="group relative flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <ChevronLeft size={14} className="sm:hidden" />
                            <ChevronLeft size={18} className="hidden sm:inline" />
                            <span className="hidden sm:inline">Previous</span>
                            <span className="sm:hidden">Prev</span>
                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                        </button>

                        <div className="bg-white backdrop-blur-xl border-2 border-gray-200 rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2 shadow-md">
                            <span className="text-gray-700 font-medium text-xs sm:text-sm">
                                <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
                                <span className="sm:hidden">{currentPage}/{totalPages}</span>
                            </span>
                        </div>

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="group relative flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <span className="sm:hidden">Next</span>
                            <ChevronLeft size={14} className="sm:hidden rotate-180" />
                            <ChevronRight size={18} className="hidden sm:inline" />
                            <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                        </button>
                    </div>
                )}

                {/* Modern 3D Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-2xl shadow-2xl w-full max-w-md transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-lg"></div>

                            {/* Modern Header */}
                            <div className="relative z-10 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
                                <div className="flex items-center justify-center">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg mr-3">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold">Allow Reapplication</h3>
                                </div>
                            </div>

                            <div className="relative z-10 p-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <CheckCircle className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-gray-700 text-lg mb-4">
                                        Are you sure you want to allow <span className="font-bold text-green-800">{selectedAdminName}</span> to reapply?
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        This will enable them to submit a new application for mosque administration.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleCancelConfirmation}
                                        className="group relative flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                    >
                                        <div className="flex items-center justify-center">
                                            <XCircle className="w-4 h-4 mr-2" />
                                            <span>Cancel</span>
                                        </div>
                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    </button>
                                    <button
                                        onClick={handleConfirmAllowReapplication}
                                        className="group relative flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                    >
                                        <div className="flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            <span>Yes, Allow</span>
                                        </div>
                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notifications */}
                {toast.show && (
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast({ ...toast, show: false })}
                    />
                )}
            </div>
        </div>
    );
};

export default RejectedAdmins;
