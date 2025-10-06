import React, { useState, useEffect } from 'react';
import {
    FaHistory, FaSearch, FaFilter, FaDownload, FaCheck, FaTimes, FaClock,
    FaUser, FaCalendarAlt, FaBuilding, FaUserPlus, FaUserMinus, FaCode,
    FaEye, FaTrash, FaSync
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
        target_type: 'mosque' | 'admin' | 'verification_code' | 'prayer_times';
        target_id?: string;
        target_name?: string;
    };
    action_details: {
        mosque_data?: Record<string, unknown>;
        admin_data?: Record<string, unknown>;
        prayer_times?: Record<string, unknown>;
        before_data?: Record<string, unknown>;
        after_data?: Record<string, unknown>;
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
    recent_activity_24h: number;
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
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    useEffect(() => {
        // Reset to page 1 when filters change
        setPage(1);
    }, [actionFilter, userFilter, dateRange]);

    useEffect(() => {
        fetchAuditLogs();
        fetchAuditStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, actionFilter, userFilter, dateRange]);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page,
                limit: 20,
            };

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
            const params: Record<string, string> = {};
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

            setToast({ message: 'Audit logs exported successfully', type: 'success' });
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
        if (!window.confirm('Are you sure you want to delete audit logs older than 90 days? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await superAdminApi.cleanupAuditLogs(90);
            setToast({
                message: response.data.message || 'Audit logs cleaned up successfully',
                type: 'success'
            });
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
        }
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
            case 'verification_code_regenerated':
                return <FaCode className="w-4 h-4 text-blue-600" />;
            case 'admin_login':
            case 'superadmin_login':
                return <FaUser className="w-4 h-4 text-purple-600" />;
            case 'prayer_times_updated':
                return <FaClock className="w-4 h-4 text-orange-600" />;
            case 'mosque_details_updated':
                return <FaBuilding className="w-4 h-4 text-blue-600" />;
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
            case 'verification_code_regenerated':
            case 'mosque_details_updated':
                return 'bg-blue-100 text-blue-800';
            case 'prayer_times_updated':
                return 'bg-orange-100 text-orange-800';
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
            'admin_rejected': 'Admin Rejected',
            'admin_removed': 'Admin Removed',
            'admin_login': 'Admin Login',
            'superadmin_login': 'Super Admin Login',
            'verification_code_regenerated': 'Code Regenerated',
            'prayer_times_updated': 'Prayer Times Updated',
            'mosque_details_updated': 'Mosque Updated'
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

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            log.performed_by.user_name.toLowerCase().includes(searchLower) ||
            log.action_type.toLowerCase().includes(searchLower) ||
            (log.target.target_name && log.target.target_name.toLowerCase().includes(searchLower)) ||
            (log.description && log.description.toLowerCase().includes(searchLower))
        );
    });

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusCount = (statusType: string) => {
        if (!stats) return 0;
        const statusStat = stats.status_stats.find(s => s._id === statusType);
        return statusStat?.count || 0;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-lg text-gray-600">Loading audit logs...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Audit Logs Management
                </h1>
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                    <button
                        onClick={() => {
                            fetchAuditLogs();
                            fetchAuditStats();
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        <FaSync className="w-4 h-4 mr-2" />
                        Refresh
                    </button>
                    <button
                        onClick={handleExportLogs}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        <FaDownload className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                    <button
                        onClick={handleCleanupLogs}
                        className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        <FaTrash className="w-4 h-4 mr-2" />
                        Cleanup Old
                    </button>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {totalLogs} Total
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="all">All Actions</option>
                            <option value="mosque_created">Mosque Created</option>
                            <option value="mosque_deleted">Mosque Deleted</option>
                            <option value="admin_approved">Admin Approved</option>
                            <option value="admin_rejected">Admin Rejected</option>
                            <option value="admin_removed">Admin Removed</option>
                            <option value="admin_registered">Admin Registered</option>
                            <option value="verification_code_regenerated">Code Regenerated</option>
                            <option value="prayer_times_updated">Prayer Times Updated</option>
                            <option value="mosque_details_updated">Mosque Updated</option>
                        </select>
                    </div>

                    <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="all">All Users</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month' | 'all')}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="today">Today</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Actions</p>
                            <h3 className="text-2xl font-bold text-blue-600">{totalLogs}</h3>
                        </div>
                        <FaHistory className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Successful</p>
                            <h3 className="text-2xl font-bold text-green-600">
                                {getStatusCount('success')}
                            </h3>
                        </div>
                        <FaCheck className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Failed</p>
                            <h3 className="text-2xl font-bold text-red-600">
                                {getStatusCount('failed')}
                            </h3>
                        </div>
                        <FaTimes className="w-8 h-8 text-red-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Last 24h</p>
                            <h3 className="text-2xl font-bold text-yellow-600">
                                {stats?.recent_activity_24h || 0}
                            </h3>
                        </div>
                        <FaClock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center">
                        <FaHistory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Audit Logs Found</h3>
                        <p className="text-gray-500">No logs match your current filter criteria.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Timestamp</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Performed By</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredLogs.map((log, index) => (
                                        <tr
                                            key={log._id}
                                            className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                                } hover:bg-purple-50 transition-colors`}
                                        >
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

                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                            <div className="text-sm text-gray-600">
                                Page {page} of {totalPages} ({totalLogs} total)
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Audit Log Details</h2>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-white hover:text-gray-200"
                                >
                                    <FaTimes className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Action Type</h3>
                                    <p className="text-lg font-medium">{getActionLabel(selectedLog.action_type)}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Status</h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getActionColor(selectedLog.action_type, selectedLog.status)}`}>
                                        {selectedLog.status}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Timestamp</h3>
                                    <p className="text-lg font-medium">{formatTimestamp(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Performed By</h3>
                                    <p className="text-lg font-medium">{selectedLog.performed_by.user_name}</p>
                                    <p className="text-sm text-gray-500">{selectedLog.performed_by.user_email}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold mb-3">Target Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Type</p>
                                        <p className="font-medium">{selectedLog.target.target_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Name</p>
                                        <p className="font-medium">{selectedLog.target.target_name || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedLog.action_details && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-3">Action Details</h3>

                                    {selectedLog.action_details.mosque_data && (
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-2">Mosque Information</h4>
                                            <div className="space-y-1 text-sm">
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
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-2">Admin Information</h4>
                                            <div className="space-y-1 text-sm">
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
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-2">Additional Information</h4>
                                            <p className="text-sm">
                                                {selectedLog.action_details.reason || selectedLog.action_details.notes}
                                            </p>
                                        </div>
                                    )}

                                    <div className="border-t pt-3 mt-3">
                                        <h4 className="font-semibold text-gray-700 mb-2">Technical Details</h4>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            {selectedLog.action_details.ip_address && (
                                                <p><span className="font-medium">IP Address:</span> {selectedLog.action_details.ip_address}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedLog.description && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                                    <p className="text-gray-700">{selectedLog.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
