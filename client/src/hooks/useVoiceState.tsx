import { useState, useCallback, useRef, useEffect } from 'react';

// Finite State Machine for Voice States
export type VoiceStateType = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'TALKING';

// State transition rules
const VALID_TRANSITIONS: Record<VoiceStateType, VoiceStateType[]> = {
  IDLE: ['LISTENING', 'PROCESSING'],
  LISTENING: ['IDLE', 'PROCESSING', 'TALKING'],
  PROCESSING: ['IDLE', 'TALKING', 'LISTENING'],
  TALKING: ['IDLE', 'LISTENING']
};

interface VoiceStateHookReturn {
  voiceState: VoiceStateType;
  setVoiceState: (newState: VoiceStateType) => boolean;
  isProcessing: boolean;
  canTransitionTo: (state: VoiceStateType) => boolean;
  forceTransition: (newState: VoiceStateType) => void;
  resetToIdle: () => void;
  getStateHistory: () => VoiceStateType[];
}

export const useVoiceState = (): VoiceStateHookReturn => {
  const [voiceState, setVoiceStateInternal] = useState<VoiceStateType>('IDLE');
  const stateHistoryRef = useRef<VoiceStateType[]>(['IDLE']);
  const lastTransitionRef = useRef<number>(Date.now());

  // Check if a state transition is valid according to FSM rules
  const canTransitionTo = useCallback((newState: VoiceStateType): boolean => {
    const validTransitions = VALID_TRANSITIONS[voiceState];
    return validTransitions.includes(newState);
  }, [voiceState]);

  // Safe state transition with validation
  const setVoiceState = useCallback((newState: VoiceStateType): boolean => {
    console.log(`🎛️ Voice FSM: Attempting transition from ${voiceState} to ${newState}`);
    
    if (voiceState === newState) {
      console.log(`🎛️ Voice FSM: Already in state ${newState}, ignoring`);
      return true;
    }

    if (!canTransitionTo(newState)) {
      console.warn(`🚫 Voice FSM: Invalid transition from ${voiceState} to ${newState}`);
      return false;
    }

    console.log(`✅ Voice FSM: Valid transition from ${voiceState} to ${newState}`);
    
    // Update state and history
    setVoiceStateInternal(newState);
    stateHistoryRef.current.push(newState);
    lastTransitionRef.current = Date.now();

    // Keep history manageable (last 10 states)
    if (stateHistoryRef.current.length > 10) {
      stateHistoryRef.current = stateHistoryRef.current.slice(-10);
    }

    return true;
  }, [voiceState, canTransitionTo]);

  // Force transition (emergency override)
  const forceTransition = useCallback((newState: VoiceStateType) => {
    console.log(`🚨 Voice FSM: Force transition from ${voiceState} to ${newState}`);
    setVoiceStateInternal(newState);
    stateHistoryRef.current.push(newState);
    lastTransitionRef.current = Date.now();
  }, [voiceState]);

  // Reset to safe idle state
  const resetToIdle = useCallback(() => {
    console.log(`🔄 Voice FSM: Resetting to IDLE from ${voiceState}`);
    setVoiceStateInternal('IDLE');
    stateHistoryRef.current.push('IDLE');
    lastTransitionRef.current = Date.now();
  }, [voiceState]);

  // Get state history for debugging
  const getStateHistory = useCallback(() => {
    return [...stateHistoryRef.current];
  }, []);

  // Computed properties
  const isProcessing = voiceState === 'PROCESSING' || voiceState === 'TALKING';

  // Auto-timeout for stuck states (safety mechanism)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const timeSinceTransition = Date.now() - lastTransitionRef.current;
      
      // If stuck in PROCESSING or TALKING for more than 30 seconds, reset
      if ((voiceState === 'PROCESSING' || voiceState === 'TALKING') && timeSinceTransition > 30000) {
        console.warn(`⚠️ Voice FSM: State ${voiceState} timeout after 30s, resetting to IDLE`);
        resetToIdle();
      }
    }, 31000); // Check after 31 seconds

    return () => clearTimeout(timeout);
  }, [voiceState, resetToIdle]);

  return {
    voiceState,
    setVoiceState,
    isProcessing,
    canTransitionTo,
    forceTransition,
    resetToIdle,
    getStateHistory
  };
};