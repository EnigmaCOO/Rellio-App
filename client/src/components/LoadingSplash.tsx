import { useEffect, useState } from 'react';
import rellioLogo from "@assets/rellio-logo.png";

interface LoadingSplashProps {
  show: boolean;
  onComplete?: () => void;
}

export default function LoadingSplash({ show, onComplete }: LoadingSplashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onComplete?.();
    };

    const minDelay = window.setTimeout(finish, 1200);

    const onLoad = () => window.setTimeout(finish, 300);
    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    const hardCap = window.setTimeout(finish, 2500);

    return () => {
      window.clearTimeout(minDelay);
      window.clearTimeout(hardCap);
      window.removeEventListener('load', onLoad);
    };
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] grid place-items-center bg-white transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="flex flex-col items-center gap-6">
        <img
          src={rellioLogo}
          alt="Rellio"
          className="w-44 h-auto object-contain"
        />
        <p className="text-gray-700 text-lg font-serif text-center max-w-xs">
          Guiding You Through Sacred Wisdom
        </p>
      </div>
      <span className="sr-only">Loading Rellio application...</span>
    </div>
  );
}
