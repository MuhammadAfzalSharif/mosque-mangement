import React, { useState, useEffect } from 'react';
import {
    FaHistory,
    FaUser,
    FaCalendarAlt,
    FaSearch,
    FaFilter,
    FaEye,
    FaDownload,
    FaBuilding,
    FaUserPlus,
    FaUserMinus,
    FaCode,
    FaCheck,
    FaTimes,
    FaClock
} from 'react-icons/fa'; interface AuditLogData {
    [key: string]: string | number | boolean | null | undefined;
}

interface AuditLog {
    _id: string;
    action: string;
    user_id: string;
    user_name: string;
    user_role: 'superadmin' | 'admin';
    target_type: 'mosque' | 'admin' | 'user' | 'system';
    target_id?: string;
    target_name?: string;
    details: {
        mosque_name?: string;
        admin_name?: string;
        previous_data?: AuditLogData;
        new_data?: AuditLogData;
        reason?: string;
        ip_address?: string;
        user_agent?: string;
    };
    timestamp: string;
    result: 'success' | 'failure' | 'pending';
}

interface ExportFilters {
    search: string;
    action: string;
    user: string;
    dateRange: string;
}

interface Props {
    onViewDetails: (log: AuditLog) => void;
    onExportLogs: (filters: ExportFilters) => void;
}

