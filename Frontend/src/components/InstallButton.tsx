import React, { useState, useEffect } from 'react';
import { Download } from 'react-feather';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallButton: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation');
    } else {
      console.log('User dismissed the PWA installation');
    }

    setInstallPrompt(null);
  };

  if (!installPrompt) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="group relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
    >
      <div className="flex items-center">
        <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" />
        <span className="hidden sm:inline">Download App</span>
        <span className="sm:hidden">App</span>
      </div>
      <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
    </button>
  );
};

export default InstallButton;