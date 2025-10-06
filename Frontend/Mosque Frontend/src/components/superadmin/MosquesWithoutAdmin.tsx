import React, { useState, useEffect } from 'react';
import { superAdminApi, mosqueApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import {
    FaUserSlash,
    FaBuilding,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaExclamationTriangle,
    FaSearch,
    FaFilter,
    FaUserPlus,
    FaTrash,
    FaClock,
    FaEnvelope
} from 'react-icons/fa'; interface MosqueWithoutAdmin {
    _id: string;
    mosque_name: string;
    location: string;
    registration_code: string;
    created_at: string;
    last_admin_removed?: string;
    removal_reason?: string;
    contact_attempts: number;
    status: 'no_admin' | 'admin_removed' | 'admin_inactive' | 'approved';
    description?: string;
    contact_email?: string;
    contact_phone?: string;
    pending_admins?: Array<{
        name: string;
        email: string;
        phone: string;
    }>;
    rejected_admins?: Array<{
        name: string;
        email: string;
        phone: string;
    }>;
    has_approved_admin?: boolean;
    approved_admin?: {
        name: string;
        email: string;
        phone: string;
    };
}

interface Props {
    onAssignAdmin: (mosqueId: string) => void;
    onDelete: (mosqueId: string, reason: string) => void;
    onSendReminder: (mosqueId: string) => void;
}

const MosquesWithoutAdmin: React.FC<Props> = ({ onAssignAdmin, onDelete, onSendReminder }) => {
    const [mosques, setMosques] = useState<MosqueWithoutAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'no_admin' | 'admin_removed' | 'admin_inactive'>('all');
    const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'has_admin' | 'no_admin'>('all');
    const [selectedMosques, setSelectedMosques] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [targetMosque, setTargetMosque] = useState<string | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMosquesWithoutAdmin();
    }, []);

    const fetchMosquesWithoutAdmin = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch ALL mosques, approved admins, pending admins, and rejected admins
            const [mosquesResponse, approvedResponse, pendingResponse, rejectedResponse] = await Promise.all([
                mosqueApi.getMosques({ limit: 1000 }), // Get all mosques
                superAdminApi.getApprovedRequests(), // Get all approved admins
                superAdminApi.getPendingRequests(), // Get all pending admins
                superAdminApi.getRejectedAdmins({ limit: 1000 }) // Get all rejected admins
            ]);

            const allMosques = mosquesResponse.data.mosques || [];
            const approvedAdmins = approvedResponse.data.approved_admins || [];
            const pendingAdmins = pendingResponse.data.pending_admins || [];
            const rejectedAdmins = rejectedResponse.data.rejected_admins || [];

            console.log('All Mosques:', allMosques);
            console.log('Approved Admins:', approvedAdmins);
            console.log('Pending Admins:', pendingAdmins);
            console.log('Rejected Admins:', rejectedAdmins);

            // Create a map of approved admins by mosque_id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const approvedAdminsByMosque = new Map<string, any>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            approvedAdmins.forEach((admin: any) => {
                const mosqueId = admin.mosque_id?._id || admin.mosque_id;
                if (mosqueId) {
                    approvedAdminsByMosque.set(mosqueId, {
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone
                    });
                }
            });

            // Create maps for pending and rejected admins by mosque_id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pendingAdminsByMosque = new Map<string, any[]>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pendingAdmins.forEach((admin: any) => {
                const mosqueId = admin.mosque_id?._id || admin.mosque_id;
                if (mosqueId) {
                    if (!pendingAdminsByMosque.has(mosqueId)) {
                        pendingAdminsByMosque.set(mosqueId, []);
                    }
                    pendingAdminsByMosque.get(mosqueId)?.push({
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone
                    });
                }
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rejectedAdminsByMosque = new Map<string, any[]>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rejectedAdmins.forEach((admin: any) => {
                // Check previous_mosque_ids for rejected admins
                const previousMosqueIds = admin.previous_mosque_ids || [];
                previousMosqueIds.forEach((mosqueId: string) => {
                    if (!rejectedAdminsByMosque.has(mosqueId)) {
                        rejectedAdminsByMosque.set(mosqueId, []);
                    }
                    rejectedAdminsByMosque.get(mosqueId)?.push({
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone
                    });
                });
            });

            // Map ALL mosques with their admin status
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allMosquesWithAdminStatus = allMosques.map((mosque: any) => {
                const hasApprovedAdmin = approvedAdminsByMosque.has(mosque.id);

                return {
                    _id: mosque.id,
                    mosque_name: mosque.name,
                    location: mosque.location,
                    registration_code: mosque.verification_code || 'N/A',
                    created_at: mosque.createdAt || new Date().toISOString(),
                    contact_attempts: 0,
                    status: hasApprovedAdmin ? 'approved' as const : 'no_admin' as const,
                    description: mosque.description || '',
                    contact_email: mosque.contact_email || '',
                    contact_phone: mosque.contact_phone || '',
                    pending_admins: pendingAdminsByMosque.get(mosque.id) || [],
                    rejected_admins: rejectedAdminsByMosque.get(mosque.id) || [],
                    has_approved_admin: hasApprovedAdmin,
                    approved_admin: approvedAdminsByMosque.get(mosque.id) || undefined
                };
            });

            setMosques(allMosquesWithAdminStatus);
        } catch (err) {
            console.error('Failed to fetch mosques:', err);
            setError(getErrorMessage(err));
            setMosques([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredMosques = mosques
        .filter(mosque => {
            // Normalize search term for comparison
            const normalizedSearchTerm = searchTerm.toLowerCase().trim();

            // Check for special admin status search terms
            const adminStatusTerms = ['admin', 'no admin', 'noadmin', 'no_admin', 'without admin'];
            const isAdminStatusSearch = adminStatusTerms.some(term =>
                normalizedSearchTerm.includes(term)
            );

            // If searching for admin-related terms, always match (since all are without admin)
            if (isAdminStatusSearch && normalizedSearchTerm.length > 0) {
                return true;
            }

            // Helper function to search within admin arrays
            const searchInAdmins = (admins?: Array<{ name: string; email: string; phone: string }>) => {
                if (!admins || admins.length === 0) return false;
                return admins.some(admin =>
                    admin.name.toLowerCase().includes(normalizedSearchTerm) ||
                    admin.email.toLowerCase().includes(normalizedSearchTerm) ||
                    admin.phone.toLowerCase().includes(normalizedSearchTerm)
                );
            };

            // Search in approved admin
            const searchInApprovedAdmin = (admin?: { name: string; email: string; phone: string }) => {
                if (!admin) return false;
                return admin.name.toLowerCase().includes(normalizedSearchTerm) ||
                    admin.email.toLowerCase().includes(normalizedSearchTerm) ||
                    admin.phone.toLowerCase().includes(normalizedSearchTerm);
            };

            // Standard search across all fields including admin data
            const matchesSearch =
                mosque.mosque_name.toLowerCase().includes(normalizedSearchTerm) ||
                mosque.location.toLowerCase().includes(normalizedSearchTerm) ||
                mosque.registration_code.toLowerCase().includes(normalizedSearchTerm) ||
                (mosque.description && mosque.description.toLowerCase().includes(normalizedSearchTerm)) ||
                (mosque.contact_email && mosque.contact_email.toLowerCase().includes(normalizedSearchTerm)) ||
                (mosque.contact_phone && mosque.contact_phone.toLowerCase().includes(normalizedSearchTerm)) ||
                searchInAdmins(mosque.pending_admins) ||
                searchInAdmins(mosque.rejected_admins) ||
                searchInApprovedAdmin(mosque.approved_admin);

            const matchesStatus = statusFilter === 'all' || mosque.status === statusFilter;

            // Check admin status filter (has admin vs no admin)
            const matchesAdminStatusFilter =
                adminStatusFilter === 'all' ||
                (adminStatusFilter === 'has_admin' && mosque.has_approved_admin) ||
                (adminStatusFilter === 'no_admin' && !mosque.has_approved_admin);

            return matchesSearch && matchesStatus && matchesAdminStatusFilter;
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

    const handleAssignAdmin = (mosqueId: string) => {
        setTargetMosque(mosqueId);
        setShowAssignModal(true);
    };

    const handleDeleteMosque = (mosqueId: string) => {
        setTargetMosque(mosqueId);
        setShowDeleteModal(true);
    };

    const confirmAssignAdmin = () => {
        if (!newAdminEmail.trim()) {
            alert('Please enter admin email');
            return;
        }

        if (targetMosque) {
            onAssignAdmin(targetMosque);
            setShowAssignModal(false);
            setNewAdminEmail('');
            setTargetMosque(null);
        }
    };

    const confirmDelete = () => {
        if (!actionReason.trim()) {
            alert('Please provide a reason for deletion');
            return;
        }

        if (targetMosque) {
            onDelete(targetMosque, actionReason);
            setMosques(prev => prev.filter(m => m._id !== targetMosque));
            setShowDeleteModal(false);
            setActionReason('');
            setTargetMosque(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <FaUserPlus className="w-4 h-4 text-green-600" />;
            case 'no_admin':
                return <FaUserSlash className="w-4 h-4 text-red-600" />;
            case 'admin_removed':
                return <FaUserSlash className="w-4 h-4 text-orange-600" />;
            case 'admin_inactive':
                return <FaClock className="w-4 h-4 text-yellow-600" />;
            default:
                return <FaUserSlash className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'no_admin':
                return 'bg-red-100 text-red-800';
            case 'admin_removed':
                return 'bg-orange-100 text-orange-800';
            case 'admin_inactive':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved':
                return 'Has Admin';
            case 'no_admin':
                return 'No Admin Assigned';
            case 'admin_removed':
                return 'Admin Removed';
            case 'admin_inactive':
                return 'Admin Inactive';
            default:
                return 'Unknown Status';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getPriorityLevel = (mosque: MosqueWithoutAdmin) => {
        const daysSinceCreated = Math.floor((Date.now() - new Date(mosque.created_at).getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceCreated > 60) return { level: 'High', color: 'text-red-600' };
        if (daysSinceCreated > 30) return { level: 'Medium', color: 'text-orange-600' };
        return { level: 'Low', color: 'text-yellow-600' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-lg text-gray-600">Loading mosques without admin...</span>
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
                    onClick={fetchMosquesWithoutAdmin}
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
                    Admin Management
                </h1>
                <div className="flex items-center space-x-2">
                    <FaBuilding className="w-5 h-5 text-blue-500" />
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {mosques.length} Total Mosques
                    </span>
                </div>
            </div>

            {/* Alert Notice */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                <div className="flex items-start">
                    <FaBuilding className="w-6 h-6 text-blue-500 mr-3 mt-1" />
                    <div>
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">Mosque Admin Management</h3>
                        <p className="text-blue-700 mb-2">
                            Manage all mosques and their administrators. You can:
                        </p>
                        <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                            <li>View all mosques with or without admins</li>
                            <li>Filter and search across all mosque and admin information</li>
                            <li>Assign admins to mosques that need them</li>
                            <li>Send reminder notifications to potential admins</li>
                            <li>Manage mosque details and admin assignments</li>
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
                            placeholder="Search by mosque or admin details (name, email, phone, location, etc.)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'no_admin' | 'admin_removed' | 'admin_inactive')}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="no_admin">No Admin</option>
                            <option value="admin_removed">Admin Removed</option>
                            <option value="admin_inactive">Admin Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Admin Status Sorting Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">Filter by Admin Status:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAdminStatusFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${adminStatusFilter === 'all'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All Mosques
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${adminStatusFilter === 'all'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {mosques.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setAdminStatusFilter('has_admin')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${adminStatusFilter === 'has_admin'
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Has Admin
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${adminStatusFilter === 'has_admin'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {mosques.filter(m => m.has_approved_admin).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setAdminStatusFilter('no_admin')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${adminStatusFilter === 'no_admin'
                                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            No Admin
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${adminStatusFilter === 'no_admin'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {mosques.filter(m => !m.has_approved_admin).length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedMosques.length > 0 && (
                    <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <span className="text-blue-800 font-semibold">
                            {selectedMosques.length} mosque(s) selected
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => selectedMosques.forEach(id => onSendReminder(id))}
                                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                <FaEnvelope className="w-4 h-4 mr-2" />
                                Send Reminders
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Mosques</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {mosques.length}
                            </p>
                        </div>
                        <FaBuilding className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Has Admin</p>
                            <p className="text-2xl font-bold text-green-600">
                                {mosques.filter(m => m.has_approved_admin).length}
                            </p>
                        </div>
                        <FaUserPlus className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">No Admin</p>
                            <p className="text-2xl font-bold text-red-600">
                                {mosques.filter(m => !m.has_approved_admin).length}
                            </p>
                        </div>
                        <FaUserSlash className="w-8 h-8 text-red-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Filtered Results</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {filteredMosques.length}
                            </p>
                        </div>
                        <FaFilter className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Mosques List */}
            <div className="space-y-4">
                {/* Results Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-3">
                        <FaBuilding className="w-6 h-6 text-orange-600" />
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {adminStatusFilter === 'all' && 'All Mosques - Admin Management'}
                                {adminStatusFilter === 'has_admin' && 'Mosques With Admin'}
                                {adminStatusFilter === 'no_admin' && 'Mosques Without Admin'}
                            </h2>
                            <p className="text-sm text-gray-600">
                                Showing {filteredMosques.length} of {mosques.length} mosques
                                {searchTerm && ` • Search: "${searchTerm}"`}
                            </p>
                        </div>
                    </div>
                    {filteredMosques.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold">
                                {filteredMosques.length}
                            </span>
                        </div>
                    )}
                </div>

                {filteredMosques.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-12 text-center">
                        <FaBuilding className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Mosques Found</h3>
                        <p className="text-gray-500">
                            {searchTerm
                                ? `No mosques match your search "${searchTerm}"`
                                : 'No mosques match the current filters'
                            }
                        </p>
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
                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                    Select All ({filteredMosques.length})
                                </span>
                            </label>
                        </div>

                        {/* Mosque Cards */}
                        {filteredMosques.map((mosque) => {
                            const priority = getPriorityLevel(mosque);
                            return (
                                <div
                                    key={mosque._id}
                                    className={`bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-3xl ${selectedMosques.includes(mosque._id) ? 'ring-2 ring-orange-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start space-x-4">
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={selectedMosques.includes(mosque._id)}
                                            onChange={() => handleSelectMosque(mosque._id)}
                                            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-2"
                                        />

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                                                        <FaBuilding className="w-5 h-5 mr-2 text-orange-600" />
                                                        {mosque.mosque_name}
                                                    </h3>
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <span className={`flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(mosque.status)}`}>
                                                            {getStatusIcon(mosque.status)}
                                                            <span className="ml-1">{getStatusLabel(mosque.status)}</span>
                                                        </span>
                                                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                                                            {mosque.registration_code}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priority.color} bg-gray-100`}>
                                                            {priority.level} Priority
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center text-gray-700">
                                                        <FaMapMarkerAlt className="w-4 h-4 mr-3 text-red-600" />
                                                        <span>{mosque.location}</span>
                                                    </div>
                                                    <div className="flex items-center text-gray-700">
                                                        <FaCalendarAlt className="w-4 h-4 mr-3 text-purple-600" />
                                                        <span>Created: {formatDate(mosque.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {mosque.last_admin_removed && (
                                                        <div className="flex items-center text-gray-700">
                                                            <FaUserSlash className="w-4 h-4 mr-3 text-orange-600" />
                                                            <span>Admin Removed: {formatDate(mosque.last_admin_removed)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center text-gray-700">
                                                        <FaEnvelope className="w-4 h-4 mr-3 text-blue-600" />
                                                        <span>Contact Attempts: {mosque.contact_attempts}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {mosque.removal_reason && (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                                    <p className="text-sm text-yellow-800">
                                                        <strong>Removal Reason:</strong> {mosque.removal_reason}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={() => handleAssignAdmin(mosque._id)}
                                                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                                >
                                                    <FaUserPlus className="w-4 h-4 mr-2" />
                                                    Assign Admin
                                                </button>
                                                <button
                                                    onClick={() => onSendReminder(mosque._id)}
                                                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                                >
                                                    <FaEnvelope className="w-4 h-4 mr-2" />
                                                    Send Reminder
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMosque(mosque._id)}
                                                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                                                >
                                                    <FaTrash className="w-4 h-4 mr-2" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Assign Admin Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaUserPlus className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Assign New Admin</h3>
                            <p className="text-gray-600">
                                Enter the email address of the new administrator for this mosque.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Email Address *
                            </label>
                            <input
                                type="email"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                placeholder="admin@mosque.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setNewAdminEmail('');
                                    setTargetMosque(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAssignAdmin}
                                disabled={!newAdminEmail.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Assign Admin
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                Are you sure you want to delete this mosque? This action cannot be undone.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Deletion *
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
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
                                    setActionReason('');
                                    setTargetMosque(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={!actionReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MosquesWithoutAdmin;