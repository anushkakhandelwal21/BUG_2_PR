import React from 'react';

interface LogoProps {
  size?: number | string;
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  tagline?: boolean;
}

/**
 * Custom vector logo for Fixtrail.
 * Concept: Traceable branching path representing a defect progressing through
 * isolation, branch investigation, patch synthesis, and mint-green verified resolution.
 */
export const FixtrailMark: React.FC<{ size?: number | string; className?: string }> = ({
  size = 20,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Fixtrail vector mark"
    >
      {/* Primary resolution path (traceable branch from defect origin to verified endpoint) */}
      <path
        d="M 3.5 18 L 8.5 18 L 14 7 L 19 7"
        stroke="#E6E8EA"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Secondary diagnostic branch (isolated exploration path) */}
      <path
        d="M 8.5 18 L 14.5 18 L 17 14"
        stroke="#5A6478"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2.5 2"
      />

      {/* Origin defect inception node */}
      <circle cx="3.5" cy="18" r="1.75" fill="#5A6478" />

      {/* Investigation junction milestone */}
      <circle cx="8.5" cy="18" r="1.5" fill="#E6E8EA" />

      {/* Verified terminal endpoint node - Restrained mint-green accent */}
      <circle cx="19" cy="7" r="2.5" fill="#10B981" />
      <circle cx="19" cy="7" r="4.5" stroke="#10B981" strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  );
};

export const FixtrailLogo: React.FC<LogoProps> = ({
  size = 20,
  className = '',
  showWordmark = true,
  wordmarkClassName = '',
  tagline = false,
}) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <FixtrailMark size={size} />
      {showWordmark && (
        <div className="flex flex-col">
          <span className={`font-mono font-bold tracking-tight text-[#EDEFEF] leading-none ${wordmarkClassName || 'text-xs'}`}>
            Bug2PR
          </span>
          {tagline && (
            <span className="text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5">
              From Issue to Verified PR
            </span>
          )}
        </div>
      )}
    </div>
  );
};
