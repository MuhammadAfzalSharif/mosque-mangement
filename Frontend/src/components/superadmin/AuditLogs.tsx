

import React, { useState, useEffect } from 'react';
import {
    FaHistory, FaSearch, FaFilter, FaDownload, FaCheck, FaTimes, FaClock,
    FaUser, FaCalendarAlt, FaBuilding, FaUserPlus, FaUserMinus, FaCode,
    FaEye, FaTrash, FaSync, FaExclamationTriangle, FaUserShield
} from 'react-icons/fa';
import { superAdminApi } from '../../lib/api';
import Toast from '../Toast';

interface AuditLog {
    _id: string;
    action_type: string;
    performed_by: {
        user_id: string;
        user_type: 'admin' | 'super_admin' | 'system';
        user_email: string;
        user_name: string;
    };
    target: {
        target_type: 'mosque' | 'admin' | 'verification_code' | 'prayer_times' | 'system';
        target_id?: string;
        target_name?: string;
    };
    action_details: {
        mosque_data?: Record<string, unknown>;
        admin_data?: Record<string, unknown>;
        prayer_times?: Record<string, unknown>;
        before_data?: Record<string, unknown>;
        after_data?: Record<string, unknown>;
        error_data?: Record<string, unknown>;
        reason?: string;
        notes?: string;
        ip_address?: string;
        user_agent?: string;
    };
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    description?: string;
}

interface AuditStats {
    action_stats: Array<{ _id: string; count: number; latest: string }>;
    user_stats: Array<{ _id: string; count: number }>;
    status_stats: Array<{ _id: string; count: number }>;
    target_stats: Array<{ _id: string; count: number }>;
    last_24h: number;
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    generated_at: string;
}

interface Props {
    onViewDetails?: (log: AuditLog) => void;
    onExportLogs?: (filters?: Record<string, unknown>) => void;
}

