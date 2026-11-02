export function MandalaPattern() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.05]">
      <svg
        width="600"
        height="600"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full max-h-full animate-mandala-rotate"
      >
        <g transform="translate(300,300)" className="text-gold">
          {/* Outer Sacred Circle */}
          <circle r="280" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle r="260" stroke="currentColor" strokeWidth="0.5" fill="none" />
          
          {/* Lotus Petals - Outer Layer */}
          {Array.from({ length: 24 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 15})`}>
              <path
                d="M 0,-250 Q -15,-230 0,-210 Q 15,-230 0,-250 Z"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
              />
            </g>
          ))}
          
          {/* Sacred Geometry - Middle Layer */}
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 30})`}>
              <circle r="4" cy="-180" stroke="currentColor" strokeWidth="0.5" fill="none" />
              <line
                x1="0"
                y1="-200"
                x2="0"
                y2="-160"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </g>
          ))}
          
          {/* Inner Lotus Petals */}
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 45})`}>
              <path
                d="M 0,-120 Q -10,-100 0,-80 Q 10,-100 0,-120 Z"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
              />
            </g>
          ))}
          
          {/* Central Sacred Symbol */}
          <circle r="40" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle r="20" stroke="currentColor" strokeWidth="0.5" fill="none" />
          
          {/* Eight-spoke Dharma Wheel Center */}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1="-15"
              x2="0"
              y2="15"
              stroke="currentColor"
              strokeWidth="0.5"
              transform={`rotate(${i * 45})`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}