const AuditLogs: React.FC<Props> = ({ onViewDetails, onExportLogs }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

    useEffect(() => {
        // Simulate API call
        const mockLogs: AuditLog[] = [
            {
                _id: '1',
                action: 'mosque_approved',
                user_id: 'superadmin_001',
                user_name: 'Super Admin',
                user_role: 'superadmin',
                target_type: 'mosque',
                target_id: 'mosque_001',
                target_name: 'Masjid Al-Noor',
                details: {
                    mosque_name: 'Masjid Al-Noor',
                    admin_name: 'Ahmed Hassan',
                    reason: 'All documents verified',
                    ip_address: '192.168.1.100',
                    user_agent: 'Mozilla/5.0...'
                },
                timestamp: '2024-01-15T14:30:00Z',
                result: 'success'
            },
            {
                _id: '2',
                action: 'admin_rejected',
                user_id: 'superadmin_001',
                user_name: 'Super Admin',
                user_role: 'superadmin',
                target_type: 'admin',
                target_id: 'admin_002',
                target_name: 'Muhammad Ali',
                details: {
                    mosque_name: 'Jamia Masjid Karachi',
                    admin_name: 'Muhammad Ali',
                    reason: 'Incomplete documentation',
                    ip_address: '192.168.1.100',
                    user_agent: 'Mozilla/5.0...'
                },
                timestamp: '2024-01-15T13:45:00Z',
                result: 'success'
            },
            {
                _id: '3',
                action: 'code_regenerated',
                user_id: 'superadmin_001',
                user_name: 'Super Admin',
                user_role: 'superadmin',
                target_type: 'mosque',
                target_id: 'mosque_003',
                target_name: 'Faisal Mosque',
                details: {
                    mosque_name: 'Faisal Mosque',
                    previous_data: { code: 'MSQ001' },
                    new_data: { code: 'MSQ003' },
                    reason: 'Admin requested new code',
                    ip_address: '192.168.1.100'
                },
                timestamp: '2024-01-15T12:20:00Z',
                result: 'success'
            },
            {
                _id: '4',
                action: 'mosque_deleted',
                user_id: 'superadmin_001',
                user_name: 'Super Admin',
                user_role: 'superadmin',
                target_type: 'mosque',
                target_id: 'mosque_004',
                target_name: 'Old Community Mosque',
                details: {
                    mosque_name: 'Old Community Mosque',
                    reason: 'Mosque permanently closed',
                    ip_address: '192.168.1.100'
                },
                timestamp: '2024-01-15T11:10:00Z',
                result: 'success'
            },
            {
                _id: '5',
                action: 'login_attempt',
                user_id: 'superadmin_002',
                user_name: 'Unknown User',
                user_role: 'superadmin',
                target_type: 'system',
                details: {
                    ip_address: '192.168.1.150',
                    user_agent: 'Mozilla/5.0...'
                },
                timestamp: '2024-01-15T10:30:00Z',
                result: 'failure'
            }
        ];

        setTimeout(() => {
            setLogs(mockLogs);
            setLoading(false);
        }, 1000);
    }, []);

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'mosque_created':
            case 'mosque_approved':
                return <FaBuilding className="w-4 h-4 text-green-600" />;
            case 'mosque_rejected':
            case 'mosque_deleted':
                return <FaBuilding className="w-4 h-4 text-red-600" />;
            case 'admin_approved':
            case 'admin_created':
                return <FaUserPlus className="w-4 h-4 text-green-600" />;
            case 'admin_rejected':
            case 'admin_removed':
                return <FaUserMinus className="w-4 h-4 text-red-600" />;
            case 'code_regenerated':
                return <FaCode className="w-4 h-4 text-blue-600" />;
            case 'login_attempt':
                return <FaUser className="w-4 h-4 text-purple-600" />;
            default:
                return <FaHistory className="w-4 h-4 text-gray-600" />;
        }
    };

    const getActionColor = (action: string, result: string) => {
        if (result === 'failure') return 'bg-red-100 text-red-800';
        if (result === 'pending') return 'bg-yellow-100 text-yellow-800';

        switch (action) {
            case 'mosque_created':
            case 'mosque_approved':
            case 'admin_approved':
            case 'admin_created':
                return 'bg-green-100 text-green-800';
            case 'mosque_rejected':
            case 'mosque_deleted':
            case 'admin_rejected':
            case 'admin_removed':
                return 'bg-red-100 text-red-800';
            case 'code_regenerated':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getActionLabel = (action: string) => {
        const labels: { [key: string]: string } = {
            'mosque_created': 'Mosque Created',
            'mosque_approved': 'Mosque Approved',
            'mosque_rejected': 'Mosque Rejected',
            'mosque_deleted': 'Mosque Deleted',
            'admin_approved': 'Admin Approved',
            'admin_rejected': 'Admin Rejected',
            'admin_created': 'Admin Created',
            'admin_removed': 'Admin Removed',
            'code_regenerated': 'Code Regenerated',
            'login_attempt': 'Login Attempt',
            'system_backup': 'System Backup',
            'data_export': 'Data Export'
        };
        return labels[action] || action.replace('_', ' ').toUpperCase();
    };

    const getResultIcon = (result: string) => {
        switch (result) {
            case 'success':
                return <FaCheck className="w-3 h-3 text-green-600" />;
            case 'failure':
                return <FaTimes className="w-3 h-3 text-red-600" />;
            case 'pending':
                return <FaClock className="w-3 h-3 text-yellow-600" />;
            default:
                return null;
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.target_name && log.target_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.details.mosque_name && log.details.mosque_name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesAction = actionFilter === 'all' || log.action === actionFilter;
        const matchesUser = userFilter === 'all' || log.user_role === userFilter;

        // Date filtering
        const logDate = new Date(log.timestamp);
        const now = new Date();
        let matchesDate = true;

        switch (dateRange) {
            case 'today':
                matchesDate = logDate.toDateString() === now.toDateString();
                break;
            case 'week': {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = logDate >= weekAgo;
                break;
            }
            case 'month': {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesDate = logDate >= monthAgo;
                break;
            }
            case 'all':
                matchesDate = true;
                break;
        }

        return matchesSearch && matchesAction && matchesUser && matchesDate;
    });

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const handleExport = () => {
        const filters = {
            search: searchTerm,
            action: actionFilter,
            user: userFilter,
            dateRange: dateRange
        };
        onExportLogs(filters);
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Audit Logs
                </h1>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        <FaDownload className="w-4 h-4 mr-2" />
                        Export Logs
                    </button>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {filteredLogs.length} Records
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Search */}
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

                    {/* Action Filter */}
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="all">All Actions</option>
                            <option value="mosque_created">Mosque Created</option>
                            <option value="mosque_approved">Mosque Approved</option>
                            <option value="mosque_rejected">Mosque Rejected</option>
                            <option value="mosque_deleted">Mosque Deleted</option>
                            <option value="admin_approved">Admin Approved</option>
                            <option value="admin_rejected">Admin Rejected</option>
                            <option value="code_regenerated">Code Regenerated</option>
                            <option value="login_attempt">Login Attempt</option>
                        </select>
                    </div>

                    {/* User Filter */}
                    <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white w-full"
                        >
                            <option value="all">All Users</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* Date Range */}
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
                            <p className="text-sm text-gray-600">Total Actions</p>
                            <p className="text-2xl font-bold text-blue-600">{filteredLogs.length}</p>
                        </div>
                        <FaHistory className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Successful</p>
                            <p className="text-2xl font-bold text-green-600">
                                {filteredLogs.filter(log => log.result === 'success').length}
                            </p>
                        </div>
                        <FaCheck className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Failed</p>
                            <p className="text-2xl font-bold text-red-600">
                                {filteredLogs.filter(log => log.result === 'failure').length}
                            </p>
                        </div>
                        <FaTimes className="w-8 h-8 text-red-500" />
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {filteredLogs.filter(log => log.result === 'pending').length}
                            </p>
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Target
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Result
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getActionColor(log.action, log.result)}`}>
                                                    {getActionIcon(log.action)}
                                                    <span className="ml-2">{getActionLabel(log.action)}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                                                <div className="text-sm text-gray-500 capitalize">{log.user_role}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {log.target_name || 'System'}
                                                </div>
                                                <div className="text-sm text-gray-500 capitalize">{log.target_type}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatTimestamp(log.timestamp)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center">
                                                {getResultIcon(log.result)}
                                                <span className="ml-1 text-sm capitalize">{log.result}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => onViewDetails(log)}
                                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium flex items-center"
                                            >
                                                <FaEye className="w-4 h-4 mr-1" />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;