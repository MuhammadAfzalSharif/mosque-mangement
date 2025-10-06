import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import {
    FaBuilding as Building,
    FaClock as Clock,
    FaCheckCircle as CheckCircle,
    FaTimesCircle as XCircle,
    FaChartLine as TrendingUp,
    FaCalendarAlt as Calendar,
    FaSync as Activity
} from 'react-icons/fa';

interface DashboardStats {
    total_mosques: number;
    approved_mosques: number;
    pending_requests: number;
    rejected_requests: number;
}

interface MonthlyTrend {
    date: string;
    approved: number;
    rejected: number;
}

interface ActivityData {
    action: string;
    count: number;
}

interface Props {
    stats: DashboardStats | null;
    onRefresh: () => void;
}

const DashboardOverview: React.FC<Props> = ({ stats, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);
    const [todayStats, setTodayStats] = useState({
        registrations: 0,
        approvals: 0,
        activeMosques: 0
    });

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch monthly trends and activity data
            const [trendsResponse, activityResponse] = await Promise.all([
                superAdminApi.getRequestHistory({ limit: 6 }),
                superAdminApi.getRequestHistory({ limit: 100 })
            ]);

            // Process monthly trends data
            const trends = processTrendsData(trendsResponse.data.requests || []);
            setMonthlyTrends(trends);

            // Process activity data
            const activity = processActivityData(activityResponse.data.requests || []);
            setRecentActivity(activity);

            // Calculate today's stats
            const today = new Date().toISOString().split('T')[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const todayRequests = activityResponse.data.requests?.filter((req: any) =>
                req.created_at?.startsWith(today)
            ) || [];

            setTodayStats({
                registrations: todayRequests.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                approvals: todayRequests.filter((req: any) => req.status === 'approved').length,
                activeMosques: stats?.approved_mosques || 0
            });

        } catch (error) {
            console.error('Failed to fetch dashboard data:', getErrorMessage(error));
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processTrendsData = (requests: any[]): MonthlyTrend[] => {
        const monthlyData: { [key: string]: { approved: number; rejected: number } } = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requests.forEach((request: any) => {
            const month = request.created_at?.substring(0, 7) || '2024-01'; // YYYY-MM format
            if (!monthlyData[month]) {
                monthlyData[month] = { approved: 0, rejected: 0 };
            }

            if (request.status === 'approved') {
                monthlyData[month].approved++;
            } else if (request.status === 'rejected') {
                monthlyData[month].rejected++;
            }
        });

        return Object.entries(monthlyData)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-6); // Last 6 months
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processActivityData = (requests: any[]): ActivityData[] => {
        const activities: { [key: string]: number } = {
            'Mosque Created': 0,
            'Admin Approved': 0,
            'Admin Rejected': 0,
            'Code Regenerated': 0,
            'Mosque Deleted': 0
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requests.forEach((request: any) => {
            switch (request.status) {
                case 'approved':
                    activities['Admin Approved']++;
                    break;
                case 'rejected':
                    activities['Admin Rejected']++;
                    break;
                case 'pending':
                    activities['Mosque Created']++;
                    break;
            }
        });

        return Object.entries(activities).map(([action, count]) => ({ action, count }));
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

            {/* Trends and Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center mb-6">
                        <TrendingUp className="w-6 h-6 text-blue-600 mr-3" />
                        <h3 className="text-xl font-bold text-gray-800">Monthly Trends</h3>
                    </div>
                    <div className="space-y-4">
                        {monthlyTrends.slice(-3).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm font-medium text-gray-600">{item.date}</span>
                                <div className="flex space-x-4">
                                    <span className="text-green-600 font-semibold">+{item.approved}</span>
                                    <span className="text-red-600 font-semibold">-{item.rejected}</span>
                                </div>
                            </div>
                        ))}
                        {monthlyTrends.length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* System Activity */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center mb-6">
                        <Activity className="w-6 h-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-bold text-gray-800">Recent Activity</h3>
                    </div>
                    <div className="space-y-3">
                        {recentActivity.slice(0, 5).map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm font-medium text-gray-700">{activity.action}</span>
                                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                    {activity.count}
                                </span>
                            </div>
                        ))}
                        {recentActivity.length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                                No activity data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center mb-6">
                    <Calendar className="w-6 h-6 text-indigo-600 mr-3" />
                    <h3 className="text-xl font-bold text-gray-800">Recent Activity Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Today's Registrations</p>
                        <p className="text-2xl font-bold text-blue-600">{todayStats.registrations}</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Today's Approvals</p>
                        <p className="text-2xl font-bold text-green-600">{todayStats.approvals}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-1">Active Mosques</p>
                        <p className="text-2xl font-bold text-purple-600">{todayStats.activeMosques}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;