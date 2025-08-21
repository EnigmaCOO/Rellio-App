import React from 'react';

interface SimpleVoiceTestProps {
  onSendMessage: (message: string) => void;
}

export const SimpleVoiceTest: React.FC<SimpleVoiceTestProps> = ({ onSendMessage }) => {
  
  const testButtonClick = () => {
    alert('🎯 BUTTON CLICKED! Check console...');
    console.log('🚨 SIMPLE TEST BUTTON CLICKED - THIS WORKS!');
    onSendMessage('Test message from SimpleVoiceTest component');
  };

  const testVoice = () => {
    alert('🎤 STARTING VOICE TEST...');
    console.log('🎤 Voice test button clicked');
    
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      
      recognition.onstart = () => {
        alert('🎧 LISTENING - SAY SOMETHING NOW!');
        console.log('🎤 Speech recognition started');
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        alert(`🎯 YOU SAID: "${transcript}"`);
        console.log('🎯 Speech result:', transcript);
        onSendMessage(transcript);
      };
      
      recognition.onerror = (event: any) => {
        alert(`❌ ERROR: ${event.error}`);
        console.error('❌ Speech error:', event.error);
      };
      
      recognition.start();
    } else {
      alert('❌ No speech support - try Chrome or Edge');
      console.log('❌ No speech recognition support');
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'orange', 
      padding: '30px', 
      margin: '20px',
      border: '5px solid red',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        🧪 SIMPLE VOICE TEST COMPONENT
      </h1>
      
      <button
        onClick={testButtonClick}
        style={{
          backgroundColor: 'blue',
          color: 'white',
          padding: '20px',
          fontSize: '20px',
          margin: '10px',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer'
        }}
      >
        🔵 TEST BUTTON
      </button>
      
      <button
        onClick={testVoice}
        style={{
          backgroundColor: 'green',
          color: 'white',
          padding: '20px',
          fontSize: '20px',
          margin: '10px',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer'
        }}
      >
        🎤 TEST VOICE
      </button>
      
      <p style={{ marginTop: '20px', fontSize: '18px' }}>
        Click the buttons above - you should see popup alerts!
      </p>
    </div>
  );
};