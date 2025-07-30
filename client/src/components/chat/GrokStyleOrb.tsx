import { motion } from 'framer-motion';

interface GrokStyleOrbProps {
  isActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isInterrupted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulseColor?: string;
}

export function GrokStyleOrb({ 
  isActive, 
  isListening, 
  isProcessing, 
  isInterrupted = false,
  size = 'md',
  pulseColor = 'teal'
}: GrokStyleOrbProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const getOrbState = () => {
    if (isInterrupted) return 'interrupted';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    if (isActive) return 'active';
    return 'idle';
  };

  const orbState = getOrbState();

  // Different color schemes based on state
  const stateColors = {
    idle: {
      bg: 'from-gray-300 to-gray-400',
      ring: 'ring-gray-400/30',
      pulse: 'bg-gray-400'
    },
    active: {
      bg: `from-${pulseColor}-400 to-${pulseColor}-600`,
      ring: `ring-${pulseColor}-400/40`,
      pulse: `bg-${pulseColor}-400`
    },
    listening: {
      bg: 'from-blue-400 to-purple-600',
      ring: 'ring-blue-400/50',
      pulse: 'bg-blue-400'
    },
    processing: {
      bg: 'from-emerald-400 to-cyan-600',
      ring: 'ring-emerald-400/50',
      pulse: 'bg-emerald-400'
    },
    interrupted: {
      bg: 'from-red-400 to-orange-500',
      ring: 'ring-red-400/50',
      pulse: 'bg-red-400'
    }
  };

  const colors = stateColors[orbState];

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulsing rings - multiple layers for Grok effect */}
      {(isListening || isProcessing || isInterrupted) && (
        <>
          <motion.div
            className={`absolute ${sizeClasses[size]} rounded-full ${colors.ring} ring-4`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.8, 0.3, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={`absolute ${sizeClasses[size]} rounded-full ${colors.ring} ring-2`}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0.1, 0.6]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3
            }}
          />
          <motion.div
            className={`absolute ${sizeClasses[size]} rounded-full ${colors.ring} ring-1`}
            animate={{
              scale: [1, 2.2, 1],
              opacity: [0.4, 0.05, 0.4]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.6
            }}
          />
        </>
      )}

      {/* Main orb */}
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors.bg} shadow-lg flex items-center justify-center`}
        animate={{
          scale: orbState === 'listening' ? [1, 1.1, 1] : orbState === 'processing' ? [1, 0.95, 1] : 1,
          rotate: orbState === 'processing' ? [0, 360] : 0
        }}
        transition={{
          scale: {
            duration: orbState === 'listening' ? 1.5 : 2,
            repeat: (isListening || isProcessing) ? Infinity : 0,
            ease: "easeInOut"
          },
          rotate: {
            duration: 3,
            repeat: isProcessing ? Infinity : 0,
            ease: "linear"
          }
        }}
      >
        {/* Inner glow effect */}
        <motion.div
          className={`absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent`}
          animate={{
            opacity: orbState === 'listening' ? [0.4, 0.8, 0.4] : orbState === 'processing' ? [0.6, 0.3, 0.6] : 0.4
          }}
          transition={{
            duration: 2,
            repeat: (isListening || isProcessing) ? Infinity : 0,
            ease: "easeInOut"
          }}
        />

        {/* Central dot indicator */}
        <motion.div
          className={`w-2 h-2 rounded-full ${colors.pulse}`}
          animate={{
            scale: orbState === 'listening' ? [0.8, 1.2, 0.8] : orbState === 'processing' ? [1, 0.6, 1] : 1,
            opacity: orbState === 'interrupted' ? [1, 0.3, 1] : [0.8, 1, 0.8]
          }}
          transition={{
            duration: orbState === 'listening' ? 1 : orbState === 'processing' ? 1.5 : 2,
            repeat: (isListening || isProcessing || isInterrupted) ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Floating particles for enhanced Grok effect */}
      {isProcessing && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${colors.pulse} opacity-60`}
              animate={{
                x: [0, Math.cos(i * 60 * Math.PI / 180) * 30],
                y: [0, Math.sin(i * 60 * Math.PI / 180) * 30],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 0.2
              }}
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
      )}

      {/* Voice waveform indicators for listening state */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-0.5 bg-white/80 rounded-full mx-0.5"
              animate={{
                height: [4, 12, 4]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}