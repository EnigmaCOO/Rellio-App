export function CompassWatermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.07]">
      <svg
        width="800"
        height="800"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full max-h-full"
      >
        {/* Outer Circle */}
        <circle
          cx="200"
          cy="200"
          r="180"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-gold"
        />
        
        {/* Cardinal Points */}
        <g className="text-gold" fill="currentColor">
          {/* North */}
          <polygon points="200,40 190,60 210,60" />
          {/* East */}
          <polygon points="360,200 340,190 340,210" />
          {/* South */}
          <polygon points="200,360 190,340 210,340" />
          {/* West */}
          <polygon points="40,200 60,190 60,210" />
        </g>
        
        {/* Main Compass Rose */}
        <g transform="translate(200,200)" className="text-gold" fill="currentColor">
          {/* Main Cross */}
          <rect x="-2" y="-150" width="4" height="300" />
          <rect x="-150" y="-2" width="300" height="4" />
          
          {/* Diagonal Cross */}
          <rect x="-2" y="-106" width="4" height="212" transform="rotate(45)" />
          <rect x="-106" y="-2" width="212" height="4" transform="rotate(45)" />
          
          {/* Center Circle */}
          <circle r="15" />
          
          {/* Compass Points */}
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 45})`}>
              <polygon points="0,-140 -8,-120 8,-120" />
            </g>
          ))}
        </g>
        
        {/* Degree Markings */}
        {Array.from({ length: 36 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 10} 200 200)`} className="text-gold">
            <line
              x1="200"
              y1="30"
              x2="200"
              y2={i % 3 === 0 ? "40" : "35"}
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}