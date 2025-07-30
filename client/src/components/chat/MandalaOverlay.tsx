import { cn } from "@/lib/utils";

interface MandalaOverlayProps {
  className?: string;
  opacity?: number;
}

export function MandalaOverlay({ className, opacity = 0.1 }: MandalaOverlayProps) {
  return (
    <div 
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      style={{ opacity }}
    >
      {/* Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(75, 0, 130, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
            linear-gradient(135deg, rgba(75, 0, 130, 0.05) 0%, rgba(212, 175, 55, 0.05) 100%)
          `
        }}
      />

      {/* Mandala SVG */}
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.3 }}
      >
        <defs>
          <linearGradient id="mandalaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4B0082" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#00D5FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Central Circle */}
        <circle
          cx="200"
          cy="200"
          r="8"
          fill="none"
          stroke="url(#mandalaGradient)"
          strokeWidth="1"
        />

        {/* Inner Petals - 8 sections */}
        {[...Array(8)].map((_, i) => {
          const angle = (360 / 8) * i;
          return (
            <g key={`inner-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 200 200 Q 210 190 220 200 Q 210 210 200 200"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.8"
              />
              <circle
                cx="215"
                cy="200"
                r="2"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.5"
              />
            </g>
          );
        })}

        {/* Middle Ring - 12 sections */}
        {[...Array(12)].map((_, i) => {
          const angle = (360 / 12) * i;
          return (
            <g key={`middle-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 200 200 L 235 200 Q 240 195 235 190 Q 230 195 235 200"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.6"
              />
              <circle
                cx="237"
                cy="200"
                r="1.5"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.4"
              />
            </g>
          );
        })}

        {/* Outer Ring - 16 sections */}
        {[...Array(16)].map((_, i) => {
          const angle = (360 / 16) * i;
          return (
            <g key={`outer-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 250 200 Q 265 195 280 200 Q 265 205 250 200"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.5"
              />
              <line
                x1="250"
                y1="200"
                x2="280"
                y2="200"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.3"
              />
            </g>
          );
        })}

        {/* Outer Border Circle */}
        <circle
          cx="200"
          cy="200"
          r="85"
          fill="none"
          stroke="url(#mandalaGradient)"
          strokeWidth="0.8"
          strokeDasharray="3,2"
        />

        {/* Geometric Patterns */}
        {[...Array(6)].map((_, i) => {
          const angle = (360 / 6) * i;
          return (
            <g key={`geo-${i}`} transform={`rotate(${angle} 200 200)`}>
              <polygon
                points="200,150 210,170 190,170"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.4"
              />
              <circle
                cx="200"
                cy="160"
                r="3"
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth="0.3"
              />
            </g>
          );
        })}

        {/* Sacred Symbols - Lotus Petals */}
        {[...Array(24)].map((_, i) => {
          const angle = (360 / 24) * i;
          const isMainPetal = i % 3 === 0;
          return (
            <g key={`lotus-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d={isMainPetal 
                  ? "M 200 200 Q 205 130 210 120 Q 200 125 190 120 Q 195 130 200 200"
                  : "M 200 200 Q 203 140 205 135 Q 200 137 195 135 Q 197 140 200 200"
                }
                fill="none"
                stroke="url(#mandalaGradient)"
                strokeWidth={isMainPetal ? "0.6" : "0.3"}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Spiritual Particles */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-yellow-300 rounded-full animate-pulse"
            style={{
              left: `${20 + (i * 6.5)}%`,
              top: `${15 + (i * 5.8)}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + (i * 0.2)}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}