export const MandalaBackground = () => (
  <svg 
    className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" 
    viewBox="0 0 400 400" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g transform="translate(200,200)">
      {/* Outer circles */}
      <circle cx="0" cy="0" r="180" stroke="var(--gold)" strokeWidth="1" fill="none" />
      <circle cx="0" cy="0" r="160" stroke="var(--gold)" strokeWidth="0.5" fill="none" />
      <circle cx="0" cy="0" r="140" stroke="var(--gold)" strokeWidth="1" fill="none" />
      
      {/* Geometric patterns */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45) * Math.PI / 180;
        const x1 = Math.cos(angle) * 140;
        const y1 = Math.sin(angle) * 140;
        const x2 = Math.cos(angle) * 180;
        const y2 = Math.sin(angle) * 180;
        return (
          <line 
            key={i} 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke="var(--gold)" 
            strokeWidth="0.5" 
          />
        );
      })}
      
      {/* Inner compass design */}
      <circle cx="0" cy="0" r="80" stroke="var(--gold)" strokeWidth="1" fill="none" />
      <circle cx="0" cy="0" r="60" stroke="var(--gold)" strokeWidth="0.5" fill="none" />
      
      {/* Compass points */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i * 22.5) * Math.PI / 180;
        const r1 = i % 2 === 0 ? 60 : 50;
        const r2 = i % 2 === 0 ? 80 : 70;
        const x1 = Math.cos(angle) * r1;
        const y1 = Math.sin(angle) * r1;
        const x2 = Math.cos(angle) * r2;
        const y2 = Math.sin(angle) * r2;
        return (
          <line 
            key={i} 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke="var(--gold)" 
            strokeWidth={i % 4 === 0 ? "1" : "0.5"} 
          />
        );
      })}
      
      {/* Center compass star */}
      <polygon 
        points="0,-30 8,-8 30,0 8,8 0,30 -8,8 -30,0 -8,-8" 
        stroke="var(--gold)" 
        strokeWidth="1" 
        fill="none" 
      />
      <circle cx="0" cy="0" r="15" stroke="var(--gold)" strokeWidth="1" fill="none" />
    </g>
  </svg>
);