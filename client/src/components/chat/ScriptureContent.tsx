import React from 'react';

interface ScriptureContentProps {
  content: string;
  onNavigateToVerse?: (verse: any) => void;
}

const ScriptureContent: React.FC<ScriptureContentProps> = ({ content }) => {
  const renderFormattedContent = (text: string) => {
    const perspectiveColors = {
      'Christianity': 'border-l-2 border-gray-300 bg-gray-50 text-gray-700',
      'Islam':        'border-l-2 border-gray-300 bg-gray-50 text-gray-700',
      'Judaism':      'border-l-2 border-gray-300 bg-gray-50 text-gray-700',
      'Hinduism':     'border-l-2 border-gray-300 bg-gray-50 text-gray-700',
      'Buddhism':     'border-l-2 border-gray-300 bg-gray-50 text-gray-700',
    };
    const fallbackClass = 'border-l-2 border-gray-200 bg-gray-50';

    if (text.includes('<perspective>')) {
      const parts = text.split(/(<perspective>.*?<\/perspective>)/g);
      const result = [];
      let currentReligion = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const perspectiveMatch = part.match(/<perspective>(.*?)<\/perspective>/);
        if (perspectiveMatch) {
          currentReligion = perspectiveMatch[1];
          const colorClass = perspectiveColors[currentReligion as keyof typeof perspectiveColors] ?? fallbackClass;
          result.push(
            <div key={`header-${i}`} className={`pl-4 py-2 mb-1 rounded-r-lg ${colorClass}`}>
              <h4 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {currentReligion}
              </h4>
            </div>
          );
        } else if (part.trim() && currentReligion) {
          const colorClass = perspectiveColors[currentReligion as keyof typeof perspectiveColors] ?? fallbackClass;
          result.push(
            <div key={`content-${i}`} className={`pl-4 pr-3 py-2 mb-3 rounded-r-lg ${colorClass} border-opacity-40`}>
              <p className="text-sm leading-relaxed">{part.trim()}</p>
            </div>
          );
          currentReligion = '';
        }
      }

      return result.length > 0 ? result : [
        <div key="fallback" className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          <p>{text}</p>
        </div>
      ];
    }

    return [
      <div key="simple" className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
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
