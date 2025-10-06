import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
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
    FaClock
} from 'react-icons/fa';

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



    useEffect(() => {
        fetchMosquesForDeletion();
    }, []);

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
        setShowDeleteModal(true);
    };

    const handleBulkDeleteAction = () => {
        if (selectedMosques.length === 0) return;
        setMosqueToDelete(null);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletionReason.trim()) {
            alert('Please provide a reason for deletion');
            return;
        }

        try {
            setIsDeleting(true);

            if (mosqueToDelete) {
                // Single deletion
                await superAdminApi.deleteMosque(mosqueToDelete, deletionReason);
                setMosques(prev => prev.filter(m => m._id !== mosqueToDelete));
            } else {
                // Bulk deletion
                await superAdminApi.bulkDeleteMosques(selectedMosques, deletionReason);
                setMosques(prev => prev.filter(m => !selectedMosques.includes(m._id)));
                setSelectedMosques([]);
            }

            setShowDeleteModal(false);
            setDeletionReason('');
            setMosqueToDelete(null);
        } catch (error) {
            console.error('Deletion failed:', error);
            alert('Failed to delete mosque(s). Please try again.');
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
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                <span className="ml-3 text-lg text-gray-600">Loading mosques...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-600 mb-2">
                    <FaExclamationTriangle className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Error Loading Data</h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                    onClick={fetchMosquesForDeletion}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Delete Mosques
                </h1>
                <div className="flex items-center space-x-2">
                    <FaExclamationTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-700 font-semibold">Danger Zone</span>
                </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                <div className="flex items-start">
                    <FaExclamationTriangle className="w-6 h-6 text-red-500 mr-3 mt-1" />
                    <div>
                        <h3 className="text-lg font-semibold text-red-800 mb-2">Warning: Permanent Action</h3>
                        <p className="text-red-700 mb-2">
                            Deleting mosques will permanently remove them from the system. This action cannot be undone.
                        </p>
                        <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                            <li>All mosque data will be permanently deleted</li>
                            <li>Admin accounts will be deactivated</li>
                            <li>Historical records will be archived</li>
                            <li>A reason for deletion is required for audit purposes</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by mosque name, admin, location, or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'no_admin' | 'pending')}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                        >
                            <option value="all">All Mosques</option>
                            <option value="approved">With Admin</option>
                            <option value="no_admin">Without Admin</option>
                            <option value="pending">Pending Admin Requests</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedMosques.length > 0 && (
                    <div className="mt-4 flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                        <span className="text-red-800 font-semibold">
                            {selectedMosques.length} mosque(s) selected for deletion
                        </span>
                        <button
                            onClick={handleBulkDeleteAction}
                            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            <FaTrash className="w-4 h-4 mr-2" />
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Mosques List */}
            <div className="space-y-4">
                {filteredMosques.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-12 text-center">
                        <FaBuilding className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Mosques Found</h3>
                        <p className="text-gray-500">No mosques match your search criteria.</p>
                    </div>
                ) : (
                    <>
                        {/* Select All Header */}
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg p-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedMosques.length === filteredMosques.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                    Select All ({filteredMosques.length})
                                </span>
                            </label>
                        </div>

                        {/* Mosque Cards */}
                        {filteredMosques.map((mosque) => (
                            <div
                                key={mosque._id}
                                className={`bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-3xl ${selectedMosques.includes(mosque._id) ? 'ring-2 ring-red-500' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-4">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedMosques.includes(mosque._id)}
                                        onChange={() => handleSelectMosque(mosque._id)}
                                        className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-2"
                                    />

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                                                    <FaBuilding className="w-5 h-5 mr-2 text-red-600" />
                                                    {mosque.mosque_name}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    {mosque.has_admin ? (
                                                        <span className="flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                                            <FaCheckCircle className="w-4 h-4 mr-1" />
                                                            Has Admin
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                                                            <FaClock className="w-4 h-4 mr-1" />
                                                            No Admin
                                                        </span>
                                                    )}
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                                                        Code: {mosque.verification_code}
                                                    </span>
                                                    {mosque.pending_admins > 0 && (
                                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">
                                                            {mosque.pending_admins} Pending
                                                        </span>
                                                    )}
                                                    {mosque.rejected_admins > 0 && (
                                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                                                            {mosque.rejected_admins} Rejected
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center text-gray-700">
                                                    <FaUser className="w-4 h-4 mr-3 text-blue-600" />
                                                    <div>
                                                        <span className="font-medium">{mosque.admin_name}</span>
                                                        {mosque.admin_email && (
                                                            <span className="text-sm text-gray-500 ml-2">({mosque.admin_email})</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center text-gray-700">
                                                    <FaMapMarkerAlt className="w-4 h-4 mr-3 text-red-600" />
                                                    <span>{mosque.location}</span>
                                                </div>
                                                {mosque.contact_phone && (
                                                    <div className="flex items-center text-gray-700">
                                                        <span className="text-sm">📞 {mosque.contact_phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center text-gray-700">
                                                    <FaCalendarAlt className="w-4 h-4 mr-3 text-purple-600" />
                                                    <span>Created: {formatDate(mosque.created_at)}</span>
                                                </div>
                                                {mosque.description && (
                                                    <div className="text-sm text-gray-600">
                                                        <p className="line-clamp-2">{mosque.description}</p>
                                                    </div>
                                                )}
                                                {mosque.all_admins && mosque.all_admins.length > 0 && (
                                                    <div className="text-sm text-gray-600">
                                                        <p className="font-medium">Admin Requests: {mosque.all_admins.length}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleSingleDelete(mosque._id)}
                                                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                                            >
                                                <FaTrash className="w-4 h-4 mr-2" />
                                                Delete Mosque
                                            </button>
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Deletion</h3>
                            <p className="text-gray-600">
                                {mosqueToDelete
                                    ? 'Are you sure you want to delete this mosque?'
                                    : `Are you sure you want to delete ${selectedMosques.length} mosque(s)?`
                                }
                            </p>
                            <p className="text-sm text-red-600 mt-2 font-semibold">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Deletion *
                            </label>
                            <textarea
                                value={deletionReason}
                                onChange={(e) => setDeletionReason(e.target.value)}
                                placeholder="Please provide a reason for deleting this mosque..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                rows={3}
                                required
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletionReason('');
                                    setMosqueToDelete(null);
                                }}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting || !deletionReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeleteMosques;