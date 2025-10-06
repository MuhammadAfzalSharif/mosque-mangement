import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../lib/api';
import { getErrorMessage } from '../../lib/types';
import { FaClock, FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCheck, FaTimes, FaEye, FaSearch, FaFilter } from 'react-icons/fa';

interface PendingRequest {
    _id: string;
    mosque_name: string;
    admin_name: string;
    admin_email: string;
    admin_phone: string;
    location: string;
    registration_code: string;
    created_at: string;
    status: 'pending';
    mosque_id?: string;
    application_notes?: string;
    verification_status?: string;
}

interface Props {
    onApprove: (id: string, notes?: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
    onViewDetails: (request: PendingRequest) => Promise<void>;
}

const PendingRequests: React.FC<Props> = ({ onApprove, onReject, onViewDetails }) => {
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mosque_name'>('newest');
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<string | null>(null);
    const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<string | null>(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching pending requests...');
            const response = await superAdminApi.getPendingRequests();
            console.log('Pending requests response:', response);
            console.log('Pending admins data:', response.data);

            // Transform the data to match our interface
            // Backend returns admin objects with populated mosque_id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedRequests = (response.data.pending_admins || []).map((admin: any) => {
                console.log('Transforming admin:', admin);
                return {
                    _id: admin._id,
                    mosque_name: admin.mosque_id?.name || 'Unknown Mosque',
                    admin_name: admin.name || 'Unknown Admin',
                    admin_email: admin.email || '',
                    admin_phone: admin.phone || '',
                    location: admin.mosque_id?.location || 'Unknown Location',
                    registration_code: admin.verification_code_used || 'No Code',
                    created_at: admin.createdAt || new Date().toISOString(),
                    status: 'pending' as const,
                    // Additional fields we might need
                    mosque_id: admin.mosque_id?._id || null,
                    application_notes: admin.application_notes || '',
                    verification_status: admin.verification_status || 'unknown'
                };
            });

