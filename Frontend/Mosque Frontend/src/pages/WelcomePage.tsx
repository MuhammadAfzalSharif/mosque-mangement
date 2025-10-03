import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Navigation Header */}
            <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4 sm:py-6">
                        <div className="flex items-center">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-2 mr-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Mosque Finder
                            </span>
                        </div>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <Link
                                to="/mosques"
                                className="hidden sm:flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Find Mosques
                            </Link>

                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5">
                    <svg className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2" width="404" height="384" fill="none" viewBox="0 0 404 384">
                        <defs>
                            <pattern id="hero-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                <rect x="0" y="0" width="4" height="4" className="text-blue-200" fill="currentColor" />
                            </pattern>
                        </defs>
                        <rect width="404" height="384" fill="url(#hero-pattern)" />
                    </svg>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28">
                    <div className="text-center">
                        {/* Main Hero Content */}
                        <div className="mb-8 sm:mb-12">
                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-medium text-blue-800 mb-6 sm:mb-8">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Modern Islamic Prayer Management
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight">
                                <span className="block">Find Your Local</span>
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mosque & Prayer Times</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8 sm:mb-12">
                                Connect with your Islamic community through our comprehensive mosque finder.
                                Get accurate prayer times, find nearby mosques, and never miss a prayer again.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                                <Link
                                    to="/mosques"
                                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Find Mosques Near You
                                </Link>


                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-16 sm:py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need for
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Islamic Worship</span>
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                            Our comprehensive platform provides all the tools you need to stay connected with your faith and community.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Feature 1 - Prayer Times */}
                        <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 sm:p-8 border border-blue-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Accurate Prayer Times
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Get precise prayer times for Fajr, Dhuhr, Asr, Maghrib, Isha, and Jummah prayers with real-time updates.
                            </p>
                        </div>

                        {/* Feature 2 - Mosque Locator */}
                        <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 sm:p-8 border border-green-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="bg-gradient-to-r from-green-500 to-green-600 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Find Local Mosques
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Search and discover mosques in your area with detailed location information and directions.
                            </p>
                        </div>

                        {/* Feature 3 - Admin Management */}
                        <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 sm:p-8 border border-purple-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Admin Management
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Mosque administrators can update prayer times and manage their mosque information.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coming Soon Section */}
            <div className="py-16 sm:py-24 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
                <svg className="absolute top-0 right-0 transform translate-x-32 -translate-y-24 opacity-10" width="200" height="200" fill="none" viewBox="0 0 200 200">
                    <defs>
                        <pattern id="coming-soon-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <rect x="0" y="0" width="4" height="4" className="text-blue-300" fill="currentColor" />
                        </pattern>
                    </defs>
                    <rect width="200" height="200" fill="url(#coming-soon-pattern)" />
                </svg>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full text-sm font-medium text-orange-800 mb-6">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Coming Soon
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Exciting Features on the
                            <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent"> Horizon</span>
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                            We're constantly innovating to bring you more powerful tools for Islamic worship and community connection.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Feature 1 - Mobile App */}
                        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                2025 Q2
                            </div>
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Mobile App
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Native iOS and Android apps with offline prayer times, push notifications, and GPS-based mosque finder.
                            </p>
                        </div>

                        {/* Feature 2 - Qibla Direction */}
                        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                2025 Q1
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V3a1 1 0 011 1v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1v0z M13.5 8.5L15 10l-1.5 1.5L12 10l1.5-1.5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Qibla Compass
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Accurate Qibla direction finder using GPS and compass technology for perfect prayer alignment anywhere.
                            </p>
                        </div>

                        {/* Feature 3 - Community Events */}
                        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                2025 Q3
                            </div>
                            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a4 4 0 118 0v4m-4 4v6m-3-3h6" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Community Events
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Discover and manage Islamic events, lectures, and community gatherings at your local mosque.
                            </p>
                        </div>

                        {/* Feature 4 - Islamic Calendar */}
                        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                2025 Q2
                            </div>
                            <div className="bg-gradient-to-r from-red-500 to-rose-500 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a4 4 0 118 0v4m-8 4h16l-4-4m0 0l4-4m-4 4v12" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Islamic Calendar
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Complete Hijri calendar with important Islamic dates, festivals, and fasting schedules.
                            </p>
                        </div>

                        {/* Feature 5 - Donation Platform */}
                        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                2025 Q4
                            </div>
                            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Secure Donations
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Safe and transparent donation platform to support your local mosque and Islamic charities.
                            </p>
                        </div>

                        {/* Feature 6 - Prayer Tracking */}
                        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                2025 Q3
                            </div>
                            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                                Prayer Analytics
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                Track your prayer habits and spiritual growth with beautiful analytics and personalized insights.
                            </p>
                        </div>
                    </div>

                    {/* Newsletter Signup */}
                    <div className="mt-16 sm:mt-20 text-center">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-gray-200 shadow-xl max-w-2xl mx-auto">
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                                Stay Updated
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Be the first to know when these exciting features launch!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                    Notify Me
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 sm:mb-6">
                            Ready to Connect with Your Community?
                        </h2>
                        <p className="text-lg sm:text-xl text-blue-100 mb-8 sm:mb-12 max-w-2xl mx-auto">
                            Join thousands of Muslims who trust our platform for accurate prayer times and mosque information.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                            <Link
                                to="/mosques"
                                className="w-full sm:w-auto bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Start Finding Mosques
                            </Link>

                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-2 mr-3">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold">Mosque Finder</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Connecting Muslims with their local mosques and prayer times
                        </p>
                        <div className="mt-6 text-xs text-gray-500">
                            &copy; 2024 Mosque Finder. Built with ❤️ for the Muslim community.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;