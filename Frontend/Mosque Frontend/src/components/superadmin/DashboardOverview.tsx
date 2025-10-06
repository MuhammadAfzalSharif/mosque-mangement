import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import {
    FaBuilding as Building,
    FaClock as Clock,
    FaCheckCircle as CheckCircle,
    FaTimesCircle as XCircle,
    FaChartLine as TrendingUp,
    FaSync as Activity,
    FaUserPlus,
    FaUserCheck,
    FaUserTimes,
    FaTrash,
    FaHistory,
    FaEdit,
    FaRedo,
    FaUserMinus,
    FaShieldAlt,
    FaSignInAlt,
    FaInfoCircle
} from 'react-icons/fa';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface DashboardStats {
    total_mosques: number;
    approved_mosques: number;
    pending_requests: number;
    rejected_requests: number;
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

interface BarChartData {
    [key: string]: string | number;
}

interface TooltipPayload {
    name: string;
    value: number;
    color: string;
    dataKey: string;
}

interface Props {
    stats: DashboardStats | null;
    onRefresh: () => void;
}

// Custom Tooltip Component for better UX
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Filter out entries with 0 value for cleaner display
        const nonZeroPayload = payload.filter((entry: TooltipPayload) => entry.value > 0);

        if (nonZeroPayload.length === 0) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-700 mb-1">{label}</p>
                    <p className="text-sm text-gray-500">No activity</p>
                </div>
            );
        }

        return (
            <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                <p className="font-semibold text-gray-700 mb-2 border-b pb-1">{label}</p>
                <div className="space-y-1">
                    {nonZeroPayload.map((entry: TooltipPayload, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm text-gray-700">{entry.name}:</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Total:</span>
                        <span className="text-xs font-bold text-blue-600">
                            {nonZeroPayload.reduce((sum: number, entry: TooltipPayload) => sum + entry.value, 0)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const DashboardOverview: React.FC<Props> = ({ stats, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [actionTypesData, setActionTypesData] = useState<ActionTypeData[]>([]);
    const [dailyBarData, setDailyBarData] = useState<BarChartData[]>([]);
    const [monthlyBarData, setMonthlyBarData] = useState<BarChartData[]>([]);
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
            // Fetch audit logs, stats, and action types summary
            // Set limit to a large number to get all logs for charts
            const [auditLogsResponse, statsResponse, actionTypesResponse] = await Promise.all([
                superAdminApi.getAuditLogs({ limit: 1000 }),
                superAdminApi.getAuditStats(),
                superAdminApi.getActionTypesSummary()
            ]);

            console.log('Audit Logs Response:', auditLogsResponse.data);
            console.log('Stats Response:', statsResponse.data);
            console.log('Action Types Response:', actionTypesResponse.data);

            const auditLogs = auditLogsResponse.data.audit_logs || [];

            // Set audit stats
            if (statsResponse.data) {
                setAuditStats({
                    total_actions: statsResponse.data.total_actions || 0,
                    successful_actions: statsResponse.data.successful_actions || 0,
                    failed_actions: statsResponse.data.failed_actions || 0,
                    last_24h: statsResponse.data.last_24h || 0
                });
            }

            // Set action types data
            if (actionTypesResponse.data && actionTypesResponse.data.action_types) {
                setActionTypesData(actionTypesResponse.data.action_types);
            }

            // Process bar graph data for daily trends (last 7 days)
            const dailyData = processDailyBarData(auditLogs);
            console.log('Daily Bar Data:', dailyData);
            setDailyBarData(dailyData);

            // Process bar graph data for monthly trends (last 6 months)
            const monthlyData = processMonthlyBarData(auditLogs);
            console.log('Monthly Bar Data:', monthlyData);
            setMonthlyBarData(monthlyData);

            console.log('Dashboard data loaded successfully');
            console.log('Total logs:', auditLogs.length);
            console.log('Audit stats:', statsResponse.data);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', getErrorMessage(error));
        }
    };

    // Process daily bar data for last 7 days
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processDailyBarData = (logs: any[]) => {
        console.log('Processing daily bar data, logs count:', logs.length);
        console.log('Sample log:', logs[0]);

        const dailyData: { [key: string]: { [key: string]: number } } = {};
        const actionTypes = [
            'mosque_created',
            'admin_approved',
            'admin_rejected',
            'mosque_deleted',
            'admin_registered',
            'admin_removed',
            'prayer_times_updated',
            'mosque_details_updated',
            'superadmin_login',
            'admin_login',
            'mosque_updated',
            'verification_code_regenerated'
        ];

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().substring(0, 10);
            dailyData[dateStr] = {};
            actionTypes.forEach(type => {
                dailyData[dateStr][type] = 0;
            });
        }

        console.log('Initialized daily data:', dailyData);

        // Count actions per day
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logs.forEach((log: any) => {
            const date = log.timestamp?.substring(0, 10);
            console.log('Log date:', date, 'Action:', log.action_type);
            if (dailyData[date] && actionTypes.includes(log.action_type)) {
                dailyData[date][log.action_type]++;
            }
        });

        // Convert to array format for recharts
        const result = Object.entries(dailyData)
            .map(([date, counts]) => ({
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                'Mosque Created': counts['mosque_created'] || 0,
                'Admin Approved': counts['admin_approved'] || 0,
                'Admin Rejected': counts['admin_rejected'] || 0,
                'Mosque Deleted': counts['mosque_deleted'] || 0,
                'Admin Registered': counts['admin_registered'] || 0,
                'Admin Removed': counts['admin_removed'] || 0,
                'Prayer Times': counts['prayer_times_updated'] || 0,
                'Details Updated': counts['mosque_details_updated'] || 0,
                'Super Admin Login': counts['superadmin_login'] || 0,
                'Admin Login': counts['admin_login'] || 0,
                'Mosque Updated': counts['mosque_updated'] || 0,
                'Code Regenerated': counts['verification_code_regenerated'] || 0
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log('Final daily bar chart data:', result);
        return result;
    };

    // Process monthly bar data for last 6 months
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processMonthlyBarData = (logs: any[]) => {
        console.log('Processing monthly bar data, logs count:', logs.length);

        const monthlyData: { [key: string]: { [key: string]: number } } = {};
        const actionTypes = [
            'mosque_created',
            'admin_approved',
            'admin_rejected',
            'mosque_deleted',
            'admin_registered',
            'admin_removed',
            'prayer_times_updated',
            'mosque_details_updated',
            'superadmin_login',
            'admin_login',
            'mosque_updated',
            'verification_code_regenerated'
        ];

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthStr] = {};
            actionTypes.forEach(type => {
                monthlyData[monthStr][type] = 0;
            });
        }

        console.log('Initialized monthly data:', monthlyData);

        // Count actions per month
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logs.forEach((log: any) => {
            const monthStr = log.timestamp?.substring(0, 7); // YYYY-MM
            if (monthlyData[monthStr] && actionTypes.includes(log.action_type)) {
                monthlyData[monthStr][log.action_type]++;
            }
        });

        console.log('Populated monthly data:', monthlyData);

        // Convert to array format for recharts
        const result = Object.entries(monthlyData)
            .map(([month, counts]) => {
                const [year, monthNum] = month.split('-');
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                return {
                    month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    'Mosque Created': counts['mosque_created'] || 0,
                    'Admin Approved': counts['admin_approved'] || 0,
                    'Admin Rejected': counts['admin_rejected'] || 0,
                    'Mosque Deleted': counts['mosque_deleted'] || 0,
                    'Admin Registered': counts['admin_registered'] || 0,
                    'Admin Removed': counts['admin_removed'] || 0,
                    'Prayer Times': counts['prayer_times_updated'] || 0,
                    'Details Updated': counts['mosque_details_updated'] || 0,
                    'Super Admin Login': counts['superadmin_login'] || 0,
                    'Admin Login': counts['admin_login'] || 0,
                    'Mosque Updated': counts['mosque_updated'] || 0,
                    'Code Regenerated': counts['verification_code_regenerated'] || 0
                };
            });

        console.log('Final monthly bar chart data:', result);
        return result;
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
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Dashboard Overview
                </h1>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50"
                >
                    <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={index}
                            className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6 hover:transform hover:scale-105 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className={`text-sm font-semibold px-2 py-1 rounded-lg ${card.changeType === 'increase'
                                    ? 'text-green-600 bg-green-100'
                                    : 'text-red-600 bg-red-100'
                                    }`}>
                                    {card.change}
                                </div>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800 mb-1">
                                    {card.value.toLocaleString()}
                                </p>
                                <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Audit Stats Overview */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <FaHistory className="w-7 h-7 text-purple-600 mr-3" />
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">System Audit Overview</h3>
                            <p className="text-sm text-gray-600">Real-time activity monitoring</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Total Actions</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            {auditStats.total_actions}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-md border border-green-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Successful Actions</p>
                                <p className="text-2xl font-bold text-green-600">{auditStats.successful_actions}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                                style={{ width: `${auditStats.total_actions > 0 ? (auditStats.successful_actions / auditStats.total_actions * 100) : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border border-red-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Failed Actions</p>
                                <p className="text-2xl font-bold text-red-600">{auditStats.failed_actions}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                                style={{ width: `${auditStats.total_actions > 0 ? (auditStats.failed_actions / auditStats.total_actions * 100) : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border border-yellow-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Last 24 Hours</p>
                                <p className="text-2xl font-bold text-yellow-600">{auditStats.last_24h}</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500 animate-pulse"
                                style={{ width: `${auditStats.total_actions > 0 ? (auditStats.last_24h / auditStats.total_actions * 100) : 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Trends and Activity Section - BAR GRAPHS */}
            <div className="grid grid-cols-1 gap-6">
                {/* Daily Trends Bar Chart */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center mb-6">
                        <TrendingUp className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Daily Activity Trends</h3>
                            <p className="text-xs text-gray-500">Last 7 Days - Real-time Updates</p>
                        </div>
                    </div>
                    <div className="h-96">{/* Increased height from h-80 to h-96 for better legend space */}
                        {dailyBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{
                                            fontSize: '11px',
                                            maxHeight: '80px',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
                                            paddingTop: '10px'
                                        }}
                                        iconType="circle"
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                    />
                                    <Bar dataKey="Mosque Created" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Approved" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Rejected" fill="#ef4444" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Mosque Deleted" fill="#f97316" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Registered" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Removed" fill="#6b7280" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Prayer Times" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Details Updated" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Super Admin Login" fill="#a855f7" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Login" fill="#ec4899" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Mosque Updated" fill="#6366f1" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Code Regenerated" fill="#eab308" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <div>
                                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <p className="font-medium text-lg">No daily trend data available</p>
                                    <p className="text-xs mt-1">Data will appear here once actions are logged</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Trends Bar Chart */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center mb-6">
                        <Activity className="w-6 h-6 text-purple-600 mr-3" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Monthly Activity Trends</h3>
                            <p className="text-xs text-gray-500">Last 6 Months - Comprehensive Overview</p>
                        </div>
                    </div>
                    <div className="h-96">{/* Increased height from h-80 to h-96 for better legend space */}
                        {monthlyBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{
                                            fontSize: '11px',
                                            maxHeight: '80px',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
                                            paddingTop: '10px'
                                        }}
                                        iconType="circle"
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                    />
                                    <Bar dataKey="Mosque Created" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Approved" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Rejected" fill="#ef4444" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Mosque Deleted" fill="#f97316" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Registered" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Removed" fill="#6b7280" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Prayer Times" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Details Updated" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Super Admin Login" fill="#a855f7" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Admin Login" fill="#ec4899" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Mosque Updated" fill="#6366f1" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Code Regenerated" fill="#eab308" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <div>
                                    <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <p className="font-medium text-lg">No monthly trend data available</p>
                                    <p className="text-xs mt-1">Data will appear here once actions are logged</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* All Action Types Overview */}
            {actionTypesData.length > 0 && (
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center mb-6">
                        <Activity className="w-6 h-6 text-purple-600 mr-3" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Action Types Overview</h3>
                            <p className="text-xs text-gray-500">Comprehensive breakdown of all system activities</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                'refresh': FaRedo,
                                'clock': Clock,
                                'info': FaInfoCircle,
                                'sign-in': FaSignInAlt,
                                'shield': FaShieldAlt,
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
                                'pink': 'from-pink-500 to-pink-600',
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
                                'pink': 'from-pink-50 to-pink-100',
                                'violet': 'from-violet-50 to-violet-100'
                            };

                            const Icon = iconMap[actionType.icon] || iconMap['default'];
                            const colorGradient = colorMap[actionType.color] || colorMap['gray'];
                            const bgGradient = bgColorMap[actionType.color] || bgColorMap['gray'];

                            return (
                                <div
                                    key={index}
                                    className={`bg-gradient-to-br ${bgGradient} rounded-xl p-4 border border-${actionType.color}-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-10 h-10 bg-gradient-to-r ${colorGradient} rounded-lg flex items-center justify-center shadow-md`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-semibold text-${actionType.color}-700 bg-${actionType.color}-200 px-2 py-1 rounded-full mb-1`}>
                                                {actionType.success_rate}%
                                            </span>
                                            {actionType.count_today > 0 && (
                                                <span className={`text-[10px] font-semibold text-${actionType.color}-600 bg-white px-2 py-0.5 rounded-full`}>
                                                    +{actionType.count_today} today
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1 font-medium">{actionType.label}</p>
                                    <div className="flex items-baseline justify-between">
                                        <p className={`text-2xl font-bold text-${actionType.color}-700`}>
                                            {actionType.total_count.toLocaleString()}
                                        </p>
                                        {actionType.count_24h > 0 && (
                                            <span className="text-[10px] text-gray-500">
                                                {actionType.count_24h} in 24h
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <div className="flex justify-between text-[10px] text-gray-500">
                                            <span>✓ {actionType.success_count}</span>
                                            <span>✗ {actionType.failure_count}</span>
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