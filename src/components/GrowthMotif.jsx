import { useId } from 'react';

// Signature growth-chart motif — a warm growth curve with developmental
// milestone markers. Used sparingly as an illustration accent (hero, empty
// states, progress) to signal development and continuity of care without
// implying a diagnosis, percentile, or clinical interpretation.
export default function GrowthMotif({ className = '', title = 'Growth chart with developmental milestones' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const curve = `gm-curve-${uid}`;
  const fill = `gm-fill-${uid}`;
  return (
    <svg className={className} viewBox="0 0 340 210" role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={curve} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5a623" />
          <stop offset="1" stopColor="#ff8a5c" />
        </linearGradient>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(245,166,35,.32)" />
          <stop offset="1" stopColor="rgba(245,166,35,0)" />
        </linearGradient>
      </defs>
      <path d="M6 174 C78 158 130 126 176 100 S272 54 334 28" fill="none" stroke="rgba(255,255,255,.30)" strokeWidth="1.5" strokeDasharray="5 7" strokeLinecap="round" />
      <path d="M6 190 C78 180 130 158 176 140 S272 104 334 82" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" strokeDasharray="5 7" strokeLinecap="round" />
      <path d="M6 182 C70 172 120 142 168 114 S262 62 334 38 L334 210 L6 210 Z" fill={`url(#${fill})`} />
      <path d="M6 182 C70 172 120 142 168 114 S262 62 334 38" fill="none" stroke={`url(#${curve})`} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="62" cy="182" r="5.5" fill="#0f8f8a" stroke="#fff" strokeWidth="2.5" />
      <circle cx="168" cy="114" r="6.5" fill="#fff" stroke="#ff8a5c" strokeWidth="3" />
      <circle cx="262" cy="66" r="5.5" fill="#f5a623" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}
