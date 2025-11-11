import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../lib/api';
import { getErrorMessage } from '../lib/types';
import {
    BarChart,
    Clock,
    CheckCircle,
    XCircle,
    Trash2,
    AlertTriangle,
    Activity,
    Menu,
    X,
    LogOut,
    Key
} from 'react-feather';
import {
    FaBuilding,
    FaEye,
    FaEdit,
    FaTimes,
    FaCheckCircle
} from 'react-icons/fa';
import Toast from '../components/Toast';

// Import tab components
import DashboardOverview from '../components/superadmin/DashboardOverview.tsx';
import PendingRequests from '../components/superadmin/PendingRequests.tsx';
import ApprovedMosques from '../components/superadmin/ApprovedMosques.tsx';
import RejectedAdmins from '../components/superadmin/RejectedAdmins.tsx';
import MosqueRegistrationSelector from '../components/superadmin/MosqueRegistrationSelector.tsx';
import DeleteMosques from '../components/superadmin/DeleteMosques.tsx';
import AdminManagement from '../components/superadmin/AdminManagement.tsx';
import AuditLogs from '../components/superadmin/AuditLogs.tsx';
import SuperAdminManagement from '../components/superadmin/SuperAdminManagement.tsx';
import CodeRegeneration from '../components/superadmin/CodeRegeneration.tsx';

type TabType = 'dashboard' | 'pending' | 'approved' | 'rejected' | 'registration' | 'delete' | 'no-admin' | 'audit' | 'superadmin' | 'code-regeneration';

interface ToastState {
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
}

interface DashboardStats {
    total_mosques: number;
    approved_mosques: number;
    pending_requests: number;
    rejected_requests: number;
    mosque_deleted_admins: number;
    admin_removed_admins: number;
    code_regenerated_admins: number;
    total_super_admins: number;
    total_audit_logs: number;
}

interface AdminApplication {
    _id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    verification_code_used: string;
    createdAt: string;
}

interface MosqueDetails {
    id: string;
    name: string;
    location: string;
    description?: string;
    contact_phone?: string;
    contact_email?: string;
    admin_instructions?: string;
    verification_code: string;
    code_expires: string;
    code_expired: boolean;
    prayer_times?: {
        fajr?: string;
        dhuhr?: string;
        asr?: string;
        maghrib?: string;
        isha?: string;
        jummah?: string;
    };
}

interface MosqueDetailsModalData {
    request: {
        mosque_id?: string;
        mosque_name?: string;
        admin_name?: string;
        admin_email?: string;
        admin_phone?: string;
        registration_code?: string;
    };
    mosqueData?: {
        mosque: MosqueDetails;
        admin_applications: AdminApplication[];
    } | null;
    error?: string;
}

interface ApprovedMosqueForEdit {
    _id: string;
    mosque_name: string;
    admin_name: string;
    admin_email: string;
    admin_phone: string;
    location: string;
    registration_code: string;
    created_at: string;
    approved_at: string;
    status: 'approved';
    admin_id?: string;
    mosque_id?: string;
}

interface UpdateMosqueData {
    name?: string;
    location?: string;
    description?: string;
    contact_phone?: string;
    contact_email?: string;
    admin_instructions?: string;
    prayer_times?: {
        fajr?: string;
        dhuhr?: string;
        asr?: string;
        maghrib?: string;
        isha?: string;
        jummah?: string;
    };
}

interface PrayerTimesData {
    fajr?: string;
    dhuhr?: string;
    asr?: string;
    maghrib?: string;
    isha?: string;
    jummah?: string;
}



const SuperAdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false); // New state for background refresh indicator
    const [error, setError] = useState<string | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedMosqueDetails, setSelectedMosqueDetails] = useState<MosqueDetailsModalData | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMosqueForEdit, setSelectedMosqueForEdit] = useState<ApprovedMosqueForEdit | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', message: '' });
    const [refreshApprovedMosques, setRefreshApprovedMosques] = useState(0); // Trigger for refreshing approved mosques
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar toggle
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true); // Toggle for auto-refresh - enabled by default
    const autoRefreshIntervalRef = useRef<number | null>(null); // Ref to store interval ID
    const [editFormData, setEditFormData] = useState({
        name: '',
        location: '',
        description: '',
        contact_phone: '',
        contact_email: '',
        admin_instructions: '',
        prayer_times: {
            fajr: '',
            dhuhr: '',
            asr: '',
            maghrib: '',
            isha: '',
            jummah: ''
        }
    });

    const fetchStats = useCallback(async (isInitialLoad = false) => {
        try {
            // Don't show loading spinner for background updates
            // Only show loading on initial load
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
            console.log('Fetching dashboard stats...');
            const response = await superAdminApi.getDashboardStats();
            console.log('Dashboard stats response:', response.data);
            setStats({
                ...response.data.stats,
                mosque_deleted_admins: 0,
                admin_removed_admins: 0,
                code_regenerated_admins: 0,
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            // Only set error on initial load, not background updates
            if (isInitialLoad) {
                setError(getErrorMessage(err));
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Toggle auto-refresh functionality
    const toggleAutoRefresh = useCallback(() => {
        if (isAutoRefreshEnabled) {
            // Stop auto-refresh
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
                autoRefreshIntervalRef.current = null;
            }
            setIsAutoRefreshEnabled(false);
            setToast({ show: true, type: 'warning', message: 'Auto-refresh disabled' });
        } else {
            // Start auto-refresh
            setIsAutoRefreshEnabled(true);
            autoRefreshIntervalRef.current = setInterval(() => {
                fetchStats(false);
            }, 30000); // 30 seconds
            setToast({ show: true, type: 'success', message: 'Auto-refresh enabled - updates every 30 seconds' });
        }
    }, [isAutoRefreshEnabled, fetchStats]);

    useEffect(() => {
        // Check if super admin is logged in
        const superAdmin = localStorage.getItem('superadmin');
        const userType = localStorage.getItem('user_type');

        if (!superAdmin || userType !== 'superadmin') {
            navigate('/superadmin/login');
            return;
        }

        // Initial fetch
        fetchStats(true);

        // Cleanup interval on component unmount
        return () => {
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };

    }, [navigate, fetchStats]);

    // Separate effect to handle auto-refresh setup
    useEffect(() => {
        if (isAutoRefreshEnabled && stats) {
            // Start auto-refresh only if enabled and after initial load
            autoRefreshIntervalRef.current = setInterval(() => {
                fetchStats(false);
            }, 30000); // 30 seconds
        } else {
            // Clear interval if auto-refresh is disabled
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
                autoRefreshIntervalRef.current = null;
            }
        }

        return () => {
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current);
            }
        };
    }, [isAutoRefreshEnabled, stats, fetchStats]);

    // Handler functions for pending requests
    const handleApproveAdmin = async (id: string, notes?: string) => {
        try {
            console.log('Approving admin ID:', id, 'with notes:', notes);
            const response = await superAdminApi.approveAdmin(id, { super_admin_notes: notes });
            console.log('Approval response:', response);
            await fetchStats(false); // Refresh stats
            setToast({ show: true, type: 'success', message: 'Admin approved successfully!' });
        } catch (err) {
            console.error('Failed to approve admin:', err);
            const errorMessage = getErrorMessage(err);
            setToast({ show: true, type: 'error', message: `Failed to approve admin: ${errorMessage}` });
            throw err; // Re-throw to let component handle it
        }
    };

    const handleRejectAdmin = async (id: string, reason: string) => {
        try {
            console.log('Rejecting admin ID:', id, 'with reason:', reason);
            const response = await superAdminApi.rejectAdmin(id, { reason });
            console.log('Rejection response:', response);
            await fetchStats(false); // Refresh stats
            setToast({ show: true, type: 'success', message: 'Admin rejected successfully!' });
        } catch (err) {
            console.error('Failed to reject admin:', err);
            const errorMessage = getErrorMessage(err);
            setToast({ show: true, type: 'error', message: `Failed to reject admin: ${errorMessage}` });
            throw err; // Re-throw to let component handle it
        }
    };

    const handleViewMosqueDetails = async (request: { mosque_id?: string; mosque_name?: string; admin_name?: string }) => {
        try {
            if (request.mosque_id) {
                const response = await superAdminApi.getMosqueVerificationDetails(request.mosque_id);
                setSelectedMosqueDetails({
                    request,
                    mosqueData: response.data
                });
                setShowDetailsModal(true);
            } else {
                setSelectedMosqueDetails({
                    request,
                    mosqueData: null
                });
                setShowDetailsModal(true);
            }
        } catch (err) {
            console.error('Failed to fetch mosque details:', err);
            setSelectedMosqueDetails({
                request,
                error: 'Failed to load mosque details. Please try again.'
            });
            setShowDetailsModal(true);
        }
    };

    // Handler for viewing approved mosque details
    const handleViewApprovedMosque = async (mosque: ApprovedMosqueForEdit) => {
        try {
            if (mosque.mosque_id) {
                const response = await superAdminApi.getMosqueVerificationDetails(mosque.mosque_id);
                setSelectedMosqueDetails({
                    request: {
                        mosque_id: mosque.mosque_id,
                        mosque_name: mosque.mosque_name,
                        admin_name: mosque.admin_name,
                        admin_email: mosque.admin_email,
                        admin_phone: mosque.admin_phone,
                        registration_code: mosque.registration_code
                    },
                    mosqueData: response.data
                });
                setShowDetailsModal(true);
            } else {
                setToast({
                    show: true,
                    type: 'error',
                    message: '⚠ No mosque ID found for this record.'
                });
            }
        } catch (err) {
            console.error('Failed to fetch mosque details:', err);
            const errorMessage = getErrorMessage(err);
            setToast({
                show: true,
                type: 'error',
                message: `Failed to load mosque details: ${errorMessage}`
            });
        }
    };

    // Handler for editing approved mosque
    const handleEditApprovedMosque = async (mosque: ApprovedMosqueForEdit) => {
        try {
            // Fetch full mosque details first
            if (mosque.mosque_id) {
                console.log('Fetching mosque details for editing:', mosque.mosque_id);
                const response = await superAdminApi.getMosqueVerificationDetails(mosque.mosque_id);
                const mosqueData = response.data.mosque;

                console.log('Mosque data received:', mosqueData);
                console.log('Prayer times in mosque data:', mosqueData.prayer_times);

                setSelectedMosqueForEdit(mosque);

                // Set form data with existing values or empty strings
                const formData = {
                    name: mosqueData.name || '',
                    location: mosqueData.location || '',
                    description: mosqueData.description || '',
                    contact_phone: mosqueData.contact_phone || '',
                    contact_email: mosqueData.contact_email || '',
                    admin_instructions: mosqueData.admin_instructions || '',
                    prayer_times: {
                        fajr: mosqueData.prayer_times?.fajr || '',
                        dhuhr: mosqueData.prayer_times?.dhuhr || '',
                        asr: mosqueData.prayer_times?.asr || '',
                        maghrib: mosqueData.prayer_times?.maghrib || '',
                        isha: mosqueData.prayer_times?.isha || '',
                        jummah: mosqueData.prayer_times?.jummah || ''
                    }
                };

                console.log('Setting form data:', formData);
                setEditFormData(formData);
                setShowEditModal(true);
            } else {
                setToast({
                    show: true,
                    type: 'error',
                    message: '⚠ No mosque ID found. Cannot edit this record.'
                });
            }
        } catch (err) {
            console.error('Failed to fetch mosque details for editing:', err);
            const errorMessage = getErrorMessage(err);
            setToast({
                show: true,
                type: 'error',
                message: `Failed to load mosque details: ${errorMessage}`
            });
        }
    };

    // Handler for saving mosque edits - show confirmation first
    const handleSaveMosqueEdit = () => {
        setShowConfirmModal(true);
    };

    // Handler for confirming mosque edits
    const handleConfirmMosqueEdit = async () => {
        try {
            if (!selectedMosqueForEdit || !selectedMosqueForEdit.mosque_id) {
                setToast({
                    show: true,
                    type: 'error',
                    message: '⚠ No mosque selected for editing.'
                });
                return;
            }

            // Only send fields that have values (not empty strings)
            const updateData: UpdateMosqueData = {};
            if (editFormData.name.trim()) updateData.name = editFormData.name.trim();
            if (editFormData.location.trim()) updateData.location = editFormData.location.trim();
            if (editFormData.description.trim()) updateData.description = editFormData.description.trim();
            if (editFormData.contact_phone.trim()) updateData.contact_phone = editFormData.contact_phone.trim();
            if (editFormData.contact_email.trim()) updateData.contact_email = editFormData.contact_email.trim();
            if (editFormData.admin_instructions.trim()) updateData.admin_instructions = editFormData.admin_instructions.trim();

            // Handle prayer times - include both filled and empty values for complete update
            const prayerTimes: PrayerTimesData = {
                fajr: editFormData.prayer_times.fajr.trim(),
                dhuhr: editFormData.prayer_times.dhuhr.trim(),
                asr: editFormData.prayer_times.asr.trim(),
                maghrib: editFormData.prayer_times.maghrib.trim(),
                isha: editFormData.prayer_times.isha.trim(),
                jummah: editFormData.prayer_times.jummah.trim()
            };

            // Always include prayer times object to allow clearing them if needed
            updateData.prayer_times = prayerTimes;

            console.log('Updating mosque with data:', updateData);

            const response = await superAdminApi.updateMosque(selectedMosqueForEdit.mosque_id, updateData);

            // Close confirmation modal and show success modal
            setShowConfirmModal(false);
            setShowSuccessModal(true);

            // Show success toast
            const mosqueName = editFormData.name || selectedMosqueForEdit.mosque_name || 'Mosque';
            setToast({
                show: true,
                type: 'success',
                message: `${mosqueName} details updated successfully!`
            });

            console.log('Mosque updated successfully:', response.data);

            // Trigger refresh of approved mosques list
            setRefreshApprovedMosques(prev => prev + 1);

        } catch (err) {
            console.error('Failed to update mosque:', err);
            const errorMessage = getErrorMessage(err);

            setShowConfirmModal(false);

            // Show error toast with server message
            setToast({
                show: true,
                type: 'error',
                message: `Failed to update mosque: ${errorMessage}`
            });
        }
    };

    // Handler for closing success modal
    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setShowEditModal(false);
        setSelectedMosqueForEdit(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('superadmin');
        localStorage.removeItem('user_type');
        localStorage.removeItem('token');
        navigate('/');
    };

    const tabs = [
        {
            id: 'dashboard' as TabType,
            label: 'Dashboard',
            icon: BarChart,
            count: null
        },
        {
            id: 'pending' as TabType,
            label: 'Pending Requests',
            icon: Clock,
            count: stats?.pending_requests || 0
        },
        {
            id: 'approved' as TabType,
            label: 'Approved Mosques',
            icon: CheckCircle,
            count: stats?.approved_mosques || 0
        },
        {
            id: 'registration' as TabType,
            label: 'Mosque Registration',
            icon: FaBuilding,
            count: null
        },
        {
            id: 'code-regeneration' as TabType,
            label: 'Code Regeneration',
            icon: Key,
            count: null
        },
        {
            id: 'delete' as TabType,
            label: 'Delete Mosques',
            icon: Trash2,
            count: null
        },
        {
            id: 'no-admin' as TabType,
            label: 'Admin Management',
            icon: AlertTriangle,
            count: null
        },
        {
            id: 'rejected' as TabType,
            label: 'Rejected Admins',
            icon: XCircle,
            count: stats?.rejected_requests || 0
        },
        {
            id: 'audit' as TabType,
            label: 'Audit Logs',
            icon: Activity,
            count: stats?.total_audit_logs || 0
        },
        {
            id: 'superadmin' as TabType,
            label: 'Super Admin Management',
            icon: AlertTriangle,
            count: stats?.total_super_admins || 0
        }
    ];

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardOverview stats={stats} onRefresh={() => fetchStats(false)} />;
            case 'pending':
                return (
                    <PendingRequests
                        onApprove={handleApproveAdmin}
                        onReject={handleRejectAdmin}
                        onViewDetails={handleViewMosqueDetails}
                    />
                );
            case 'approved':
                return (
                    <ApprovedMosques
                        onViewDetails={handleViewApprovedMosque}
                        onEdit={handleEditApprovedMosque}
                        refreshTrigger={refreshApprovedMosques}
                    />
                );
            case 'rejected':
                return <RejectedAdmins />;
            case 'registration':
                return (
                    <MosqueRegistrationSelector
                        onCompleteRegister={async (data) => {
                            try {
                                const registrationData = {
                                    mosque_name: data.mosque_name as string,
                                    location: data.location as string,
                                    description: (data.description as string) || '',
                                    contact_phone: (data.contact_phone as string) || '',
                                    contact_email: (data.contact_email as string) || '',
                                    admin_instructions: (data.admin_instructions as string) || '',
                                    admin_name: data.admin_name as string,
                                    admin_email: data.admin_email as string,
                                    admin_phone: data.admin_phone as string,
                                    admin_password: data.admin_password as string,
                                    registration_code: data.registration_code as string
                                };

                                const response = await superAdminApi.registerMosqueWithAdmin(registrationData);
                                console.log('Complete registration successful:', response.data);

                                // Show success toast immediately
                                setToast({
                                    show: true,
                                    type: 'success',
                                    message: ` Mosque "${data.mosque_name}" registered successfully with Admin "${data.admin_name}"!`
                                });

                                // Refresh stats in background (no need to wait)
                                fetchStats();
                            } catch (error) {
                                console.error('Complete registration failed:', error);

                                // Show error toast
                                setToast({
                                    show: true,
                                    type: 'error',
                                    message: ` Registration failed: ${getErrorMessage(error)}`
                                });

                                throw error; // Re-throw to let the component handle the error
                            }
                        }}
                        onSimpleRegister={async (data) => {
                            try {
                                const registrationData = {
                                    name: data.name as string,
                                    location: data.location as string,
                                    description: (data.description as string) || '',
                                    contact_phone: (data.contact_phone as string) || '',
                                    contact_email: (data.contact_email as string) || '',
                                    admin_instructions: (data.admin_instructions as string) || ''
                                };

                                const response = await superAdminApi.registerSimpleMosque(registrationData);
                                console.log('Simple mosque registration successful:', response.data);

                                // Show success toast with verification code immediately
                                const verificationCode = response.data?.mosque?.verification_code || 'N/A';
                                setToast({
                                    show: true,
                                    type: 'success',
                                    message: ` Mosque "${data.name}" registered successfully! Verification Code: ${verificationCode}`
                                });

                                // Refresh stats in background (no need to wait)
                                fetchStats();

                                // Return the response data so the component can access verification_code
                                return response.data;
                            } catch (error) {
                                console.error('Simple mosque registration failed:', error);

                                // Show error toast
                                setToast({
                                    show: true,
                                    type: 'error',
                                    message: ` Registration failed: ${getErrorMessage(error)}`
                                });

                                throw error; // Re-throw to let the component handle the error
                            }
                        }}
                    />
                );
            case 'code-regeneration':
                return <CodeRegeneration />;
            case 'delete':
                return <DeleteMosques />;
            case 'no-admin':
                return (
                    <AdminManagement
                        onDelete={(id: string, reason: string) => console.log('Delete:', id, reason)}
                        onSendReminder={(id: string) => console.log('Send Reminder:', id)}
                    />
                );
            case 'audit':
                return <AuditLogs />;
            case 'superadmin':
                return <SuperAdminManagement />;
            default:
                return <DashboardOverview stats={stats} onRefresh={() => fetchStats(false)} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="flex relative">
                {/* Universal Toggle Button - Works for all screen sizes */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="fixed top-3 left-3 z-[10000] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    title={isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
                >
                    {isSidebarOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                {/* Overlay for mobile when sidebar is open */}
                {isSidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[9990]"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Enhanced Sidebar with slide animation for all screens */}
                <div className={`
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    fixed z-[9995]
                    w-64 sm:w-72 lg:w-80 xl:w-80 bg-white/95 backdrop-blur-lg border-r border-white/20 shadow-2xl min-h-screen max-h-screen
                    transition-all duration-300 ease-in-out overflow-hidden
                    flex flex-col
                `}>
                    {/* Header Section - Simplified without logo and text */}
                    <div className={`${isSidebarOpen ? 'pt-16 sm:pt-18' : 'pt-16 sm:pt-18 lg:pt-20'} p-4 sm:p-5 lg:p-6 border-b border-gray-200 flex-shrink-0`}>
                        <div className="flex flex-col items-center space-y-4">
                            {/* Auto-refresh Toggle Button */}
                            <div className="flex items-center justify-center">
                                <button
                                    onClick={toggleAutoRefresh}
                                    className={`
                                        relative p-3 sm:p-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2
                                        ${isAutoRefreshEnabled
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white focus:ring-green-500'
                                            : 'bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white focus:ring-gray-500'
                                        }
                                    `}
                                    title={isAutoRefreshEnabled ? 'Click to disable auto-refresh' : 'Click to enable auto-refresh (30s intervals)'}
                                >
                                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                                    {/* Status indicator dot */}
                                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isAutoRefreshEnabled ? 'bg-green-300 animate-pulse' : 'bg-gray-300'}`}></span>
                                </button>
                            </div>

                            {/* Status Text */}
                            <div className="flex items-center space-x-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${isRefreshing ? 'bg-yellow-400 animate-pulse' : isAutoRefreshEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                <span className="text-base font-medium text-gray-600">
                                    {isRefreshing ? 'Updating Dashboard...' : isAutoRefreshEnabled ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Section - Scrollable */}
                    <nav className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 space-y-1 sm:space-y-2 custom-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        // Only close sidebar on mobile screens
                                        if (window.innerWidth < 1024) {
                                            setIsSidebarOpen(false);
                                        }
                                    }}
                                    className={`
                                        w-full flex items-center justify-between p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl text-left transition-all duration-300 group relative overflow-hidden
                                        ${isActive
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-[1.02]'
                                            : 'text-gray-700 hover:bg-white/60 hover:shadow-md hover:scale-[1.01]'
                                        }
                                    `}
                                >
                                    <div className="flex items-center min-w-0 flex-1">
                                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-500'
                                            }`} />
                                        <span className={`font-medium text-sm sm:text-base lg:text-base truncate ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
                                            }`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                    {tab.count !== null && tab.count > 0 && (
                                        <span className={`
                                            ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-sm font-bold flex-shrink-0
                                            ${isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                                            }
                                        `}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Logout Button - Fixed at bottom */}
                    <div className="flex-shrink-0 p-2 sm:p-3 lg:p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center"
                        >
                            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            <span className="text-xs sm:text-sm lg:text-base">Logout</span>
                        </button>
                    </div>
                </div>

                {/* Main Content with dynamic spacing based on sidebar state */}
                <div className={`
                    flex-1 min-h-screen transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'lg:ml-80 xl:ml-80' : 'ml-0'}
                `}>
                    <div className={`h-screen overflow-y-auto p-2 sm:p-3 lg:p-6 ${isSidebarOpen ? 'pt-16 sm:pt-18 lg:pt-6' : 'pt-20 sm:pt-22 lg:pt-16'}`}>
                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                <p className="text-red-700 font-medium text-sm sm:text-base">{error}</p>
                            </div>
                        )}

                        {renderActiveTab()}
                    </div>
                </div>
            </div>

            {/* Modern 3D Mosque Details Modal */}
            {showDetailsModal && selectedMosqueDetails && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998] p-2 sm:p-3 lg:p-4">
                    <div className="relative bg-white backdrop-blur-xl border border-gray-200/50 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-2xl w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full blur-lg"></div>

                        {/* Modern Header */}
                        <div className="relative z-10 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white p-4 sm:p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                                        <FaEye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold">Mosque Verification Details</h2>
                                        <p className="text-blue-100 text-sm sm:text-base mt-1">Request Information & Verification Status</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-red-500/80 text-white hover:text-white rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-sm shadow-lg hover:scale-110"
                                >
                                    <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modern Content with Scrollbar */}
                        <div className="relative z-10 p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                            {selectedMosqueDetails.error ? (
                                <div className="relative bg-gradient-to-br from-red-50 via-rose-50/50 to-red-50/30 backdrop-blur-xl border-2 border-red-200/50 rounded-2xl shadow-xl p-6 text-center">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-100/20 to-transparent opacity-60 rounded-2xl"></div>
                                    <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-red-200/20 to-transparent rounded-full blur-lg"></div>

                                    <div className="relative z-10">
                                        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                                            <FaTimes className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Details</h3>
                                        <p className="text-red-700">{selectedMosqueDetails.error}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 sm:space-y-6">
                                    {/* Basic Information */}
                                    <div>
                                        <h4 className="text-base sm:text-sm font-semibold text-gray-800 mb-3 bg-blue-100 px-3 py-1 rounded-lg inline-block">
                                            Basic Information
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Mosque Name</label>
                                                <p className="text-gray-800 font-semibold text-sm sm:text-base">{selectedMosqueDetails.mosqueData?.mosque?.name || selectedMosqueDetails.request.mosque_name || 'N/A'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Location</label>
                                                <p className="text-gray-800 text-sm sm:text-base">{selectedMosqueDetails.mosqueData?.mosque?.location || 'N/A'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Registration Code</label>
                                                <p className="text-gray-800 font-mono bg-yellow-100 px-2 py-1 rounded text-xs sm:text-sm font-semibold">
                                                    {selectedMosqueDetails.request.registration_code || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Registration Date</label>
                                                <p className="text-gray-800 text-sm sm:text-base">Oct 8, 2025, 01:56 PM</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin Information */}
                                    <div>
                                        <h4 className="text-base sm:text-sm font-semibold text-gray-800 mb-3 bg-green-100 px-3 py-1 rounded-lg inline-block">
                                            Admin Information
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Admin Name</label>
                                                <p className="text-gray-800 font-semibold text-sm sm:text-base">{selectedMosqueDetails.request.admin_name || 'N/A'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Admin Email</label>
                                                <p className="text-gray-800 text-sm sm:text-base">{selectedMosqueDetails.request.admin_email || 'N/A'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Admin Phone</label>
                                                <p className="text-gray-800 text-sm sm:text-base">{selectedMosqueDetails.request.admin_phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mosque Management Contact */}
                                    <div>
                                        <h4 className="text-base sm:text-sm font-semibold text-gray-800 mb-3 bg-indigo-100 px-3 py-1 rounded-lg inline-block">
                                            Mosque Management Contact
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Mosque Management Email</label>
                                                <p className="text-gray-800 text-sm sm:text-base">{selectedMosqueDetails.mosqueData?.mosque?.contact_email || selectedMosqueDetails.request.admin_email || 'N/A'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                                <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 block">Management Phone</label>
                                                <p className="text-gray-800 text-sm sm:text-base">{selectedMosqueDetails.mosqueData?.mosque?.contact_phone || selectedMosqueDetails.request.admin_phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>                                    {/* Modern Mosque Information Section */}
                                    {selectedMosqueDetails.mosqueData ? (
                                        <div className="relative bg-gradient-to-br from-green-50 via-emerald-50/50 to-green-50/30 backdrop-blur-xl border-2 border-green-200/50 rounded-2xl shadow-lg p-4 sm:p-6">
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 to-transparent opacity-60 rounded-2xl"></div>
                                            <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg"></div>

                                            <div className="relative z-10">
                                                <h3 className="text-base sm:text-sm font-bold text-gray-800 mb-4 bg-green-100 px-3 py-2 rounded-lg inline-block">
                                                    <span className="text-lg mr-2">🕌</span>
                                                    Mosque Verification Details
                                                </h3>

                                                {/* Basic Mosque Information */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                </svg>
                                                                Mosque Name
                                                            </label>
                                                            <p className="text-gray-800 font-semibold text-lg">{selectedMosqueDetails.mosqueData.mosque?.name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                Location
                                                            </label>
                                                            <p className="text-gray-800">{selectedMosqueDetails.mosqueData.mosque?.location || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                Contact Phone
                                                            </label>
                                                            <p className="text-gray-800">{selectedMosqueDetails.mosqueData.mosque?.contact_phone || 'Not provided'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                Contact Email
                                                            </label>
                                                            <p className="text-gray-800">{selectedMosqueDetails.mosqueData.mosque?.contact_email || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                Description
                                                            </label>
                                                            <p className="text-gray-800 text-sm">{selectedMosqueDetails.mosqueData.mosque?.description || 'No description provided'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Verification Code Information */}
                                                <div className="border-t pt-6">
                                                    <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center">
                                                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2a2 2 0 00-2-2m0 0a2 2 0 012-2m0 0a2 2 0 00-2 2m2 2a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2a2 2 0 00-2-2" />
                                                        </svg>
                                                        Verification Code Information
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600">Current Verification Code</label>
                                                            <p className="text-gray-800 font-mono bg-blue-100 px-3 py-2 rounded-lg text-lg font-semibold">
                                                                {selectedMosqueDetails.mosqueData.mosque?.verification_code || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-600">Code Status</label>
                                                            <div className="flex items-center mt-1">
                                                                <div className={`w-3 h-3 rounded-full mr-2 ${selectedMosqueDetails.mosqueData.mosque?.code_expired ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                                                <p className={`font-semibold ${selectedMosqueDetails.mosqueData.mosque?.code_expired ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {selectedMosqueDetails.mosqueData.mosque?.code_expired ? 'Expired' : 'Active'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="text-sm font-medium text-gray-600">Code Expires</label>
                                                            <p className={`text-gray-800 font-semibold ${selectedMosqueDetails.mosqueData.mosque?.code_expired ? 'text-red-600' : 'text-green-600'}`}>
                                                                {selectedMosqueDetails.mosqueData.mosque?.code_expires
                                                                    ? new Date(selectedMosqueDetails.mosqueData.mosque.code_expires).toLocaleDateString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })
                                                                    : 'N/A'
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Admin Instructions */}
                                                {selectedMosqueDetails.mosqueData.mosque?.admin_instructions && (
                                                    <div className="border-t pt-6 mt-6">
                                                        <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                                                            <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Admin Instructions
                                                        </h4>
                                                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                                            <p className="text-gray-700 text-sm leading-relaxed">{selectedMosqueDetails.mosqueData.mosque.admin_instructions}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative bg-gradient-to-br from-orange-50 via-yellow-50/50 to-orange-50/30 backdrop-blur-xl border-2 border-orange-200/50 rounded-2xl shadow-lg p-6 text-center">
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-100/20 to-transparent opacity-60 rounded-2xl"></div>
                                            <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-orange-200/20 to-transparent rounded-full blur-lg"></div>

                                            <div className="relative z-10">
                                                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                                                    <FaTimes className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-800 mb-2">No Mosque Information</h3>
                                                <p className="text-orange-700">This request does not have associated mosque verification details.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Admin Applications History */}
                                    {selectedMosqueDetails.mosqueData?.admin_applications && selectedMosqueDetails.mosqueData.admin_applications.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Application History
                                            </h3>
                                            <div className="space-y-3">
                                                {selectedMosqueDetails.mosqueData.admin_applications.map((app: AdminApplication, index: number) => (
                                                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-semibold text-gray-800">{app.name}</p>
                                                                <p className="text-sm text-gray-600">{app.email}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${app.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {app.status}
                                                                </span>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {new Date(app.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modern Footer */}
                        <div className="relative z-10 p-4 sm:p-6 border-t border-gray-200 flex justify-center">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern 3D Edit Mosque Modal */}
            {showEditModal && selectedMosqueForEdit && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998] p-2 sm:p-3 lg:p-4">
                    <div className="relative bg-white backdrop-blur-xl border border-gray-200/50 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-2xl w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full blur-lg"></div>

                        {/* Modern Header */}
                        <div className="relative z-10 bg-gradient-to-r from-emerald-600 via-green-600 to-blue-600 text-white p-4 sm:p-6 rounded-t-2xl flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                                        <FaEdit className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold">Edit Mosque Details</h2>
                                        <p className="text-green-100 text-sm sm:text-base mt-1">Update mosque information and prayer times</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-red-500/80 text-white hover:text-white rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-sm shadow-lg hover:scale-110"
                                >
                                    <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modern Content with Scrollbar */}
                        <div className="relative z-10 p-4 sm:p-6 flex-1 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <h3 className="text-base sm:text-sm font-semibold text-gray-800 mb-3 bg-blue-100 px-3 py-1 rounded-lg inline-block">
                                        Basic Information
                                    </h3>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Mosque Name</label>
                                        <input
                                            type="text"
                                            value={editFormData.name}
                                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            placeholder="Enter mosque name"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Location</label>
                                        <input
                                            type="text"
                                            value={editFormData.location}
                                            onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            placeholder="Enter location"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Description</label>
                                        <textarea
                                            value={editFormData.description}
                                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            placeholder="A mosque serving the local Muslim community with daily prayers, Friday sermons, and various Islamic activities and events."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Contact Phone</label>
                                        <input
                                            type="tel"
                                            value={editFormData.contact_phone}
                                            onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            placeholder="+923024228990"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Contact Email</label>
                                        <input
                                            type="email"
                                            value={editFormData.contact_email}
                                            onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            placeholder="hira@gmail.com"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Admin Instructions</label>
                                        <textarea
                                            value={editFormData.admin_instructions}
                                            onChange={(e) => setEditFormData({ ...editFormData, admin_instructions: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            placeholder="To become an admin for this mosque, please contact the mosque management committee with your full name, phone number, and email address."
                                            rows={4}
                                        />
                                    </div>
                                </div>

                                {/* Prayer Times */}
                                <div className="space-y-4">
                                    <h3 className="text-base sm:text-sm font-semibold text-gray-800 mb-3 bg-green-100 px-3 py-1 rounded-lg inline-block">
                                        Prayer Times
                                    </h3>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Fajr</label>
                                        <input
                                            type="time"
                                            value={editFormData.prayer_times.fajr}
                                            onChange={(e) => setEditFormData({
                                                ...editFormData,
                                                prayer_times: { ...editFormData.prayer_times, fajr: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Dhuhr</label>
                                        <input
                                            type="time"
                                            value={editFormData.prayer_times.dhuhr}
                                            onChange={(e) => setEditFormData({
                                                ...editFormData,
                                                prayer_times: { ...editFormData.prayer_times, dhuhr: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Asr</label>
                                        <input
                                            type="time"
                                            value={editFormData.prayer_times.asr}
                                            onChange={(e) => setEditFormData({
                                                ...editFormData,
                                                prayer_times: { ...editFormData.prayer_times, asr: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Maghrib</label>
                                        <input
                                            type="time"
                                            value={editFormData.prayer_times.maghrib}
                                            onChange={(e) => setEditFormData({
                                                ...editFormData,
                                                prayer_times: { ...editFormData.prayer_times, maghrib: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Isha</label>
                                        <input
                                            type="time"
                                            value={editFormData.prayer_times.isha}
                                            onChange={(e) => setEditFormData({
                                                ...editFormData,
                                                prayer_times: { ...editFormData.prayer_times, isha: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Jummah</label>
                                        <input
                                            type="time"
                                            value={editFormData.prayer_times.jummah}
                                            onChange={(e) => setEditFormData({
                                                ...editFormData,
                                                prayer_times: { ...editFormData.prayer_times, jummah: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modern Footer */}
                        <div className="relative z-20 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center justify-center">
                                        <FaTimes className="w-4 h-4 mr-2" />
                                        <span>Cancel</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                                <button
                                    onClick={handleSaveMosqueEdit}
                                    className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                >
                                    <div className="flex items-center justify-center">
                                        <FaCheckCircle className="w-4 h-4 mr-2" />
                                        <span>Save Changes</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern 3D Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998] p-3 sm:p-4">
                    <div className="relative bg-white backdrop-blur-xl border border-gray-200/50 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-2xl w-full max-w-xs sm:max-w-md transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-yellow-200/20 to-transparent rounded-full blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full blur-lg"></div>

                        {/* Modern Header */}
                        <div className="relative z-10 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center justify-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg mr-3">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold">Confirm Update</h3>
                            </div>
                        </div>

                        <div className="relative z-10 p-6">
                            <div className="text-center mb-6">
                                <p className="text-gray-700 text-lg mb-4">
                                    Are you sure you want to update the mosque details? This action will modify the mosque information and prayer times.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                    <div className="flex items-center justify-center">
                                        <FaTimes className="w-4 h-4 mr-2" />
                                        <span>Cancel</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                                <button
                                    onClick={handleConfirmMosqueEdit}
                                    className="flex-1 group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                    <div className="flex items-center justify-center">
                                        <FaCheckCircle className="w-4 h-4 mr-2" />
                                        <span>Yes, Update</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern 3D Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998] p-3 sm:p-4">
                    <div className="relative bg-white backdrop-blur-xl border border-gray-200/50 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-2xl w-full max-w-xs sm:max-w-md transform scale-95 animate-[modalSlideIn_0.3s_ease-out_forwards]">
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl"></div>
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-lg"></div>

                        {/* Modern Header */}
                        <div className="relative z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center justify-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg mr-3">
                                    <FaCheckCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold">Success!</h3>
                            </div>
                        </div>

                        <div className="relative z-10 p-6 text-center">
                            <div className="mb-6">
                                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <FaCheckCircle className="w-10 h-10 text-white" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-800 mb-3">
                                    Mosque Details Updated!
                                </h4>
                                <p className="text-gray-600 mb-6">
                                    The mosque information and prayer times have been successfully updated. Changes will be reflected across the system.
                                </p>
                            </div>

                            <button
                                onClick={handleCloseSuccessModal}
                                className="group relative w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <div className="flex items-center justify-center">
                                    <FaCheckCircle className="w-5 h-5 mr-2" />
                                    <span>Great!</span>
                                </div>
                                <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                            </button>
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

            {/* Custom Styles for Enhanced Sidebar */}
            <style>{`
                /* Custom scrollbar for navigation */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 10px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
                    border-radius: 10px;
                    opacity: 0.7;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #2563eb, #7c3aed);
                    opacity: 1;
                }

                /* Enhanced sidebar animation */
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-100%);
                    }
                }

                /* Modal animations */
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Backdrop blur enhancement */
                .backdrop-blur-enhanced {
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                }

                /* Smooth transitions for content area */
                .content-transition {
                    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* Enhanced shadow effects */
                .shadow-3d {
                    box-shadow: 
                        0 10px 25px -3px rgba(0, 0, 0, 0.1),
                        0 4px 6px -2px rgba(0, 0, 0, 0.05),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }

                /* Glassmorphism effect */
                .glass-effect {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                /* Mobile optimizations */
                @media (max-width: 640px) {
                    .sidebar-mobile {
                        width: 280px;
                    }
                }

                @media (max-width: 360px) {
                    .sidebar-mobile {
                        width: 260px;
                    }
                    
                    .text-mobile-xs {
                        font-size: 0.65rem;
                    }
                    
                    .p-mobile-xs {
                        padding: 0.375rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default SuperAdminDashboard;