import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function AudioWaveform({ 
  isActive, 
  audioLevel, 
  size = 'md', 
  className 
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const sizeConfig = {
    sm: { width: 120, height: 40, bars: 12 },
    md: { width: 160, height: 50, bars: 16 },
    lg: { width: 200, height: 60, bars: 20 }
  };

  const config = sizeConfig[size];

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
          const time = Date.now() * 0.005;
          const position = i / config.bars;
          
          const wave1 = Math.sin(time + position * Math.PI * 2) * 0.5;
          const wave2 = Math.sin(time * 1.5 + position * Math.PI * 3) * 0.3;
          const wave3 = Math.sin(time * 0.8 + position * Math.PI * 4) * 0.2;
          
          const combinedWave = (wave1 + wave2 + wave3) * 0.5 + 0.5;
          const activityLevel = Math.max(audioLevel * 2, 0.3);
          height = baseHeight + (maxHeight - baseHeight) * combinedWave * activityLevel;
        }

        const y = canvas.height - height;

        ctx.fillStyle = isActive ? '#374151' : '#D1D5DB';
        ctx.fillRect(x, y, width, height);
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel, config]);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className="rounded-lg"
        style={{ width: config.width, height: config.height }}
      />
    </div>
  );
}

export function CSSAudioWaveform({ 
  isActive, 
  audioLevel, 
  size = 'md',
  className 
}: AudioWaveformProps) {
  const barCount = { sm: 12, md: 16, lg: 20 }[size];

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
          isActive ? 'bg-gray-700' : 'bg-gray-300',
          'rounded-full transition-all duration-200'
        )}
        style={{
          animationDelay: `${delay}ms`,
          transform: `scaleY(${isActive ? intensity + Math.random() * 0.5 : 0.2})`
        }}
      />
    );
  });

  return (
    <div className={cn("flex items-end justify-center gap-1", className)}>
      {bars}
    </div>
  );
}
