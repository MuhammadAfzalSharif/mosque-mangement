import React from 'react';
import { Link } from 'react-router-dom';
import {
    MapPin,
    Star,
    Home,
    Clock,
    Users,
    Heart,
    Eye,
    Calendar
} from 'react-feather';

interface MosqueCardProps {
    id: string;
    name: string;
    location: string;
    description?: string;
    isFavorited: boolean;
    onToggleFavorite: (id: string) => void;
}

const MosqueCard: React.FC<MosqueCardProps> = ({ id, name, location, isFavorited, onToggleFavorite }) => {
    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation when clicking the star
        e.stopPropagation();
        onToggleFavorite(id);
    };

    // Capitalize first letter of each word in name and location
    const capitalizeFirstLetter = (str: string) => {
        return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const capitalizedName = capitalizeFirstLetter(name);
    const capitalizedLocation = capitalizeFirstLetter(location);

    return (
        <Link
            to={`/mosques/${id}`}
            className="group relative block bg-gradient-to-br from-white via-green-50/50 to-emerald-50/30 backdrop-blur-xl border-2 border-white/40 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-[1.02] hover:-translate-y-1"
        >
            {/* 3D Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
            <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-lg sm:blur-xl group-hover:scale-110 transition-transform duration-300"></div>
            <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-md sm:blur-lg group-hover:scale-110 transition-transform duration-300"></div>

            {/* Modern Islamic Header */}
            <div className="relative bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 overflow-hidden">
                {/* Header 3D Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-16 sm:translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-24 sm:h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6 sm:translate-y-12 sm:-translate-x-12"></div>

                <div className="relative z-10 flex items-center justify-between">
                    {/* Mosque Icon & Status */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white/30 rounded-lg blur-sm"></div>
                            <div className="relative bg-white/20 backdrop-blur-sm rounded-lg p-1 sm:p-1.5">
                                <Home className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-300 rounded-full animate-pulse shadow-sm"></div>
                            <span className="text-xs sm:text-sm text-green-100 font-medium">
                                <span className="hidden sm:inline">Active</span>
                                <span className="sm:hidden">Open</span>
                            </span>
                        </div>
                    </div>

                    {/* Favorite Button */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                            onClick={handleFavoriteClick}
                            className="group/fav relative bg-white/10 backdrop-blur-sm rounded-full p-1.5 sm:p-2 hover:bg-white/20 transition-all duration-300 transform hover:scale-110 shadow-md"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-sm opacity-0 group-hover/fav:opacity-100 transition-opacity duration-300"></div>
                                <Star
                                    className={`relative w-3 h-3 sm:w-4 sm:h-4 transition-all duration-300 ${isFavorited
                                            ? 'text-yellow-400 fill-current drop-shadow-sm'
                                            : 'text-white group-hover/fav:text-yellow-200'
                                        }`}
                                />
                            </div>
                        </button>

                        {/* Prayer Time Indicator */}
                        <div className="hidden sm:flex items-center bg-white/10 backdrop-blur-sm rounded-full px-2 py-1">
                            <Clock className="w-3 h-3 text-white mr-1" />
                            <span className="text-xs text-white">5x</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modern Islamic Content */}
            <div className="relative z-10 p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4">
                {/* Mosque Name */}
                <div className="space-y-1 sm:space-y-2">
                    <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-300 leading-tight line-clamp-2">
                        {capitalizedName}
                    </h3>

                    {/* Quick Stats - Mobile Hidden, Desktop Shown */}
                    <div className="hidden sm:flex items-center space-x-3 text-xs text-gray-600">
                        <div className="flex items-center">
                            <Users className="w-3 h-3 mr-1 text-green-600" />
                            <span>Community</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-blue-600" />
                            <span>Events</span>
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="relative flex-shrink-0 mt-0.5">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg blur-sm opacity-30"></div>
                        <div className="relative bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-lg p-1.5 sm:p-2 shadow-sm">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-2 font-medium">
                            {capitalizedLocation}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                            Tap for directions & details
                        </p>
                    </div>
                </div>

                {/* Modern Action Button */}
                <div className="pt-2 sm:pt-3 border-t border-green-100/50">
                    <div className="group/btn relative bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 hover:from-green-100 hover:via-emerald-100 hover:to-teal-100 border border-green-200/50 rounded-lg sm:rounded-xl py-2 sm:py-3 transition-all duration-300 shadow-sm hover:shadow-md">
                        {/* Button 3D Effects */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-lg sm:rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>

                        <div className="relative z-10 flex items-center justify-center space-x-1.5 sm:space-x-2">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-sm opacity-30"></div>
                                <Eye className="relative w-3 h-3 sm:w-4 sm:h-4 text-green-600 group-hover/btn:text-emerald-700 group-hover/btn:scale-110 transition-all duration-300" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-green-700 via-emerald-700 to-teal-700 bg-clip-text text-transparent">
                                <span className="hidden sm:inline">View Details & Prayer Times</span>
                                <span className="sm:hidden">View Details</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Mobile-Only Quick Actions */}
                <div className="sm:hidden flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center text-green-600">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>Prayers</span>
                        </div>
                        <div className="flex items-center text-blue-600">
                            <Heart className="w-3 h-3 mr-1" />
                            <span>Community</span>
                        </div>
                    </div>
                    <div className="text-gray-500">
                        <span>Tap to explore</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MosqueCard;