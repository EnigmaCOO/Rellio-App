
# Core Files for Grok Review

## 1. Main Chat Component - Most Critical
**File**: `client/src/components/EnhancedAuraArchivist.tsx`
**Size**: ~800 lines
**Issues**: Voice auto-send reliability, conversation context management

## 2. Voice System - Performance Critical  
**File**: `client/src/components/chat/VoiceModeHandler.tsx`
**Size**: ~200 lines
**Issues**: Auto-send timing, error recovery, state cleanup

## 3. Backend AI Integration
**File**: `server/services/xai.ts`
**Size**: ~150 lines  
**Issues**: XAI quota handling, fallback logic, conversation history

## 4. Scholar Personas
**File**: `client/src/components/chat/ScholarPersonas.tsx`
**Size**: ~300 lines
**Status**: Working well, minimal changes needed

## Key Questions for Grok:

1. **Voice Auto-Send**: How can we make the voice transcript auto-send more reliable? Current timeout approach sometimes fails.

2. **XAI Integration**: Better patterns for handling API quota limits and seamless OpenAI fallback?

3. **Context Windowing**: Smarter way to manage conversation history for better AI responses?

4. **User Experience**: How to make the voice-first interface more intuitive and responsive?

5. **Performance**: Any bottlenecks in the current React/TypeScript architecture?

The codebase is functional but could benefit from Grok's insights on making it more robust and user-friendly.
