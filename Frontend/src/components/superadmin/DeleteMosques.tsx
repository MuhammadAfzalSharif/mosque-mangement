import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import Toast from '../Toast';
import {
    FaTrash,
    FaBuilding,
    FaUser,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaExclamationTriangle,
    FaSearch,
    FaFilter,
    FaCheckCircle,
    FaClock,
    FaPhone
} from 'react-icons/fa';
import { RefreshCw, AlertTriangle, Edit3, X } from 'react-feather';

interface MosqueForDeletion {
    _id: string;
    mosque_name: string;
    location: string;
    description?: string;
    contact_phone?: string;
    contact_email?: string;
    admin_instructions?: string;
    verification_code: string;
    verification_code_expires?: string;
    created_at: string;

    // Admin details
    has_admin: boolean;
    admin_name: string;
    admin_email?: string;
    admin_phone?: string;
    admin_status: string;
    admin_id?: string;

    // Admin counts
    pending_admins: number;
    rejected_admins: number;

    // All admin requests
    all_admins: Array<{
        _id: string;
        name: string;
        email: string;
        phone: string;
        status: string;
        created_at: string;
        approved_at?: string;
        rejected_at?: string;
    }>;
}

const DeleteMosques: React.FC = () => {
    const [mosques, setMosques] = useState<MosqueForDeletion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'no_admin' | 'pending'>('all');
    const [selectedMosques, setSelectedMosques] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletionReason, setDeletionReason] = useState('');
    const [mosqueToDelete, setMosqueToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'warning'; message: string }>({
        show: false,
        type: 'success',
        message: ''
    });

    const fetchMosquesForDeletion = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all mosques with their admin details
            const response = await superAdminApi.getAllMosques({
                status: statusFilter !== 'all' ? statusFilter : undefined
            });

            setMosques(response.data.mosques || []);
        } catch (err) {
            console.error('Failed to fetch mosques for deletion:', err);
            setError(getErrorMessage(err));
            setMosques([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMosquesForDeletion();
    }, []);

    // Refetch when status filter changes
    useEffect(() => {
        fetchMosquesForDeletion();
    }, [statusFilter]);

    const filteredMosques = mosques
        .filter(mosque => {
            const matchesSearch =
                mosque.mosque_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mosque.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mosque.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mosque.verification_code.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        });

    const handleSelectAll = () => {
        if (selectedMosques.length === filteredMosques.length) {
            setSelectedMosques([]);
        } else {
            setSelectedMosques(filteredMosques.map(mosque => mosque._id));
        }
    };

    const handleSelectMosque = (id: string) => {
        setSelectedMosques(prev =>
            prev.includes(id)
                ? prev.filter(mosqueId => mosqueId !== id)
                : [...prev, id]
        );
    };

    const handleSingleDelete = (id: string) => {
        setMosqueToDelete(id);
        setDeletionReason('Mosque removed due to operational requirements');
        setShowDeleteModal(true);
    };

    const handleBulkDeleteAction = () => {
        if (selectedMosques.length === 0) return;
        setMosqueToDelete(null);
        setDeletionReason('Mosque removed due to operational requirements');
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletionReason.trim()) {
            setToast({
                show: true,
                type: 'warning',
                message: 'Please provide a reason for deletion'
            });
            return;
        }

        if (deletionReason.trim().length < 10) {
            setToast({
                show: true,
                type: 'warning',
                message: 'Deletion reason must be at least 10 characters long'
            });
            return;
        }

        try {
            setIsDeleting(true);

            if (mosqueToDelete) {
                // Single deletion
                const mosqueToDeleteData = mosques.find(m => m._id === mosqueToDelete);
                const mosqueName = mosqueToDeleteData?.mosque_name || 'Mosque';

                await superAdminApi.deleteMosque(mosqueToDelete, deletionReason);

                // Show success toast
                setToast({
                    show: true,
                    type: 'success',
                    message: `${mosqueName} deleted successfully!`
                });

                console.log('Mosque deleted successfully:', mosqueName);
            } else {
                // Bulk deletion
                await superAdminApi.bulkDeleteMosques(selectedMosques, deletionReason);

                // Show success toast
                setToast({
                    show: true,
                    type: 'success',
                    message: `${selectedMosques.length} mosque(s) deleted successfully!`
                });

                console.log(`${selectedMosques.length} mosques deleted successfully`);
            }

            // Close modal and reset
            setShowDeleteModal(false);
            setDeletionReason('');
            setMosqueToDelete(null);
            setSelectedMosques([]);

            // Refresh the mosques list to get updated data
            await fetchMosquesForDeletion();

        } catch (error) {
            console.error('Deletion failed:', error);
            const errorMessage = getErrorMessage(error);

            // Show error toast with server message
            setToast({
                show: true,
                type: 'error',
                message: `Failed to delete mosque(s): ${errorMessage}`
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-2xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
                            Loading Mosques
                        </h3>
                        <p className="text-gray-600 text-sm sm:text-base">Please wait while we fetch the mosque data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
                <div className="relative max-w-md w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-2xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <FaExclamationTriangle className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Error Loading Data</h3>
                        <p className="text-red-700 mb-6 text-sm sm:text-base leading-relaxed">{error}</p>
                        <button
                            onClick={fetchMosquesForDeletion}
                            className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                            <span className="relative flex items-center">
                                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Try Again
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-2 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 lg:space-y-6 xl:space-y-8">
                {/* Header */}
                <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4 lg:mb-6">
                        <div className="mb-2 sm:mb-0">
                            <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-800 bg-clip-text text-transparent mb-1 sm:mb-2">
                                Delete Mosques
                            </h1>
                            <p className="text-gray-600 text-xs sm:text-sm lg:text-base hidden sm:block">Permanently remove mosques from the system</p>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 lg:space-x-3 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 bg-red-100/80 backdrop-blur-sm border border-red-200 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <FaExclamationTriangle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-red-600" />
                            <span className="text-red-700 font-semibold text-xs sm:text-sm lg:text-base">Danger Zone</span>
                        </div>
                    </div>
                </div>

                {/* Warning Notice */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-md sm:rounded-lg lg:rounded-2xl blur-lg"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-red-200/50 rounded-md sm:rounded-lg lg:rounded-2xl shadow-2xl p-1.5 sm:p-3 lg:p-4 transform hover:scale-[1.01] transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-start space-y-1 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="flex-shrink-0 mx-auto sm:mx-0">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                    <FaExclamationTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 text-white animate-pulse" />
                                </div>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-xs sm:text-sm lg:text-base xl:text-lg font-bold text-red-800 mb-0.5 sm:mb-1 lg:mb-2">
                                    Critical Warning: Permanent Action
                                </h3>
                                <p className="text-red-700 mb-1 sm:mb-2 lg:mb-3 text-xs sm:text-sm leading-relaxed">
                                    Deleting mosques will permanently remove them from the system. This action cannot be undone.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 sm:gap-1 lg:gap-2">
                                    <div className="flex items-center space-x-1 p-1 sm:p-1.5 lg:p-2 bg-red-50/80 rounded-md border border-red-100">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                                        <span className="text-red-700 text-xs font-medium">Data deleted</span>
                                    </div>
                                    <div className="flex items-center space-x-1 p-1 sm:p-1.5 lg:p-2 bg-red-50/80 rounded-md border border-red-100">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                                        <span className="text-red-700 text-xs font-medium">Admins deactivated</span>
                                    </div>
                                    <div className="hidden lg:flex items-center space-x-1 p-1 sm:p-1.5 lg:p-2 bg-red-50/80 rounded-md border border-red-100">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                                        <span className="text-red-700 text-xs font-medium">Records archived</span>
                                    </div>
                                    <div className="hidden lg:flex items-center space-x-1 p-1 sm:p-1.5 lg:p-2 bg-red-50/80 rounded-md border border-red-100">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                                        <span className="text-red-700 text-xs font-medium">Reason required</span>
                                    </div>
                                </div>
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
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                                <div className="relative">
                                    <FaSearch className="absolute left-2 sm:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors duration-300 z-10 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search mosque name, admin, location..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 sm:pl-10 lg:pl-12 pr-2 sm:pr-3 lg:pr-4 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/25 focus:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="relative group w-full lg:w-64 xl:w-80">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                                <div className="relative">
                                    <FaFilter className="absolute left-2 sm:left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-purple-500 transition-colors duration-300 z-10 w-3 h-3 sm:w-4 sm:h-4" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'no_admin' | 'pending')}
                                        className="w-full pl-8 sm:pl-10 lg:pl-12 pr-8 sm:pr-9 lg:pr-10 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-purple-500/25 focus:border-purple-400 transition-all duration-300 shadow-lg hover:shadow-xl appearance-none cursor-pointer"
                                    >
                                        <option value="all">All Mosques</option>
                                        <option value="approved">With Admin</option>
                                        <option value="no_admin">Without Admin</option>
                                        <option value="pending">Pending Requests</option>
                                    </select>
                                    <div className="absolute right-2 sm:right-3 lg:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedMosques.length > 0 && (
                            <div className="mt-2 sm:mt-4 lg:mt-6 relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg"></div>
                                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 xl:p-6 bg-red-50/90 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-red-200/50 shadow-lg">
                                    <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
                                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-red-800 font-bold text-xs sm:text-sm lg:text-base">
                                            {selectedMosques.length} mosque(s) selected for deletion
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleBulkDeleteAction}
                                        className="group relative overflow-hidden px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <div className="relative flex items-center space-x-1 sm:space-x-2">
                                            <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="text-xs sm:text-sm lg:text-base">Delete Selected</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mosques List */}
                <div className="space-y-2 sm:space-y-4 lg:space-y-6">
                    {filteredMosques.length === 0 ? (
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-600/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-xl"></div>
                            <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 text-center transform hover:scale-[1.01] transition-all duration-300">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6 shadow-lg">
                                    <FaBuilding className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-white" />
                                </div>
                                <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-700 mb-2 sm:mb-3">No Mosques Found</h3>
                                <p className="text-gray-500 text-xs sm:text-sm lg:text-base">No mosques match your current search and filter criteria.</p>
                                <div className="mt-3 sm:mt-4 lg:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                                    >
                                        Clear Search
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-xs sm:text-sm lg:text-base"
                                    >
                                        Show All
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Select All Header */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg"></div>
                                <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg p-2 sm:p-3 lg:p-4 xl:p-6 transform hover:scale-[1.01] transition-all duration-300">
                                    <label className="flex items-center cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={selectedMosques.length === filteredMosques.length}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 border-2 border-gray-300 rounded-md sm:rounded-lg focus:ring-2 sm:focus:ring-4 focus:ring-red-500/25 transition-all duration-300 cursor-pointer"
                                            />
                                            <div className="absolute inset-0 rounded-md sm:rounded-lg bg-gradient-to-r from-red-500/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                        </div>
                                        <span className="ml-2 sm:ml-3 lg:ml-4 text-xs sm:text-sm lg:text-base font-semibold text-gray-700 group-hover:text-red-600 transition-colors duration-300">
                                            Select All ({filteredMosques.length} mosques)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Mosque Cards */}
                            {filteredMosques.map((mosque) => (
                                <div key={mosque._id} className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                                    <div className={`relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 transition-all duration-300 hover:shadow-3xl transform hover:scale-[1.01] ${selectedMosques.includes(mosque._id) ? 'ring-2 sm:ring-4 ring-red-500/50 shadow-red-500/25' : ''}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                                            {/* Checkbox */}
                                            <div className="flex-shrink-0 flex justify-center sm:justify-start">
                                                <div className="relative group/checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMosques.includes(mosque._id)}
                                                        onChange={() => handleSelectMosque(mosque._id)}
                                                        className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 border-2 border-gray-300 rounded-md sm:rounded-lg lg:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-red-500/25 transition-all duration-300 cursor-pointer"
                                                    />
                                                    <div className="absolute inset-0 rounded-md sm:rounded-lg lg:rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 opacity-0 group-hover/checkbox:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-2 sm:space-y-3 lg:space-y-4">
                                                {/* Header */}
                                                <div className="text-center sm:text-left">
                                                    <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-gray-800 mb-2 sm:mb-3 lg:mb-4 flex items-center justify-center sm:justify-start space-x-2 sm:space-x-3">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                            <FaBuilding className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                        </div>
                                                        <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent truncate">
                                                            {mosque.mosque_name}
                                                        </span>
                                                    </h3>

                                                    {/* Status Badges */}
                                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-2 lg:gap-3">
                                                        {mosque.has_admin ? (
                                                            <span className="flex items-center px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl lg:rounded-2xl text-xs font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-lg">
                                                                <FaCheckCircle className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 mr-1 sm:mr-2" />
                                                                <span className="hidden sm:inline">Has Admin</span>
                                                                <span className="sm:hidden">Admin</span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl lg:rounded-2xl text-xs font-bold bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200 shadow-lg">
                                                                <FaClock className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 mr-1 sm:mr-2" />
                                                                <span className="hidden sm:inline">No Admin</span>
                                                                <span className="sm:hidden">No Admin</span>
                                                            </span>
                                                        )}
                                                        <span className="px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl lg:rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200 shadow-lg">
                                                            {mosque.verification_code}
                                                        </span>
                                                        {mosque.pending_admins > 0 && (
                                                            <span className="px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl lg:rounded-2xl text-xs font-bold bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200 shadow-lg">
                                                                {mosque.pending_admins} Pending
                                                            </span>
                                                        )}
                                                        {mosque.rejected_admins > 0 && (
                                                            <span className="px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl lg:rounded-2xl text-xs font-bold bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200 shadow-lg">
                                                                {mosque.rejected_admins} Rejected
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 p-1.5 sm:p-2 lg:p-3 bg-blue-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-blue-100 shadow-sm">
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                                                <FaUser className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base truncate">{mosque.admin_name}</p>
                                                                {mosque.admin_email && (
                                                                    <p className="text-xs text-gray-500 truncate hidden sm:block">{mosque.admin_email}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 p-1.5 sm:p-2 lg:p-3 bg-red-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-red-100 shadow-sm">
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                                                <FaMapMarkerAlt className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base truncate">{mosque.location}</p>
                                                            </div>
                                                        </div>

                                                        {mosque.contact_phone && (
                                                            <div className="hidden sm:flex items-center space-x-2 sm:space-x-3 lg:space-x-4 p-1.5 sm:p-2 lg:p-3 bg-green-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-green-100 shadow-sm">
                                                                <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                                                    <FaPhone className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base">{mosque.contact_phone}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 p-1.5 sm:p-2 lg:p-3 bg-purple-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-purple-100 shadow-sm">
                                                            <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                                                <FaCalendarAlt className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base">
                                                                    <span className="hidden sm:inline">Created: </span>{formatDate(mosque.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {mosque.description && (
                                                            <div className="p-1.5 sm:p-2 lg:p-3 bg-indigo-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-indigo-100 shadow-sm hidden lg:block">
                                                                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-2">{mosque.description}</p>
                                                            </div>
                                                        )}

                                                        {mosque.all_admins && mosque.all_admins.length > 0 && (
                                                            <div className="p-1.5 sm:p-2 lg:p-3 bg-teal-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-teal-100 shadow-sm">
                                                                <p className="font-semibold text-teal-800 text-xs sm:text-sm lg:text-base">
                                                                    <span className="hidden sm:inline">Total Admin Requests: </span>
                                                                    <span className="sm:hidden">Requests: </span>{mosque.all_admins.length}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Delete Button */}
                                                <div className="flex justify-center sm:justify-end">
                                                    <button
                                                        onClick={() => handleSingleDelete(mosque._id)}
                                                        className="group relative overflow-hidden px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                                        <div className="relative flex items-center space-x-1 sm:space-x-2">
                                                            <FaTrash className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                                            <span className="text-xs sm:text-sm lg:text-base">
                                                                <span className="hidden sm:inline">Delete Mosque</span>
                                                                <span className="sm:hidden">Delete</span>
                                                            </span>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
                        <div className="relative max-w-sm sm:max-w-md lg:max-w-lg w-full max-h-[95vh] overflow-y-auto animate-slide-up">
                            {/* Modal Background with 3D Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-2xl"></div>

                            <div className="relative bg-white/95 backdrop-blur-2xl border border-white/30 rounded-lg sm:rounded-2xl lg:rounded-3xl shadow-2xl p-3 sm:p-4 lg:p-6">
                                {/* Header */}
                                <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                                    <div className="relative mx-auto mb-3 sm:mb-4 lg:mb-6">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-110 transition-all duration-300">
                                            <FaExclamationTriangle className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-white animate-pulse" />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg sm:rounded-2xl lg:rounded-3xl blur-xl"></div>
                                    </div>

                                    <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4">
                                        <span className="flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                                            Confirm Deletion
                                        </span>
                                    </h3>

                                    <div className="space-y-2 sm:space-y-3">
                                        <p className="text-gray-700 text-xs sm:text-sm lg:text-base font-semibold">
                                            {mosqueToDelete
                                                ? 'Are you sure you want to delete this mosque?'
                                                : `Are you sure you want to delete ${selectedMosques.length} mosque(s)?`
                                            }
                                        </p>

                                        <div className="p-2 sm:p-3 lg:p-4 bg-red-50/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl border border-red-200 shadow-lg">
                                            <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                <span className="text-red-800 font-bold text-xs sm:text-sm lg:text-base">Critical Warning</span>
                                            </div>
                                            <p className="text-red-700 text-xs font-semibold">
                                                This action cannot be undone and will permanently remove all associated data.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Reason Input */}
                                <div className="mb-4 sm:mb-6 lg:mb-8">
                                    <label className="block text-xs sm:text-sm lg:text-base font-bold text-gray-700 mb-2 sm:mb-3">
                                        <span className="flex items-center">
                                            <Edit3 className="w-4 h-4 mr-2 text-blue-600" />
                                            Reason for Deletion *
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={deletionReason}
                                            onChange={(e) => setDeletionReason(e.target.value)}
                                            placeholder="Please provide a detailed reason for deleting this mosque..."
                                            className="w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl focus:ring-2 sm:focus:ring-4 focus:ring-red-500/25 focus:border-red-400 transition-all duration-300 resize-none shadow-lg text-xs sm:text-sm lg:text-base"
                                            rows={3}
                                            required
                                        />
                                        <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs text-gray-400">
                                            {deletionReason.length}/500
                                        </div>
                                    </div>
                                    {deletionReason.trim().length > 0 && deletionReason.trim().length < 10 && (
                                        <p className="mt-1 sm:mt-2 text-xs text-amber-600 font-semibold">
                                            <span className="flex items-center">
                                                <AlertTriangle className="w-3 h-3 mr-1 text-yellow-600" />
                                                Please provide at least 10 characters
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setDeletionReason('');
                                            setMosqueToDelete(null);
                                        }}
                                        disabled={isDeleting}
                                        className="group relative overflow-hidden flex-1 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <span className="relative text-xs sm:text-sm lg:text-base flex items-center">
                                            <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Cancel
                                        </span>
                                    </button>

                                    <button
                                        onClick={confirmDelete}
                                        disabled={isDeleting || !deletionReason.trim() || deletionReason.trim().length < 10}
                                        className="group relative overflow-hidden flex-1 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                        <div className="relative flex items-center justify-center space-x-1 sm:space-x-2">
                                            {isDeleting ? (
                                                <>
                                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span className="text-xs sm:text-sm lg:text-base">Deleting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span className="text-xs sm:text-sm lg:text-base">
                                                        <span className="hidden sm:flex items-center">
                                                            Confirm Delete
                                                        </span>
                                                        <span className="sm:hidden">Delete</span>
                                                    </span>
                                                </>
                                            )}
                                        </div>
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
            `}</style>
        </div>
    );
};

export default DeleteMosques;