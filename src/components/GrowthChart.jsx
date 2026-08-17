const BANDS = [
  { label: '3rd', value: 3, color: '#fb7185' },
  { label: '15th', value: 15, color: '#fbbf24' },
  { label: '50th', value: 50, color: '#34d399' },
  { label: '85th', value: 85, color: '#fbbf24' },
  { label: '97th', value: 97, color: '#fb7185' },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function GrowthChart({ results = [] }) {
  if (!results.length) return null;
  const width = 760;
  const left = 126;
  const right = 30;
  const plotWidth = width - left - right;
  const rowHeight = 62;
  const height = 68 + results.length * rowHeight;
  const x = (percentile) => left + (clamp(Number(percentile) || 0, 0, 100) / 100) * plotWidth;

  return (
    <div className="growth-chart-wrap" role="img" aria-label="Growth percentile chart with measured results">
      <svg className="growth-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="growth-band" x1="0" x2="1">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="15%" stopColor="#fffbeb" />
            <stop offset="50%" stopColor="#ecfdf5" />
            <stop offset="85%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#fff1f2" />
          </linearGradient>
        </defs>
        <rect x={left} y="18" width={plotWidth} height={height - 32} rx="12" fill="url(#growth-band)" />
        {[0, 3, 15, 50, 85, 97, 100].map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1="18" y2={height - 14} stroke={tick === 50 ? '#86efac' : '#e2e8f0'} strokeDasharray={tick === 50 ? '0' : '4 5'} />
            <text x={x(tick)} y="12" textAnchor="middle" fontSize="10" fill="#64748b">{tick}th</text>
          </g>
        ))}
        {results.map((result, index) => {
          const y = 49 + index * rowHeight;
          const measuredX = x(result.percentile);
          return (
            <g key={result.label}>
              <text x="0" y={y + 4} fontSize="12" fontWeight="700" fill="#19324d">{result.label.replace('Head Circumference', 'Head circumference')}</text>
              <text x="0" y={y + 21} fontSize="10" fill="#64748b">{result.value}</text>
              <line x1={left} x2={left + plotWidth} y1={y} y2={y} stroke="#cbd5e1" />
              {BANDS.map((band) => <circle key={band.label} cx={x(band.value)} cy={y} r="4" fill={band.color} opacity=".75" />)}
              <line x1={measuredX} x2={measuredX} y1={y - 16} y2={y + 16} stroke="#0f766e" strokeWidth="3" />
              <circle cx={measuredX} cy={y} r="7" fill="#0f766e" stroke="#ffffff" strokeWidth="3" />
              <text x={Math.min(measuredX + 12, width - 72)} y={y - 10} fontSize="11" fontWeight="700" fill="#0f766e">{result.percentile}th</text>
            </g>
          );
        })}
        <text x={left + plotWidth / 2} y={height - 1} textAnchor="middle" fontSize="10" fill="#64748b">Percentile position · interpret trends, not isolated values</text>
      </svg>
    </div>
  );
}
