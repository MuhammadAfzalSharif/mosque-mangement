import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import {
    FaBuilding as Building,
    FaClock as Clock,
    FaCheckCircle as CheckCircle,
    FaTimesCircle as XCircle,
    FaSync as Activity,
    FaUserPlus,
    FaUserCheck,
    FaUserTimes,
    FaTrash,
    FaHistory,
    FaEdit,
    FaRedo,
    FaUserMinus,
    FaInfoCircle,
    FaExclamationTriangle,
    FaUserShield
} from 'react-icons/fa';
import { X } from 'react-feather';
import {
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    RadialBarChart,
    RadialBar,

} from 'recharts';

interface DashboardStats {
    total_mosques: number;
    approved_mosques: number;
    pending_requests: number;
    rejected_requests: number;
    mosque_deleted_admins: number;
    admin_removed_admins: number;
    code_regenerated_admins: number;
    total_super_admins: number;
}

interface ActionTypeData {
    action_type: string;
    label: string;
    color: string;
    icon: string;
    category: string;
    total_count: number;
    success_count: number;
    failure_count: number;
    count_24h: number;
    count_today: number;
    latest_timestamp: string;
    earliest_timestamp: string;
    success_rate: number;
}

interface AuditLog {
    timestamp: string;
    action_type: string;
    status: string;
    [key: string]: unknown; // Allow additional properties
}



interface LineChartData {
    [key: string]: string | number;
}

interface WeeklyAuditChartData {
    name: string;
    value: number;
    fill: string;
}


interface Props {
    stats: DashboardStats | null;
    onRefresh: () => void;
}



