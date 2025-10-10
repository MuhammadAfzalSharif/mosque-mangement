import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import { FaClock, FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCheck, FaTimes, FaEye, FaSearch, FaFilter } from 'react-icons/fa';
import { BarChart, CheckCircle } from 'react-feather';

interface PendingRequest {
    _id: string;
    mosque_name: string;
    admin_name: string;
    admin_email: string;
    admin_phone: string;
    location: string;
    registration_code: string;
    created_at: string;
    status: 'pending';
    mosque_id?: string;
    application_notes?: string;
    verification_status?: string;
}

interface Props {
    onApprove: (id: string, notes?: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
    onViewDetails: (request: PendingRequest) => Promise<void>;
}

const PendingRequests: React.FC<Props> = ({ onApprove, onReject }) => {
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mosque_name'>('newest');
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<string | null>(null);
    const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<string | null>(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
    const [bulkRejectionReason, setBulkRejectionReason] = useState('');
    const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
    const [selectedRequestForView, setSelectedRequestForView] = useState<PendingRequest | null>(null);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching pending requests...');
            const response = await superAdminApi.getPendingRequests();
            console.log('Pending requests response:', response);
            console.log('Pending admins data:', response.data);

            // Transform the data to match our interface
            // Backend returns admin objects with populated mosque_id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedRequests = (response.data.pending_admins || []).map((admin: any) => {
                console.log('Transforming admin:', admin);
                return {
                    _id: admin._id,
                    mosque_name: admin.mosque_id?.name || 'Unknown Mosque',
                    admin_name: admin.name || 'Unknown Admin',
                    admin_email: admin.email || '',
                    admin_phone: admin.phone || '',
                    location: admin.mosque_id?.location || 'Unknown Location',
                    registration_code: admin.verification_code_used || 'No Code',
                    created_at: admin.createdAt || new Date().toISOString(),
                    status: 'pending' as const,
                    // Additional fields we might need
                    mosque_id: admin.mosque_id?._id || null,
                    application_notes: admin.application_notes || '',
                    verification_status: admin.verification_status || 'unknown'
                };
            });

