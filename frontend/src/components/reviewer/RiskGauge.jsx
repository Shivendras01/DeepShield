import React from 'react';

export default function RiskGauge({ score = 0, band = 'LOW' }) {
  // Clamp score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, Number(score) || 0));

  // Determine color scheme based on 4 risk bands
  let strokeColor = '#0F766E'; // Emerald (LOW)
  let badgeBg = 'bg-emerald-soft text-emerald-bank border-emerald-border';

  if (normalizedScore >= 75) {
    strokeColor = '#991B1B'; // Wine (HIGH)
    badgeBg = 'bg-wine-soft text-wine-bank border-wine-border';
  } else if (normalizedScore >= 50) {
    strokeColor = '#C2410C'; // Burnt Orange (ELEVATED)
    badgeBg = 'bg-orange-50 text-orange-800 border-orange-200';
  } else if (normalizedScore >= 25) {
    strokeColor = '#B45309'; // Amber (GUARDED)
    badgeBg = 'bg-amber-soft text-amber-bank border-amber-border';
  }

  // Circular gauge math (180-degree semi-circle or 260-degree arc)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // Arc covers 75% of a full circle (270 degrees)
  const totalArc = circumference * 0.75;
  const strokeDashoffset = totalArc - (normalizedScore / 100) * totalArc;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-135" viewBox="0 0 160 160">
          {/* Background track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#EAE9E4"
            strokeWidth="12"
            strokeDasharray={totalArc}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
          {/* Active progress stroke */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={totalArc}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-ink font-mono">
            {normalizedScore.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">
            Fraud Risk
          </span>
        </div>
      </div>

      {/* Risk Band Badge */}
      <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${badgeBg}`}>
        Tier: {band}
      </div>
    </div>
  );
}
