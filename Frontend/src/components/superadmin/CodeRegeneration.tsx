import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    RefreshCw,
    CheckSquare,
    Square,
    Filter,
    User,
    Mail,
    MapPin,
    Key,
    Clock,
    AlertTriangle,
    Zap,
    Layers
} from 'react-feather';
import { superAdminApi } from '../../lib/api';
import Toast from '../../components/Toast';

interface MosqueForRegeneration {
    id: string;
    name: string;
    location: string;
    verification_code: string;
    verification_code_expires: string;
    contact_phone: string;
    contact_email: string;
    days_remaining: number;
    is_expired: boolean;
    admin: {
        name: string;
        email: string;
        phone: string;
    } | null;
}

interface RegenerationResult {
    mosque_id: string;
    mosque_name: string;
    old_code: string;
    new_code: string;
    new_expiry: string;
    admin_status_changed: {
        name: string;
        email: string;
        phone: string;
    } | null;
}

interface ToastState {
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
}

const CodeRegeneration: React.FC = () => {
    const [mosques, setMosques] = useState<MosqueForRegeneration[]>([]);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [selectedMosques, setSelectedMosques] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [expiryFilter, setExpiryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('verification_code_expires');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [regenerationResults, setRegenerationResults] = useState<RegenerationResult[]>([]);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
    const [expiryDays, setExpiryDays] = useState(30);

    // New state for generation modals
    const [showSingleModal, setShowSingleModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedMosqueForSingle, setSelectedMosqueForSingle] = useState<MosqueForRegeneration | null>(null);
    const [singleExpiryDays, setSingleExpiryDays] = useState(30);

    // Helper function to log frontend errors
    const logFrontendError = useCallback(async (action: string, error: unknown, additionalData: Record<string, unknown> = {}) => {
        try {
            let errorMessage = 'Unknown error';
            let statusCode = 500;

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                const axiosError = error as { response?: { data?: { error?: string; message?: string }; status?: number } };
                if (axiosError.response?.data?.error) {
                    errorMessage = axiosError.response.data.error;
                } else if (axiosError.response?.data?.message) {
                    errorMessage = axiosError.response.data.message;
                }
                if (axiosError.response?.status) {
                    statusCode = axiosError.response.status;
                }
            }

            const errorData = {
                action: `frontend_${action}`,
                error: errorMessage,
                component: 'CodeRegeneration',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                statusCode,
                ...additionalData
            };

            // Use the API method instead of direct fetch
            await superAdminApi.logFrontendError(errorData);
            console.error(`[CodeRegeneration] ${action}:`, error);
        } catch (logError) {
            console.error('Failed to log frontend error:', logError);
        }
    }, []);

    const fetchMosques = useCallback(async () => {
        try {
            setLoading(true);
            const response = await superAdminApi.getCodeRegenerationList({
                search: searchTerm || undefined,
                expiry_filter: expiryFilter,
                sort: sortBy,
                order: sortOrder,
                page: currentPage,
                limit: 50
            });

            console.log('API Response:', {
                mosquesCount: response.data.mosques?.length || 0,
                pagination: response.data.pagination,
                sampleMosque: response.data.mosques?.[0]
            });

            setMosques(response.data.mosques || []);
            setTotalPages(response.data.pagination?.total_pages || 1);
        } catch (err) {
            console.error('Failed to fetch mosques:', err);
            await logFrontendError('fetch_mosques', err, {
                searchTerm,
                expiryFilter,
                sortBy,
                sortOrder,
                currentPage
            });
            setToast({
                show: true,
                type: 'error',
                message: 'Failed to load mosques for code regeneration'
            });
        } finally {
            setLoading(false);
        }
    }, [searchTerm, expiryFilter, sortBy, sortOrder, currentPage, logFrontendError]);

    useEffect(() => {
        fetchMosques();
    }, [fetchMosques]);

    const handleSelectMosque = (mosqueId: string) => {
        const newSelected = new Set(selectedMosques);
        if (newSelected.has(mosqueId)) {
            newSelected.delete(mosqueId);
        } else {
            newSelected.add(mosqueId);
        }
        setSelectedMosques(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedMosques.size === mosques.length) {
            setSelectedMosques(new Set());
        } else {
            setSelectedMosques(new Set(mosques.map(m => m.id)));
        }
    };

    const handleSingleRegenerate = (mosque: MosqueForRegeneration) => {
        setSelectedMosqueForSingle(mosque);
        setSingleExpiryDays(30);
        setShowSingleModal(true);
    };

    const handleBulkRegenerateAction = () => {
        if (selectedMosques.size === 0) {
            setToast({
                show: true,
                type: 'warning',
                message: 'Please select at least one mosque for bulk regeneration'
            });
            return;
        }
        setExpiryDays(30);
        setShowBulkModal(true);
    };

    const confirmSingleRegenerate = async () => {
        if (!selectedMosqueForSingle) return;

        try {
            setRegenerating(true);
            const response = await superAdminApi.regenerateMultipleCodes({
                mosque_ids: [selectedMosqueForSingle.id],
                expiry_days: singleExpiryDays
            });

            setRegenerationResults(response.data.updated_mosques || []);
            setShowResultsModal(true);
            setShowSingleModal(false);

            const successCount = response.data.summary?.successful || response.data.updated_mosques?.length || 0;
            setToast({
                show: true,
                type: successCount > 0 ? 'success' : 'error',
                message: successCount > 0
                    ? `Code regenerated successfully for ${selectedMosqueForSingle.name}`
                    : 'Failed to regenerate code'
            });

            fetchMosques();
        } catch (err) {
            console.error('Failed to regenerate single code:', err);
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to regenerate code'
                : 'Failed to regenerate code';
            setToast({
                show: true,
                type: 'error',
                message: errorMessage
            });
        } finally {
            setRegenerating(false);
            setSelectedMosqueForSingle(null);
        }
    };

    const confirmBulkRegenerate = async () => {
        try {
            setRegenerating(true);
            const response = await superAdminApi.regenerateMultipleCodes({
                mosque_ids: Array.from(selectedMosques),
                expiry_days: expiryDays
            });

            setRegenerationResults(response.data.updated_mosques || []);
            setShowResultsModal(true);
            setShowBulkModal(false);
            setSelectedMosques(new Set());

            const successCount = response.data.summary?.successful || response.data.updated_mosques?.length || 0;
            const failedCount = response.data.summary?.failed || 0;

            setToast({
                show: true,
                type: successCount > 0 ? 'success' : 'error',
                message: failedCount > 0
                    ? `Successfully regenerated ${successCount} codes, ${failedCount} failed`
                    : `Successfully regenerated codes for ${successCount} mosque${successCount !== 1 ? 's' : ''}`
            });

            fetchMosques();
        } catch (err) {
            console.error('Failed to regenerate bulk codes:', err);
            const errorMessage = err instanceof Error && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to regenerate codes'
                : 'Failed to regenerate codes';
            setToast({
                show: true,
                type: 'error',
                message: errorMessage
            });
        } finally {
            setRegenerating(false);
        }
    };

    const getDaysRemainingColor = (days: number, isExpired: boolean) => {
        if (isExpired) return 'text-red-600 bg-red-50';
        if (days <= 1) return 'text-red-600 bg-red-50';
        if (days <= 3) return 'text-orange-600 bg-orange-50';
        if (days <= 7) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-2 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 lg:space-y-6 xl:space-y-8">
                {/* Header */}
                <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4 lg:mb-6">
                        <div className="mb-2 sm:mb-0">
                            <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent mb-1 sm:mb-2">
                                Code Regeneration
                            </h1>
                            <p className="text-gray-600 text-sm sm:text-base">Manage and regenerate mosque verification codes</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 lg:gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        console.log('Testing API connection...');
                                        const response = await superAdminApi.healthCheck();
                                        console.log('Health check response:', response.data);

                                        const mosquesResponse = await superAdminApi.getCodeRegenerationList();
                                        console.log('Mosques available for regeneration:', mosquesResponse.data);

                                        setToast({
                                            show: true,
                                            type: 'success',
                                            message: `API healthy! Found ${mosquesResponse.data.mosques?.length || 0} mosques available for code regeneration.`
                                        });
                                    } catch (err) {
                                        console.error('API Test Error:', err);
                                        await logFrontendError('api_test', err);
                                        setToast({
                                            show: true,
                                            type: 'error',
                                            message: 'API connectivity test failed - Check console'
                                        });
                                    }
                                }}
                                className="group relative overflow-hidden px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                <span className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-xs sm:text-sm">Test API</span>
                                </span>
                            </button>
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2 lg:space-x-3 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 bg-purple-100/80 backdrop-blur-sm border border-purple-200 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg w-full sm:w-auto">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-pulse"></div>
                                <Key className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-purple-600" />
                                <span className="text-purple-700 font-semibold text-sm sm:text-base">
                                    {mosques.length} Mosque{mosques.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 xl:p-8 transform hover:scale-[1.01] transition-all duration-300">
                        <div className="text-center mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                Choose Regeneration Type
                            </h2>
                            <p className="text-gray-600 text-sm">Select how you want to regenerate verification codes</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                            {/* Single Code Regeneration Button */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                                <button
                                    onClick={() => setShowSingleModal(true)}
                                    className="relative w-full flex flex-col items-center justify-center gap-3 sm:gap-4 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 hover:from-blue-100 hover:via-purple-100 hover:to-indigo-100 rounded-2xl border border-blue-200/60 hover:border-purple-300 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                                >
                                    <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg">
                                        <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">Single Code</h3>
                                        <p className="text-gray-600 text-sm">Regenerate code for one mosque</p>
                                    </div>
                                </button>
                            </div>

                            {/* Bulk Code Regeneration Button */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                                <button
                                    onClick={handleBulkRegenerateAction}
                                    disabled={selectedMosques.size === 0}
                                    className="relative w-full flex flex-col items-center justify-center gap-3 sm:gap-4 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 hover:from-indigo-100 hover:via-purple-100 hover:to-pink-100 rounded-2xl border border-indigo-200/60 hover:border-purple-300 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg">
                                        <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">Bulk Codes</h3>
                                        <p className="text-gray-600 text-sm">
                                            {selectedMosques.size === 0
                                                ? 'Select mosques below first'
                                                : `Regenerate ${selectedMosques.size} code${selectedMosques.size !== 1 ? 's' : ''}`
                                            }
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 transform hover:scale-[1.01] transition-all duration-300">
                        <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                <input
                                    type="text"
                                    placeholder="Search mosques..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 lg:py-3 border border-gray-200/60 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 text-sm sm:text-base"
                                />
                            </div>

                            {/* Expiry Filter */}
                            <div className="relative">
                                <Filter className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                <select
                                    value={expiryFilter}
                                    onChange={(e) => setExpiryFilter(e.target.value)}
                                    className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 lg:py-3 border border-gray-200/60 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                                >
                                    <option value="all">All Codes</option>
                                    <option value="expired">Expired</option>
                                    <option value="1">1 day</option>
                                    <option value="3">3 days</option>
                                    <option value="7">7 days</option>
                                </select>
                            </div>

                            {/* Sort Options - Hidden on mobile */}
                            <div className="hidden sm:flex gap-2 lg:gap-3">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 lg:py-3 border border-gray-200/60 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 text-xs sm:text-sm appearance-none cursor-pointer"
                                >
                                    <option value="verification_code_expires">Expiry Date</option>
                                    <option value="name">Mosque Name</option>
                                    <option value="location">Location</option>
                                </select>

                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 lg:py-3 border border-gray-200/60 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 text-xs sm:text-sm appearance-none cursor-pointer"
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                            </div>
                        </div>

                        {/* Select All Button */}
                        {mosques.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 lg:gap-4 mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200/60">
                                <button
                                    onClick={handleSelectAll}
                                    className="group relative overflow-hidden px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-100 hover:to-purple-100 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-gray-200/60 hover:border-purple-300"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                    <span className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                        {selectedMosques.size === mosques.length ? (
                                            <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                        ) : (
                                            <Square className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                        )}
                                        <span className="text-xs sm:text-sm lg:text-base font-medium">
                                            Select All ({selectedMosques.size}/{mosques.length})
                                        </span>
                                    </span>
                                </button>

                                {/* Bulk Action Notice */}
                                {selectedMosques.size > 0 && (
                                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100/80 backdrop-blur-sm border border-blue-200 rounded-lg sm:rounded-xl shadow-lg">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-blue-700 font-semibold text-xs sm:text-sm">
                                            {selectedMosques.size} Selected
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mosques List */}
                <div className="space-y-2 sm:space-y-4 lg:space-y-6">
                    {loading ? (
                        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-3xl blur-2xl"></div>
                                <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                        Loading Mosques
                                    </h3>
                                    <p className="text-gray-600 text-sm sm:text-base">Please wait while we fetch the mosque data...</p>
                                </div>
                            </div>
                        </div>
                    ) : mosques.length === 0 ? (
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-blue-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-xl"></div>
                            <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-8 sm:p-12 lg:p-16 text-center transform hover:scale-[1.01] transition-all duration-300">
                                <div className="w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 bg-gradient-to-br from-gray-400 to-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                                </div>
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700 mb-2">No Mosques Found</h3>
                                <p className="text-gray-500 text-sm sm:text-base">No mosques match your current filter criteria</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile-optimized cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
                                {mosques.map((mosque) => (
                                    <div key={mosque.id} className="group relative">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-200 via-indigo-200 to-blue-200 rounded-lg sm:rounded-2xl lg:rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>

                                        <div className={`relative bg-white/90 backdrop-blur-xl rounded-lg sm:rounded-2xl lg:rounded-3xl p-2 sm:p-4 lg:p-6 shadow-2xl border transition-all duration-500 hover:shadow-3xl hover:scale-[1.02] transform-gpu ${selectedMosques.has(mosque.id)
                                            ? 'border-purple-400 bg-gradient-to-br from-purple-50/80 to-indigo-50/80'
                                            : 'border-white/40 hover:border-purple-200'
                                            }`}>
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent rounded-lg sm:rounded-2xl lg:rounded-3xl"></div>

                                            {/* Header with checkbox and status */}
                                            <div className="relative flex items-start justify-between mb-2 sm:mb-3 lg:mb-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMosques.has(mosque.id)}
                                                    onChange={() => handleSelectMosque(mosque.id)}
                                                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 cursor-pointer"
                                                />

                                                <div className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold shadow-inner ${getDaysRemainingColor(mosque.days_remaining, mosque.is_expired)}`}>
                                                    <Clock className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                                    <span className="hidden sm:inline">
                                                        {mosque.is_expired ? `Expired ${Math.abs(mosque.days_remaining)}d` : `${mosque.days_remaining}d left`}
                                                    </span>
                                                    <span className="sm:hidden">
                                                        {mosque.is_expired ? 'Expired' : `${mosque.days_remaining}d`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mosque Info - Compact for mobile */}
                                            <div className="relative space-y-2 sm:space-y-3 lg:space-y-4">
                                                {/* Name & Location */}
                                                <div>
                                                    <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 line-clamp-2">{mosque.name}</h3>
                                                    <div className="flex items-center text-gray-600">
                                                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-purple-500 flex-shrink-0" />
                                                        <span className="text-xs sm:text-sm line-clamp-1">{mosque.location}</span>
                                                    </div>
                                                </div>

                                                {/* Verification Code - Mobile optimized */}
                                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 border border-gray-200/60 shadow-inner">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-500 mb-1 hidden sm:block">Verification Code</p>
                                                            <p className="font-mono text-sm sm:text-lg font-bold text-gray-900 tracking-wider break-all">
                                                                {mosque.verification_code}
                                                            </p>
                                                        </div>
                                                        <div className="p-1 sm:p-2 bg-white rounded-lg sm:rounded-xl shadow-sm ml-2 flex-shrink-0">
                                                            <Key className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-purple-500" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-1 sm:mt-2 text-xs text-gray-500 hidden sm:block">
                                                        Expires: {formatDate(mosque.verification_code_expires)}
                                                    </div>
                                                </div>

                                                {/* Admin Info - Condensed for mobile */}
                                                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 border border-purple-200/60 shadow-inner">
                                                    {mosque.admin ? (
                                                        <div className="space-y-1 sm:space-y-2">
                                                            <div className="flex items-center">
                                                                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-purple-500 flex-shrink-0" />
                                                                <span className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-1">{mosque.admin.name}</span>
                                                            </div>
                                                            <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-600">
                                                                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-indigo-500 flex-shrink-0" />
                                                                <span className="line-clamp-1">{mosque.admin.email}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center py-1 sm:py-2">
                                                            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gray-400" />
                                                            <span className="text-gray-400 text-xs sm:text-sm">No admin</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Single Regenerate Button */}
                                                <button
                                                    onClick={() => handleSingleRegenerate(mosque)}
                                                    className="group/btn relative w-full overflow-hidden px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                                >
                                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                                                    <span className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        <span className="text-xs sm:text-sm lg:text-base">Regenerate</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="relative mt-4 sm:mt-6 lg:mt-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-indigo-200 rounded-lg sm:rounded-2xl lg:rounded-3xl blur opacity-25"></div>
                            <div className="relative bg-white/90 backdrop-blur-xl rounded-lg sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 shadow-2xl border border-white/40">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                                    <div className="text-gray-700 font-medium text-xs sm:text-sm lg:text-base">
                                        Page <span className="text-purple-600 font-bold">{currentPage}</span> of{' '}
                                        <span className="text-indigo-600 font-bold">{totalPages}</span>
                                    </div>
                                    <div className="flex gap-2 sm:gap-3">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="group flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-purple-100 hover:to-indigo-100 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/60 hover:border-purple-300"
                                        >
                                            <span className="text-xs sm:text-sm font-medium">← Prev</span>
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="group flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-indigo-100 hover:to-purple-100 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/60 hover:border-indigo-300"
                                        >
                                            <span className="text-xs sm:text-sm font-medium">Next →</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Single Mosque Regeneration Modal */}
                {showSingleModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
                        <div className="relative max-w-sm sm:max-w-md lg:max-w-lg w-full max-h-[95vh] overflow-y-auto animate-slide-up">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-2xl"></div>
                            <div className="relative bg-white/95 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 xl:p-8 transform hover:scale-105 transition-all duration-300">

                                {/* Header */}
                                <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                                        <Zap className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                                        Single Code Regeneration
                                    </h3>
                                    <p className="text-gray-600 text-xs sm:text-sm lg:text-base">Regenerate code for selected mosque</p>
                                </div>

                                {/* Selected Mosque Info */}
                                {selectedMosqueForSingle && (
                                    <div className="relative mb-3 sm:mb-4 lg:mb-6">
                                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 border border-purple-200/60 shadow-inner">
                                            <h4 className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 line-clamp-2">
                                                {selectedMosqueForSingle.name}
                                            </h4>
                                            <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-2">
                                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-purple-500" />
                                                <span className="line-clamp-1">{selectedMosqueForSingle.location}</span>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-2 sm:p-3">
                                                <p className="text-xs font-medium text-gray-500 mb-1">Current Code</p>
                                                <p className="font-mono text-sm sm:text-base font-bold text-gray-900">
                                                    {selectedMosqueForSingle.verification_code}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Expiry Days Input */}
                                <div className="relative mb-4 sm:mb-6 lg:mb-8">
                                    <label className="block text-xs sm:text-sm lg:text-base font-bold text-gray-700 mb-1 sm:mb-2 lg:mb-3">
                                        New Expiry Days
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={singleExpiryDays}
                                        onChange={(e) => setSingleExpiryDays(parseInt(e.target.value) || 30)}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-inner text-sm sm:text-base"
                                        placeholder="Enter days (1-365)"
                                    />
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                                        Code will expire in {singleExpiryDays} days from generation
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                                    <button
                                        onClick={() => setShowSingleModal(false)}
                                        className="group relative overflow-hidden px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-700 font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <span className="relative text-xs sm:text-sm lg:text-base">Cancel</span>
                                    </button>
                                    <button
                                        onClick={confirmSingleRegenerate}
                                        disabled={regenerating}
                                        className="group relative overflow-hidden px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:flex-1"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <span className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                            {regenerating ? (
                                                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                            ) : (
                                                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                                            )}
                                            <span className="text-xs sm:text-sm lg:text-base">
                                                {regenerating ? 'Processing...' : 'Regenerate Code'}
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Regeneration Modal */}
                {showBulkModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
                        <div className="relative max-w-sm sm:max-w-md lg:max-w-lg w-full max-h-[95vh] overflow-y-auto animate-slide-up">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-2xl"></div>
                            <div className="relative bg-white/95 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6 xl:p-8 transform hover:scale-105 transition-all duration-300">

                                {/* Header */}
                                <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                                        <Layers className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                                        Bulk Code Regeneration
                                    </h3>
                                    <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                                        Regenerate codes for {selectedMosques.size} selected mosque{selectedMosques.size !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                {/* Warning */}
                                <div className="relative mb-3 sm:mb-4 lg:mb-6">
                                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 border border-yellow-200/60 shadow-inner">
                                        <div className="flex items-start space-x-2 sm:space-x-3">
                                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-yellow-800 text-xs sm:text-sm mb-1">Important Notice</h4>
                                                <p className="text-yellow-700 text-xs sm:text-sm">
                                                    This will regenerate codes for all selected mosques and remove their current admins.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expiry Days Input */}
                                <div className="relative mb-4 sm:mb-6 lg:mb-8">
                                    <label className="block text-xs sm:text-sm lg:text-base font-bold text-gray-700 mb-1 sm:mb-2 lg:mb-3">
                                        New Expiry Days
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={expiryDays}
                                        onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-inner text-sm sm:text-base"
                                        placeholder="Enter days (1-365)"
                                    />
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                                        All codes will expire in {expiryDays} days from generation
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                                    <button
                                        onClick={() => setShowBulkModal(false)}
                                        className="group relative overflow-hidden px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-700 font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <span className="relative text-xs sm:text-sm lg:text-base">Cancel</span>
                                    </button>
                                    <button
                                        onClick={confirmBulkRegenerate}
                                        disabled={regenerating}
                                        className="group relative overflow-hidden px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:flex-1"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <span className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                            {regenerating ? (
                                                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                            ) : (
                                                <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
                                            )}
                                            <span className="text-xs sm:text-sm lg:text-base">
                                                {regenerating ? 'Processing...' : `Regenerate ${selectedMosques.size} Code${selectedMosques.size !== 1 ? 's' : ''}`}
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ultra Responsive Results Modal - 360x640 Optimized */}
                {showResultsModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-[9999] p-1 sm:p-2 lg:p-4 animate-fade-in">
                        <div className="relative w-full max-w-[340px] sm:max-w-2xl lg:max-w-6xl max-h-[95vh] group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 rounded-xl sm:rounded-2xl lg:rounded-3xl blur opacity-30 group-hover:opacity-40 transition duration-500"></div>

                            <div className="relative bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border border-white/40">
                                {/* Compact Header - Mobile First */}
                                <div className="relative p-2 sm:p-4 lg:p-6 border-b border-gray-200/60 bg-gradient-to-r from-purple-50/80 to-indigo-50/80">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
                                            <div className="p-1.5 sm:p-2 lg:p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg sm:rounded-xl flex-shrink-0">
                                                <Key className="w-3 h-3 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-xs sm:text-lg lg:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">
                                                    Results
                                                </h3>
                                                <p className="text-gray-600 text-xs sm:text-sm lg:text-base mt-0.5 hidden sm:block">
                                                    {regenerationResults?.length || 0} mosque{(regenerationResults?.length || 0) !== 1 ? 's' : ''} processed
                                                </p>
                                                {/* Mobile count */}
                                                <p className="text-gray-600 text-xs mt-0.5 sm:hidden">
                                                    {regenerationResults?.length || 0} processed
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowResultsModal(false)}
                                            className="p-1.5 sm:p-2 lg:p-3 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
                                        >
                                            <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 relative">
                                                <div className="absolute inset-0 rotate-45 transition-transform duration-300">
                                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-400"></div>
                                                    <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-400"></div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Ultra Compact Results Content */}
                                <div className="relative p-2 sm:p-4 lg:p-6 overflow-y-auto max-h-[70vh] sm:max-h-[65vh]">
                                    {regenerationResults && regenerationResults.length > 0 ? (
                                        <div className="space-y-2 sm:space-y-4 lg:space-y-6">
                                            {regenerationResults.map((result, index) => (
                                                <div key={index} className="group/result relative">
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-200 to-blue-200 rounded-lg sm:rounded-xl blur opacity-25 group-hover/result:opacity-40 transition duration-300"></div>
                                                    <div className="relative bg-gradient-to-br from-white to-gray-50/80 rounded-lg sm:rounded-xl p-2 sm:p-4 lg:p-6 shadow-xl border border-gray-200/60">

                                                        {/* Ultra Compact Mosque Name */}
                                                        <div className="relative mb-2 sm:mb-3 lg:mb-4">
                                                            <h4 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-1 line-clamp-1 sm:line-clamp-2">{result.mosque_name}</h4>
                                                            <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
                                                        </div>

                                                        {/* Mobile-First Code Comparison */}
                                                        <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                                                            {/* Old Code - Ultra Compact */}
                                                            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-md sm:rounded-lg p-1.5 sm:p-2 lg:p-3 border border-red-200/60">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-semibold text-red-600">Previous</span>
                                                                    <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
                                                                </div>
                                                                <div className="font-mono text-xs sm:text-sm font-bold text-red-700 bg-white/80 px-1.5 sm:px-2 py-1 rounded border border-red-200 break-all">
                                                                    {result.old_code}
                                                                </div>
                                                            </div>

                                                            {/* New Code - Ultra Compact */}
                                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-md sm:rounded-lg p-1.5 sm:p-2 lg:p-3 border border-green-200/60">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-semibold text-green-600">New Code</span>
                                                                    <CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                                                                </div>
                                                                <div className="font-mono text-xs sm:text-sm font-bold text-green-700 bg-white/80 px-1.5 sm:px-2 py-1 rounded border border-green-200 break-all">
                                                                    {result.new_code}
                                                                </div>
                                                            </div>

                                                            {/* Expiry - Compact for mobile, full for larger screens */}
                                                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-md sm:rounded-lg p-1.5 sm:p-2 lg:p-3 border border-purple-200/60">
                                                                <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                                                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-500" />
                                                                    <span className="text-xs font-semibold text-purple-600">Expires</span>
                                                                </div>
                                                                <div className="text-purple-700 font-medium text-xs sm:text-sm">
                                                                    <span className="sm:hidden">
                                                                        {new Date(result.new_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                    <span className="hidden sm:inline">
                                                                        {formatDate(result.new_expiry)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Admin Status Changed - Only show if exists and on larger screens */}
                                                            {result.admin_status_changed && (
                                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md sm:rounded-lg p-1.5 sm:p-2 lg:p-3 border border-blue-200/60 hidden sm:block">
                                                                    <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                                                                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                                                                        <span className="text-xs font-semibold text-blue-600">Admin Status: Code Regenerated</span>
                                                                    </div>
                                                                    <div className="text-blue-700 font-medium text-xs sm:text-sm">
                                                                        {result.admin_status_changed.name}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 sm:py-8 lg:py-12">
                                            <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                                                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400" />
                                            </div>
                                            <h4 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">No Results</h4>
                                            <p className="text-gray-500 text-xs sm:text-sm">No regeneration results to display</p>
                                        </div>
                                    )}
                                </div>

                                {/* Compact Footer */}
                                <div className="relative p-2 sm:p-4 lg:p-6 border-t border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-purple-50/80">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                                        <div className="text-xs text-gray-600 hidden lg:block">
                                            Completed at {new Date().toLocaleString()}
                                        </div>
                                        <button
                                            onClick={() => setShowResultsModal(false)}
                                            className="relative flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-xl font-semibold text-xs sm:text-sm w-full sm:w-auto"
                                        >
                                            <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>Close</span>
                                        </button>
                                    </div>
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

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slide-up {
                    from { 
                        opacity: 0;
                        transform: translateY(50px) scale(0.9);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                
                .animate-slide-up {
                    animation: slide-up 0.4s ease-out;
                }
                
                .line-clamp-1 {
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                /* Mobile optimizations for 360x640 */}
                @media (max-width: 360px) {
                    .grid-cols-1 {
                        gap: 0.5rem;
                    }
                    
                    .p-2 {
                        padding: 0.5rem;
                    }
                    
                    .space-y-2 > * + * {
                        margin-top: 0.5rem;
                    }
                    
                    .text-xs {
                        font-size: 0.65rem;
                    }
                    
                    .rounded-lg {
                        border-radius: 0.5rem;
                    }
                }
                
                /* Enhanced gradient backgrounds */
                .bg-gradient-to-br {
                    background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
                }
                
                /* Custom scrollbar */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #8b5cf6, #6366f1);
                    border-radius: 10px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #7c3aed, #4f46e5);
                }
            `}</style>
        </div>
    );
};

export default CodeRegeneration;