
import React from 'react';
import { VoiceTest } from './VoiceTest';

export function SimpleVoiceTest() {
  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">
          Simple Voice System Test
        </h1>
        <VoiceTest />
      </div>
    </div>
  );
}