const DashboardOverview: React.FC<Props> = ({ stats, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [actionTypesData, setActionTypesData] = useState<ActionTypeData[]>([]);
    const [weeklyAuditData, setWeeklyAuditData] = useState<WeeklyAuditChartData[]>([]);
    const [monthlyLineData, setMonthlyLineData] = useState<LineChartData[]>([]);
    const [auditStats, setAuditStats] = useState({
        total_actions: 0,
        successful_actions: 0,
        failed_actions: 0,
        last_24h: 0
    });

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [auditLogsResponse, statsResponse, actionTypesResponse] = await Promise.all([
                superAdminApi.getAuditLogs({ limit: 1000 }),
                superAdminApi.getAuditStats(),
                superAdminApi.getActionTypesSummary()
            ]);

            const auditLogs = auditLogsResponse.data.audit_logs || [];

            if (statsResponse.data) {
                setAuditStats({
                    total_actions: statsResponse.data.total_actions || 0,
                    successful_actions: statsResponse.data.successful_actions || 0,
                    failed_actions: statsResponse.data.failed_actions || 0,
                    last_24h: statsResponse.data.last_24h || 0
                });
            }

            if (actionTypesResponse.data && actionTypesResponse.data.action_types) {
                setActionTypesData(actionTypesResponse.data.action_types);
            }

            const weeklyData = processWeeklyAuditData(auditLogs);
            setWeeklyAuditData(weeklyData);

            const monthlyData = processMonthlyLineData(auditLogs);
            setMonthlyLineData(monthlyData);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', getErrorMessage(error));
        }
    };

    // Process weekly audit data for radial bar chart - action types breakdown for last 7 days
    const processWeeklyAuditData = (logs: AuditLog[]): WeeklyAuditChartData[] => {
        // Get logs from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyLogs = logs.filter((log: AuditLog) => {
            const logDate = new Date(log.timestamp);
            return logDate >= sevenDaysAgo;
        });

        // Count different action types
        const actionCounts: { [key: string]: number } = {};

        weeklyLogs.forEach((log: AuditLog) => {
            const actionType = log.action_type;
            actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
        });

        // Convert to radial bar chart format with action labels and colors
        const actionColors: { [key: string]: string } = {
            'mosque_created': '#22c55e',
            'mosque_deleted': '#ef4444',
            'mosque_details_updated': '#3b82f6',
            'admin_approved': '#22c55e',
            'admin_registered': '#10b981',
            'admin_assigned': '#06b6d4',
            'admin_rejected': '#ef4444',
            'admin_removed': '#dc2626',
            'admin_reapplication': '#f59e0b',
            'admin_allowed_reapply': '#eab308',
            'admin_login': '#8b5cf6',
            'superadmin_login': '#7c3aed',
            'super_admin_created': '#9333ea',
            'super_admin_deleted': '#dc2626',
            'verification_code_regenerated': '#3b82f6',
            'code_regenerated': '#2563eb',
            'bulk_code_regeneration': '#1d4ed8',
            'prayer_times_updated': '#f97316',
            'audit_logs_cleaned': '#6b7280',
            'audit_logs_bulk_deleted': '#ef4444',
            'error_logged': '#dc2626'
        };

        const actionLabels: { [key: string]: string } = {
            'mosque_created': 'Mosque Created',
            'mosque_deleted': 'Mosque Deleted',
            'mosque_details_updated': 'Mosque Updated',
            'admin_approved': 'Admin Approved',
            'admin_registered': 'Admin Registered',
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
            'audit_logs_cleaned': 'Audit Logs Cleaned',
            'audit_logs_bulk_deleted': 'Audit Logs Deleted',
            'error_logged': 'Error Logged'
        };

        return Object.entries(actionCounts)
            .map(([actionType, count]) => ({
                name: actionLabels[actionType] || actionType.replace(/_/g, ' ').toUpperCase(),
                value: count,
                fill: actionColors[actionType] || '#6b7280'
            }))
            .sort((a, b) => b.value - a.value) as WeeklyAuditChartData[];
    };

    // Process monthly data for stacked bar chart - success vs failure over months
    const processMonthlyLineData = (logs: AuditLog[]): LineChartData[] => {
        const monthlyData: { [key: string]: { success: number; failed: number; total: number } } = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthlyData[monthStr] = { success: 0, failed: 0, total: 0 };
        }

        // Count success/failure per month
        logs.forEach((log: AuditLog) => {
            const logDate = new Date(log.timestamp);
            const monthStr = logDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (monthStr in monthlyData) {
                monthlyData[monthStr].total++;
                if (log.status === 'success') {
                    monthlyData[monthStr].success++;
                } else if (log.status === 'failed') {
                    monthlyData[monthStr].failed++;
                }
            }
        });

        // Convert to stacked bar chart format
        return Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                'Successful': data.success,
                'Failed': data.failed,
                'Total': data.total
            }));
    };

    const handleRefresh = async () => {
        setLoading(true);
        await Promise.all([onRefresh(), fetchDashboardData()]);
        setLoading(false);
    };

    const statCards = [
        {
            title: 'Total Mosques',
            value: stats?.total_mosques || 0,
            icon: Building,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'from-blue-50 to-blue-100',
            change: '+12%',
            changeType: 'increase'
        },
        {
            title: 'Approved Mosques',
            value: stats?.approved_mosques || 0,
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
            bgColor: 'from-green-50 to-green-100',
            change: '+8%',
            changeType: 'increase'
        },
        {
            title: 'Pending Requests',
            value: stats?.pending_requests || 0,
            icon: Clock,
            color: 'from-yellow-500 to-yellow-600',
            bgColor: 'from-yellow-50 to-yellow-100',
            change: '-5%',
            changeType: 'decrease'
        },
        {
            title: 'Rejected Requests',
            value: stats?.rejected_requests || 0,
            icon: XCircle,
            color: 'from-red-500 to-red-600',
            bgColor: 'from-red-50 to-red-100',
            change: '+2%',
            changeType: 'increase'
        },
        {
            title: 'Mosque Deleted',
            value: stats?.mosque_deleted_admins || 0,
            icon: FaTrash,
            color: 'from-orange-500 to-orange-600',
            bgColor: 'from-orange-50 to-orange-100',
            change: '+2%',
            changeType: 'increase'
        },
        {
            title: 'Admin Removed',
            value: stats?.admin_removed_admins || 0,
            icon: FaUserMinus,
            color: 'from-pink-500 to-pink-600',
            bgColor: 'from-pink-50 to-pink-100',
            change: '+1%',
            changeType: 'increase'
        },
        {
            title: 'Code Regenerated',
            value: stats?.code_regenerated_admins || 0,
            icon: FaRedo,
            color: 'from-cyan-500 to-cyan-600',
            bgColor: 'from-cyan-50 to-cyan-100',
            change: '+3%',
            changeType: 'increase'
        },
        {
            title: 'Total Super Admins',
            value: stats?.total_super_admins || 0,
            icon: FaUserShield,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'from-purple-50 to-purple-100',
            change: '+5%',
            changeType: 'increase'
        }
    ];

    return (
        <div className="space-y-2 sm:space-y-4 lg:space-y-6 px-1 sm:px-3 lg:px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-3">
                <h1 className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    <span className="sm:hidden">Dashboard</span>
                    <span className="hidden sm:inline">Dashboard Overview</span>
                </h1>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-md sm:rounded-lg lg:rounded-xl transition-all duration-300 transform sm:hover:scale-105 shadow-md sm:hover:shadow-lg disabled:opacity-50 text-[10px] sm:text-xs lg:text-sm"
                >
                    <Activity className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 lg:gap-3 xl:gap-4">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={index}
                            className={`relative bg-gradient-to-br ${card.bgColor} border border-white/50 sm:border-2 rounded-md sm:rounded-lg lg:rounded-xl xl:rounded-2xl shadow-md sm:shadow-lg sm:hover:shadow-xl transition-all duration-500 p-1.5 sm:p-2 lg:p-3 xl:p-4 transform sm:hover:scale-105 sm:hover:-translate-y-1 group overflow-hidden`}
                        >
                            {/* 3D Effect Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-sm sm:blur-md"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-1 sm:mb-1.5 lg:mb-2">
                                    <div className={`w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 bg-gradient-to-r ${card.color} rounded sm:rounded-md lg:rounded-lg flex items-center justify-center shadow-sm sm:group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-white" />
                                    </div>
                                    <div className={`text-[8px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full ${card.changeType === 'increase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        <span className="hidden sm:inline">{card.change}</span>
                                        <span className="sm:hidden">{card.change.replace('%', '')}</span>
                                    </div>
                                </div>
                                <h3 className="text-[9px] sm:text-xs lg:text-sm font-semibold text-gray-600 mb-0.5 sm:mb-1 line-clamp-2">{card.title}</h3>
                                <p className="text-xs sm:text-sm lg:text-lg xl:text-xl font-bold text-gray-800 sm:group-hover:scale-110 transition-transform duration-300">
                                    {card.value.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Audit Stats Overview */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 sm:border-2 rounded-md sm:rounded-lg lg:rounded-xl xl:rounded-2xl shadow-md sm:shadow-lg p-2 sm:p-3 lg:p-4 xl:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                    <div className="flex items-center">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded sm:rounded-md lg:rounded-lg flex items-center justify-center shadow-sm mr-1.5 sm:mr-2">
                            <FaHistory className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xs sm:text-sm lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                <span className="sm:hidden">Audit Stats</span>
                                <span className="hidden sm:inline">Audit Statistics</span>
                            </h2>
                            <p className="text-[8px] sm:text-xs text-gray-600 hidden sm:block">System activity monitoring</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    <div className="bg-white/80 backdrop-blur-lg rounded-md sm:rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-4 shadow-md sm:shadow-lg border border-green-200">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 mb-0.5 sm:mb-1">
                                    <span className="sm:hidden">Success</span>
                                    <span className="hidden sm:inline">Successful Actions</span>
                                </p>
                                <h3 className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold text-green-600">{auditStats.successful_actions}</h3>
                                <p className="text-[8px] sm:text-xs text-green-500 mt-0.5 sm:mt-1">
                                    {auditStats.total_actions > 0
                                        ? Math.round((auditStats.successful_actions / auditStats.total_actions) * 100)
                                        : 0}% success rate
                                </p>
                            </div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-100 rounded sm:rounded-md lg:rounded-lg flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2">
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-lg rounded-md sm:rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-4 shadow-md sm:shadow-lg border border-red-200">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 mb-0.5 sm:mb-1">
                                    <span className="sm:hidden">Failed</span>
                                    <span className="hidden sm:inline">Failed Actions</span>
                                </p>
                                <h3 className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold text-red-600">{auditStats.failed_actions}</h3>
                                <p className="text-[8px] sm:text-xs text-red-500 mt-0.5 sm:mt-1">
                                    {auditStats.total_actions > 0
                                        ? Math.round((auditStats.failed_actions / auditStats.total_actions) * 100)
                                        : 0}% failure rate
                                </p>
                            </div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-red-100 rounded sm:rounded-md lg:rounded-lg flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2">
                                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-red-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-lg rounded-md sm:rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-4 shadow-md sm:shadow-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 mb-0.5 sm:mb-1">
                                    <span className="sm:hidden">24h</span>
                                    <span className="hidden sm:inline">Last 24 Hours</span>
                                </p>
                                <h3 className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold text-blue-600">{auditStats.last_24h}</h3>
                                <p className="text-[8px] sm:text-xs text-blue-500 mt-0.5 sm:mt-1">Recent activity</p>
                            </div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 rounded sm:rounded-md lg:rounded-lg flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Charts Section - Better Desktop Layout */}
            <div className="space-y-2 sm:space-y-4 lg:space-y-6 relative z-10">
                {/* Grid Layout for Better Desktop Experience */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-4 lg:gap-6 max-w-7xl mx-auto">
                    {/* Weekly Action Types - Radial Bar Chart */}
                    <div className="bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30 backdrop-blur-xl border border-white/30 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-lg sm:shadow-2xl hover:shadow-3xl transition-all duration-500 p-2 sm:p-3 lg:p-4 xl:p-6 w-full max-w-2xl transform hover:scale-[1.01] hover:-translate-y-1 relative z-20">
                        <div className="flex items-center mb-2 sm:mb-3 lg:mb-4 xl:mb-6">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg mr-2 sm:mr-3 lg:mr-4">
                                <FaHistory className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    <span className="sm:hidden">Weekly Actions</span>
                                    <span className="hidden sm:inline">Weekly Action Types</span>
                                </h3>
                                <p className="text-[8px] sm:text-xs lg:text-sm text-gray-600 font-medium hidden sm:block">
                                    Last 7 Days - Action Breakdown
                                </p>
                            </div>
                        </div>
                        <div className="h-[200px] sm:h-[250px] lg:h-[300px] xl:h-[350px] bg-white/60 backdrop-blur-lg rounded-lg sm:rounded-xl p-1 sm:p-2 lg:p-3 shadow-inner">
                            {weeklyAuditData.length > 0 ? (
                                <div className="flex flex-col h-full">
                                    {/* Chart Container */}
                                    <div className="flex-1 min-h-[120px] sm:min-h-[150px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="10%"
                                                outerRadius="70%"
                                                data={weeklyAuditData.slice(0, 6)} // Limit for mobile
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                <RadialBar
                                                    label={false}
                                                    background={false}
                                                    dataKey="value"
                                                />
                                                <Tooltip
                                                    formatter={(value: number) => [value, 'Actions']}
                                                    labelStyle={{ color: '#374151', fontWeight: 'bold', fontSize: '8px' }}
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255,255,255,0.95)',
                                                        border: '1px solid rgba(255,255,255,0.3)',
                                                        borderRadius: '4px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                        fontSize: '8px',
                                                        padding: '2px 6px'
                                                    }}
                                                />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Compact Legend */}
                                    <div className="mt-1 sm:mt-2">
                                        <div className="grid grid-cols-2 gap-1 text-[8px] sm:text-xs">
                                            {weeklyAuditData.slice(0, 6).map((item, index) => (
                                                <div key={index} className="flex items-center space-x-1 p-0.5 rounded">
                                                    <div
                                                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: item.fill }}
                                                    ></div>
                                                    <span className="text-[7px] sm:text-[8px] text-gray-700 font-medium truncate flex-1">
                                                        {item.name.length > 8 ? `${item.name.substring(0, 8)}...` : item.name}
                                                    </span>
                                                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-bold">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {weeklyAuditData.length > 6 && (
                                            <div className="mt-1 p-0.5 bg-gray-100 rounded text-center">
                                                <span className="text-[7px] sm:text-[8px] text-gray-600">
                                                    +{weeklyAuditData.length - 6} more
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-center text-gray-500">
                                    <div>
                                        <FaHistory className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-gray-400" />
                                        <p className="font-medium text-xs sm:text-sm">No weekly data</p>
                                        <p className="text-[8px] sm:text-xs mt-0.5">Data will appear here</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Success/Failure Trends - Stacked Bar Chart */}
                    <div className="bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30 backdrop-blur-xl border border-white/30 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-lg sm:shadow-2xl hover:shadow-3xl transition-all duration-500 p-2 sm:p-3 lg:p-4 xl:p-6 w-full max-w-2xl transform hover:scale-[1.01] hover:-translate-y-1 relative z-20">
                        <div className="flex items-center mb-2 sm:mb-3 lg:mb-4">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg mr-2 sm:mr-3">
                                <Activity className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    <span className="sm:hidden">Monthly Trends</span>
                                    <span className="hidden sm:inline">Monthly Success/Failure Trends</span>
                                </h3>
                                <p className="text-[8px] sm:text-xs lg:text-sm text-gray-600 font-medium hidden sm:block">
                                    Last 6 Months - Success vs Failure
                                </p>
                            </div>
                        </div>
                        <div className="h-[200px] sm:h-[250px] lg:h-[300px] bg-white/60 backdrop-blur-lg rounded-lg sm:rounded-xl p-1 sm:p-2 lg:p-3 shadow-inner">
                            {monthlyLineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyLineData} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis
                                            dataKey="month"
                                            stroke="#4b5563"
                                            style={{ fontSize: '8px', fontWeight: '500' }}
                                            tick={{ fill: '#4b5563' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            stroke="#4b5563"
                                            style={{ fontSize: '8px', fontWeight: '500' }}
                                            tick={{ fill: '#4b5563' }}
                                        />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                value,
                                                name === 'Successful' ? 'Success' : 'Failed'
                                            ]}
                                            labelStyle={{ color: '#374151', fontWeight: 'bold', fontSize: '8px' }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255,255,255,0.95)',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                fontSize: '8px',
                                                padding: '2px 4px'
                                            }}
                                        />
                                        <Bar dataKey="Successful" stackId="a" fill="#22c55e" name="Successful" />
                                        <Bar dataKey="Failed" stackId="a" fill="#ef4444" name="Failed" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-center text-gray-500">
                                    <div>
                                        <Activity className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-gray-400" />
                                        <p className="font-medium text-xs sm:text-sm">No monthly data</p>
                                        <p className="text-[8px] sm:text-xs mt-0.5">Data will appear here</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Action Types Overview Cards */}
            {actionTypesData.length > 0 && (
                <div className="bg-gradient-to-br from-white/90 via-gray-50/50 to-blue-50/30 backdrop-blur-xl border border-white/30 sm:border-2 rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-lg sm:shadow-2xl p-2 sm:p-3 lg:p-4 xl:p-6 relative z-40 mt-2 sm:mt-4 lg:mt-6">
                    <div className="flex items-center mb-2 sm:mb-3 lg:mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg mr-2 sm:mr-3">
                            <Activity className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                <span className="sm:hidden">Action Types</span>
                                <span className="hidden sm:inline">Action Types Overview</span>
                            </h3>
                            <p className="text-[8px] sm:text-xs text-gray-600 font-medium hidden sm:block">
                                System activities breakdown
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2 lg:gap-3 xl:gap-4">
                        {actionTypesData.map((actionType, index) => {
                            // Map icon names to components
                            const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
                                'building': Building,
                                'trash': FaTrash,
                                'edit': FaEdit,
                                'user-check': FaUserCheck,
                                'user-times': FaUserTimes,
                                'user-plus': FaUserPlus,
                                'user-minus': FaUserMinus,
                                'user-shield': FaUserShield,
                                'refresh': FaRedo,
                                'clock': Clock,
                                'info': FaInfoCircle,
                                'exclamation-triangle': FaExclamationTriangle,
                                'default': Activity
                            };

                            // Map color names to Tailwind gradient classes
                            const colorMap: { [key: string]: string } = {
                                'blue': 'from-blue-500 to-blue-600',
                                'orange': 'from-orange-500 to-orange-600',
                                'indigo': 'from-indigo-500 to-indigo-600',
                                'green': 'from-green-500 to-green-600',
                                'red': 'from-red-500 to-red-600',
                                'purple': 'from-purple-500 to-purple-600',
                                'gray': 'from-gray-500 to-gray-600',
                                'yellow': 'from-yellow-500 to-yellow-600',
                                'teal': 'from-teal-500 to-teal-600',
                                'cyan': 'from-cyan-500 to-cyan-600',
                                'lime': 'from-lime-500 to-lime-600',
                                'emerald': 'from-emerald-500 to-emerald-600',
                                'violet': 'from-violet-500 to-violet-600'
                            };

                            // Map color names to background gradient classes
                            const bgColorMap: { [key: string]: string } = {
                                'blue': 'from-blue-50 to-blue-100',
                                'orange': 'from-orange-50 to-orange-100',
                                'indigo': 'from-indigo-50 to-indigo-100',
                                'green': 'from-green-50 to-green-100',
                                'red': 'from-red-50 to-red-100',
                                'purple': 'from-purple-50 to-purple-100',
                                'gray': 'from-gray-50 to-gray-100',
                                'yellow': 'from-yellow-50 to-yellow-100',
                                'teal': 'from-teal-50 to-teal-100',
                                'cyan': 'from-cyan-50 to-cyan-100',
                                'lime': 'from-lime-50 to-lime-100',
                                'emerald': 'from-emerald-50 to-emerald-100',
                                'violet': 'from-violet-50 to-violet-100'
                            };

                            const Icon = iconMap[actionType.icon] || iconMap['default'];
                            const colorGradient = colorMap[actionType.color] || colorMap['gray'];
                            const bgGradient = bgColorMap[actionType.color] || bgColorMap['gray'];

                            return (
                                <div
                                    key={index}
                                    className={`relative bg-gradient-to-br ${bgGradient} border border-white/50 sm:border-2 rounded-md sm:rounded-lg lg:rounded-xl shadow-md sm:shadow-lg sm:hover:shadow-xl transition-all duration-500 p-1.5 sm:p-2 lg:p-3 xl:p-4 transform sm:hover:scale-105 sm:hover:-translate-y-1 group overflow-hidden`}
                                >
                                    {/* Enhanced 3D Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60"></div>
                                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm sm:blur-md"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                                            <div className={`w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-r ${colorGradient} rounded sm:rounded-md lg:rounded-lg flex items-center justify-center shadow-sm sm:group-hover:scale-110 transition-transform duration-300`}>
                                                <Icon className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                                            </div>
                                            <div className="flex flex-col items-end space-y-0.5">
                                                <span className={`text-[8px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full bg-white/80 text-${actionType.color}-700 shadow-sm`}>
                                                    {actionType.success_rate}%
                                                </span>
                                                {actionType.count_today > 0 && (
                                                    <span className="text-[8px] font-semibold bg-green-100 text-green-700 px-1 py-0.5 rounded-full hidden sm:inline">
                                                        +{actionType.count_today}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 sm:group-hover:text-gray-800 transition-colors line-clamp-2">
                                            {actionType.label}
                                        </h4>

                                        <div className="flex items-baseline justify-between mb-1 sm:mb-1.5">
                                            <p className="text-xs sm:text-sm lg:text-base font-bold text-gray-800 sm:group-hover:scale-110 transition-transform duration-300">
                                                {actionType.total_count.toLocaleString()}
                                            </p>
                                            {actionType.count_24h > 0 && (
                                                <span className="text-[8px] sm:text-xs text-gray-500 bg-white/50 px-1 py-0.5 rounded">
                                                    {actionType.count_24h}
                                                </span>
                                            )}
                                        </div>

                                        <div className="bg-white/60 backdrop-blur-sm rounded sm:rounded-md p-1 sm:p-1.5 shadow-inner">
                                            <div className="flex justify-between text-[8px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
                                                <span className="font-medium">Success</span>
                                                <span className="font-medium">Failed</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] sm:text-xs font-bold">
                                                <span className="text-green-600 flex items-center">
                                                    <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" /> {actionType.success_count}
                                                </span>
                                                <span className="text-red-600 flex items-center">
                                                    <X className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" /> {actionType.failure_count}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardOverview;










