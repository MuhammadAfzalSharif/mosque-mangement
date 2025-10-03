import React from 'react';
import { Link } from 'react-router-dom';
import {
    FiMapPin,
    FiClock,
    FiArrowRight,
    FiNavigation
} from 'react-icons/fi';
import { MdOutlineMosque } from 'react-icons/md';

interface MosqueCardProps {
    id: string;
    name: string;
    location: string;
    description?: string;
}

const MosqueCard: React.FC<MosqueCardProps> = ({ id, name, location }) => {
    return (
        <Link
            to={`/mosques/${id}`}
            className="group block bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02]"
        >
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="bg-white/20 rounded-xl p-2 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <MdOutlineMosque className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-200 font-medium">Active</span>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-full p-2 group-hover:bg-white/20 transition-colors duration-300">
                        <FiArrowRight className="w-4 h-4 text-white" />
                    </div>
                </div>

                {/* Decorative background pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {/* Mosque Name */}
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 leading-tight">
                    {name}
                </h3>

                {/* Location */}
                <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 rounded-lg p-2 flex-shrink-0">
                        <FiMapPin className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed flex-1 line-clamp-2">
                        {location}
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-3 pt-2">
                    <div className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 transition-colors duration-200 rounded-lg px-3 py-2 flex-1">
                        <FiClock className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">Prayer Times</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 transition-colors duration-200 rounded-lg px-3 py-2 flex-1">
                        <FiNavigation className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Directions</span>
                    </div>
                </div>

                {/* View Details Button */}
                <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl py-3 transition-all duration-300 group-hover:shadow-md">
                        <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            View Details & Prayer Times
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MosqueCard;