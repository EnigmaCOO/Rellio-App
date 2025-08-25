import React from 'react';
import { cn } from '@/lib/utils';

// Enhanced animated orb component with processing states
type OrbState = 'idle' | 'listening' | 'processing' | 'thinking' | 'responding' | 'interrupted';

interface AnimatedOrbProps {
  state: OrbState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AnimatedOrb({ state, size = 'md', className }: AnimatedOrbProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const getOrbClasses = () => {
    const baseClasses = cn(
      'rounded-full transition-all duration-500 ease-in-out relative overflow-hidden shadow-lg',
      sizeClasses[size],
      className
    );

    switch (state) {
      case 'idle':
        return cn(baseClasses, 'bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-gray-500');
      
      case 'listening':
        return cn(
          baseClasses, 
          'bg-gradient-to-br from-teal-400 to-cyan-500',
          'border-2 border-teal-300',
          'animate-pulse shadow-teal-200 shadow-lg'
        );
      
      case 'processing':
      case 'thinking':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-purple-400 via-indigo-500 to-purple-600', 
          'border-2 border-purple-300',
          'shadow-purple-200 shadow-xl animate-spin'
        );
      
      case 'responding':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-yellow-400 via-orange-500 to-gold-500',
          'border-2 border-yellow-300', 
          'animate-pulse shadow-yellow-200 shadow-xl'
        );
      
      case 'interrupted':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-red-400 to-rose-500',
          'border-2 border-red-300',
          'animate-bounce shadow-red-200 shadow-lg'
        );
      
      default:
        return baseClasses;
    }
  };

  const getInnerAnimation = () => {
    if (state === 'thinking' || state === 'processing') {
      return (
        <div className="absolute inset-0 rounded-full">
          {/* Pulsing dots for thinking state */}
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2" 
               style={{ animationDelay: '0.15s' }} />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2" 
               style={{ animationDelay: '0.3s' }} />
        </div>
      );
    }

    if (state === 'listening') {
      return (
        <div className="absolute inset-0 rounded-full">
          {/* Waveform indicator for listening */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      );
    }

    if (state === 'responding') {
      return (
        <div className="absolute inset-0 rounded-full">
          {/* Speaking animation */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={getOrbClasses()}>
      {getInnerAnimation()}
      
      {/* Outer glow effect based on state */}
      {state !== 'idle' && (
        <div className={cn(
          "absolute -inset-2 rounded-full opacity-30 blur-sm",
          state === 'listening' && "bg-gradient-to-br from-teal-300 to-cyan-400 animate-pulse",
          state === 'processing' && "bg-gradient-to-br from-purple-300 to-indigo-400 animate-spin",
          state === 'thinking' && "bg-gradient-to-br from-purple-300 to-indigo-400 animate-pulse", 
          state === 'responding' && "bg-gradient-to-br from-yellow-300 to-orange-400 animate-pulse",
          state === 'interrupted' && "bg-gradient-to-br from-red-300 to-rose-400 animate-bounce"
        )} />
      )}
    </div>
  );
}

// Thinking indicator component
interface ThinkingIndicatorProps {
  visible: boolean;
  message?: string;
  className?: string;
}

export function ThinkingIndicator({ visible, message = "Thinking...", className }: ThinkingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm text-gray-600 animate-fade-in", className)}>
      <AnimatedOrb state="thinking" size="sm" />
      <span className="animate-pulse">{message}</span>
    </div>
  );
}

// Persona introduction component with animations
interface PersonaIntroProps {
  persona: {
    name: string;
    icon: React.ComponentType<any>;
    expertise: string[];
    voiceTone: string;
    bgColor: string;
    iconColor: string;
  };
  onDismiss: () => void;
  className?: string;
}

export function PersonaIntro({ persona, onDismiss, className }: PersonaIntroProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl p-4 shadow-lg border border-gray-200 animate-slide-up",
      "max-w-md mx-auto",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
          "animate-fade-in-scale transition-all duration-300",
          persona.bgColor
        )}>
          <persona.icon className={cn("w-6 h-6", persona.iconColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 animate-fade-in">
              Meet your {persona.name}!
            </h3>
            <button 
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mt-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Your spiritual guide with expertise in {persona.expertise.slice(0, 2).join(' and ')}.
          </p>
          
          <p className="text-xs text-gray-500 mt-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Speaking in a {persona.voiceTone} tone to help guide your spiritual journey.
          </p>
        </div>
      </div>
    </div>
  );
}