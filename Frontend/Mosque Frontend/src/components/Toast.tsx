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
        <div className={`
            fixed top-2 left-2 right-2 sm:top-4 sm:right-4 sm:left-auto z-50 
            flex items-center gap-2 sm:gap-3 
            ${bgColors[type]} border-2 rounded-lg sm:rounded-xl 
            shadow-lg p-2 sm:p-4 
            w-auto sm:min-w-[300px] sm:max-w-md 
            animate-slide-in
            text-xs sm:text-sm
        `}>
            <div className="flex-shrink-0">
                <div className="w-4 h-4 sm:w-6 sm:h-6">
                    {type === 'success' && <CheckCircle className="w-full h-full text-green-500" />}
                    {type === 'error' && <XCircle className="w-full h-full text-red-500" />}
                    {type === 'warning' && <AlertCircle className="w-full h-full text-yellow-500" />}
                </div>
            </div>
            <p className={`flex-1 ${textColors[type]} font-medium text-xs sm:text-sm leading-tight sm:leading-normal`}>
                {message}
            </p>
            <button
                onClick={onClose}
                className={`flex-shrink-0 ${textColors[type]} hover:opacity-70 transition-opacity p-1`}
            >
                <X className="w-3 h-3 sm:w-5 sm:h-5" />
            </button>
        </div>
    );
};

// Add animation styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slide-in {
            from {
                opacity: 0;
                transform: translateY(-100px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-slide-in {
            animation: slide-in 0.3s ease-out;
        }
    `;
    if (!document.querySelector('style[data-toast-animations]')) {
        style.setAttribute('data-toast-animations', 'true');
        document.head.appendChild(style);
    }
}

export default Toast;
