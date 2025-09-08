import React from 'react';
import { cn } from '@/lib/utils';

interface GrokStyleOrbProps {
  state: 'idle' | 'listening' | 'processing' | 'responding' | 'interrupted' | 'listening-after-interrupt';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GrokStyleOrb({ 
  state, 
  size = 'md', 
  className = "" 
}: GrokStyleOrbProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  const getOrbClasses = () => {
    const baseClasses = cn(
      'rounded-full transition-all duration-300 relative overflow-hidden',
      sizeClasses[size]
    );

    switch (state) {
      case 'idle':
        return cn(baseClasses, 'bg-gray-300 border-2 border-gray-400');

      case 'listening':
        return cn(
          baseClasses, 
          'bg-gradient-to-br from-teal-400 to-cyan-500',
          'border-2 border-teal-300',
          'animate-pulse shadow-lg shadow-teal-200'
        );

      case 'processing':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-purple-400 to-indigo-500', 
          'border-2 border-purple-300',
          'animate-spin shadow-lg shadow-purple-200'
        );

      case 'responding':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-yellow-400 to-orange-500',
          'border-2 border-yellow-300', 
          'animate-pulse shadow-lg shadow-yellow-200'
        );

      case 'interrupted':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-red-400 to-rose-500',
          'border-2 border-red-300',
          'animate-bounce shadow-lg shadow-red-200'
        );

      case 'listening-after-interrupt':
        return cn(
          baseClasses,
          'bg-gradient-to-br from-emerald-400 to-teal-500',
          'border-2 border-emerald-300',
          'animate-pulse shadow-lg shadow-emerald-200'
        );

      default:
        return baseClasses;
    }
  };

  const getInnerAnimation = () => {
    if (state === 'processing') {
      return (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2 animation-delay-150" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2 animation-delay-300" />
        </div>
      );
    }

    if (state === 'listening') {
      return (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
      );
    }

    if (state === 'listening-after-interrupt') {
      return (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent animate-pulse" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping animation-delay-150" />
        </div>
      );
    }

    if (state === 'responding') {
      return (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping" />
        </div>
      );
    }

    return null;
  };

  const getTooltipText = () => {
    switch (state) {
      case 'idle': return 'Ready to help';
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'responding': return 'Responding...';
      case 'interrupted': return 'Interrupted';
      case 'listening-after-interrupt': return 'Listening for your next question...';
      default: return '';
    }
  };

  return (
    <div className={cn('relative group', className)} title={getTooltipText()}>
      <div className={getOrbClasses()}>
        {getInnerAnimation()}
      </div>

      {/* Ripple effect for listening states */}
      {state === 'listening' && (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full bg-teal-400 opacity-25 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-teal-400 opacity-20 animate-ping animation-delay-300" />
        </div>
      )}
      
      {/* Enhanced ripple effect for post-interruption listening */}
      {state === 'listening-after-interrupt' && (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-25 animate-ping animation-delay-150" />
          <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping animation-delay-300" />
        </div>
      )}

      {/* Tooltip */}
      {getTooltipText() && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {getTooltipText()}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom animation delays for staggered effects
const style = `
  .animation-delay-150 {
    animation-delay: 150ms;
  }
  .animation-delay-300 {
    animation-delay: 300ms;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('grok-orb-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'grok-orb-styles';
  styleElement.textContent = style;
  document.head.appendChild(styleElement);
}