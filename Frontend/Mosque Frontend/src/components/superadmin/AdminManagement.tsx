import React, { useState, useEffect } from 'react';
import { superAdminApi, mosqueApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import Toast from '../Toast';
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
    FaEnvelope,
    FaPhone,
    FaEye,
    FaUserMinus,
    FaIdCard,
    FaCheckCircle
} from 'react-icons/fa';

interface MosqueWithoutAdmin {
    _id: string;
    mosque_name: string;
    location: string;
    registration_code: string;
    verification_code_expires?: string;
    created_at: string;
    updated_at?: string;
    last_admin_removed?: string;
    removal_reason?: string;
    contact_attempts: number;
    status: 'no_admin' | 'admin_removed' | 'admin_inactive' | 'approved';
    description?: string;
    contact_email?: string;
    contact_phone?: string;
    admin_instructions?: string;
    prayer_times?: {
        fajr: string | null;
        dhuhr: string | null;
        asr: string | null;
        maghrib: string | null;
        isha: string | null;
        jummah: string | null;
    };
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
        id: string;
        name: string;
        email: string;
        phone: string;
        status: string;
    };
}

interface Props {
    onDelete: (mosqueId: string, reason: string) => void;
    onSendReminder: (mosqueId: string) => void;
}

const AdminManagement: React.FC<Props> = ({ onDelete, onSendReminder }) => {
    const [mosques, setMosques] = useState<MosqueWithoutAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'no_admin' | 'admin_removed' | 'admin_inactive'>('all');
    const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'has_admin' | 'no_admin'>('all');
    const [selectedMosques, setSelectedMosques] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [targetMosque, setTargetMosque] = useState<string | null>(null);
    const [selectedMosqueForView, setSelectedMosqueForView] = useState<MosqueWithoutAdmin | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [assignFormData, setAssignFormData] = useState({
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        admin_password: '',
        super_admin_notes: ''
    });
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'warning'; message: string }>({
        show: false,
        type: 'success',
        message: ''
    });

    // State for remove admin modal
    const [showRemoveAdminModal, setShowRemoveAdminModal] = useState(false);
    const [selectedMosqueForRemove, setSelectedMosqueForRemove] = useState<MosqueWithoutAdmin | null>(null);
    const [removalReason, setRemovalReason] = useState('');
    const [removeLoading, setRemoveLoading] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

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
            // IMPORTANT: Only include admins with status='approved' (not admin_removed, mosque_deleted, etc.)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const approvedAdminsByMosque = new Map<string, any>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            approvedAdmins.forEach((admin: any) => {
                const mosqueId = admin.mosque_id?._id || admin.mosque_id;
                // Only include admins with approved status
                if (mosqueId && admin.status === 'approved') {
                    approvedAdminsByMosque.set(mosqueId, {
                        id: admin._id,
                        name: admin.name,
                        email: admin.email,
                        phone: admin.phone,
                        status: admin.status
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
                    verification_code_expires: mosque.verification_code_expires || null,
                    created_at: mosque.createdAt || new Date().toISOString(),
                    updated_at: mosque.updatedAt || null,
                    contact_attempts: 0,
                    status: hasApprovedAdmin ? 'approved' as const : 'no_admin' as const,
                    description: mosque.description || '',
                    contact_email: mosque.contact_email || '',
                    contact_phone: mosque.contact_phone || '',
                    admin_instructions: mosque.admin_instructions || '',
                    prayer_times: mosque.prayer_times || {
                        fajr: null,
                        dhuhr: null,
                        asr: null,
                        maghrib: null,
                        isha: null,
                        jummah: null
                    },
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

    const handleRemoveAdminClick = (mosque: MosqueWithoutAdmin) => {
        setSelectedMosqueForRemove(mosque);
        setRemovalReason('');
        setRemoveError(null);
        setShowRemoveAdminModal(true);
    };

    const handleRemoveAdmin = async () => {
        if (!selectedMosqueForRemove || !selectedMosqueForRemove.approved_admin) {
            setRemoveError('No admin selected');
            return;
        }

        if (!removalReason.trim()) {
            setRemoveError('Please provide a removal reason');
            return;
        }

        if (removalReason.trim().length < 10) {
            setRemoveError('Removal reason must be at least 10 characters long');
            return;
        }

        try {
            setRemoveLoading(true);
            setRemoveError(null);

            console.log('Removing admin with ID:', selectedMosqueForRemove.approved_admin.id);
            console.log('Removal reason:', removalReason.trim());

            await superAdminApi.removeAdmin(selectedMosqueForRemove.approved_admin.id, {
                removal_reason: removalReason.trim()
            });

            // Refresh the list
            await fetchMosquesWithoutAdmin();

            // Close modal and reset
            setShowRemoveAdminModal(false);
            setSelectedMosqueForRemove(null);
            setRemovalReason('');

            // Show success toast
            setToast({
                show: true,
                type: 'success',
                message: `Admin ${selectedMosqueForRemove.approved_admin.name} has been successfully removed from ${selectedMosqueForRemove.mosque_name}`
            });

            // Hide toast after 5 seconds
            setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 5000);

        } catch (err) {
            console.error('Failed to remove admin:', err);
            const errorMsg = getErrorMessage(err);
            setRemoveError(errorMsg);
        } finally {
            setRemoveLoading(false);
        }
    };

    const closeRemoveAdminModal = () => {
        setShowRemoveAdminModal(false);
        setSelectedMosqueForRemove(null);
        setRemovalReason('');
        setRemoveError(null);
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
        setAssignFormData({
            admin_name: '',
            admin_email: '',
            admin_phone: '',
            admin_password: '',
            super_admin_notes: ''
        });
        setAssignError(null);
        setShowAssignModal(true);
    };

    const handleDeleteMosque = (mosqueId: string) => {
        setTargetMosque(mosqueId);
        setShowDeleteModal(true);
    };

    const handleAssignSubmit = () => {
        // Validation
        if (!assignFormData.admin_name.trim()) {
            setAssignError('Admin name is required');
            return;
        }

        if (!assignFormData.admin_email.trim()) {
            setAssignError('Admin email is required');
            return;
        }

        if (!assignFormData.admin_phone.trim()) {
            setAssignError('Admin phone is required');
            return;
        }

        if (!assignFormData.admin_password.trim()) {
            setAssignError('Admin password is required');
            return;
        }

        if (assignFormData.admin_password.length < 6) {
            setAssignError('Password must be at least 6 characters long');
            return;
        }

        if (!targetMosque) {
            setAssignError('Mosque not selected');
            return;
        }

        // Show confirmation modal
        setShowAssignModal(false);
        setShowConfirmModal(true);
    };

    const confirmAssignAdmin = async () => {
        try {
            setAssignLoading(true);
            setAssignError(null);
            setShowConfirmModal(false);

            const response = await superAdminApi.assignAdminToMosque(targetMosque!, {
                admin_name: assignFormData.admin_name,
                admin_email: assignFormData.admin_email,
                admin_phone: assignFormData.admin_phone,
                admin_password: assignFormData.admin_password,
                super_admin_notes: assignFormData.super_admin_notes || undefined
            });

            console.log('Admin assigned successfully:', response.data);

            // Reset form
            setAssignFormData({
                admin_name: '',
                admin_email: '',
                admin_phone: '',
                admin_password: '',
                super_admin_notes: ''
            });
            setTargetMosque(null);

            // Refresh the mosques list
            await fetchMosquesWithoutAdmin();

            // Show success toast
            setToast({
                show: true,
                type: 'success',
                message: 'Admin successfully assigned to mosque!'
            });
        } catch (err: unknown) {
            console.error('Error assigning admin:', err);

            // Show specific error messages
            let errorMessage = 'Failed to assign admin. Please try again.';

            const error = err as { response?: { data?: { code?: string; error?: string; admin?: { name?: string } } } };

            if (error.response?.data?.code === 'EMAIL_ALREADY_EXISTS') {
                errorMessage = 'This email is already registered by another admin.';
            } else if (error.response?.data?.code === 'PHONE_ALREADY_EXISTS') {
                errorMessage = 'This phone number is already registered by another admin.';
            } else if (error.response?.data?.code === 'ADMIN_ALREADY_EXISTS') {
                errorMessage = `This mosque already has an approved admin: ${error.response.data.admin?.name}`;
            } else if (error.response?.data?.code === 'MOSQUE_NOT_FOUND') {
                errorMessage = 'Mosque not found.';
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            setToast({
                show: true,
                type: 'error',
                message: errorMessage
            });

            // Reopen the assign modal with the error
            setAssignError(errorMessage);
            setShowAssignModal(true);
        } finally {
            setAssignLoading(false);
        }
    };

    const cancelAssignConfirmation = () => {
        setShowConfirmModal(false);
        setShowAssignModal(true);
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
                        {filteredMosques.map((mosque) => (
                            <div
                                key={mosque._id}
                                className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedMosques.includes(mosque._id)}
                                        onChange={() => handleSelectMosque(mosque._id)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                                    />

                                    {/* Content */}
                                    <div className="flex-1">
                                        {/* Mosque Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                                    <FaBuilding className="w-5 h-5 text-orange-600" />
                                                    {mosque.mosque_name}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(mosque.status)}`}>
                                                        {getStatusIcon(mosque.status)}
                                                        <span className="ml-1">{getStatusLabel(mosque.status)}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mosque Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            {/* Location */}
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <FaMapMarkerAlt className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                <span className="text-sm">{mosque.location}</span>
                                            </div>

                                            {/* Created Date */}
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <FaCalendarAlt className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                <span className="text-sm">Created: {formatDate(mosque.created_at)}</span>
                                            </div>

                                            {/* Mosque Email */}
                                            {mosque.contact_email && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <FaEnvelope className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                    <span className="text-sm truncate">{mosque.contact_email}</span>
                                                </div>
                                            )}

                                            {/* Mosque Phone */}
                                            {mosque.contact_phone && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <FaPhone className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                    <span className="text-sm">{mosque.contact_phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Admin Details Section */}
                                        {mosque.has_approved_admin && mosque.approved_admin ? (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                                                    <FaUserPlus className="w-4 h-4" />
                                                    Admin Details
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                    <div className="flex items-center gap-2 text-green-700">
                                                        <FaIdCard className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{mosque.approved_admin.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-green-700">
                                                        <FaEnvelope className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{mosque.approved_admin.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-green-700">
                                                        <FaPhone className="w-3 h-3 flex-shrink-0" />
                                                        <span>{mosque.approved_admin.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                                <p className="text-sm text-red-700 flex items-center gap-2">
                                                    <FaUserSlash className="w-4 h-4" />
                                                    <span className="font-medium">No admin assigned to this mosque</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* Contact Attempts */}
                                        <div className="flex items-center gap-2 text-gray-600 mb-4">
                                            <FaEnvelope className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">Contact Attempts: {mosque.contact_attempts}</span>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-2">
                                            {/* View Button - Always visible */}
                                            <button
                                                onClick={() => {
                                                    setSelectedMosqueForView(mosque);
                                                    setShowViewModal(true);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                                            >
                                                <FaEye className="w-4 h-4" />
                                                View
                                            </button>

                                            {/* Conditional Buttons based on admin status */}
                                            {mosque.has_approved_admin && mosque.approved_admin?.status === 'approved' ? (
                                                // Has Admin with 'approved' status - Show Remove Admin button
                                                <button
                                                    onClick={() => handleRemoveAdminClick(mosque)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                                                >
                                                    <FaUserMinus className="w-4 h-4" />
                                                    Remove Admin
                                                </button>
                                            ) : (
                                                // No Admin or admin not in approved status - Show Assign Admin button
                                                <button
                                                    onClick={() => handleAssignAdmin(mosque._id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
                                                >
                                                    <FaUserPlus className="w-4 h-4" />
                                                    Assign Admin
                                                </button>
                                            )}

                                            {/* Delete Mosque Button */}
                                            <button
                                                onClick={() => handleDeleteMosque(mosque._id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors text-sm"
                                            >
                                                <FaTrash className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Assign Admin Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                        <FaUserPlus className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">Assign New Admin</h3>
                                        <p className="text-sm text-gray-600">Fill in the admin details to assign to this mosque</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setAssignFormData({
                                            admin_name: '',
                                            admin_email: '',
                                            admin_phone: '',
                                            admin_password: '',
                                            super_admin_notes: ''
                                        });
                                        setAssignError(null);
                                        setTargetMosque(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {assignError && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                                <FaExclamationTriangle className="w-5 h-5" />
                                <span className="text-sm">{assignError}</span>
                            </div>
                        )}

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Admin Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Admin Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaIdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={assignFormData.admin_name}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_name: e.target.value })}
                                        placeholder="Enter admin full name"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                        minLength={2}
                                        maxLength={50}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">2-50 characters, letters only</p>
                            </div>

                            {/* Admin Email */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Admin Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={assignFormData.admin_email}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_email: e.target.value })}
                                        placeholder="admin@gmail.com"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Use gmail.com, outlook.com, yahoo.com, hotmail.com, icloud.com, or protonmail.com</p>
                            </div>

                            {/* Admin Phone */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Admin Phone <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={assignFormData.admin_phone}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_phone: e.target.value })}
                                        placeholder="+923001234567"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                        pattern="^\+923[0-9]{9}$"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Format: +923xxxxxxxxx (Pakistani number)</p>
                            </div>

                            {/* Admin Password */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Admin Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        type="password"
                                        value={assignFormData.admin_password}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_password: e.target.value })}
                                        placeholder="Enter secure password"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                        minLength={8}
                                        maxLength={50}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Min 8 characters, must include uppercase, lowercase, number, and special character (@$!%*?&#)</p>
                            </div>

                            {/* Super Admin Notes (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Super Admin Notes <span className="text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    value={assignFormData.super_admin_notes}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, super_admin_notes: e.target.value })}
                                    placeholder="Add any notes about this admin assignment..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">{assignFormData.super_admin_notes.length}/500 characters</p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setAssignFormData({
                                        admin_name: '',
                                        admin_email: '',
                                        admin_phone: '',
                                        admin_password: '',
                                        super_admin_notes: ''
                                    });
                                    setAssignError(null);
                                    setTargetMosque(null);
                                }}
                                disabled={assignLoading}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSubmit}
                                disabled={assignLoading || !assignFormData.admin_name.trim() || !assignFormData.admin_email.trim() || !assignFormData.admin_phone.trim() || !assignFormData.admin_password.trim()}
                                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {assignLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <FaUserPlus className="w-4 h-4" />
                                        Assign Admin
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedMosqueForView && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FaBuilding className="w-6 h-6" />
                                <h3 className="text-2xl font-bold">{selectedMosqueForView.mosque_name}</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedMosqueForView(null);
                                }}
                                className="text-white hover:bg-blue-700 rounded-lg p-2 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Status Badge */}
                        <div className="px-6 pt-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedMosqueForView.status)}`}>
                                {getStatusIcon(selectedMosqueForView.status)}
                                <span className="ml-1">{getStatusLabel(selectedMosqueForView.status)}</span>
                            </span>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Mosque Verification Details Section */}
                            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                                <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaBuilding className="w-4 h-4 text-green-700" />
                                    Mosque Verification Details
                                </h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaBuilding className="w-3 h-3 text-gray-600" />
                                            <label className="text-xs font-semibold text-gray-600">Mosque Name</label>
                                        </div>
                                        <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.mosque_name}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaEnvelope className="w-3 h-3 text-gray-600" />
                                            <label className="text-xs font-semibold text-gray-600">Contact Email</label>
                                        </div>
                                        <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.contact_email || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaMapMarkerAlt className="w-3 h-3 text-gray-600" />
                                            <label className="text-xs font-semibold text-gray-600">Location</label>
                                        </div>
                                        <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.location}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaPhone className="w-3 h-3 text-gray-600" />
                                            <label className="text-xs font-semibold text-gray-600">Contact Phone</label>
                                        </div>
                                        <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.contact_phone || 'Not provided'}</p>
                                    </div>
                                    {selectedMosqueForView.description && (
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaBuilding className="w-3 h-3 text-gray-600" />
                                                <label className="text-xs font-semibold text-gray-600">Description</label>
                                            </div>
                                            <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Verification Code Information Section */}
                            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                                <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Verification Code Information
                                </h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600">Current Verification Code</label>
                                        <p className="text-sm text-gray-900 font-mono bg-yellow-100 px-3 py-2 rounded mt-1 border border-yellow-300">
                                            {selectedMosqueForView.registration_code}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600">Code Status</label>
                                        <p className="text-sm text-green-700 font-semibold mt-1 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Active
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-gray-600">Code Expires</label>
                                        <p className="text-sm text-green-700 mt-1">
                                            {selectedMosqueForView.verification_code_expires
                                                ? new Date(selectedMosqueForView.verification_code_expires).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                }) + ' at ' + new Date(selectedMosqueForView.verification_code_expires).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                    hour12: true
                                                })
                                                : 'Not set'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Instructions Section - Only show if present */}
                            {selectedMosqueForView.admin_instructions && (
                                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Admin Instructions
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {selectedMosqueForView.admin_instructions}
                                    </p>
                                </div>
                            )}

                            {/* Admin Details Section */}
                            {selectedMosqueForView.has_approved_admin && selectedMosqueForView.approved_admin ? (
                                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                                    <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <FaUserPlus className="w-4 h-4 text-green-700" />
                                        Approved Admin Details
                                    </h4>
                                    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaIdCard className="w-3 h-3 text-gray-600" />
                                                <label className="text-xs font-semibold text-gray-600">Admin Name</label>
                                            </div>
                                            <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.approved_admin.name}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaEnvelope className="w-3 h-3 text-gray-600" />
                                                <label className="text-xs font-semibold text-gray-600">Admin Email</label>
                                            </div>
                                            <p className="text-sm text-gray-900 ml-5 truncate">{selectedMosqueForView.approved_admin.email}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaPhone className="w-3 h-3 text-gray-600" />
                                                <label className="text-xs font-semibold text-gray-600">Admin Phone</label>
                                            </div>
                                            <p className="text-sm text-gray-900 ml-5">{selectedMosqueForView.approved_admin.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaUserSlash className="w-4 h-4 text-red-700" />
                                        Admin Status
                                    </h4>
                                    <p className="text-sm text-red-700 flex items-center gap-2">
                                        <FaExclamationTriangle className="w-4 h-4" />
                                        <span className="font-medium">No admin currently assigned to this mosque</span>
                                    </p>
                                </div>
                            )}

                            {/* Pending Admin Applications */}
                            {selectedMosqueForView.pending_admins && selectedMosqueForView.pending_admins.length > 0 && (
                                <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
                                    <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <FaClock className="w-4 h-4 text-yellow-700" />
                                        Pending Admin Applications ({selectedMosqueForView.pending_admins.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedMosqueForView.pending_admins.map((admin, index) => (
                                            <div key={index} className="bg-white rounded-lg p-3 border border-yellow-300">
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-xs text-gray-600">Name:</span>
                                                        <p className="font-medium text-gray-900">{admin.name}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-600">Email:</span>
                                                        <p className="font-medium text-gray-900 truncate">{admin.email}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-600">Phone:</span>
                                                        <p className="font-medium text-gray-900">{admin.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rejected Admin Applications */}
                            {selectedMosqueForView.rejected_admins && selectedMosqueForView.rejected_admins.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-300">
                                    <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <FaUserSlash className="w-4 h-4 text-gray-700" />
                                        Rejected Admin Applications ({selectedMosqueForView.rejected_admins.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedMosqueForView.rejected_admins.map((admin, index) => (
                                            <div key={index} className="bg-white rounded-lg p-3 border border-gray-300">
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-xs text-gray-600">Name:</span>
                                                        <p className="font-medium text-gray-900">{admin.name}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-600">Email:</span>
                                                        <p className="font-medium text-gray-900 truncate">{admin.email}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-600">Phone:</span>
                                                        <p className="font-medium text-gray-900">{admin.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-gray-100 p-4 rounded-b-2xl border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedMosqueForView(null);
                                }}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
                            >
                                Close
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

            {/* Confirmation Modal for Assign Admin */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaCheckCircle className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirm Admin Assignment</h3>
                            <p className="text-gray-600">
                                Are you sure you want to assign this admin to the mosque?
                            </p>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-3">Admin Details:</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <FaIdCard className="w-4 h-4 text-blue-600" />
                                    <span className="text-gray-700"><strong>Name:</strong> {assignFormData.admin_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaEnvelope className="w-4 h-4 text-blue-600" />
                                    <span className="text-gray-700"><strong>Email:</strong> {assignFormData.admin_email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaPhone className="w-4 h-4 text-blue-600" />
                                    <span className="text-gray-700"><strong>Phone:</strong> {assignFormData.admin_phone}</span>
                                </div>
                                {assignFormData.super_admin_notes && (
                                    <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200">
                                        <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="text-gray-700 flex-1"><strong>Notes:</strong> {assignFormData.super_admin_notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6">
                            <div className="flex items-start">
                                <FaExclamationTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                                <div className="text-sm text-yellow-800">
                                    <p className="font-semibold">Important:</p>
                                    <p className="mt-1">This admin will be immediately approved and can login to manage this mosque.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={cancelAssignConfirmation}
                                disabled={assignLoading}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAssignAdmin}
                                disabled={assignLoading}
                                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {assignLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Assigning...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle className="w-4 h-4" />
                                        <span>Confirm & Assign</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Admin Modal */}
            {showRemoveAdminModal && selectedMosqueForRemove && selectedMosqueForRemove.approved_admin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FaUserMinus className="text-red-600" />
                                Remove Admin
                            </h3>
                            <button
                                onClick={closeRemoveAdminModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Admin:</strong> {selectedMosqueForRemove.approved_admin.name}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Email:</strong> {selectedMosqueForRemove.approved_admin.email}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Mosque:</strong> {selectedMosqueForRemove.mosque_name}
                            </p>
                            <p className="text-sm text-gray-700">
                                <strong>Location:</strong> {selectedMosqueForRemove.location}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Removal Reason *
                            </label>
                            <textarea
                                value={removalReason}
                                onChange={(e) => setRemovalReason(e.target.value)}
                                placeholder="Explain why this admin is being removed (minimum 10 characters)..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                rows={4}
                                disabled={removeLoading}
                            />
                            {removeError && (
                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600 font-medium">{removeError}</p>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                                The admin's account will be preserved with 'admin_removed' status and they can reapply for a different mosque.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeRemoveAdminModal}
                                disabled={removeLoading}
                                className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemoveAdmin}
                                disabled={removeLoading || !removalReason.trim() || removalReason.trim().length < 10}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {removeLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Removing...
                                    </>
                                ) : (
                                    <>
                                        <FaUserMinus />
                                        Remove Admin
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
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

export default AdminManagement;