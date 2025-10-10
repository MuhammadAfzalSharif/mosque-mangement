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
    FaClock,
    FaEnvelope,
    FaPhone,
    FaEye,
    FaUserMinus,
    FaIdCard,
    FaCheckCircle
} from 'react-icons/fa';
import { RefreshCw } from 'react-feather';

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
        admin_email: '@gmail.com',
        admin_phone: '+923',
        admin_password: '',
        admin_confirm_password: '',
        super_admin_notes: 'Admin assigned by super admin for mosque management and prayer time updates.'
    });
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        setRemovalReason('Admin removed due to policy compliance');
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
            admin_email: '@gmail.com',
            admin_phone: '+923',
            admin_password: '',
            admin_confirm_password: '',
            super_admin_notes: 'Admin assigned by super admin for mosque management and prayer time updates.'
        });
        setAssignError(null);
        setShowAssignModal(true);
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

        if (!assignFormData.admin_confirm_password.trim()) {
            setAssignError('Please confirm the admin password');
            return;
        }

        if (assignFormData.admin_password !== assignFormData.admin_confirm_password) {
            setAssignError('Passwords do not match');
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
                admin_email: '@gmail.com',
                admin_phone: '+923',
                admin_password: '',
                admin_confirm_password: '',
                super_admin_notes: 'Admin assigned by super admin for mosque management and prayer time updates.'
            });
            setTargetMosque(null);
            setShowPassword(false);
            setShowConfirmPassword(false);

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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            Loading Admin Management
                        </h3>
                        <p className="text-gray-600 text-sm sm:text-base">Please wait while we fetch mosque and admin data...</p>
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
                            onClick={fetchMosquesWithoutAdmin}
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-6 lg:space-y-8">
                {/* Header */}
                <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4 lg:mb-6">
                        <div className="mb-2 sm:mb-0">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent mb-1 sm:mb-2">
                                Admin Management
                            </h1>
                            <p className="text-xs sm:text-sm lg:text-base text-gray-600">Manage mosque administrators and assignments</p>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100/80 backdrop-blur-sm border border-blue-200 rounded-xl sm:rounded-2xl shadow-lg">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <FaBuilding className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            <span className="text-xs sm:text-sm lg:text-base font-semibold text-blue-700">{mosques.length} Total Mosques</span>
                        </div>
                    </div>
                </div>

                {/* Alert Notice */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl sm:rounded-3xl blur-xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-blue-200/50 rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-6 lg:p-8 transform hover:scale-[1.01] transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                            <div className="flex-shrink-0 mx-auto sm:mx-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                                    <FaBuilding className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                                    Mosque Admin Management
                                </h3>
                                <p className="text-gray-600 mb-2 sm:mb-3 text-xs sm:text-sm lg:text-base">
                                    Manage mosque administrators efficiently
                                </p>
                                <div className="grid grid-cols-2 gap-1 sm:gap-2 lg:gap-2 text-xs sm:text-sm">
                                    <div className="flex items-center space-x-1 sm:space-x-2 text-blue-600">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>View mosques</span>
                                    </div>
                                    <div className="flex items-center space-x-1 sm:space-x-2 text-blue-600">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>Search & filter</span>
                                    </div>
                                    <div className="flex items-center space-x-1 sm:space-x-2 text-blue-600">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>Assign admins</span>
                                    </div>
                                    <div className="flex items-center space-x-1 sm:space-x-2 text-blue-600">
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full"></div>
                                        <span>Send reminders</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl sm:rounded-3xl blur-xl"></div>
                    <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-2xl sm:rounded-3xl shadow-2xl p-2 sm:p-4 lg:p-6 transform hover:scale-[1.01] transition-all duration-300">
                        <div className="flex flex-col xl:flex-row gap-2 sm:gap-4 lg:gap-6">
                            {/* Search */}
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <FaSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors duration-300 z-10 w-3 h-3 sm:w-4 sm:h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by mosque or admin details..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="relative w-full pl-8 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 lg:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm text-xs sm:text-sm lg:text-base placeholder-gray-500 transition-all duration-300"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative group w-full xl:w-56 lg:w-64">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <FaFilter className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300 z-10 w-3 h-3 sm:w-4 sm:h-4" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'no_admin' | 'admin_removed' | 'admin_inactive')}
                                    className="relative w-full pl-8 sm:pl-12 pr-8 sm:pr-10 py-2 sm:py-3 lg:py-4 border border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70 backdrop-blur-sm text-xs sm:text-sm lg:text-base appearance-none cursor-pointer transition-all duration-300"
                                >
                                    <option value="all">All Status</option>
                                    <option value="no_admin">No Admin</option>
                                    <option value="admin_removed">Admin Removed</option>
                                    <option value="admin_inactive">Admin Inactive</option>
                                </select>
                                <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Admin Status Sorting Buttons */}
                        <div className="mt-3 sm:mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <span className="text-xs sm:text-sm lg:text-base font-bold text-gray-700">Filter by Admin Status:</span>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 lg:gap-3">
                                <button
                                    onClick={() => setAdminStatusFilter('all')}
                                    className={`group relative overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 ${adminStatusFilter === 'all'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl'
                                        : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200 shadow-lg'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                    <span className="relative flex items-center space-x-1 sm:space-x-2">
                                        <span className="text-xs sm:text-sm lg:text-base">All Mosques</span>
                                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-bold ${adminStatusFilter === 'all'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {mosques.length}
                                        </span>
                                    </span>
                                </button>
                                <button
                                    onClick={() => setAdminStatusFilter('has_admin')}
                                    className={`group relative overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 ${adminStatusFilter === 'has_admin'
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl'
                                        : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200 shadow-lg'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                    <span className="relative flex items-center space-x-1 sm:space-x-2">
                                        <span className="text-xs sm:text-sm lg:text-base">Has Admin</span>
                                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-bold ${adminStatusFilter === 'has_admin'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-green-100 text-green-600'
                                            }`}>
                                            {mosques.filter(m => m.has_approved_admin).length}
                                        </span>
                                    </span>
                                </button>
                                <button
                                    onClick={() => setAdminStatusFilter('no_admin')}
                                    className={`group relative overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-xl sm:rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 ${adminStatusFilter === 'no_admin'
                                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl'
                                        : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200 shadow-lg'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                    <span className="relative flex items-center space-x-1 sm:space-x-2">
                                        <span className="text-xs sm:text-sm lg:text-base">No Admin</span>
                                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-bold ${adminStatusFilter === 'no_admin'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-red-100 text-red-600'
                                            }`}>
                                            {mosques.filter(m => !m.has_approved_admin).length}
                                        </span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedMosques.length > 0 && (
                            <div className="mt-3 sm:mt-6 relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl sm:rounded-2xl blur-lg"></div>
                                <div className="relative bg-blue-50/90 backdrop-blur-sm border border-blue-200/50 rounded-xl sm:rounded-2xl p-2 sm:p-4 lg:p-6 shadow-lg">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                                        <div className="flex items-center space-x-2 sm:space-x-3">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                            <span className="text-blue-800 font-bold text-xs sm:text-sm lg:text-base">
                                                {selectedMosques.length} mosque(s) selected
                                            </span>
                                        </div>
                                        <div className="flex space-x-2 sm:space-x-3">
                                            <button
                                                onClick={() => selectedMosques.forEach(id => onSendReminder(id))}
                                                className="group relative overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                                <span className="relative flex items-center gap-1 sm:gap-2">
                                                    <FaEnvelope className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span className="text-xs sm:text-sm lg:text-base">Send Reminders</span>
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-xl p-4 sm:p-6 transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Total Mosques</p>
                                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        {mosques.length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                                    <FaBuilding className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-xl p-4 sm:p-6 transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Has Admin</p>
                                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        {mosques.filter(m => m.has_approved_admin).length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                                    <FaUserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-xl p-4 sm:p-6 transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">No Admin</p>
                                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                                        {mosques.filter(m => !m.has_approved_admin).length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
                                    <FaUserSlash className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-xl p-4 sm:p-6 transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Filtered Results</p>
                                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                        {filteredMosques.length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                                    <FaFilter className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mosques List */}
                <div className="space-y-2 sm:space-y-4 lg:space-y-6">
                    {/* Results Header */}
                    <div className="hidden sm:relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-3xl blur-xl"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl border border-orange-200/50 rounded-3xl shadow-2xl p-4 sm:p-6 transform hover:scale-[1.01] transition-all duration-300">
                            <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <FaBuilding className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                            {adminStatusFilter === 'all' && 'All Mosques - Admin Management'}
                                            {adminStatusFilter === 'has_admin' && 'Mosques With Admin'}
                                            {adminStatusFilter === 'no_admin' && 'Mosques Without Admin'}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            Showing <span className="font-semibold text-orange-600">{filteredMosques.length}</span> of <span className="font-semibold">{mosques.length}</span> mosques
                                            {searchTerm && <span className="text-blue-600"> • Search: "<span className="font-semibold">{searchTerm}</span>"</span>}
                                        </p>
                                    </div>
                                </div>
                                {filteredMosques.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-2xl shadow-lg">
                                            <span className="text-sm sm:text-base">{filteredMosques.length} Results</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {filteredMosques.length === 0 ? (
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 text-center">
                            <FaBuilding className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-2 sm:mb-3 lg:mb-4" />
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2">No Mosques Found</h3>
                            <p className="text-gray-500 text-xs sm:text-sm lg:text-base">
                                {searchTerm
                                    ? `No mosques match your search "${searchTerm}"`
                                    : 'No mosques match the current filters'
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Select All Header */}
                            <div className="hidden sm:relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-lg"></div>
                                <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-4 sm:p-6">
                                    <label className="hidden sm:flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={selectedMosques.length === filteredMosques.length}
                                            onChange={handleSelectAll}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500 focus:ring-2 transition-all duration-200"
                                        />
                                        <span className="ml-4 text-sm sm:text-base font-bold text-gray-700 group-hover:text-blue-600 transition-colors duration-200">
                                            Select All ({filteredMosques.length} mosques)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Mosque Cards */}
                            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                                {filteredMosques.map((mosque) => (
                                    <div
                                        key={mosque._id}
                                        className="group relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl sm:rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-1.5 sm:p-4 lg:p-6 transform hover:scale-[1.02]">
                                            <div className="flex items-start gap-1.5 sm:gap-4 lg:gap-6">
                                                {/* Checkbox */}
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMosques.includes(mosque._id)}
                                                        onChange={() => handleSelectMosque(mosque._id)}
                                                        className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-1 transition-all duration-200"
                                                    />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Mosque Header */}
                                                    <div className="flex flex-col gap-1 sm:gap-2 lg:gap-4 mb-2 sm:mb-4 lg:mb-6">
                                                        <div className="flex-1">
                                                            <h3 className="text-xs sm:text-lg lg:text-2xl xl:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-0.5 sm:mb-1 lg:mb-3 flex items-center gap-1 sm:gap-2 lg:gap-3">
                                                                <div className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                    <FaBuilding className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                                </div>
                                                                <span className="truncate text-xs sm:text-sm lg:text-xl">{mosque.mosque_name}</span>
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 lg:gap-3">
                                                                <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-3 sm:py-1 lg:px-4 lg:py-2 rounded-lg sm:rounded-lg lg:rounded-2xl text-xs sm:text-xs lg:text-sm font-bold shadow-lg ${getStatusColor(mosque.status)} transition-all duration-300`}>
                                                                    {getStatusIcon(mosque.status)}
                                                                    <span className="ml-1 sm:ml-1 lg:ml-2">{getStatusLabel(mosque.status)}</span>
                                                                </span>
                                                                <div className="hidden sm:flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 rounded-lg sm:rounded-xl">
                                                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></div>
                                                                    <span className="text-xs sm:text-sm text-gray-600 font-medium">ID: {mosque.registration_code}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mosque Details */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 lg:gap-4 mb-2 sm:mb-4 lg:mb-6">
                                                        {/* Location */}
                                                        <div className="group flex items-center gap-1 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-red-50/50 backdrop-blur-sm border border-red-200/50 rounded-lg sm:rounded-lg lg:rounded-2xl hover:bg-red-50 transition-all duration-200">
                                                            <div className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                <FaMapMarkerAlt className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs text-gray-500 font-medium hidden sm:block">Location</p>
                                                                <p className="text-xs sm:text-xs lg:text-sm font-semibold text-gray-700 truncate">{mosque.location}</p>
                                                            </div>
                                                        </div>

                                                        {/* Created Date - Hidden on mobile */}
                                                        <div className="hidden sm:flex group items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-purple-50/50 backdrop-blur-sm border border-purple-200/50 rounded-lg lg:rounded-2xl hover:bg-purple-50 transition-all duration-200">
                                                            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                <FaCalendarAlt className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium">Created</p>
                                                                <p className="text-xs lg:text-sm font-semibold text-gray-700">{formatDate(mosque.created_at)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Mosque Email - Hidden on mobile */}
                                                        {mosque.contact_email && (
                                                            <div className="hidden sm:flex group items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 rounded-lg lg:rounded-2xl hover:bg-blue-50 transition-all duration-200">
                                                                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                    <FaEnvelope className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs text-gray-500 font-medium">Email</p>
                                                                    <p className="text-xs lg:text-sm font-semibold text-gray-700 truncate">{mosque.contact_email}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Mosque Phone - Hidden on mobile */}
                                                        {mosque.contact_phone && (
                                                            <div className="hidden sm:flex group items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-green-50/50 backdrop-blur-sm border border-green-200/50 rounded-lg lg:rounded-2xl hover:bg-green-50 transition-all duration-200">
                                                                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                    <FaPhone className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                                                                    <p className="text-xs lg:text-sm font-semibold text-gray-700">{mosque.contact_phone}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Admin Details Section */}
                                                    {mosque.has_approved_admin && mosque.approved_admin ? (
                                                        <div className="relative mb-2 sm:mb-4 lg:mb-6">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg sm:rounded-lg lg:rounded-2xl blur-lg"></div>
                                                            <div className="relative bg-green-50/90 backdrop-blur-sm border border-green-200/50 rounded-lg sm:rounded-lg lg:rounded-2xl p-1.5 sm:p-4 lg:p-6">
                                                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 mb-1.5 sm:mb-2 lg:mb-4">
                                                                    <div className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                        <FaUserPlus className="w-2.5 h-2.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                                                                    </div>
                                                                    <h4 className="text-xs sm:text-sm lg:text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                                                        Has Admin
                                                                    </h4>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 lg:gap-4">
                                                                    <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-3 bg-white/70 backdrop-blur-sm border border-green-200/30 rounded-lg sm:rounded-lg lg:rounded-xl">
                                                                        <FaIdCard className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-green-600 flex-shrink-0" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs text-gray-500 font-medium hidden sm:block">Name</p>
                                                                            <p className="text-xs sm:text-xs lg:text-sm font-semibold text-green-700 truncate">{mosque.approved_admin.name}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="hidden sm:flex items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-white/70 backdrop-blur-sm border border-green-200/30 rounded-lg lg:rounded-xl">
                                                                        <FaEnvelope className="w-3 h-3 lg:w-4 lg:h-4 text-green-600 flex-shrink-0" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs text-gray-500 font-medium">Email</p>
                                                                            <p className="text-xs lg:text-sm font-semibold text-green-700 truncate">{mosque.approved_admin.email}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="hidden sm:flex items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-white/70 backdrop-blur-sm border border-green-200/30 rounded-lg lg:rounded-xl">
                                                                        <FaPhone className="w-3 h-3 lg:w-4 lg:h-4 text-green-600 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-xs text-gray-500 font-medium">Phone</p>
                                                                            <p className="text-xs lg:text-sm font-semibold text-green-700">{mosque.approved_admin.phone}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="relative mb-2 sm:mb-4 lg:mb-6">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-lg sm:rounded-lg lg:rounded-2xl blur-lg"></div>
                                                            <div className="relative bg-red-50/90 backdrop-blur-sm border border-red-200/50 rounded-lg sm:rounded-lg lg:rounded-2xl p-1.5 sm:p-4 lg:p-6">
                                                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                                                                    <div className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                                        <FaUserSlash className="w-2.5 h-2.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs sm:text-sm lg:text-lg font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-0 sm:mb-0 lg:mb-1">
                                                                            No Admin
                                                                        </h4>
                                                                        <p className="text-xs sm:text-xs lg:text-sm text-red-600 hidden sm:block">This mosque requires an admin to manage operations</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Contact Attempts - Hidden on mobile */}
                                                    <div className="hidden sm:flex items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-lg lg:rounded-2xl mb-4 lg:mb-6">
                                                        <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-gray-500 to-gray-400 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                                            <FaEnvelope className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 font-medium">Contact Attempts</p>
                                                            <p className="text-xs lg:text-sm font-semibold text-gray-700">{mosque.contact_attempts} attempts</p>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-3">
                                                        {/* View Button - Always visible */}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedMosqueForView(mosque);
                                                                setShowViewModal(true);
                                                            }}
                                                            className="group relative overflow-hidden px-2 py-1 sm:px-4 sm:py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-lg lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                                            <span className="relative flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                                                                <FaEye className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                                                <span className="text-xs sm:text-sm lg:text-base">View</span>
                                                            </span>
                                                        </button>

                                                        {/* Conditional Buttons based on admin status */}
                                                        {mosque.has_approved_admin && mosque.approved_admin?.status === 'approved' ? (
                                                            // Has Admin with 'approved' status - Show Remove Admin button
                                                            <button
                                                                onClick={() => handleRemoveAdminClick(mosque)}
                                                                className="group relative overflow-hidden px-2 py-1 sm:px-4 sm:py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-lg sm:rounded-lg lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                                                <span className="relative flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                                                                    <FaUserMinus className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                                                    <span className="text-xs sm:text-sm lg:text-base">Remove</span>
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            // No Admin or admin not in approved status - Show Assign Admin button
                                                            <button
                                                                onClick={() => handleAssignAdmin(mosque._id)}
                                                                className="group relative overflow-hidden px-2 py-1 sm:px-4 sm:py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg sm:rounded-lg lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                                                                <span className="relative flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                                                                    <FaUserPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                                                    <span className="text-xs sm:text-sm lg:text-base">Assign</span>
                                                                </span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Assign Admin Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full p-3 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="mb-3 sm:mb-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                                        <FaUserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-800">Assign New Admin</h3>
                                        <p className="text-xs sm:text-sm text-gray-600">Fill in the admin details</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setAssignFormData({
                                            admin_name: '',
                                            admin_email: '@gmail.com',
                                            admin_phone: '+923',
                                            admin_password: '',
                                            admin_confirm_password: '',
                                            super_admin_notes: 'Admin assigned by super admin for mosque management and prayer time updates.'
                                        });
                                        setAssignError(null);
                                        setTargetMosque(null);
                                        setShowPassword(false);
                                        setShowConfirmPassword(false);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 p-1 sm:p-2"
                                >
                                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {assignError && (
                            <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 flex items-center gap-2 text-red-700">
                                <FaExclamationTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="text-xs sm:text-sm">{assignError}</span>
                            </div>
                        )}

                        {/* Form */}
                        <div className="space-y-3 sm:space-y-4">
                            {/* Admin Name */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    Admin Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaIdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        type="text"
                                        value={assignFormData.admin_name}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_name: e.target.value })}
                                        placeholder="Enter admin full name"
                                        className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
                                        required
                                        minLength={2}
                                        maxLength={50}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 hidden sm:block">2-50 characters, letters only</p>
                            </div>

                            {/* Admin Email */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    Admin Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        type="email"
                                        value={assignFormData.admin_email}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_email: e.target.value })}
                                        placeholder="admin@gmail.com"
                                        className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 hidden sm:block">Use gmail.com, outlook.com, yahoo.com, hotmail.com, icloud.com, or protonmail.com</p>
                            </div>

                            {/* Admin Phone */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    Admin Phone <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                                    <input
                                        type="tel"
                                        value={assignFormData.admin_phone}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_phone: e.target.value })}
                                        placeholder="+923001234567"
                                        className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
                                        required
                                        pattern="^\+923[0-9]{9}$"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 hidden sm:block">Format: +923xxxxxxxxx (Pakistani number)</p>
                            </div>

                            {/* Admin Password */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    Admin Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={assignFormData.admin_password}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_password: e.target.value })}
                                        onPaste={() => setShowConfirmPassword(false)}
                                        placeholder="Enter secure password"
                                        className="w-full pl-8 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
                                        required
                                        minLength={8}
                                        maxLength={50}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 hidden sm:block">Min 8 characters, must include uppercase, lowercase, number, and special character (@$!%*?&#)</p>
                            </div>

                            {/* Confirm Admin Password */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={assignFormData.admin_confirm_password}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, admin_confirm_password: e.target.value })}
                                        onPaste={() => setShowPassword(false)}
                                        placeholder="Confirm password"
                                        className="w-full pl-8 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
                                        required
                                        minLength={8}
                                        maxLength={50}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? (
                                            <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 hidden sm:block">Re-enter the password to confirm</p>
                            </div>

                            {/* Super Admin Notes (Optional) */}
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    Notes <span className="text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    value={assignFormData.super_admin_notes}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, super_admin_notes: e.target.value })}
                                    placeholder="Add any notes..."
                                    rows={2}
                                    maxLength={500}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-xs sm:text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1 hidden sm:block">{assignFormData.super_admin_notes.length}/500 characters</p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setAssignFormData({
                                        admin_name: '',
                                        admin_email: '@gmail.com',
                                        admin_phone: '+923',
                                        admin_password: '',
                                        admin_confirm_password: '',
                                        super_admin_notes: 'Admin assigned by super admin for mosque management and prayer time updates.'
                                    });
                                    setAssignError(null);
                                    setTargetMosque(null);
                                    setShowPassword(false);
                                    setShowConfirmPassword(false);
                                }}
                                disabled={assignLoading}
                                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSubmit}
                                disabled={assignLoading || !assignFormData.admin_name.trim() || !assignFormData.admin_email.trim() || !assignFormData.admin_phone.trim() || !assignFormData.admin_password.trim() || !assignFormData.admin_confirm_password.trim() || assignFormData.admin_password !== assignFormData.admin_confirm_password}
                                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                            >
                                {assignLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <FaUserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-blue-600 text-white p-3 sm:p-6 rounded-t-xl sm:rounded-t-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <FaBuilding className="w-4 h-4 sm:w-6 sm:h-6" />
                                <h3 className="text-lg sm:text-2xl font-bold">{selectedMosqueForView.mosque_name}</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedMosqueForView(null);
                                }}
                                className="text-white hover:bg-blue-700 rounded-lg p-1 sm:p-2 transition-colors"
                            >
                                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Status Badge */}
                        <div className="px-3 sm:px-6 pt-2 sm:pt-4">
                            <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedMosqueForView.status)}`}>
                                {getStatusIcon(selectedMosqueForView.status)}
                                <span className="ml-1">{getStatusLabel(selectedMosqueForView.status)}</span>
                            </span>
                        </div>

                        {/* Modal Body */}
                        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                            {/* Mosque Verification Details Section */}
                            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                                <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaBuilding className="w-4 h-4 text-green-700" />
                                    Mosque Verification Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
                        <div className="sticky bottom-0 bg-gray-100 p-3 sm:p-4 rounded-b-xl sm:rounded-b-2xl border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedMosqueForView(null);
                                }}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-lg transition-colors text-xs sm:text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-4 sm:mb-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <FaExclamationTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2">Confirm Deletion</h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                                Are you sure you want to delete this mosque? This action cannot be undone.
                            </p>
                        </div>

                        <div className="mb-4 sm:mb-6">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                Reason for Deletion *
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Please provide a reason for deleting this mosque..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-xs sm:text-sm"
                                rows={3}
                                required
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setActionReason('');
                                    setTargetMosque(null);
                                }}
                                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={!actionReason.trim()}
                                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Assign Admin */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 animate-scale-in max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-4 sm:mb-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <FaCheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">Confirm Admin Assignment</h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                                Are you sure you want to assign this admin to the mosque?
                            </p>
                        </div>

                        <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-200">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-800 mb-2 sm:mb-3">Admin Details:</h4>
                            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <FaIdCard className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-gray-700 truncate"><strong>Name:</strong> {assignFormData.admin_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <FaEnvelope className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-gray-700 truncate"><strong>Email:</strong> {assignFormData.admin_email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <FaPhone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-gray-700"><strong>Phone:</strong> {assignFormData.admin_phone}</span>
                                </div>
                                {assignFormData.super_admin_notes && (
                                    <div className="flex items-start gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-200">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="text-gray-700 flex-1"><strong>Notes:</strong> {assignFormData.super_admin_notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 sm:p-4 rounded mb-4 sm:mb-6">
                            <div className="flex items-start">
                                <FaExclamationTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                                <div className="text-xs sm:text-sm text-yellow-800">
                                    <p className="font-semibold">Important:</p>
                                    <p className="mt-1">This admin will be immediately approved and can login to manage this mosque.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={cancelAssignConfirmation}
                                disabled={assignLoading}
                                className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAssignAdmin}
                                disabled={assignLoading}
                                className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                            >
                                {assignLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                                        <span>Assigning...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2">
                                <FaUserMinus className="text-red-600 w-4 h-4 sm:w-5 sm:h-5" />
                                Remove Admin
                            </h3>
                            <button
                                onClick={closeRemoveAdminModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
                            <p className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">
                                <strong>Admin:</strong> {selectedMosqueForRemove.approved_admin.name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2 truncate">
                                <strong>Email:</strong> {selectedMosqueForRemove.approved_admin.email}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2 truncate">
                                <strong>Mosque:</strong> {selectedMosqueForRemove.mosque_name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-700 truncate">
                                <strong>Location:</strong> {selectedMosqueForRemove.location}
                            </p>
                        </div>

                        <div className="mb-4 sm:mb-6">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                Removal Reason *
                            </label>
                            <textarea
                                value={removalReason}
                                onChange={(e) => setRemovalReason(e.target.value)}
                                placeholder="Explain why this admin is being removed (minimum 10 characters)..."
                                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-xs sm:text-sm"
                                rows={3}
                                disabled={removeLoading}
                            />
                            {removeError && (
                                <div className="mt-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-xs sm:text-sm text-red-600 font-medium">{removeError}</p>
                                </div>
                            )}
                            <p className="mt-1 sm:mt-2 text-xs text-gray-500">
                                The admin's account will be preserved with 'admin_removed' status and they can reapply for a different mosque.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={closeRemoveAdminModal}
                                disabled={removeLoading}
                                className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemoveAdmin}
                                disabled={removeLoading || !removalReason.trim() || removalReason.trim().length < 10}
                                className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                            >
                                {removeLoading ? (
                                    <>
                                        <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Removing...
                                    </>
                                ) : (
                                    <>
                                        <FaUserMinus className="w-3 h-3 sm:w-4 sm:h-4" />
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
        // </div>
    );
};

export default AdminManagement;