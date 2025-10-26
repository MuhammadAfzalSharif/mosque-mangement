import React, { useState, useEffect } from 'react';
import {
    Clock,
    Calendar,
    Moon,
    Sunset,
    Sun,
    Cloud,
    Home,

} from 'react-feather';

interface PrayerTimes {
    fajr: string | null;
    dhuhr: string | null;
    asr: string | null;
    maghrib: string | null;
    isha: string | null;
    jummah: string | null;
}

interface PrayerClockProps {
    prayerTimes: PrayerTimes;
}

const PrayerClock: React.FC<PrayerClockProps> = ({ prayerTimes }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; countdown: string } | null>(null);

    // Convert 24-hour time to 12-hour format with AM/PM
    const convertTo12Hour = (time24: string): string => {
        if (!time24) return '--:--';

        // Handle both "HH:MM" and "HH:MM AM/PM" formats
        const timeStr = time24.trim();

        // If already in 12-hour format, return as-is
        if (timeStr.match(/AM|PM/i)) {
            return timeStr;
        }

        // Convert from 24-hour to 12-hour
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // 0 should be 12

        return `${hour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    // Move formatTimeRemaining function before useEffect
    const formatTimeRemaining = (minutesLeft: number, secondsOffset: number) => {
        const totalSeconds = (minutesLeft * 60) - secondsOffset;

        // Handle negative values (when prayer time has just passed)
        if (totalSeconds <= 0) {
            return "00:00";
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.max(0, totalSeconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const calculateNextPrayer = (now: Date, prayers: PrayerTimes) => {
            console.log('Calculating next prayer...', prayers); // Debug log

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const isFriday = now.getDay() === 5; // Friday is day 5 (0=Sunday, 1=Monday, ..., 5=Friday)
            console.log('Current time in minutes:', currentMinutes, `(${now.getHours()}:${now.getMinutes()})`);
            console.log('Is Friday:', isFriday);

            // Build prayer list based on day of week
            const prayerList = [
                { name: 'Fajr', time: prayers.fajr },
                // On Friday, use Jummah instead of Dhuhr
                isFriday
                    ? { name: 'Jummah', time: prayers.jummah }
                    : { name: 'Dhuhr', time: prayers.dhuhr },
                { name: 'Asr', time: prayers.asr },
                { name: 'Maghrib', time: prayers.maghrib },
                { name: 'Isha', time: prayers.isha },
                // Only include Jummah in prayer calculations on Fridays (when it replaces Dhuhr)
                // On other days, Jummah is for display only and not considered for next prayer
            ].filter(prayer => prayer.time && prayer.time.trim() !== ''); // Filter out empty strings too            console.log('Valid prayers:', prayerList);

            if (prayerList.length === 0) {
                console.log('No valid prayer times found');
                setNextPrayer(null);
                return;
            }

            let nextPrayerInfo = null;
            let minDiff = Infinity;

            for (const prayer of prayerList) {
                if (!prayer.time) continue;

                let hours: number;
                let minutes: number;

                // Handle both 24-hour (HH:MM) and 12-hour (HH:MM AM/PM) formats
                const time12Match = prayer.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                const time24Match = prayer.time.match(/^(\d{1,2}):(\d{2})$/);

                if (time12Match) {
                    // 12-hour format
                    hours = parseInt(time12Match[1], 10);
                    minutes = parseInt(time12Match[2], 10);
                    const ampm = time12Match[3].toUpperCase();

                    // Convert to 24-hour format
                    if (ampm === 'PM' && hours !== 12) {
                        hours += 12;
                    } else if (ampm === 'AM' && hours === 12) {
                        hours = 0;
                    }
                } else if (time24Match) {
                    // 24-hour format
                    hours = parseInt(time24Match[1], 10);
                    minutes = parseInt(time24Match[2], 10);
                } else {
                    console.log(`Invalid time format for ${prayer.name}: ${prayer.time}`);
                    continue;
                }

                // Validate hours and minutes
                if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                    console.log(`Invalid time values for ${prayer.name}: ${hours}:${minutes}`);
                    continue;
                }

                let prayerMinutes = hours * 60 + minutes;
                console.log(`${prayer.name} time in minutes:`, prayerMinutes, `(${hours}:${minutes})`);

                // If prayer time has passed today, check tomorrow
                if (prayerMinutes <= currentMinutes) {
                    prayerMinutes += 24 * 60; // Add 24 hours
                    console.log(`${prayer.name} moved to tomorrow:`, prayerMinutes);
                }

                const diff = prayerMinutes - currentMinutes;
                console.log(`${prayer.name} diff:`, diff, 'minutes');

                if (diff < minDiff && diff > 0) {
                    minDiff = diff;
                    nextPrayerInfo = {
                        name: prayer.name,
                        time: prayer.time,
                        countdown: formatTimeRemaining(diff, now.getSeconds())
                    };
                    console.log('New next prayer found:', nextPrayerInfo);
                }
            }

            console.log('Final next prayer:', nextPrayerInfo);
            setNextPrayer(nextPrayerInfo);
        };

        // Initial calculation
        calculateNextPrayer(new Date(), prayerTimes);

        // Set up timer
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            calculateNextPrayer(now, prayerTimes);
        }, 1000);

        return () => clearInterval(timer);
    }, [prayerTimes]);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Fix the urgent calculation
    const isUrgent = nextPrayer && (() => {
        const parts = nextPrayer.countdown.split(':');
        if (parts.length === 2) {
            // MM:SS format
            return parseInt(parts[0]) < 30;
        } else if (parts.length === 3) {
            // HH:MM:SS format
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            return hours === 0 && minutes < 30;
        }
        return false;
    })();

    const getPrayerIcon = (prayerName: string) => {
        switch (prayerName.toLowerCase()) {
            case 'fajr':
                return <Moon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />;
            case 'dhuhr':
            case 'jummah':
                return <Sun className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />;
            case 'asr':
                return <Cloud className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />;
            case 'maghrib':
                return <Sunset className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />;
            case 'isha':
                return <Moon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />;
            default:
                return <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />;
        }
    };

    return (
        <div className="w-full">
            {/* Modern Islamic Current Date and Time Header */}
            <div className="relative bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6 text-white shadow-2xl overflow-hidden">
                {/* 3D Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-16 sm:translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-24 sm:h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6 sm:translate-y-12 sm:-translate-x-12"></div>

                <div className="relative z-10 text-center">
                    {/* Date Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-center mb-3 sm:mb-4">
                        <div className="relative mb-2 sm:mb-0 sm:mr-3">
                            <div className="absolute inset-0 bg-white/30 rounded-full blur-sm"></div>
                            <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 shadow-lg">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                            </div>
                        </div>
                        <div>
                            <div className="text-sm sm:text-base lg:text-lg font-medium text-green-100">
                                <span className="hidden sm:inline">{formatDate(currentTime)}</span>
                                <span className="sm:hidden">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Time Display with Light Black Outline */}
                    <div className="relative bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 mb-2 sm:mb-3 lg:mb-4 border border-gray-800/20 shadow-inner">
                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                            <div className="relative mr-1 sm:mr-2">
                                <div className="absolute inset-0 bg-gray-700/30 rounded-full blur-sm"></div>
                                <Clock className="relative w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-green-200" />
                            </div>
                            <span className="text-sm sm:text-base text-green-200 font-medium">
                                <span className="hidden sm:inline">Current Time</span>
                                <span className="sm:hidden">Now</span>
                            </span>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-4xl font-mono font-bold text-white border border-gray-700/30 rounded-lg p-2 sm:p-3 bg-gray-900/20 backdrop-blur-sm shadow-lg">
                            <span className="hidden sm:inline">{formatTime(currentTime)}</span>
                            <span className="sm:hidden">{currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Friday Indicator */}
                    {currentTime.getDay() === 5 && (
                        <div className="relative bg-emerald-500/20 border border-emerald-400/40 rounded-lg sm:rounded-xl p-2 sm:p-3 inline-flex items-center shadow-lg backdrop-blur-sm">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-lg sm:rounded-xl"></div>
                            <div className="relative mr-1 sm:mr-2">
                                <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-sm"></div>
                                <Home className="relative w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-emerald-300" />
                            </div>
                            <span className="text-emerald-200 font-medium text-sm sm:text-base">
                                <span className="hidden sm:inline">Friday - Jummah Prayer Day</span>
                                <span className="sm:hidden">Jummah Day</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Modern Islamic Next Prayer Countdown */}
            {nextPrayer ? (
                <div className="relative bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6 text-white shadow-2xl overflow-hidden">
                    {/* 3D Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-16 sm:translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-24 sm:h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6 sm:translate-y-12 sm:-translate-x-12"></div>

                    <div className="relative z-10 text-center">
                        {/* Prayer Info */}
                        <div className="flex flex-col sm:flex-row items-center justify-center mb-3 sm:mb-4">
                            <div className="relative mb-2 sm:mb-0 sm:mr-3">
                                <div className="absolute inset-0 bg-white/30 rounded-full blur-sm"></div>
                                <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 shadow-lg">
                                    {getPrayerIcon(nextPrayer.name)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm sm:text-base text-blue-100 font-medium">Next Prayer</div>
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                                    {nextPrayer.name}
                                </div>
                            </div>
                        </div>

                        {/* Countdown Display with Light Black Outline */}
                        <div className="relative bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-800/30 shadow-inner">
                            <div className={`text-xl sm:text-2xl lg:text-3xl font-mono font-bold mb-1 sm:mb-2 border border-gray-700/40 rounded-lg p-2 sm:p-3 bg-gray-900/30 backdrop-blur-sm shadow-lg ${isUrgent ? 'text-yellow-300 animate-pulse border-yellow-500/50' : 'text-white border-gray-600/30'
                                }`}>
                                {nextPrayer.countdown}
                            </div>
                            {isUrgent && (
                                <div className="flex items-center justify-center text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-1 sm:p-2 mt-2">
                                    <div className="relative mr-1">
                                        <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-sm"></div>
                                        <Clock className="relative w-3 h-3 sm:w-4 sm:h-4 animate-pulse" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium">
                                        <span className="hidden sm:inline">Prayer time approaching!</span>
                                        <span className="sm:hidden">Soon!</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative bg-gradient-to-r from-red-500 to-rose-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6 text-white shadow-2xl text-center overflow-hidden">
                    {/* 3D Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-12 sm:translate-x-12"></div>

                    <div className="relative z-10">
                        <div className="relative mb-3 sm:mb-4">
                            <div className="absolute inset-0 bg-white/30 rounded-full blur-sm"></div>
                            <div className="relative bg-white/20 rounded-full p-2 sm:p-3 w-fit mx-auto shadow-lg">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                            </div>
                        </div>
                        <div className="text-sm sm:text-base lg:text-lg font-medium">
                            <span className="hidden sm:inline">No prayer times available</span>
                            <span className="sm:hidden">No times available</span>
                        </div>
                        <div className="text-xs sm:text-sm text-red-100 mt-1">
                            <span className="hidden sm:inline">Please check back later</span>
                            <span className="sm:hidden">Check later</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern Islamic Prayer Times List */}
            <div className="space-y-2 sm:space-y-3">
                {(() => {
                    const isFriday = currentTime.getDay() === 5;
                    const displayPrayers = [
                        { name: 'Fajr', time: prayerTimes.fajr, arabic: 'الفجر', show: true, color: 'from-indigo-500 to-purple-600' },
                        { name: 'Dhuhr', time: prayerTimes.dhuhr, arabic: 'الظهر', show: !isFriday, color: 'from-yellow-500 to-orange-600' },
                        { name: 'Jummah', time: prayerTimes.jummah, arabic: 'الجمعة', show: isFriday, color: 'from-green-500 to-emerald-600' },
                        { name: 'Asr', time: prayerTimes.asr, arabic: 'العصر', show: true, color: 'from-blue-500 to-cyan-600' },
                        { name: 'Maghrib', time: prayerTimes.maghrib, arabic: 'المغرب', show: true, color: 'from-orange-500 to-red-600' },
                        { name: 'Isha', time: prayerTimes.isha, arabic: 'العشاء', show: true, color: 'from-gray-700 to-gray-900' },
                        // Always show Jummah as a separate prayer after Isha (only on non-Fridays to avoid duplication)
                        { name: 'Jummah', time: prayerTimes.jummah, arabic: 'الجمعة', show: !isFriday, color: 'from-green-500 to-emerald-600' },
                    ];

                    return displayPrayers.filter(prayer => prayer.show);
                })().map((prayer) => (
                    <div
                        key={prayer.name}
                        className={`group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-green-50/30 backdrop-blur-xl border-2 rounded-xl sm:rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${nextPrayer?.name === prayer.name
                            ? 'border-green-400/50 ring-2 ring-green-400/30 bg-gradient-to-br from-green-50 via-emerald-50/80 to-teal-50/50'
                            : 'border-white/40 hover:border-green-300/50'
                            }`}
                    >
                        {/* 3D Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-60 rounded-xl sm:rounded-2xl"></div>
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-br from-green-200/20 to-transparent rounded-full blur-md sm:blur-lg group-hover:scale-110 transition-transform duration-300"></div>
                        <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-6 h-6 sm:w-12 sm:h-12 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full blur-sm sm:blur-md group-hover:scale-110 transition-transform duration-300"></div>

                        <div className="relative z-10 flex items-center justify-between p-2 sm:p-3 lg:p-4">
                            {/* Prayer Info */}
                            <div className="flex items-center flex-1 min-w-0">
                                <div className="relative flex-shrink-0 mr-2 sm:mr-3 lg:mr-4">
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-500/20 rounded-lg sm:rounded-xl blur-sm"></div>
                                    <div className={`relative bg-gradient-to-r ${prayer.color} rounded-lg sm:rounded-xl p-2 sm:p-2.5 lg:p-3 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        {getPrayerIcon(prayer.name)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg truncate group-hover:text-green-700 transition-colors duration-300">
                                        {prayer.name}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-500 font-medium hidden sm:block">
                                        {prayer.arabic}
                                    </div>
                                </div>
                            </div>

                            {/* Time Display with Light Black Outline */}
                            <div className="text-right flex-shrink-0">
                                <div className="text-base sm:text-sm lg:text-2xl font-mono font-bold text-gray-900 border border-gray-700/20 rounded-lg p-1 sm:p-2 bg-gray-900/5 backdrop-blur-sm shadow-sm group-hover:border-gray-600/30 transition-colors duration-300">
                                    {convertTo12Hour(prayer.time || '')}
                                </div>
                                {nextPrayer?.name === prayer.name && (
                                    <div className="text-xs text-green-600 font-semibold mt-1 flex items-center justify-end bg-green-100/50 border border-green-300/50 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1 animate-pulse shadow-sm"></div>
                                        <span className="hidden sm:inline">Next Prayer</span>
                                        <span className="sm:hidden">Next</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active prayer enhanced glow effect */}
                        {nextPrayer?.name === prayer.name && (
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400/15 via-emerald-400/10 to-teal-400/15 pointer-events-none rounded-xl sm:rounded-2xl animate-pulse"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default PrayerClock;