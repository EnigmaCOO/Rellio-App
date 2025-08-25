import { useEffect, useState } from 'react';
import rellioLogo from "@assets/Rellio logo_1756158287035.png";

interface LoadingSplashProps {
  show: boolean;
  onComplete?: () => void;
}

const DustParticle = ({ delay = 0 }: { delay?: number }) => (
  <span 
    className="absolute w-1 h-1 bg-gold/30 rounded-full animate-dust-drift pointer-events-none"
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${15 + Math.random() * 10}s`
    }}
    aria-hidden="true"
  />
);

export default function LoadingSplash({ show, onComplete }: LoadingSplashProps) {
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);

  useEffect(() => {
    if (!show) return;

    // Complete logo animation after spin duration
    const logoTimer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 1200);

    // Auto-complete after window load or timeout
    const handleLoad = () => {
      setTimeout(() => {
        onComplete?.();
      }, 2000); // Give some time for tagline fade-in
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearTimeout(logoTimer);
      window.removeEventListener('load', handleLoad);
    };
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="fixed inset-0 z-[9999] grid place-items-center"
      style={{
        background: 'radial-gradient(ellipse at center, var(--bg-indigo) 0%, var(--bg-deep) 100%)'
      }}
    >
      {/* Main Content */}
      <div className="flex flex-col items-center gap-6 animate-float-up">
        {/* Compass Logo */}
        <div className="relative">
          <img
            src={rellioLogo}
            alt="Rellio"
            className={`w-28 h-28 object-contain transition-all duration-300 ${
              logoAnimationComplete 
                ? 'motion-safe:animate-pulse-glow-gold' 
                : 'motion-safe:animate-spin-once'
            }`}
          />
          {/* Glow effect */}
          <div 
            className={`absolute inset-0 rounded-full transition-opacity duration-1000 ${
              logoAnimationComplete ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background: 'radial-gradient(circle, var(--gold)/20 0%, transparent 70%)',
              filter: 'blur(8px)'
            }}
          />
        </div>

        {/* Tagline */}
        <p 
          className={`text-text-primary/90 text-lg font-serif text-center max-w-xs transition-opacity duration-1000 delay-300 ${
            logoAnimationComplete ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Guiding You Through Sacred Wisdom
        </p>
      </div>

      {/* Floating Dust Particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => (
          <DustParticle key={i} delay={i * 0.8} />
        ))}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading Rellio application...</span>
    </div>
  );
}