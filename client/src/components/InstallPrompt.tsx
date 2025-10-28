
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const hasSeenPrompt = localStorage.getItem('rellio-install-prompt-seen');

    if (isInstalled || hasSeenPrompt) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 3 seconds if on mobile
      if (isMobile) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // For iOS Safari, show instructions
      if (isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert('To install Rellio:\n\n1. Tap the Share button (⬆️)\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add"');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('rellio-install-prompt-seen', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('rellio-install-prompt-seen', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div 
        className="bg-gradient-to-r from-purple-900 to-indigo-900 border border-gold/30 rounded-lg shadow-2xl p-4"
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Install Rellio</h3>
            <p className="text-sm text-gray-300">
              Add to your home screen for quick access to sacred wisdom
            </p>
          </div>
        </div>

        <Button
          onClick={handleInstall}
          className="w-full bg-gold hover:bg-yellow-500 text-black font-semibold"
        >
          Install App
        </Button>
      </div>
    </div>
  );
}
