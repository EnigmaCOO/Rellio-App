import React from 'react';

interface ScriptureContentProps {
  content: string;
  onNavigateToVerse?: (verse: any) => void;
}

const ScriptureContent: React.FC<ScriptureContentProps> = ({ content, onNavigateToVerse }) => {
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
      const sections = text.split(/(<perspective>.*?<\/perspective>)/g);
      
      return sections.map((section, index) => {
        // Handle perspective headers
        const perspectiveMatch = section.match(/<perspective>(.*?)<\/perspective>/);
        if (perspectiveMatch) {
          const religion = perspectiveMatch[1];
          const colorClass = perspectiveColors[religion as keyof typeof perspectiveColors] || 'text-gray-700 bg-gray-50 border-l-4 border-gray-500';
          
          return (
            <div key={index} className={`pl-4 py-2 mb-3 rounded-r-lg ${colorClass}`}>
              <h4 className="font-semibold text-sm mb-1 flex items-center">
                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                {religion}
              </h4>
            </div>
          );
        }
        
        // Handle regular content following a perspective
        if (section.trim() && !section.includes('<perspective>')) {
          // Get the previous section to determine context
          const prevIndex = index - 1;
          if (prevIndex >= 0 && sections[prevIndex].includes('<perspective>')) {
            const prevPerspectiveMatch = sections[prevIndex].match(/<perspective>(.*?)<\/perspective>/);
            if (prevPerspectiveMatch) {
              const religion = prevPerspectiveMatch[1];
              const colorClass = perspectiveColors[religion as keyof typeof perspectiveColors] || 'text-gray-700 bg-gray-50';
              
              return (
                <div key={index} className={`pl-4 pr-3 pb-3 mb-3 rounded-r-lg ${colorClass.replace('border-l-4', 'border-l-2')} border-opacity-50`}>
                  <p className="text-sm leading-relaxed">{section.trim()}</p>
                </div>
              );
            }
          }
        }
        
        return null;
      }).filter(Boolean);
    }

    // Fallback for content without perspectives
    return (
      <div className="text-gray-700 leading-relaxed">
        {text.split('\n').map((line, index) => (
          <p key={index} className="mb-2">{line}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="scripture-content">
      {renderFormattedContent(content)}
    </div>
  );
};

export default ScriptureContent;