            console.log('Transformed requests:', transformedRequests);
            setRequests(transformedRequests);
        } catch (err) {
            console.error('Failed to fetch pending requests:', err);
            const errorMessage = getErrorMessage(err);
            console.error('Error message:', errorMessage);
            setError(errorMessage);
            // Fallback to empty array instead of mock data
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };



    const filteredAndSortedRequests = requests
        .filter(request =>
            request.mosque_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.location.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'mosque_name':
                    return a.mosque_name.localeCompare(b.mosque_name);
                default:
                    return 0;
            }
        });

    const handleSelectAll = () => {
        if (selectedRequests.length === filteredAndSortedRequests.length) {
            setSelectedRequests([]);
        } else {
            setSelectedRequests(filteredAndSortedRequests.map(req => req._id));
        }
    };

    const handleSelectRequest = (id: string) => {
        setSelectedRequests(prev =>
            prev.includes(id)
                ? prev.filter(reqId => reqId !== id)
                : [...prev, id]
        );
    };

    const handleBulkApprove = async () => {
        try {
            await Promise.all(selectedRequests.map(id => onApprove(id)));
            setSelectedRequests([]);
            await fetchPendingRequests();
        } catch (error) {
            console.error('Failed to bulk approve:', error);
        }
    };

    const handleBulkReject = async () => {
        setBulkRejectionReason('Bulk rejection - requests do not meet current requirements');
        setShowBulkRejectModal(true);
    };

    const handleBulkRejectSubmit = async () => {
        if (bulkRejectionReason.trim().length < 10) {
            alert('Rejection reason must be at least 10 characters');
            return;
        }

        try {
            await Promise.all(selectedRequests.map(id => onReject(id, bulkRejectionReason)));
            setSelectedRequests([]);
            setShowBulkRejectModal(false);
            setBulkRejectionReason('');
            await fetchPendingRequests();
        } catch (error) {
            console.error('Failed to bulk reject:', error);
            alert('Failed to bulk reject requests. Please try again.');
        }
    };

    const handleRejectClick = (id: string) => {
        setSelectedRequestForRejection(id);
        setRejectionReason('Application does not meet current requirements');
        setShowRejectionModal(true);
    };

    const handleRejectionSubmit = async () => {
        if (!selectedRequestForRejection) return;

        if (rejectionReason.trim().length < 10) {
            alert('Rejection reason must be at least 10 characters');
            return;
        }

        try {
            console.log('Rejecting admin:', selectedRequestForRejection, 'with reason:', rejectionReason);
            await onReject(selectedRequestForRejection, rejectionReason);
            setShowRejectionModal(false);
            setSelectedRequestForRejection(null);
            setRejectionReason('');
            await fetchPendingRequests();
        } catch (error) {
            console.error('Failed to reject request:', error);
            alert('Failed to reject admin. Please try again.');
        }
    };

    const handleApproveClick = (id: string) => {
        setSelectedRequestForApproval(id);
        setApprovalNotes('Admin approved for mosque management responsibilities');
        setShowApprovalModal(true);
    };

    const handleApprovalSubmit = async () => {
        if (selectedRequestForApproval) {
            try {
                console.log('Approving admin:', selectedRequestForApproval, 'with notes:', approvalNotes);
                await onApprove(selectedRequestForApproval, approvalNotes);
                setShowApprovalModal(false);
                setSelectedRequestForApproval(null);
                setApprovalNotes('');
                // Refresh the requests list
                await fetchPendingRequests();
            } catch (error) {
                console.error('Failed to approve request:', error);
                alert('Failed to approve admin. Please try again.');
            }
        }
    };

    const handleApprovalCancel = () => {
        setShowApprovalModal(false);
        setSelectedRequestForApproval(null);
        setApprovalNotes('');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                </div>
                <span className="ml-6 text-xl font-semibold bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">Loading pending requests...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative bg-white backdrop-blur-xl border-2 border-red-200/50 rounded-3xl shadow-2xl p-12 text-center transform hover:scale-[1.02] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 to-rose-50/60 rounded-3xl"></div>
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-rose-200/20 to-transparent rounded-full blur-xl"></div>

                <div className="relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <FaTimes className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Error Loading Requests</h3>
                    <p className="text-gray-600 mb-6 text-lg">{error}</p>
                    <button
                        onClick={fetchPendingRequests}
                        className="group relative bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                        <div className="flex items-center justify-center">
                            <span>Try Again</span>
                        </div>
                        <div className="absolute inset-0 bg-white/20 rounded-2xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-1 sm:p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 lg:space-y-6">
                {/* Compact 3D Header */}
                <div className="relative bg-gradient-to-r from-white via-gray-50/50 to-blue-50/30 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-2 sm:p-3 lg:p-4 xl:p-6 mb-2 sm:mb-4 lg:mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-60 rounded-lg sm:rounded-xl lg:rounded-2xl"></div>
                    <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                    <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-gray-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                        <div className="text-center sm:text-left">
                            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-0.5 sm:mb-1">
                                <span className="hidden sm:inline">Pending Requests</span>
                                <span className="sm:hidden">Pending</span>
                            </h1>
                            <p className="text-gray-600 text-xs sm:text-sm lg:text-base hidden sm:block">Review and manage mosque registration requests</p>
                        </div>

                        <div className="flex items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-md sm:rounded-lg lg:rounded-xl blur-sm sm:blur-md opacity-30"></div>
                                <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-md sm:rounded-lg lg:rounded-xl font-semibold text-xs sm:text-sm shadow-lg">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                        <FaClock className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span>{filteredAndSortedRequests.length} <span className="hidden sm:inline">Pending</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Search & Filters */}
                <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-2 sm:p-3 lg:p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-lg sm:rounded-xl lg:rounded-2xl"></div>
                    <div className="absolute -top-1 -right-1 sm:-top-3 sm:-right-3 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-md sm:blur-lg"></div>
                    <div className="absolute -bottom-1 -left-1 sm:-bottom-3 sm:-left-3 w-6 h-6 sm:w-12 sm:h-12 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full blur-sm sm:blur-md"></div>

                    <div className="relative z-10 space-y-2 sm:space-y-3 lg:space-y-4">
                        {/* Search Section */}
                        <div className="space-y-1 sm:space-y-2">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center">
                                <FaSearch className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                                <span className="hidden sm:inline">Search & Filter</span>
                                <span className="sm:hidden">Search</span>
                            </h3>

                            <div className="relative group">
                                <div className="relative bg-gray-50/80 backdrop-blur-sm rounded-md sm:rounded-lg lg:rounded-xl border-2 border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-all duration-300">
                                    <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4 group-focus-within:text-blue-500 transition-colors duration-200" />
                                    <input
                                        type="text"
                                        placeholder="Search mosque, admin, location..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-7 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm bg-transparent border-0 rounded-md sm:rounded-lg lg:rounded-xl focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                        >
                                            <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filter Section */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {/* Sort Filter */}
                            <div className="relative group">
                                <label className="block text-xs font-semibold text-gray-700 mb-1 hidden sm:block">
                                    <FaFilter className="w-3 h-3 inline mr-1 text-purple-600" />
                                    Sort By
                                </label>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'mosque_name')}
                                        className="w-full pl-2 sm:pl-3 pr-6 sm:pr-8 py-1.5 sm:py-2.5 text-xs sm:text-sm bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200 rounded-md sm:rounded-lg lg:rounded-xl focus:border-purple-400 focus:bg-white focus:ring-1 focus:ring-purple-200 transition-all duration-300 text-gray-700 appearance-none cursor-pointer"
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                        <option value="mosque_name">A-Z</option>
                                    </select>
                                    <div className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Status Display */}
                            <div className="relative group">
                                <label className="block text-xs font-semibold text-gray-700 mb-1 hidden sm:block">
                                    <FaClock className="w-3 h-3 inline mr-1 text-yellow-600" />
                                    Status
                                </label>
                                <div className="w-full pl-2 sm:pl-3 pr-2 sm:pr-3 py-1.5 sm:py-2.5 text-xs sm:text-sm bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-md sm:rounded-lg lg:rounded-xl">
                                    <span className="text-yellow-800 font-medium">Pending</span>
                                </div>
                            </div>

                            {/* Results Count */}
                            <div className="relative group col-span-2 sm:col-span-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-1 hidden sm:block">
                                    <BarChart className="w-3 h-3 inline mr-1 text-green-600" />
                                    Results
                                </label>
                                <div className="w-full pl-2 sm:pl-3 pr-2 sm:pr-3 py-1.5 sm:py-2.5 text-xs sm:text-sm bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-md sm:rounded-lg lg:rounded-xl">
                                    <span className="text-green-800 font-medium">
                                        {filteredAndSortedRequests.length} Request{filteredAndSortedRequests.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {searchTerm && (
                            <div className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-md sm:rounded-lg lg:rounded-xl">
                                <span className="text-blue-800 font-medium text-xs sm:text-sm truncate mr-2">
                                    <span className="hidden sm:inline">Searching: </span>"{searchTerm}"
                                </span>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md sm:rounded-lg transition-colors duration-200 flex-shrink-0"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Compact Bulk Actions */}
                    {selectedRequests.length > 0 && (
                        <div className="mt-2 sm:mt-4 relative bg-gradient-to-r from-blue-50 via-white to-purple-50 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-2 sm:p-3 lg:p-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-lg sm:rounded-xl"></div>
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <div className="flex items-center space-x-1.5 sm:space-x-2">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md sm:rounded-lg flex items-center justify-center shadow-md">
                                        <span className="text-white font-bold text-xs">{selectedRequests.length}</span>
                                    </div>
                                    <span className="text-sm sm:text-base lg:text-lg font-semibold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
                                        <span className="hidden sm:inline">{selectedRequests.length} request{selectedRequests.length !== 1 ? 's' : ''} selected</span>
                                        <span className="sm:hidden">{selectedRequests.length} selected</span>
                                    </span>
                                </div>

                                <div className="flex space-x-1.5 sm:space-x-2">
                                    <button
                                        onClick={handleBulkApprove}
                                        className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-md sm:rounded-lg lg:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex-1 sm:flex-none"
                                    >
                                        <div className="flex items-center justify-center">
                                            <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                                            <span className="text-xs sm:text-sm">
                                                <span className="sm:hidden">Approve</span>
                                                <span className="hidden sm:inline">Approve All</span>
                                            </span>
                                        </div>
                                        <div className="absolute inset-0 bg-white/20 rounded-md sm:rounded-lg lg:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    </button>

                                    <button
                                        onClick={handleBulkReject}
                                        className="group relative bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-md sm:rounded-lg lg:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex-1 sm:flex-none"
                                    >
                                        <div className="flex items-center justify-center">
                                            <FaTimes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                                            <span className="text-xs sm:text-sm">
                                                <span className="sm:hidden">Reject</span>
                                                <span className="hidden sm:inline">Reject All</span>
                                            </span>
                                        </div>
                                        <div className="absolute inset-0 bg-white/20 rounded-md sm:rounded-lg lg:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Compact Requests Grid */}
                <div className="space-y-4">
                    {filteredAndSortedRequests.length === 0 ? (
                        <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 backdrop-blur-xl border-2 border-white/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 text-center">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-60 rounded-2xl"></div>
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-gray-200/20 to-transparent rounded-full blur-lg"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                                    <FaClock className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Requests</h3>
                                <p className="text-gray-600 text-sm">All mosque registration requests have been processed.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Compact Select All Header */}
                            <div className="relative bg-gradient-to-r from-blue-50 via-white to-purple-50 backdrop-blur-xl border-2 border-white/40 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-xl"></div>
                                <div className="relative z-10">
                                    <label className="flex items-center cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequests.length === filteredAndSortedRequests.length}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                            />
                                            <div className="absolute inset-0 bg-blue-500/10 rounded scale-0 group-hover:scale-110 transition-transform duration-200"></div>
                                        </div>
                                        <span className="ml-3 text-base font-semibold bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                                            Select All Requests ({filteredAndSortedRequests.length})
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Compact Request Cards Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredAndSortedRequests.map((request) => (
                                    <div
                                        key={request._id}
                                        className={`group relative bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 backdrop-blur-xl border-2 border-white/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 transform hover:scale-[1.01] ${selectedRequests.includes(request._id)
                                            ? 'ring-2 ring-blue-400/50 shadow-blue-200/50'
                                            : ''
                                            }`}
                                    >
                                        {/* Compact 3D Background Effects */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-2xl"></div>
                                        <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-300"></div>
                                        <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full blur-lg group-hover:scale-110 transition-transform duration-300"></div>

                                        <div className="relative z-10">
                                            {/* Checkbox and Status */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequests.includes(request._id)}
                                                        onChange={() => handleSelectRequest(request._id)}
                                                        className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-blue-500/10 rounded scale-0 hover:scale-110 transition-transform duration-200"></div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-xl text-xs font-semibold shadow-md">
                                                        {request.registration_code}
                                                    </span>
                                                    <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-2 py-1 rounded-lg text-xs font-medium">
                                                        PENDING
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Compact Mosque Info Header */}
                                            <div className="mb-4">
                                                <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                                                    {request.mosque_name}
                                                </h3>
                                                <div className="flex items-center text-gray-500 text-xs">
                                                    <FaClock className="w-3 h-3 mr-1" />
                                                    <span>Registered {formatDate(request.created_at)}</span>
                                                </div>
                                            </div>

                                            {/* Compact Contact Information Grid */}
                                            <div className="grid grid-cols-1 gap-2 mb-4">
                                                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                                            <FaUser className="w-3 h-3 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Admin</p>
                                                            <p className="font-semibold text-gray-800 text-sm">{request.admin_name}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                                                            <FaEnvelope className="w-3 h-3 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Email</p>
                                                            <p className="font-semibold text-gray-800 text-xs break-all">{request.admin_email}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                                            <FaPhone className="w-3 h-3 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Phone</p>
                                                            <p className="font-semibold text-gray-800 text-sm">{request.admin_phone}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                                                            <FaMapMarkerAlt className="w-3 h-3 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Location</p>
                                                            <p className="font-semibold text-gray-800 text-xs">{request.location}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Compact Action Buttons */}
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequestForView(request);
                                                        setShowViewDetailsModal(true);
                                                    }}
                                                    className="w-full group relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                >
                                                    <div className="flex items-center justify-center">
                                                        <FaEye className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                                                        <span className="text-sm">View Details</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                </button>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApproveClick(request._id)}
                                                        className="flex-1 group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2 px-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                    >
                                                        <div className="flex items-center justify-center">
                                                            <FaCheck className="w-3 h-3 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                                            <span className="text-sm">Approve</span>
                                                        </div>
                                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleRejectClick(request._id)}
                                                        className="flex-1 group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2 px-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                    >
                                                        <div className="flex items-center justify-center">
                                                            <FaTimes className="w-3 h-3 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                                            <span className="text-sm">Reject</span>
                                                        </div>
                                                        <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Compact Approval Modal */}
                {showApprovalModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-2xl shadow-xl w-full max-w-md transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                            {/* Compact Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-lg"></div>

                            <div className="relative z-10 p-6">
                                {/* Compact Header with Icon */}
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                                        <FaCheck className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                                        Approve Admin Request
                                    </h3>
                                    <p className="text-gray-600 text-sm">Confirm approval and add optional notes</p>
                                </div>

                                {/* Compact Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Approval Notes (Optional)
                                        </label>
                                        <textarea
                                            value={approvalNotes}
                                            onChange={(e) => setApprovalNotes(e.target.value)}
                                            placeholder="Add any notes about the approval decision..."
                                            className="w-full px-3 py-2.5 text-sm bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all duration-300 shadow-inner"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Compact Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleApprovalSubmit}
                                            className="flex-1 group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        >
                                            <div className="flex items-center justify-center">
                                                <FaCheck className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                                                <span className="text-sm">Approve Request</span>
                                            </div>
                                            <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </button>

                                        <button
                                            onClick={handleApprovalCancel}
                                            className="flex-1 group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        >
                                            <div className="flex items-center justify-center">
                                                <FaTimes className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                                                <span className="text-sm">Cancel</span>
                                            </div>
                                            <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compact Rejection Modal */}
                {showRejectionModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                            {/* Compact Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-rose-200/20 to-transparent rounded-full blur-lg"></div>

                            <div className="relative z-10 p-6">
                                {/* Compact Header with Icon */}
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                                        <FaTimes className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                                        Reject Admin Request
                                    </h3>
                                    <p className="text-gray-600 text-sm">Provide a detailed reason for rejection</p>
                                </div>

                                {/* Compact Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Rejection Reason (Required - Min 10 characters)
                                        </label>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Provide a detailed reason for rejection (e.g., incomplete documents, verification failed, etc.)..."
                                            className="w-full px-3 py-2.5 text-sm bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-400 transition-all duration-300 shadow-inner"
                                            rows={4}
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <p className={`text-xs transition-colors duration-200 ${rejectionReason.length >= 10 ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                {rejectionReason.length} / 10 characters minimum
                                            </p>
                                            {rejectionReason.length >= 10 && (
                                                <span className="text-green-600 text-xs font-semibold flex items-center">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Valid
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Compact Warning Box */}
                                    <div className="relative bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-start space-x-2">
                                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-md flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-bold text-xs">!</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-yellow-800 mb-1">Important Notice</p>
                                                <p className="text-xs text-yellow-700">
                                                    The admin account will be marked as rejected but NOT deleted.
                                                    They can only reapply if you allow them to do so later.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleRejectionSubmit}
                                            disabled={rejectionReason.trim().length < 10}
                                            className={`flex-1 group relative font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform shadow-md ${rejectionReason.trim().length >= 10
                                                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white hover:scale-105 hover:shadow-lg'
                                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="flex items-center justify-center">
                                                <FaTimes className={`w-4 h-4 mr-2 transition-transform duration-200 ${rejectionReason.trim().length >= 10 ? 'group-hover:scale-110' : ''
                                                    }`} />
                                                <span className="text-sm">Reject Request</span>
                                            </div>
                                            {rejectionReason.trim().length >= 10 && (
                                                <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowRejectionModal(false);
                                                setSelectedRequestForRejection(null);
                                                setRejectionReason('');
                                            }}
                                            className="flex-1 group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        >
                                            <div className="flex items-center justify-center">
                                                <FaTimes className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                                                <span className="text-sm">Cancel</span>
                                            </div>
                                            <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compact Bulk Rejection Modal */}
                {showBulkRejectModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                            {/* Compact Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-rose-200/20 to-transparent rounded-full blur-lg"></div>

                            <div className="relative z-10 p-6">
                                {/* Compact Header with Icon */}
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                                        <FaTimes className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                                        Bulk Reject Requests
                                    </h3>
                                    <p className="text-gray-600 text-sm">Reject {selectedRequests.length} selected request{selectedRequests.length !== 1 ? 's' : ''}</p>
                                </div>

                                {/* Compact Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Rejection Reason (Required - Min 10 characters)
                                        </label>
                                        <textarea
                                            value={bulkRejectionReason}
                                            onChange={(e) => setBulkRejectionReason(e.target.value)}
                                            placeholder="Provide a detailed reason for bulk rejection..."
                                            className="w-full px-3 py-2.5 text-sm bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-400 transition-all duration-300 shadow-inner"
                                            rows={3}
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <p className={`text-xs transition-colors duration-200 ${bulkRejectionReason.length >= 10 ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                {bulkRejectionReason.length} / 10 characters minimum
                                            </p>
                                            {bulkRejectionReason.length >= 10 && (
                                                <span className="text-green-600 text-xs font-semibold flex items-center">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Valid
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Compact Warning Box */}
                                    <div className="relative bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-start space-x-2">
                                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-md flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-bold text-xs">!</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-yellow-800 mb-1">Important Notice</p>
                                                <p className="text-xs text-yellow-700">
                                                    All {selectedRequests.length} selected admin accounts will be marked as rejected but NOT deleted.
                                                    They can only reapply if you allow them to do so later.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleBulkRejectSubmit}
                                            disabled={bulkRejectionReason.trim().length < 10}
                                            className={`flex-1 group relative font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform shadow-md ${bulkRejectionReason.trim().length >= 10
                                                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white hover:scale-105 hover:shadow-lg'
                                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="flex items-center justify-center">
                                                <FaTimes className={`w-4 h-4 mr-2 transition-transform duration-200 ${bulkRejectionReason.trim().length >= 10 ? 'group-hover:scale-110' : ''
                                                    }`} />
                                                <span className="text-sm">Reject All ({selectedRequests.length})</span>
                                            </div>
                                            {bulkRejectionReason.trim().length >= 10 && (
                                                <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowBulkRejectModal(false);
                                                setBulkRejectionReason('');
                                            }}
                                            className="flex-1 group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        >
                                            <div className="flex items-center justify-center">
                                                <FaTimes className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                                                <span className="text-sm">Cancel</span>
                                            </div>
                                            <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clean View Details Modal */}
                {showViewDetailsModal && selectedRequestForView && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                            {/* Clean Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/50 rounded-2xl"></div>

                            <div className="relative z-10">
                                {/* Compact Header */}
                                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                            <FaEye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Request Details</h3>
                                            <p className="text-sm text-gray-600">Complete information about the mosque registration</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowViewDetailsModal(false);
                                            setSelectedRequestForView(null);
                                        }}
                                        className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-lg transition-all duration-200 flex items-center justify-center"
                                    >
                                        <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>

                                {/* Content with scrollbars enabled */}
                                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[60vh] overflow-y-auto">
                                    {/* Basic Information */}
                                    <div>
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 bg-blue-100 px-3 py-1 rounded-lg inline-block">
                                            Basic Information
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="bg-purple-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">🕌</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-purple-700">Mosque Name</p>
                                                        <p className="font-semibold text-gray-800 text-sm">{selectedRequestForView.mosque_name}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-red-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                                        <FaMapMarkerAlt className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-red-700">Location</p>
                                                        <p className="font-semibold text-gray-800 text-sm">{selectedRequestForView.location}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-orange-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">#</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-orange-700">Registration Code</p>
                                                        <p className="font-semibold text-gray-800 text-sm">{selectedRequestForView.registration_code}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-green-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                                        <FaClock className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-green-700">Registration Date</p>
                                                        <p className="font-semibold text-gray-800 text-sm">{formatDate(selectedRequestForView.created_at)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin Information */}
                                    <div>
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 bg-green-100 px-3 py-1 rounded-lg inline-block">
                                            Admin Information
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                                        <FaUser className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-blue-700">Admin Name</p>
                                                        <p className="font-semibold text-gray-800 text-sm">{selectedRequestForView.admin_name}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-purple-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                                        <FaEnvelope className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-purple-700">Admin Email</p>
                                                        <p className="font-semibold text-gray-800 text-sm break-all">{selectedRequestForView.admin_email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-green-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                                        <FaPhone className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-green-700">Admin Phone</p>
                                                        <p className="font-semibold text-gray-800 text-sm">{selectedRequestForView.admin_phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mosque Management Contact */}
                                    <div>
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 bg-indigo-100 px-3 py-1 rounded-lg inline-block">
                                            Mosque Management Contact
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-indigo-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                                                        <FaEnvelope className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-indigo-700">Mosque Management Email</p>
                                                        <p className="font-semibold text-gray-800 text-sm break-all">
                                                            {selectedRequestForView.admin_email || 'contact@mosque.org'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-teal-50 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                                                        <FaPhone className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-teal-700">Management Phone</p>
                                                        <p className="font-semibold text-gray-800 text-sm">
                                                            {selectedRequestForView.admin_phone || 'Not provided'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-center">
                                    <button
                                        onClick={() => {
                                            setShowViewDetailsModal(false);
                                            setSelectedRequestForView(null);
                                        }}
                                        className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingRequests;