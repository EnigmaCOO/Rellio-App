import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

console.log('🚀 Starting Rellio App...');

// Simple working component first
function WorkingApp() {
  return React.createElement('div', {
    style: { 
      padding: '20px', 
      fontFamily: 'system-ui', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }
  }, [
    React.createElement('h1', { key: 'title', style: { fontSize: '2em', marginBottom: '1em' }}, '🎯 Rellio Scripture Platform'),
    React.createElement('p', { key: 'desc', style: { fontSize: '1.2em', marginBottom: '2em' }}, 'AI-powered multi-religious scripture exploration'),
    React.createElement('div', { 
      key: 'status',
      style: { 
        background: 'rgba(255,255,255,0.2)', 
        padding: '1em', 
        borderRadius: '8px',
        marginBottom: '1em'
      }
    }, '✅ React is working! Loading full interface...')
  ]);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  
  // Render working app first
  root.render(React.createElement(WorkingApp));
  console.log('✅ Basic React app rendered');
  
  // Load full app after 2 seconds
  setTimeout(async () => {
    try {
      console.log('📦 Loading full application...');
      const { default: App } = await import("./App");
      root.render(React.createElement(App));
      console.log('✅ Full Rellio app loaded successfully');
    } catch (error) {
      console.error('❌ Error loading full app:', error);
      
      // Show error but keep working
      const ErrorApp = () => React.createElement('div', {
        style: { 
          padding: '20px', 
          background: '#ff6b6b',
          color: 'white',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }
      }, [
        React.createElement('h1', { key: 'error-title' }, '⚠️ Loading Error'),
        React.createElement('p', { key: 'error-desc' }, 'Check console for details'),
        React.createElement('pre', { 
          key: 'error-detail',
          style: { background: 'rgba(0,0,0,0.3)', padding: '1em', borderRadius: '4px', marginTop: '1em' }
        }, String(error))
      ]);
      
      root.render(React.createElement(ErrorApp));
    }
  }, 2000);
} else {
  console.error('❌ Root element not found');
}
