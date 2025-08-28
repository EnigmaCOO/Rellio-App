import { createRoot } from "react-dom/client";
import App from "./App";
import SimpleTest from "./SimpleTest";
import "./index.css";

console.log('main.tsx loaded - attempting to render');

// Try to render with error handling
const rootElement = document.getElementById("root");
console.log('Root element found:', !!rootElement);

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    
    // Use SimpleTest to debug first, then switch back to App
    root.render(<SimpleTest />);
    console.log('SimpleTest rendered successfully');
    
    // After 2 seconds, try loading the full app
    setTimeout(() => {
      try {
        root.render(<App />);
        console.log('Full App rendered successfully');
      } catch (error) {
        console.error('Error rendering full App:', error);
        // Keep SimpleTest if App fails
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error creating React root:', error);
  }
} else {
  console.error('Root element not found!');
}
