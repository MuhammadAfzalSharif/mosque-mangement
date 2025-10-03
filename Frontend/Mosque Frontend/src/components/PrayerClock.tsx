import React, { useState, useEffect } from 'react';
import {
    FiClock,
    FiCalendar,
    FiMoon,
    FiSunset
} from 'react-icons/fi';
import {
    BsMoonStars,
    BsSun,
    BsCloudSun
} from 'react-icons/bs';
import { MdOutlineMosque } from 'react-icons/md';

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
            ].filter(prayer => prayer.time && prayer.time.trim() !== ''); // Filter out empty strings too

            console.log('Valid prayers:', prayerList);

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
                return <BsMoonStars className="w-5 h-5" />;
            case 'dhuhr':
            case 'jummah':
                return <BsSun className="w-5 h-5" />;
            case 'asr':
                return <BsCloudSun className="w-5 h-5" />;
            case 'maghrib':
                return <FiSunset className="w-5 h-5" />;
            case 'isha':
                return <FiMoon className="w-5 h-5" />;
            default:
                return <FiClock className="w-5 h-5" />;
        }
    };

    return (
        <div className="w-full">
            {/* Current Date and Time Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-2xl">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-white/20 rounded-full p-3 mr-3">
                            <FiCalendar className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-lg font-medium text-blue-100">
                                {formatDate(currentTime)}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-center mb-2">
                            <FiClock className="w-6 h-6 text-blue-200 mr-2" />
                            <span className="text-sm text-blue-200 font-medium">Current Time</span>
                        </div>
                        <div className="text-4xl font-mono font-bold text-white">
                            {formatTime(currentTime)}
                        </div>
                    </div>

                    {/* Friday Indicator */}
                    {currentTime.getDay() === 5 && (
                        <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 inline-flex items-center">
                            <MdOutlineMosque className="w-5 h-5 text-green-300 mr-2" />
                            <span className="text-green-200 font-medium">Friday - Jummah Prayer Day</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Next Prayer Countdown */}
            {nextPrayer ? (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 mb-6 text-white shadow-2xl">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="bg-white/20 rounded-full p-3 mr-3">
                                {getPrayerIcon(nextPrayer.name)}
                            </div>
                            <div>
                                <div className="text-sm text-green-100 font-medium">Next Prayer</div>
                                <div className="text-2xl font-bold text-white">
                                    {nextPrayer.name}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className={`text-3xl font-mono font-bold mb-2 ${isUrgent ? 'text-yellow-300 animate-pulse' : 'text-white'
                                }`}>
                                {nextPrayer.countdown}
                            </div>
                            {isUrgent && (
                                <div className="flex items-center justify-center text-yellow-300">
                                    <FiClock className="w-4 h-4 mr-1 animate-pulse" />
                                    <span className="text-sm font-medium">Prayer time approaching!</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-6 mb-6 text-white shadow-2xl text-center">
                    <div className="bg-white/20 rounded-full p-3 w-fit mx-auto mb-3">
                        <FiClock className="w-6 h-6" />
                    </div>
                    <div className="text-lg font-medium">No prayer times available</div>
                    <div className="text-sm text-red-100 mt-1">Please check back later</div>
                </div>
            )}

            {/* Prayer Times List */}
            <div className="space-y-3">
                {(() => {
                    const isFriday = currentTime.getDay() === 5;
                    const displayPrayers = [
                        { name: 'Fajr', time: prayerTimes.fajr, arabic: 'الفجر', show: true, color: 'from-indigo-500 to-purple-600' },
                        { name: 'Dhuhr', time: prayerTimes.dhuhr, arabic: 'الظهر', show: !isFriday, color: 'from-yellow-500 to-orange-600' },
                        { name: 'Jummah', time: prayerTimes.jummah, arabic: 'الجمعة', show: isFriday, color: 'from-green-500 to-emerald-600' },
                        { name: 'Asr', time: prayerTimes.asr, arabic: 'العصر', show: true, color: 'from-blue-500 to-cyan-600' },
                        { name: 'Maghrib', time: prayerTimes.maghrib, arabic: 'المغرب', show: true, color: 'from-orange-500 to-red-600' },
                        { name: 'Isha', time: prayerTimes.isha, arabic: 'العشاء', show: true, color: 'from-gray-700 to-gray-900' },
                    ];

                    return displayPrayers.filter(prayer => prayer.show);
                })().map((prayer) => (
                    <div
                        key={prayer.name}
                        className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${nextPrayer?.name === prayer.name
                            ? 'ring-4 ring-green-400/50 bg-gradient-to-r from-green-50 to-emerald-50'
                            : 'bg-white hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                                <div className={`bg-gradient-to-r ${prayer.color} rounded-xl p-3 mr-4 text-white shadow-lg`}>
                                    {getPrayerIcon(prayer.name)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 text-lg">
                                        {prayer.name}
                                    </div>
                                    <div className="text-sm text-gray-500 font-medium">
                                        {prayer.arabic}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-gray-900">
                                    {convertTo12Hour(prayer.time || '')}
                                </div>
                                {nextPrayer?.name === prayer.name && (
                                    <div className="text-xs text-green-600 font-semibold mt-1 flex items-center justify-end">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                        Next Prayer
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active prayer glow effect */}
                        {nextPrayer?.name === prayer.name && (
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 pointer-events-none"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default PrayerClock;