const AuditLogs: React.FC<Props> = ({ onViewDetails, onExportLogs }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [sortBy, setSortBy] = useState<'timestamp' | 'action_type' | 'user_name' | 'status'>('timestamp');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [isSearching, setIsSearching] = useState(false);

    // New state for bulk operations
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [cleanupReason, setCleanupReason] = useState('Complete audit log cleanup to clear all system logs for maintenance purposes');
    const [bulkDeleteReason, setBulkDeleteReason] = useState('Bulk deletion of selected audit logs for compliance and maintenance purposes');
    const [isDeleting, setIsDeleting] = useState(false);

    // Debounce search term to prevent excessive API calls
    useEffect(() => {
        if (searchTerm !== debouncedSearchTerm) {
            setIsSearching(true);
        }

        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setIsSearching(false);
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [searchTerm, debouncedSearchTerm]);

    useEffect(() => {
        // Reset to page 1 when filters change (but not when search term changes immediately)
        setPage(1);
        // Clear selected logs when filters change
        setSelectedLogs([]);
    }, [actionFilter, userFilter, dateRange, debouncedSearchTerm, sortBy, sortOrder]);

    useEffect(() => {
        fetchAuditLogs();
        fetchAuditStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, actionFilter, userFilter, dateRange, debouncedSearchTerm, sortBy, sortOrder]);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page,
                limit: 20,
                sort_by: sortBy,
                sort_order: sortOrder,
            };

            if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
            if (actionFilter !== 'all') params.action_type = actionFilter;
            if (userFilter !== 'all') params.user_type = userFilter;

            const now = new Date();
            if (dateRange === 'today') {
                params.start_date = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                params.end_date = new Date().toISOString();
            } else if (dateRange === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                params.start_date = weekAgo.toISOString();
            } else if (dateRange === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                params.start_date = monthAgo.toISOString();
            }

            const response = await superAdminApi.getAuditLogs(params);
            setLogs(response.data.audit_logs || []);
            setTotalPages(response.data.pagination?.pages || 1);
            setTotalLogs(response.data.pagination?.total || 0);
        } catch (error: unknown) {
            console.error('Error fetching audit logs:', error);
            const errorMessage = error instanceof Error && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to fetch audit logs'
                : 'Failed to fetch audit logs';
            setToast({
                message: errorMessage,
                type: 'error'
            });
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditStats = async () => {
        try {
            const response = await superAdminApi.getAuditStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching audit stats:', error);
        }
    };

    const handleExportLogs = async () => {
        try {
            const params: Record<string, string | string[]> = {};

            // If logs are selected, export only selected logs
            if (selectedLogs.length > 0) {
                params.log_ids = selectedLogs;
            } else {
                // If no logs selected, apply filters and date range
                if (actionFilter !== 'all') params.action_type = actionFilter;
                if (userFilter !== 'all') params.user_type = userFilter;

                const now = new Date();
                if (dateRange === 'today') {
                    params.start_date = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                    params.end_date = new Date().toISOString();
                } else if (dateRange === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    params.start_date = weekAgo.toISOString();
                } else if (dateRange === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    params.start_date = monthAgo.toISOString();
                }
            }

            const response = await superAdminApi.exportAuditLogs(params);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Notify parent that an export occurred (optional)
            onExportLogs?.(params);

            const exportMessage = selectedLogs.length > 0
                ? `${selectedLogs.length} selected audit logs exported successfully`
                : 'All audit logs exported successfully';
            setToast({ message: exportMessage, type: 'success' });
        } catch (error: unknown) {
            console.error('Error exporting audit logs:', error);
            const errorMessage = error instanceof Error && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to export audit logs'
                : 'Failed to export audit logs';
            setToast({
                message: errorMessage,
                type: 'error'
            });
        }
    };

    const handleCleanupLogs = async () => {
        setShowCleanupModal(true);
    };

    const confirmCleanupLogs = async () => {
        if (cleanupReason.trim().length < 10) {
            setToast({
                message: 'Reason must be at least 10 characters long',
                type: 'warning'
            });
            return;
        }

        try {
            setIsDeleting(true);
            const response = await superAdminApi.cleanupAuditLogs(0, cleanupReason.trim());
            setToast({
                message: response.data.message || 'Audit logs cleaned up successfully',
                type: 'success'
            });
            setShowCleanupModal(false);
            setCleanupReason('Complete audit log cleanup to clear all system logs for maintenance purposes');
            fetchAuditLogs();
            fetchAuditStats();
        } catch (error: unknown) {
            console.error('Error cleaning up audit logs:', error);
            const errorMessage = error instanceof Error && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to cleanup audit logs'
                : 'Failed to cleanup audit logs';
            setToast({
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDeleteLogs = () => {
        if (selectedLogs.length === 0) {
            setToast({
                message: 'Please select at least one log to delete',
                type: 'warning'
            });
            return;
        }
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDeleteLogs = async () => {
        if (bulkDeleteReason.trim().length < 10) {
            setToast({
                message: 'Reason must be at least 10 characters long',
                type: 'warning'
            });
            return;
        }

        try {
            setIsDeleting(true);
            const response = await superAdminApi.bulkDeleteAuditLogs(selectedLogs, bulkDeleteReason.trim());
            setToast({
                message: response.data.message || `${selectedLogs.length} audit logs deleted successfully`,
                type: 'success'
            });
            setShowBulkDeleteModal(false);
            setSelectedLogs([]);
            setBulkDeleteReason('Bulk deletion of selected audit logs for compliance and maintenance purposes');
            fetchAuditLogs();
            fetchAuditStats();
        } catch (error: unknown) {
            console.error('Error bulk deleting audit logs:', error);
            const errorMessage = error instanceof Error && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to delete audit logs'
                : 'Failed to delete audit logs';
            setToast({
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSelectAllLogs = () => {
        if (selectedLogs.length === displayLogs.length) {
            setSelectedLogs([]);
        } else {
            setSelectedLogs(displayLogs.map(log => log._id));
        }
    };

    const handleSelectLog = (logId: string) => {
        setSelectedLogs(prev =>
            prev.includes(logId)
                ? prev.filter(id => id !== logId)
                : [...prev, logId]
        );
    };

    const viewLogDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetailModal(true);
        // Notify parent that a log detail was viewed (optional)
        onViewDetails?.(log);
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'mosque_created':
                return <FaBuilding className="w-4 h-4 text-green-600" />;
            case 'mosque_deleted':
                return <FaBuilding className="w-4 h-4 text-red-600" />;
            case 'admin_approved':
            case 'admin_registered':
                return <FaUserPlus className="w-4 h-4 text-green-600" />;
            case 'admin_rejected':
            case 'admin_removed':
                return <FaUserMinus className="w-4 h-4 text-red-600" />;
            case 'admin_reapplication':
            case 'admin_allowed_reapply':
                return <FaSync className="w-4 h-4 text-yellow-600" />;
            case 'super_admin_created':
                return <FaUserShield className="w-4 h-4 text-purple-600" />;
            case 'super_admin_deleted':
                return <FaUserShield className="w-4 h-4 text-red-600" />;
            case 'verification_code_regenerated':
            case 'code_regenerated':
                return <FaCode className="w-4 h-4 text-blue-600" />;
            case 'bulk_code_regeneration':
                return <FaSync className="w-4 h-4 text-blue-600" />;
            case 'admin_login':
            case 'superadmin_login':
                return <FaUser className="w-4 h-4 text-purple-600" />;
            case 'prayer_times_updated':
                return <FaClock className="w-4 h-4 text-orange-600" />;
            case 'mosque_details_updated':
                return <FaBuilding className="w-4 h-4 text-blue-600" />;
            case 'error_logged':
                return <FaTimes className="w-4 h-4 text-red-600" />;
            default:
                return <FaHistory className="w-4 h-4 text-gray-600" />;
        }
    };

    const getActionColor = (action: string, status: string) => {
        if (status === 'failed') return 'bg-red-100 text-red-800';
        if (status === 'pending') return 'bg-yellow-100 text-yellow-800';

        switch (action) {
            case 'mosque_created':
            case 'admin_approved':
            case 'admin_registered':
                return 'bg-green-100 text-green-800';
            case 'mosque_deleted':
            case 'admin_rejected':
            case 'admin_removed':
                return 'bg-red-100 text-red-800';
            case 'admin_reapplication':
            case 'admin_allowed_reapply':
                return 'bg-yellow-100 text-yellow-800';
            case 'super_admin_created':
                return 'bg-purple-100 text-purple-800';
            case 'super_admin_deleted':
                return 'bg-red-100 text-red-800';
            case 'verification_code_regenerated':
            case 'code_regenerated':
            case 'bulk_code_regeneration':
            case 'mosque_details_updated':
                return 'bg-blue-100 text-blue-800';
            case 'prayer_times_updated':
                return 'bg-orange-100 text-orange-800';
            case 'error_logged':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getActionLabel = (action: string) => {
        const labels: { [key: string]: string } = {
            'mosque_created': 'Mosque Created',
            'mosque_updated': 'Mosque Updated',
            'mosque_deleted': 'Mosque Deleted',
            'admin_registered': 'Admin Registered',
            'admin_approved': 'Admin Approved',
            'admin_assigned': 'Admin Assigned',
            'admin_rejected': 'Admin Rejected',
            'admin_removed': 'Admin Removed',
            'admin_reapplication': 'Admin Reapplication',
            'admin_allowed_reapply': 'Allow Reapplication',
            'admin_login': 'Admin Login',
            'superadmin_login': 'Super Admin Login',
            'super_admin_created': 'Super Admin Created',
            'super_admin_deleted': 'Super Admin Deleted',
            'verification_code_regenerated': 'Legacy Code Regenerated',
            'code_regenerated': 'Code Regenerated',
            'bulk_code_regeneration': 'Bulk Code Regeneration',
            'prayer_times_updated': 'Prayer Times Updated',
            'mosque_details_updated': 'Mosque Updated',
            'audit_logs_cleaned': 'Audit Logs Cleaned',
            'audit_logs_bulk_deleted': 'Audit Logs Deleted',
            'error_logged': 'Error Logged'
        };
        return labels[action] || action.replace(/_/g, ' ').toUpperCase();
    };

    const getResultIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <FaCheck className="w-3 h-3 text-green-600" />;
            case 'failed':
                return <FaTimes className="w-3 h-3 text-red-600" />;
            case 'pending':
                return <FaClock className="w-3 h-3 text-yellow-600" />;
            default:
                return null;
        }
    };

    const displayLogs = logs;

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-8 lg:py-12 px-4">
                <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-purple-600"></div>
                <span className="mt-3 text-sm lg:text-lg text-gray-600 text-center">Loading audit logs...</span>
            </div>
        );
    }

    return (
        <div className="space-y-2 sm:space-y-4 lg:space-y-6 px-2 sm:px-4 lg:px-0">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Audit Logs
                </h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 lg:gap-3">
                    <button
                        onClick={() => {
                            fetchAuditLogs();
                            fetchAuditStats();
                        }}
                        className="flex items-center justify-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm lg:text-base font-semibold rounded-lg transition-colors"
                    >
                        <FaSync className="w-3 h-3 sm:w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Refresh</span>
                        <span className="sm:hidden">Refresh</span>
                    </button>
                    <button
                        onClick={handleExportLogs}
                        className="flex items-center justify-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm lg:text-base font-semibold rounded-lg transition-colors"
                    >
                        <FaDownload className="w-3 h-3 sm:w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">
                            {selectedLogs.length > 0 ? `Export Selected (${selectedLogs.length})` : 'Export All'}
                        </span>
                        <span className="sm:hidden">Export</span>
                    </button>
                    {selectedLogs.length > 0 && (
                        <button
                            onClick={handleBulkDeleteLogs}
                            className="flex items-center justify-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm lg:text-base font-semibold rounded-lg transition-colors"
                        >
                            <FaTrash className="w-3 h-3 sm:w-4 h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Delete Selected ({selectedLogs.length})</span>
                            <span className="sm:hidden">Delete ({selectedLogs.length})</span>
                        </button>
                    )}
                    <button
                        onClick={handleCleanupLogs}
                        className="flex items-center justify-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm lg:text-base font-semibold rounded-lg transition-colors"
                    >
                        <FaTrash className="w-3 h-3 sm:w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Cleanup All</span>
                        <span className="sm:hidden">Cleanup</span>
                    </button>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                        {totalLogs} Total
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl p-2 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                    <div className="relative">
                        {isSearching ? (
                            <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-purple-500"></div>
                            </div>
                        ) : (
                            <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-6 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <FaFilter className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="pl-6 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="all">All Actions</option>
                            <option value="mosque_created">Mosque Created</option>
                            <option value="mosque_deleted">Mosque Deleted</option>
                            <option value="admin_approved">Admin Approved</option>
                            <option value="admin_assigned">Admin Assigned</option>
                            <option value="admin_rejected">Admin Rejected</option>
                            <option value="admin_removed">Admin Removed</option>
                            <option value="admin_registered">Admin Registered</option>
                            <option value="admin_reapplication">Admin Reapplication</option>
                            <option value="admin_allowed_reapply">Allow Reapplication</option>
                            <option value="super_admin_created">Super Admin Created</option>
                            <option value="super_admin_deleted">Super Admin Deleted</option>
                            <option value="code_regenerated">Code Regenerated</option>
                            <option value="bulk_code_regeneration">Bulk Code Regeneration</option>
                            <option value="admin_code_regenerated">Admin Code Regenerated</option>
                            <option value="admin_code_validated">Admin Code Validated</option>
                            <option value="prayer_times_updated">Prayer Times Updated</option>
                            <option value="mosque_details_updated">Mosque Updated</option>
                            <option value="audit_logs_cleaned">Audit Logs Cleaned</option>
                            <option value="audit_logs_bulk_deleted">Audit Logs Bulk Deleted</option>
                            <option value="error_logged">Error Logged</option>
                        </select>
                    </div>

                    <div className="relative">
                        <FaUser className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="pl-6 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="all">All Users</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    <div className="relative">
                        <FaCalendarAlt className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month' | 'all')}
                            className="pl-6 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="today">Today</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <div className="relative">
                        <FaHistory className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'action_type' | 'user_name' | 'status')}
                            className="pl-6 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="timestamp">Sort by Time</option>
                            <option value="action_type">Sort by Action</option>
                            <option value="user_name">Sort by User</option>
                            <option value="status">Sort by Status</option>
                        </select>
                    </div>

                    <div className="relative">
                        <FaFilter className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                            className="pl-6 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm lg:text-sm text-gray-500">Total Actions</p>
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats?.total_actions || 0}</h3>
                        </div>
                        <FaHistory className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm lg:text-sm text-gray-500">Successful</p>
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                                {stats?.successful_actions || 0}
                            </h3>
                        </div>
                        <FaCheck className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm lg:text-sm text-gray-500">Failed</p>
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                                {stats?.failed_actions || 0}
                            </h3>
                        </div>
                        <FaTimes className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-red-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl p-2 sm:p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm lg:text-sm text-gray-500">Last 24h</p>
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
                                {stats?.last_24h || 0}
                            </h3>
                        </div>
                        <FaClock className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-500" />
                    </div>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden">
                {displayLogs.length === 0 ? (
                    <div className="p-8 lg:p-12 text-center">
                        <FaHistory className="w-10 h-10 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg lg:text-xl font-semibold text-gray-700 mb-2">No Audit Logs Found</h3>
                        <p className="text-sm lg:text-base text-gray-500">No logs match your current filter criteria.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-sm font-semibold">
                                            <input
                                                type="checkbox"
                                                checked={selectedLogs.length === displayLogs.length && displayLogs.length > 0}
                                                onChange={handleSelectAllLogs}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Timestamp</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Performed By</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {displayLogs.map((log, index) => (
                                        <tr
                                            key={log._id}
                                            className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                                } hover:bg-purple-50 transition-colors ${selectedLogs.includes(log._id) ? 'bg-purple-100' : ''}`}
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLogs.includes(log._id)}
                                                    onChange={() => handleSelectLog(log._id)}
                                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700">
                                                    {formatTimestamp(log.timestamp)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {getActionIcon(log.action_type)}
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(
                                                            log.action_type,
                                                            log.status
                                                        )}`}
                                                    >
                                                        {getActionLabel(log.action_type)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {log.performed_by.user_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {log.performed_by.user_type.replace('_', ' ')}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-1">
                                                    {getResultIcon(log.status)}
                                                    <span className="text-sm capitalize">{log.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => viewLogDetails(log)}
                                                    className="flex items-center text-purple-600 hover:text-purple-900 font-medium"
                                                >
                                                    <FaEye className="w-4 h-4 mr-1" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden">
                            <div className="p-2 border-b bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-700">Select All</span>
                                    <input
                                        type="checkbox"
                                        checked={selectedLogs.length === displayLogs.length && displayLogs.length > 0}
                                        onChange={handleSelectAllLogs}
                                        className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                {displayLogs.map((log) => (
                                    <div
                                        key={log._id}
                                        className={`p-2 ${selectedLogs.includes(log._id) ? 'bg-purple-50' : 'bg-white'} hover:bg-purple-50 transition-colors`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLogs.includes(log._id)}
                                                    onChange={() => handleSelectLog(log._id)}
                                                    className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5"
                                                />
                                                {getActionIcon(log.action_type)}
                                                <span
                                                    className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${getActionColor(
                                                        log.action_type,
                                                        log.status
                                                    )}`}
                                                >
                                                    {getActionLabel(log.action_type)}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                {getResultIcon(log.status)}
                                                <span className="text-xs capitalize text-gray-600">{log.status}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {log.performed_by.user_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {log.performed_by.user_type.replace('_', ' ')}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    {formatTimestamp(log.timestamp)}
                                                </p>
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => viewLogDetails(log)}
                                                    className="text-purple-600 hover:text-purple-900 font-medium text-xs flex items-center"
                                                >
                                                    <FaEye className="w-3 h-3 mr-1" />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 flex flex-col sm:flex-row items-center justify-between border-t gap-2 sm:gap-3 lg:gap-0">
                            <div className="text-xs sm:text-sm lg:text-sm text-gray-600 text-center sm:text-left">
                                Page {page} of {totalPages} ({totalLogs} total)
                            </div>
                            <div className="flex space-x-1 sm:space-x-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm lg:text-base"
                                >
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm lg:text-base"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] lg:max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 sm:p-4 lg:p-6 rounded-t-lg sm:rounded-t-xl lg:rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Audit Log Details</h2>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-white hover:text-gray-200 p-1"
                                >
                                    <FaTimes className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 mb-1">Action Type</h3>
                                    <p className="text-sm sm:text-base lg:text-lg font-medium">{getActionLabel(selectedLog.action_type)}</p>
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 mb-1">Status</h3>
                                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${getActionColor(selectedLog.action_type, selectedLog.status)}`}>
                                        {selectedLog.status}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 mb-1">Timestamp</h3>
                                    <p className="text-sm sm:text-base lg:text-lg font-medium">{formatTimestamp(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 mb-1">Performed By</h3>
                                    <p className="text-sm sm:text-base lg:text-lg font-medium">{selectedLog.performed_by.user_name}</p>
                                    <p className="text-sm text-gray-500">{selectedLog.performed_by.user_email}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3">Target Information</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <p className="text-xs sm:text-sm text-gray-500">Type</p>
                                        <p className="font-medium text-sm sm:text-base">{selectedLog.target.target_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm text-gray-500">Name</p>
                                        <p className="font-medium text-sm sm:text-base">{selectedLog.target.target_name || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedLog.action_details && (
                                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3">Action Details</h3>

                                    {selectedLog.action_details.mosque_data && (
                                        <div className="mb-3 sm:mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Mosque Information</h4>
                                            <div className="space-y-1 text-xs sm:text-sm">
                                                {(selectedLog.action_details.mosque_data as { name?: string }).name && (
                                                    <p><span className="font-medium">Name:</span> {String((selectedLog.action_details.mosque_data as { name?: string }).name)}</p>
                                                )}
                                                {(selectedLog.action_details.mosque_data as { location?: string }).location && (
                                                    <p><span className="font-medium">Location:</span> {String((selectedLog.action_details.mosque_data as { location?: string }).location)}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedLog.action_details.admin_data && (
                                        <div className="mb-3 sm:mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Admin Information</h4>
                                            <div className="space-y-1 text-xs sm:text-sm">
                                                {(selectedLog.action_details.admin_data as { name?: string }).name && (
                                                    <p><span className="font-medium">Name:</span> {String((selectedLog.action_details.admin_data as { name?: string }).name)}</p>
                                                )}
                                                {(selectedLog.action_details.admin_data as { email?: string }).email && (
                                                    <p><span className="font-medium">Email:</span> {String((selectedLog.action_details.admin_data as { email?: string }).email)}</p>
                                                )}
                                                {(selectedLog.action_details.admin_data as { mosque_name?: string }).mosque_name && (
                                                    <p><span className="font-medium">Mosque:</span> {String((selectedLog.action_details.admin_data as { mosque_name?: string }).mosque_name)}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(selectedLog.action_details.reason || selectedLog.action_details.notes) && (
                                        <div className="mb-3 sm:mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Additional Information</h4>
                                            <p className="text-xs sm:text-sm">
                                                {selectedLog.action_details.reason || selectedLog.action_details.notes}
                                            </p>
                                        </div>
                                    )}

                                    <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                                        <h4 className="font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Technical Details</h4>
                                        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                                            {selectedLog.action_details.ip_address && (
                                                <p><span className="font-medium">IP Address:</span> {selectedLog.action_details.ip_address}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedLog.description && (
                                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 sm:mb-2">Description</h3>
                                    <p className="text-xs sm:text-sm lg:text-base text-gray-700">{selectedLog.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-b-lg sm:rounded-b-xl lg:rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm lg:text-base font-semibold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cleanup Confirmation Modal */}
            {showCleanupModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl max-w-md w-full p-3 sm:p-4 lg:p-6 max-h-[95vh] overflow-y-auto">
                        <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                                <FaExclamationTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-600" />
                            </div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-1 sm:mb-2">Cleanup All Audit Logs</h3>
                            <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                                This will permanently delete ALL audit logs in the system. This action cannot be undone.
                            </p>
                        </div>

                        <div className="mb-3 sm:mb-4 lg:mb-6">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                Reason for Cleanup *
                            </label>
                            <textarea
                                value={cleanupReason}
                                onChange={(e) => setCleanupReason(e.target.value)}
                                placeholder="Provide a reason for cleaning up old audit logs..."
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                rows={3}
                                required
                            />
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {cleanupReason.length} / 10 characters minimum
                            </p>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                            <p className="text-xs sm:text-sm text-orange-800">
                                <strong>Warning:</strong> This will delete logs older than 90 days from the database permanently.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-3 sm:gap-0">
                            <button
                                onClick={() => setShowCleanupModal(false)}
                                disabled={isDeleting}
                                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCleanupLogs}
                                disabled={isDeleting || cleanupReason.trim().length < 10}
                                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Cleaning...' : 'Cleanup Logs'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl max-w-md w-full p-3 sm:p-4 lg:p-6 max-h-[95vh] overflow-y-auto">
                        <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                                <FaExclamationTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-red-600" />
                            </div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-1 sm:mb-2">Delete Selected Audit Logs</h3>
                            <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                                This will permanently delete {selectedLogs.length} selected audit log{selectedLogs.length !== 1 ? 's' : ''}.
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="mb-3 sm:mb-4 lg:mb-6">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                Reason for Deletion *
                            </label>
                            <textarea
                                value={bulkDeleteReason}
                                onChange={(e) => setBulkDeleteReason(e.target.value)}
                                placeholder="Provide a reason for deleting these audit logs..."
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                rows={3}
                                required
                            />
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {bulkDeleteReason.length} / 10 characters minimum
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                            <p className="text-xs sm:text-sm text-red-800">
                                <strong>Danger:</strong> This will permanently delete the selected logs from the database.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-3 sm:gap-0">
                            <button
                                onClick={() => setShowBulkDeleteModal(false)}
                                disabled={isDeleting}
                                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBulkDeleteLogs}
                                disabled={isDeleting || bulkDeleteReason.trim().length < 10}
                                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="hidden sm:inline">
                                    {isDeleting ? 'Deleting...' : `Delete ${selectedLogs.length} Log${selectedLogs.length !== 1 ? 's' : ''}`}
                                </span>
                                <span className="sm:hidden">
                                    {isDeleting ? 'Deleting...' : `Delete (${selectedLogs.length})`}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
