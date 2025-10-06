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
    ArrowDown
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <XCircle className="text-red-600" size={28} />
                        Rejected Admin Applications
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Manage rejected applications and allow reapplication
                    </p>
                </div>
                <div className="bg-red-100 border border-red-200 rounded-lg px-4 py-2">
                    <p className="text-sm font-semibold text-red-800">
                        Total Rejected: {totalCount}
                    </p>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to page 1 when search changes
                        }}
                        placeholder="Search by name, email, phone, mosque, location, reason... (Type 'reapply' to filter)"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                </div>
                <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                    Search
                </button>
            </form>

            {/* Search Hint */}
            {(searchQuery.toLowerCase().includes('reapply') ||
                searchQuery.toLowerCase().includes('can apply') ||
                searchQuery.toLowerCase().trim() === 'apply') && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                        <CheckCircle className="text-green-600" size={18} />
                        <p className="text-sm text-green-800">
                            <span className="font-semibold">Filtering by reapplication status:</span> Showing only admins who can reapply
                        </p>
                    </div>
                )}

            {/* Sorting Options */}
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <ArrowUp size={16} />
                        Sort By:
                    </label>
                    <div className="flex flex-wrap gap-3 flex-1">
                        <button
                            onClick={() => setSortBy('none')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'none'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            None
                        </button>
                        <button
                            onClick={() => setSortBy('canReapply')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${sortBy === 'canReapply'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <CheckCircle size={14} />
                            Can Reapply
                        </button>
                        <button
                            onClick={() => setSortBy('rejectionCount')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${sortBy === 'rejectionCount'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <AlertTriangle size={14} />
                            Rejection Count
                        </button>
                        <button
                            onClick={() => setSortBy('uniqueMosques')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${sortBy === 'uniqueMosques'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Calendar size={14} />
                            Unique Mosques
                        </button>
                    </div>
                    {sortBy !== 'none' && (
                        <button
                            onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {sortDirection === 'desc' ? (
                                <>
                                    <ArrowDown size={16} />
                                    High to Low
                                </>
                            ) : (
                                <>
                                    <ArrowUp size={16} />
                                    Low to High
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="text-red-600" size={20} />
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Rejected Admins List */}
            {rejectedAdmins.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <XCircle className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-gray-600 text-lg">No rejected admins found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedAdmins.map((admin) => {
                        const uniqueMosqueCount = getUniqueMosqueCount(admin);
                        return (
                            <div
                                key={admin.id}
                                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                            >
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <h3 className="text-xl font-bold text-gray-800">{admin.name}</h3>
                                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                                                    <XCircle size={12} />
                                                    Rejected
                                                </span>
                                                {admin.can_reapply && (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                                                        <CheckCircle size={12} />
                                                        Can Reapply
                                                    </span>
                                                )}
                                                {uniqueMosqueCount > 0 && (
                                                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                                                        <Calendar size={12} />
                                                        {uniqueMosqueCount} Unique Mosque{uniqueMosqueCount !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Mail size={14} />
                                                    {admin.email}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Phone size={14} />
                                                    {admin.phone}
                                                </span>
                                            </div>
                                        </div>

                                        {!admin.can_reapply && admin.rejection_count < 3 && (
                                            <button
                                                onClick={() => handleAllowReapplicationClick(admin.id, admin.name)}
                                                disabled={processingId === admin.id}
                                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                                            >
                                                {processingId === admin.id ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={16} />
                                                        Allow Reapplication
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Rejection Details */}
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm font-semibold text-gray-800 mb-2">Rejection Reason:</p>
                                        <p className="text-gray-700">{admin.rejection_reason}</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-red-200">
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Rejection Date</p>
                                                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(admin.rejection_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Rejection Count</p>
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {admin.rejection_count} time{admin.rejection_count !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Rejected By</p>
                                                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                                                    <User size={12} />
                                                    {admin.rejected_by ? admin.rejected_by.name : 'System'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Previous Mosques */}
                                    {admin.previous_mosques && admin.previous_mosques.length > 0 && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <p className="text-sm font-semibold text-gray-800 mb-3">
                                                Previous Applications ({admin.previous_mosques.length}):
                                            </p>
                                            <div className="space-y-2">
                                                {admin.previous_mosques.map((prev, index) => (
                                                    <div key={index} className="bg-white rounded p-3 text-sm">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="font-semibold text-gray-800">
                                                                {prev.mosque ? prev.mosque.name : 'Unknown Mosque'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(prev.rejected_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        {prev.mosque && (
                                                            <p className="text-gray-600 text-xs mb-1">{prev.mosque.location}</p>
                                                        )}
                                                        <p className="text-gray-700 text-xs italic">"{prev.rejection_reason}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Warning for Multiple Rejections */}
                                    {admin.rejection_count >= 3 && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3 mt-4">
                                            <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <p className="font-semibold text-orange-800 mb-1">Auto-Banned</p>
                                                <p className="text-sm text-orange-700">
                                                    This admin has been rejected {admin.rejection_count} times and is automatically banned from reapplying.
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-6">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={18} />
                        Previous
                    </button>

                    <span className="text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center">
                                <CheckCircle className="w-8 h-8 mr-3" />
                                <h3 className="text-xl font-bold">Allow Reapplication</h3>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 text-lg mb-6">
                                Are you sure you want to allow <span className="font-semibold text-gray-900">{selectedAdminName}</span> to reapply?
                                This will enable them to submit a new application for mosque administration.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelConfirmation}
                                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAllowReapplication}
                                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Yes, Allow
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast.show && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
        </div>
    );
};

export default RejectedAdmins;
