import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'react-feather';

interface ToastProps {
    type: 'success' | 'error' | 'warning';
    message: string;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ type, message, onClose, duration = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-6 h-6 text-green-500" />,
        error: <XCircle className="w-6 h-6 text-red-500" />,
        warning: <AlertCircle className="w-6 h-6 text-yellow-500" />
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200'
    };

    const textColors = {
        success: 'text-green-800',
        error: 'text-red-800',
        warning: 'text-yellow-800'
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 ${bgColors[type]} border-2 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-slide-in`}>
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className={`flex-1 ${textColors[type]} font-medium`}>
                {message}
            </p>
            <button
                onClick={onClose}
                className={`flex-shrink-0 ${textColors[type]} hover:opacity-70 transition-opacity`}
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Toast;
