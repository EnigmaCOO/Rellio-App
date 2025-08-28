import React from 'react';

interface ScriptureContentProps {
  content: string;
  onNavigateToVerse?: (verse: any) => void;
}

const ScriptureContent: React.FC<ScriptureContentProps> = ({ content, onNavigateToVerse }) => {
  console.log('🎨 ScriptureContent rendering:', content.substring(0, 100) + '...');
  
  // Parse content to handle multi-religious perspectives with beautiful colors
  const renderFormattedContent = (text: string) => {
    // Split by perspective tags and render with appropriate colors
    const perspectiveColors = {
      'Christianity': 'text-blue-700 bg-blue-50 border-l-4 border-blue-500',
      'Islam': 'text-green-700 bg-green-50 border-l-4 border-green-500', 
      'Judaism': 'text-purple-700 bg-purple-50 border-l-4 border-purple-500',
      'Hinduism': 'text-orange-700 bg-orange-50 border-l-4 border-orange-500',
      'Buddhism': 'text-amber-700 bg-amber-50 border-l-4 border-amber-500'
    };

    // Check if content contains perspective tags
    if (text.includes('<perspective>')) {
      console.log('🏛️ Multi-perspective content detected');
      const parts = text.split(/(<perspective>.*?<\/perspective>)/g);
      
      const result = [];
      let currentReligion = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // Handle perspective headers
        const perspectiveMatch = part.match(/<perspective>(.*?)<\/perspective>/);
        if (perspectiveMatch) {
          currentReligion = perspectiveMatch[1];
          const colorClass = perspectiveColors[currentReligion as keyof typeof perspectiveColors] || 'text-gray-700 bg-gray-50 border-l-4 border-gray-500';
          
          result.push(
            <div key={`header-${i}`} className={`pl-4 py-2 mb-1 rounded-r-lg ${colorClass}`}>
              <h4 className="font-semibold text-sm flex items-center">
                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                {currentReligion}
              </h4>
            </div>
          );
        } else if (part.trim() && currentReligion) {
          // Handle content following a perspective header
          const colorClass = perspectiveColors[currentReligion as keyof typeof perspectiveColors] || 'text-gray-700 bg-gray-50';
          
          result.push(
            <div key={`content-${i}`} className={`pl-4 pr-3 py-2 mb-3 rounded-r-lg ${colorClass.replace('border-l-4', 'border-l-2')} border-opacity-50`}>
              <p className="text-sm leading-relaxed">{part.trim()}</p>
            </div>
          );
          currentReligion = ''; // Reset for next perspective
        }
      }
      
      return result.length > 0 ? result : [
        <div key="fallback" className="text-gray-700 leading-relaxed">
          <p>{text}</p>
        </div>
      ];
    }

    // Fallback for content without perspectives
    return [
      <div key="simple" className="text-gray-700 leading-relaxed">
        {text.split('\n').map((line, index) => (
          <p key={index} className="mb-2">{line || '\u00A0'}</p>
        ))}
      </div>
    ];
  };

  return (
    <div className="scripture-content">
      {renderFormattedContent(content)}
    </div>
  );
};

export default ScriptureContent;