// Simple test component to debug white screen
import React from 'react';

export default function SimpleTest() {
  console.log('SimpleTest component rendered');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue', color: 'black' }}>
      <h1>Simple Test - React is Working!</h1>
      <p>If you see this, React is loading properly.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}