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
    FaBuilding,
    FaTimes
} from 'react-icons/fa'; interface ApprovedMosque {
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

    const getLocationColor = (location: string) => {
        const colors = {
            'Lahore': 'bg-blue-100 text-blue-800',
            'Karachi': 'bg-green-100 text-green-800',
            'Islamabad': 'bg-purple-100 text-purple-800',
            'Peshawar': 'bg-orange-100 text-orange-800',
            'Quetta': 'bg-red-100 text-red-800',
        };
        const city = location.split(',')[0];
        return colors[city as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Approved Mosques
                </h1>
                <div className="flex items-center space-x-2">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {filteredAndSortedMosques.length} Approved
                    </span>
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
                            placeholder="Search by mosque name, admin, location, or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'mosque_name' | 'location')}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        >
                            <option value="newest">Recently Approved</option>
                            <option value="oldest">Oldest Approved</option>
                            <option value="mosque_name">Mosque Name</option>
                            <option value="location">Location</option>
                        </select>
                    </div>
                </div>

                {/* Removed bulk delete functionality as requested */}
            </div>

            {/* Mosques List */}
            <div className="space-y-4">
                {filteredAndSortedMosques.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-12 text-center">
                        <FaCheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Approved Mosques Found</h3>
                        <p className="text-gray-500">No mosques match your search criteria.</p>
                    </div>
                ) : (
                    <>
                        {/* Selection functionality removed */}

                        {/* Mosque Cards (Grid Layout) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredAndSortedMosques.map((mosque) => (
                                <div
                                    key={mosque._id}
                                    className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-3xl"
                                >
                                    {/* Header with Status */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start space-x-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center">
                                                    <FaBuilding className="w-5 h-5 mr-2 text-green-600" />
                                                    {mosque.mosque_name}
                                                </h3>
                                                <div className="flex items-center space-x-2">
                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold flex items-center">
                                                        <FaCheckCircle className="w-3 h-3 mr-1" />
                                                        APPROVED
                                                    </span>
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                                                        {mosque.registration_code}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin Information */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center text-gray-700">
                                            <FaUser className="w-4 h-4 mr-3 text-blue-600" />
                                            <span className="font-medium">{mosque.admin_name}</span>
                                        </div>
                                        <div className="flex items-center text-gray-700">
                                            <FaEnvelope className="w-4 h-4 mr-3 text-green-600" />
                                            <span className="text-sm">{mosque.admin_email}</span>
                                        </div>
                                        <div className="flex items-center text-gray-700">
                                            <FaPhone className="w-4 h-4 mr-3 text-purple-600" />
                                            <span className="text-sm">{mosque.admin_phone}</span>
                                        </div>
                                        <div className="flex items-center text-gray-700">
                                            <FaMapMarkerAlt className="w-4 h-4 mr-3 text-red-600" />
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getLocationColor(mosque.location)}`}>
                                                {mosque.location}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                        <div className="space-y-2 text-xs text-gray-600">
                                            <div className="flex items-center justify-between">
                                                <span>Registered:</span>
                                                <span className="font-medium">{formatDate(mosque.created_at)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Approved:</span>
                                                <span className="font-medium text-green-600">{formatDate(mosque.approved_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => onViewDetails(mosque)}
                                            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            <FaEye className="w-3 h-3 mr-1" />
                                            View
                                        </button>
                                        <button
                                            onClick={() => onEdit(mosque)}
                                            className="flex items-center px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            <FaEdit className="w-3 h-3 mr-1" />
                                            Edit
                                        </button>
                                        {/* Code and Delete buttons removed as requested */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ApprovedMosques;