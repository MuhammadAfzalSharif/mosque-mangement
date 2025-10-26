import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import {
    FaCheckCircle,
    FaUser,
    FaMapMarkerAlt,
    FaPhone,
    FaEnvelope,
    FaEye,
    FaEdit,
    FaSearch,
    FaFilter,
    FaTimes
} from 'react-icons/fa';
import { BarChart } from 'react-feather'; interface ApprovedMosque {
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

interface Props {
    onViewDetails: (mosque: ApprovedMosque) => void;
    onEdit: (mosque: ApprovedMosque) => void;
    refreshTrigger?: number; // Used to trigger data refresh
}

const ApprovedMosques: React.FC<Props> = ({ onViewDetails, onEdit, refreshTrigger }) => {
    const [mosques, setMosques] = useState<ApprovedMosque[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mosque_name' | 'location'>('newest');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchApprovedMosques();
    }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

    const fetchApprovedMosques = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await superAdminApi.getApprovedRequests();

            console.log('Raw API Response:', response.data);
            console.log('Approved Admins:', response.data.approved_admins);

            // Transform the data to match our interface - backend returns approved admins
            // Filter out admins whose mosques have been deleted
            const transformedMosques = (response.data.approved_admins || [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((admin: any) => {
                    // Only include admins that have a valid mosque_id object
                    // This filters out admins whose mosques have been deleted
                    const hasValidMosque = admin.mosque_id && typeof admin.mosque_id === 'object' && admin.mosque_id._id;
                    if (!hasValidMosque) {
                        console.log('Filtering out admin with deleted mosque:', admin.name, admin.email);
                    }
                    return hasValidMosque;
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((admin: any) => {
                    console.log('Processing admin:', admin);
                    console.log('Mosque data:', admin.mosque_id);
                    console.log('Created at:', admin.createdAt);
                    console.log('Approved at:', admin.approved_at);

                    // For backward compatibility with existing records without approved_at
                    const approvedDate = admin.approved_at || admin.createdAt || new Date().toISOString();

                    return {
                        _id: admin._id || admin.id || Math.random().toString(),
                        mosque_name: admin.mosque_id.name,
                        admin_name: admin.name || 'Unknown Admin',
                        admin_email: admin.email || '',
                        admin_phone: admin.phone || '',
                        location: admin.mosque_id.location,
                        registration_code: admin.mosque_id.verification_code || '',
                        created_at: admin.createdAt || new Date().toISOString(),
                        approved_at: approvedDate,
                        status: 'approved' as const,
                        admin_id: admin._id,
                        mosque_id: admin.mosque_id._id // Add mosque ID for easier access
                    };
                });

            setMosques(transformedMosques);
        } catch (err) {
            console.error('Failed to fetch approved mosques:', err);
            setError(getErrorMessage(err));
            setMosques([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSortedMosques = mosques
        .filter(mosque =>
            mosque.mosque_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mosque.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mosque.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mosque.registration_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest': {
                    // Most recently approved first
                    const dateB = new Date(b.approved_at).getTime();
                    const dateA = new Date(a.approved_at).getTime();
                    return dateB - dateA;
                }
                case 'oldest': {
                    // Oldest approved first
                    const oldDateA = new Date(a.approved_at).getTime();
                    const oldDateB = new Date(b.approved_at).getTime();
                    return oldDateA - oldDateB;
                }
                case 'mosque_name':
                    return a.mosque_name.localeCompare(b.mosque_name);
                case 'location':
                    return a.location.localeCompare(b.location);
                default:
                    return 0;
            }
        });

    // Removed selection functionality as requested

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <span className="ml-3 text-lg text-gray-600">Loading approved mosques...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-600 mb-2">
                    <FaTimes className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Error Loading Approved Mosques</h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                    onClick={fetchApprovedMosques}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/20 p-1 sm:p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 lg:space-y-6">
                {/* Modern 3D Header */}
                <div className="relative bg-gradient-to-r from-white via-gray-50/50 to-green-50/30 backdrop-blur-xl border-2 border-white/40 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-2 sm:p-3 lg:p-4 xl:p-6 mb-2 sm:mb-4 lg:mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-60 rounded-lg sm:rounded-xl lg:rounded-2xl"></div>
                    <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                    <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                        <div className="text-center sm:text-left">
                            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-gray-800 via-green-600 to-emerald-600 bg-clip-text text-transparent mb-0.5 sm:mb-1">
                                <span className="hidden sm:inline">Approved Mosques</span>
                                <span className="sm:hidden">Approved</span>
                            </h1>
                            <p className="text-gray-600 text-sm sm:text-base hidden sm:block">Manage and monitor approved mosque registrations</p>
                        </div>

                        <div className="flex items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-md sm:rounded-lg lg:rounded-xl blur-sm sm:blur-md opacity-30"></div>
                                <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 text-white px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-md sm:rounded-lg lg:rounded-xl font-semibold text-sm sm:text-base shadow-lg">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                        <FaCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span>{filteredAndSortedMosques.length} <span className="hidden sm:inline">Approved</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Search & Filters */}
                <div className="relative bg-white backdrop-blur-xl border-2 border-gray-200/50 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-2 sm:p-3 lg:p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/80 rounded-lg sm:rounded-xl lg:rounded-2xl"></div>
                    <div className="absolute -top-1 -right-1 sm:-top-3 sm:-right-3 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-br from-green-200/30 to-transparent rounded-full blur-md sm:blur-lg"></div>
                    <div className="absolute -bottom-1 -left-1 sm:-bottom-3 sm:-left-3 w-6 h-6 sm:w-12 sm:h-12 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-sm sm:blur-md"></div>

                    <div className="relative z-10 space-y-2 sm:space-y-3 lg:space-y-4">
                        {/* Search Section */}
                        <div className="space-y-1 sm:space-y-2">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center">
                                <FaSearch className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-green-600" />
                                <span className="hidden sm:inline">Search & Filter</span>
                                <span className="sm:hidden">Search</span>
                            </h3>

                            <div className="relative group">
                                <div className="relative bg-gray-50/80 backdrop-blur-sm rounded-md sm:rounded-lg lg:rounded-xl border-2 border-gray-200 focus-within:border-green-400 focus-within:bg-white transition-all duration-300">
                                    <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4 group-focus-within:text-green-500 transition-colors duration-200" />
                                    <input
                                        type="text"
                                        placeholder="Search mosque, admin, location..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-7 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base bg-transparent border-0 rounded-md sm:rounded-lg lg:rounded-xl focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                        >
                                            <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filter Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                            {/* Sort Filter */}
                            <div className="relative group">
                                <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1">
                                    <FaFilter className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1 text-green-600" />
                                    <span className="hidden sm:inline">Sort By</span>
                                    <span className="sm:hidden">Sort</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'mosque_name' | 'location')}
                                        className="w-full pl-2 sm:pl-3 pr-6 sm:pr-8 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-50/80 backdrop-blur-sm border-2 border-gray-200 rounded-md sm:rounded-lg lg:rounded-xl focus:border-green-400 focus:bg-white focus:ring-1 focus:ring-green-200 transition-all duration-300 text-gray-700 appearance-none cursor-pointer"
                                    >
                                        <option value="newest">Recent</option>
                                        <option value="oldest">Oldest</option>
                                        <option value="mosque_name">Name A-Z</option>
                                        <option value="location">Location</option>
                                    </select>
                                    <div className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Status Display */}
                            <div className="relative group hidden sm:block">
                                <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1">
                                    <FaCheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1 text-green-600" />
                                    Status
                                </label>
                                <div className="w-full pl-2 sm:pl-3 pr-2 sm:pr-3 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-md sm:rounded-lg lg:rounded-xl">
                                    <span className="text-green-800 font-medium">All Approved</span>
                                </div>
                            </div>

                            {/* Results Count */}
                            <div className="relative group">
                                <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1">
                                    <BarChart className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1 text-blue-600" />
                                    Results
                                </label>
                                <div className="w-full pl-2 sm:pl-3 pr-2 sm:pr-3 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-md sm:rounded-lg lg:rounded-xl">
                                    <span className="text-blue-800 font-medium">
                                        {filteredAndSortedMosques.length} <span className="hidden sm:inline">Mosque{filteredAndSortedMosques.length !== 1 ? 's' : ''}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {searchTerm && (
                            <div className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-md sm:rounded-lg lg:rounded-xl">
                                <span className="text-green-800 font-medium text-sm sm:text-base truncate mr-2">
                                    <span className="hidden sm:inline">Searching for: "</span>
                                    <span className="sm:hidden">Search: "</span>
                                    {searchTerm.length > 15 ? `${searchTerm.substring(0, 15)}...` : searchTerm}"
                                </span>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white font-medium rounded-md sm:rounded-lg transition-colors duration-200 flex-shrink-0"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modern Mosques Grid */}
                <div className="space-y-2 sm:space-y-4">
                    {filteredAndSortedMosques.length === 0 ? (
                        <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-green-50/30 backdrop-blur-xl border-2 border-white/30 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 lg:p-8 text-center">
                            {/* 3D Background Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-60 rounded-lg sm:rounded-xl lg:rounded-2xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg"></div>

                            <div className="relative z-10">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4 shadow-md">
                                    <FaCheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                                <h3 className="text-sm sm:text-base lg:text-xl font-bold text-gray-800 mb-1 sm:mb-2">
                                    <span className="hidden sm:inline">No Approved Mosques Found</span>
                                    <span className="sm:hidden">No Mosques Found</span>
                                </h3>
                                <p className="text-gray-600 text-sm sm:text-base">No mosques match your search criteria.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Modern Mosque Cards Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredAndSortedMosques.map((mosque) => (
                                    <div
                                        key={mosque._id}
                                        className="group relative bg-gradient-to-br from-white via-gray-50/50 to-green-50/30 backdrop-blur-xl border-2 border-white/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 transform hover:scale-[1.01]"
                                    >
                                        {/* 3D Background Effects */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-2xl"></div>
                                        <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-300"></div>
                                        <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-lg group-hover:scale-110 transition-transform duration-300"></div>

                                        <div className="relative z-10">
                                            {/* Header with Status */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                                                        <span className="text-white font-bold text-lg">🕌</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 truncate mb-1 group-hover:text-green-700 transition-colors duration-300">
                                                            {mosque.mosque_name}
                                                        </h3>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm sm:text-base font-semibold bg-green-100 text-green-800">
                                                                <FaCheckCircle className="w-3 h-3 mr-1" />
                                                                APPROVED
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Registration Code */}
                                            <div className="mb-4 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm sm:text-base font-semibold text-blue-700">Registration Code</span>
                                                    <code className="text-sm sm:text-base font-mono text-blue-800 bg-blue-100 px-2 py-1 rounded">
                                                        {mosque.registration_code}
                                                    </code>
                                                </div>
                                            </div>

                                            {/* Admin Information */}
                                            <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                                                <div className="flex items-center text-gray-700 text-sm sm:text-base">
                                                    <FaUser className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2 text-blue-600 flex-shrink-0" />
                                                    <span className="truncate">{mosque.admin_name}</span>
                                                </div>
                                                <div className="flex items-center text-gray-700 text-sm sm:text-base">
                                                    <FaEnvelope className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2 text-green-600 flex-shrink-0" />
                                                    <span className="truncate">{mosque.admin_email}</span>
                                                </div>
                                                <div className="flex items-center text-gray-700 text-sm sm:text-base">
                                                    <FaPhone className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2 text-purple-600 flex-shrink-0" />
                                                    <span className="truncate">{mosque.admin_phone}</span>
                                                </div>
                                                <div className="flex items-center text-gray-700 text-sm sm:text-base">
                                                    <FaMapMarkerAlt className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2 text-red-600 flex-shrink-0" />
                                                    <span className="truncate">{mosque.location}</span>
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-xl p-3 mb-4 border border-gray-200">
                                                <div className="space-y-2 text-sm sm:text-base">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-600">Registered:</span>
                                                        <span className="text-gray-800 font-medium">{formatDate(mosque.created_at)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-600">Approved:</span>
                                                        <span className="text-green-700 font-medium">{formatDate(mosque.approved_at)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onViewDetails(mosque)}
                                                    className="flex-1 group relative bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                                                >
                                                    <div className="flex items-center justify-center">
                                                        <FaEye className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                                                        <span>View</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                </button>

                                                <button
                                                    onClick={() => onEdit(mosque)}
                                                    className="flex-1 group relative bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold py-2 px-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                                                >
                                                    <div className="flex items-center justify-center">
                                                        <FaEdit className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                                                        <span>Edit</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-white/20 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApprovedMosques;