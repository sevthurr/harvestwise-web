import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      console.log('[PWA] App is already installed');
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Debug: Check current state
    console.log('[PWA] Hook initialized', {
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      hasServiceWorker: 'serviceWorker' in navigator,
      isSecure: window.isSecureContext
    });

    // Try to force check if prompt is already available
    if (window.deferredPrompt) {
      console.log('[PWA] Found existing deferred prompt on window');
      setDeferredPrompt(window.deferredPrompt);
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    console.log('[PWA] Install button clicked', { 
      hasDeferredPrompt: !!deferredPrompt,
      isInstallable,
      isInstalled 
    });
    
    if (!deferredPrompt) {
      console.error('[PWA] No deferred prompt available');
      return { outcome: 'unavailable' };
    }

    try {
      console.log('[PWA] Calling deferredPrompt.prompt()');
      await deferredPrompt.prompt();
      
      const result = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', result.outcome);
      
      if (result.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setDeferredPrompt(null);
        setIsInstallable(false);
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }

      return result;
    } catch (error) {
      console.error('[PWA] Error during install:', error);
      return { outcome: 'error', error };
    }
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}