            console.log('Transformed requests:', transformedRequests);
            setRequests(transformedRequests);
        } catch (err) {
            console.error('Failed to fetch pending requests:', err);
            const errorMessage = getErrorMessage(err);
            console.error('Error message:', errorMessage);
            setError(errorMessage);
            // Fallback to empty array instead of mock data
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };



    const filteredAndSortedRequests = requests
        .filter(request =>
            request.mosque_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.location.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'mosque_name':
                    return a.mosque_name.localeCompare(b.mosque_name);
                default:
                    return 0;
            }
        });

    const handleSelectAll = () => {
        if (selectedRequests.length === filteredAndSortedRequests.length) {
            setSelectedRequests([]);
        } else {
            setSelectedRequests(filteredAndSortedRequests.map(req => req._id));
        }
    };

    const handleSelectRequest = (id: string) => {
        setSelectedRequests(prev =>
            prev.includes(id)
                ? prev.filter(reqId => reqId !== id)
                : [...prev, id]
        );
    };

    const handleBulkApprove = async () => {
        try {
            await Promise.all(selectedRequests.map(id => onApprove(id)));
            setSelectedRequests([]);
            await fetchPendingRequests();
        } catch (error) {
            console.error('Failed to bulk approve:', error);
        }
    };

    const handleBulkReject = async () => {
        const reason = prompt('Please provide a reason for bulk rejection (minimum 10 characters):');
        if (!reason || reason.trim().length < 10) {
            alert('Rejection reason must be at least 10 characters');
            return;
        }

        try {
            await Promise.all(selectedRequests.map(id => onReject(id, reason)));
            setSelectedRequests([]);
            await fetchPendingRequests();
        } catch (error) {
            console.error('Failed to bulk reject:', error);
        }
    };

    const handleRejectClick = (id: string) => {
        setSelectedRequestForRejection(id);
        setRejectionReason('');
        setShowRejectionModal(true);
    };

    const handleRejectionSubmit = async () => {
        if (!selectedRequestForRejection) return;

        if (rejectionReason.trim().length < 10) {
            alert('Rejection reason must be at least 10 characters');
            return;
        }

        try {
            console.log('Rejecting admin:', selectedRequestForRejection, 'with reason:', rejectionReason);
            await onReject(selectedRequestForRejection, rejectionReason);
            setShowRejectionModal(false);
            setSelectedRequestForRejection(null);
            setRejectionReason('');
            await fetchPendingRequests();
        } catch (error) {
            console.error('Failed to reject request:', error);
            alert('Failed to reject admin. Please try again.');
        }
    };

    const handleApproveClick = (id: string) => {
        setSelectedRequestForApproval(id);
        setShowApprovalModal(true);
    };

    const handleApprovalSubmit = async () => {
        if (selectedRequestForApproval) {
            try {
                console.log('Approving admin:', selectedRequestForApproval, 'with notes:', approvalNotes);
                await onApprove(selectedRequestForApproval, approvalNotes);
                setShowApprovalModal(false);
                setSelectedRequestForApproval(null);
                setApprovalNotes('');
                // Refresh the requests list
                await fetchPendingRequests();
            } catch (error) {
                console.error('Failed to approve request:', error);
                alert('Failed to approve admin. Please try again.');
            }
        }
    };

    const handleApprovalCancel = () => {
        setShowApprovalModal(false);
        setSelectedRequestForApproval(null);
        setApprovalNotes('');
    };

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-lg text-gray-600">Loading pending requests...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-600 mb-2">
                    <FaTimes className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Error Loading Requests</h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                    onClick={fetchPendingRequests}
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
                    Pending Requests
                </h1>
                <div className="flex items-center space-x-2">
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {filteredAndSortedRequests.length} Pending
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
                            placeholder="Search by mosque name, admin, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'mosque_name')}
                            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="mosque_name">Mosque Name</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedRequests.length > 0 && (
                    <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                        <span className="text-blue-800 font-semibold">
                            {selectedRequests.length} request(s) selected
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleBulkApprove}
                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                <FaCheck className="w-4 h-4 mr-2" />
                                Approve All
                            </button>
                            <button
                                onClick={handleBulkReject}
                                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                <FaTimes className="w-4 h-4 mr-2" />
                                Reject All
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {filteredAndSortedRequests.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-12 text-center">
                        <FaClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Pending Requests</h3>
                        <p className="text-gray-500">All mosque registration requests have been processed.</p>
                    </div>
                ) : (
                    <>
                        {/* Select All Header */}
                        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg p-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedRequests.length === filteredAndSortedRequests.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                    Select All ({filteredAndSortedRequests.length})
                                </span>
                            </label>
                        </div>

                        {/* Request Cards */}
                        {filteredAndSortedRequests.map((request) => (
                            <div
                                key={request._id}
                                className={`bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-3xl ${selectedRequests.includes(request._id) ? 'ring-2 ring-blue-500' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-4">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedRequests.includes(request._id)}
                                        onChange={() => handleSelectRequest(request._id)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-2"
                                    />

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-800 mb-1">
                                                    {request.mosque_name}
                                                </h3>
                                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                    <span className="flex items-center">
                                                        <FaClock className="w-4 h-4 mr-1" />
                                                        {formatDate(request.created_at)}
                                                    </span>
                                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                                                        {request.registration_code}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center text-gray-700">
                                                    <FaUser className="w-4 h-4 mr-3 text-blue-600" />
                                                    <span className="font-medium">{request.admin_name}</span>
                                                </div>
                                                <div className="flex items-center text-gray-700">
                                                    <FaEnvelope className="w-4 h-4 mr-3 text-green-600" />
                                                    <span>{request.admin_email}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center text-gray-700">
                                                    <FaPhone className="w-4 h-4 mr-3 text-purple-600" />
                                                    <span>{request.admin_phone}</span>
                                                </div>
                                                <div className="flex items-center text-gray-700">
                                                    <FaMapMarkerAlt className="w-4 h-4 mr-3 text-red-600" />
                                                    <span>{request.location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={() => onViewDetails(request)}
                                                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                            >
                                                <FaEye className="w-4 h-4 mr-2" />
                                                View Details
                                            </button>
                                            <button
                                                onClick={() => handleApproveClick(request._id)}
                                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                            >
                                                <FaCheck className="w-4 h-4 mr-2" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectClick(request._id)}
                                                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                                            >
                                                <FaTimes className="w-4 h-4 mr-2" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Approval Modal */}
            {showApprovalModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Approve Admin Request
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Approval Notes (Optional)
                            </label>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                placeholder="Add any notes about the approval..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleApprovalSubmit}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Approve
                            </button>
                            <button
                                onClick={handleApprovalCancel}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Reject Admin Request
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rejection Reason (Required - Min 10 characters)
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Provide a detailed reason for rejection (e.g., incomplete documents, verification failed, etc.)..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                rows={4}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {rejectionReason.length} / 10 characters minimum
                            </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> The admin account will be marked as rejected but NOT deleted.
                                They can only reapply if you allow them to do so later.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRejectionSubmit}
                                disabled={rejectionReason.trim().length < 10}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectionModal(false);
                                    setSelectedRequestForRejection(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingRequests;