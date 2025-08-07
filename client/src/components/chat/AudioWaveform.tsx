import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'teal' | 'purple' | 'gold';
  className?: string;
}

export function AudioWaveform({ 
  isActive, 
  audioLevel, 
  size = 'md', 
  color = 'teal',
  className 
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const sizeConfig = {
    sm: { width: 120, height: 40, bars: 12 },
    md: { width: 160, height: 50, bars: 16 },
    lg: { width: 200, height: 60, bars: 20 }
  };

  const colorConfig = {
    teal: {
      primary: '#14B8A6', // teal-500
      secondary: '#5EEAD4', // teal-300
      accent: '#CCFBF1' // teal-100
    },
    purple: {
      primary: '#8B5CF6', // purple-500
      secondary: '#A78BFA', // purple-400
      accent: '#DDD6FE' // purple-200
    },
    gold: {
      primary: '#F59E0B', // amber-500
      secondary: '#FCD34D', // amber-300
      accent: '#FEF3C7' // amber-100
    }
  };

  const config = sizeConfig[size];
  const colors = colorConfig[color];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / config.bars;
      const maxHeight = canvas.height * 0.8;
      const baseHeight = canvas.height * 0.1;

      for (let i = 0; i < config.bars; i++) {
        const x = i * barWidth + barWidth * 0.1;
        const width = barWidth * 0.8;

        let height = baseHeight;
        
        if (isActive) {
          // Create dynamic waveform based on audio level and position
          const time = Date.now() * 0.005;
          const position = i / config.bars;
          
          // Create wave pattern with audio level influence
          const wave1 = Math.sin(time + position * Math.PI * 2) * 0.5;
          const wave2 = Math.sin(time * 1.5 + position * Math.PI * 3) * 0.3;
          const wave3 = Math.sin(time * 0.8 + position * Math.PI * 4) * 0.2;
          
          const combinedWave = (wave1 + wave2 + wave3) * 0.5 + 0.5;
          
          // Scale by audio level (0-1) with minimum activity
          const activityLevel = Math.max(audioLevel * 2, 0.3);
          height = baseHeight + (maxHeight - baseHeight) * combinedWave * activityLevel;
        }

        const y = canvas.height - height;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
        
        if (isActive) {
          gradient.addColorStop(0, colors.accent);
          gradient.addColorStop(0.5, colors.secondary);
          gradient.addColorStop(1, colors.primary);
        } else {
          gradient.addColorStop(0, '#E5E7EB'); // gray-200
          gradient.addColorStop(1, '#9CA3AF'); // gray-400
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);

        // Add glow effect when active
        if (isActive && audioLevel > 0.1) {
          ctx.shadowColor = colors.primary;
          ctx.shadowBlur = 8 * audioLevel;
          ctx.fillRect(x, y, width, height);
          ctx.shadowBlur = 0;
        }
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isActive) {
      animate();
    } else {
      // Draw static bars when inactive
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel, config, colors]);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className={cn(
          "rounded-lg",
          isActive && "animate-pulse"
        )}
        style={{ 
          width: config.width, 
          height: config.height,
          filter: isActive ? `drop-shadow(0 0 6px ${colors.primary}40)` : 'none'
        }}
      />
    </div>
  );
}

// CSS-based alternative waveform for lighter performance
export function CSSAudioWaveform({ 
  isActive, 
  audioLevel, 
  size = 'md',
  color = 'teal',
  className 
}: AudioWaveformProps) {
  const barCount = {
    sm: 12,
    md: 16,
    lg: 20
  }[size];

  const colorClasses = {
    teal: {
      bar: 'bg-gradient-to-t from-teal-500 to-teal-300',
      glow: 'shadow-teal-400/50'
    },
    purple: {
      bar: 'bg-gradient-to-t from-purple-500 to-purple-300',
      glow: 'shadow-purple-400/50'
    },
    gold: {
      bar: 'bg-gradient-to-t from-amber-500 to-amber-300',
      glow: 'shadow-amber-400/50'
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-1',
    md: 'h-10 w-1.5',
    lg: 'h-12 w-2'
  };

  const bars = Array.from({ length: barCount }, (_, i) => {
    const delay = i * 100;
    const intensity = isActive ? Math.max(audioLevel, 0.3) : 0.1;
    
    return (
      <div
        key={i}
        className={cn(
          sizeClasses[size],
          isActive ? colorClasses[color].bar : 'bg-gradient-to-t from-gray-400 to-gray-300',
          'rounded-full transition-all duration-200',
          isActive && colorClasses[color].glow
        )}
        style={{
          animationDelay: `${delay}ms`,
          transform: `scaleY(${isActive ? intensity + Math.random() * 0.5 : 0.2})`,
          animation: isActive ? `waveform 1.5s ease-in-out infinite alternate` : 'none'
        }}
      />
    );
  });

  return (
    <div className={cn("flex items-end justify-center gap-1", className)}>
      {bars}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(${isActive ? Math.max(audioLevel * 2, 0.4) : 0.2}); }
        }
      `}} />
    </div>
  );
}