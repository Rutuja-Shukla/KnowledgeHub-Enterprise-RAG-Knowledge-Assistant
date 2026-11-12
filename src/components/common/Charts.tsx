import React, { useState, useRef, useEffect } from 'react';

// ==========================================
// 1. Interactive Area Chart (Dual Series)
// ==========================================
interface AreaChartProps {
  data: { period: string; queries: number; indexed: number }[];
  height?: number;
}

export const InteractiveAreaChart: React.FC<AreaChartProps> = ({ data, height = 240 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = Math.max(200, width - padding.left - padding.right);
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => Math.max(d.queries, d.indexed, 10)), 50);
  const yTicks = [0, Math.round(maxVal * 0.33), Math.round(maxVal * 0.66), maxVal];

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  // Build SVG path strings
  const queriesPoints = data.map((d, i) => `${getX(i)},${getY(d.queries)}`);
  const queriesLinePath = `M ${queriesPoints.join(' L ')}`;
  const queriesAreaPath = `${queriesLinePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(
    0
  )},${padding.top + chartHeight} Z`;

  const indexedPoints = data.map((d, i) => `${getX(i)},${getY(d.indexed)}`);
  const indexedLinePath = `M ${indexedPoints.join(' L ')}`;
  const indexedAreaPath = `${indexedLinePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(
    0
  )},${padding.top + chartHeight} Z`;

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="areaQueriesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="areaIndexedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Areas */}
        <path d={queriesAreaPath} fill="url(#areaQueriesGrad)" />
        <path d={indexedAreaPath} fill="url(#areaIndexedGrad)" />

        {/* Lines */}
        <path d={queriesLinePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <path d={indexedLinePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

        {/* X-axis labels & points */}
        {data.map((d, i) => {
          const x = getX(i);
          const isHovered = hoverIndex === i;
          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)}>
              <text
                x={x}
                y={padding.top + chartHeight + 18}
                textAnchor="middle"
                className={`text-[11px] font-medium transition-colors ${
                  isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                }`}
              >
                {d.period}
              </text>

              {/* Data points */}
              <circle
                cx={x}
                cy={getY(d.queries)}
                r={isHovered ? 5 : 3.5}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={isHovered ? 2.5 : 2}
              />
              <circle
                cx={x}
                cy={getY(d.indexed)}
                r={isHovered ? 5 : 3.5}
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth={isHovered ? 2.5 : 2}
              />

              {/* Invisible hover trigger column */}
              <rect
                x={x - chartWidth / (data.length * 2)}
                y={padding.top}
                width={chartWidth / data.length}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            </g>
          );
        })}

        {/* Hover Crosshair */}
        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={padding.top}
            x2={getX(hoverIndex)}
            y2={padding.top + chartHeight}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && hoverIndex !== null && (
        <div
          className="absolute z-10 pointer-events-none rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs animate-in fade-in-50"
          style={{
            left: Math.min(Math.max(getX(hoverIndex) - 70, 10), width - 150),
            top: 10,
          }}
        >
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1.5">{hoveredItem.period}</p>
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Employee Queries:
            </span>
            <span className="font-mono font-bold text-slate-900">{hoveredItem.queries}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] mt-1">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Documents Indexed:
            </span>
            <span className="font-mono font-bold text-slate-900">{hoveredItem.indexed}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span>Employee Queries</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span>Indexed Documents</span>
        </span>
      </div>
    </div>
  );
};

// ==========================================
// 2. Interactive Bar Chart (Latency / Buckets)
// ==========================================
interface BarChartProps {
  data: { range: string; queries: number; fill?: string }[];
  height?: number;
}

export const InteractiveBarChart: React.FC<BarChartProps> = ({ data, height = 220 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 15, bottom: 30, left: 35 };
  const chartWidth = Math.max(150, width - padding.left - padding.right);
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.queries), 10);
  const barWidth = Math.min(45, (chartWidth / data.length) * 0.65);

  const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ height }}>
      <svg width={width} height={height}>
        {/* Gridlines */}
        {[0, Math.round(maxVal / 2), maxVal].map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const slotWidth = chartWidth / data.length;
          const x = padding.left + i * slotWidth + (slotWidth - barWidth) / 2;
          const y = getY(d.queries);
          const barH = padding.top + chartHeight - y;
          const isHovered = hoverIndex === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill={d.fill || '#3b82f6'}
                opacity={isHovered ? 1 : 0.85}
                className="transition-all"
              />

              {/* Value on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-slate-700"
              >
                {d.queries}
              </text>

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + chartHeight + 18}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-colors ${
                  isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                }`}
              >
                {d.range}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ==========================================
// 3. Interactive Donut Chart
// ==========================================
interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  size?: number;
}

export const InteractiveDonutChart: React.FC<DonutChartProps> = ({ data, size = 180 }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = size / 2 - 16;
  const innerRadius = radius * 0.65;
  const cx = size / 2;
  const cy = size / 2;

  let currentAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * (Math.PI * 2);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(startAngle);
    const y4 = cy + innerRadius * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    return { ...d, pathData, index: i };
  });

  const activeSlice = hoverIndex !== null ? data[hoverIndex] : data[0];

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {slices.map((slice) => {
            const isHovered = hoverIndex === slice.index;
            return (
              <path
                key={slice.name}
                d={slice.pathData}
                fill={slice.color}
                opacity={hoverIndex === null || isHovered ? 1 : 0.6}
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoverIndex(slice.index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-slate-900">{activeSlice?.value}%</span>
          <span className="text-[10px] text-slate-500 font-medium max-w-[80px] text-center truncate">
            {activeSlice?.name.split(' ')[0]}
          </span>
        </div>
      </div>
    </div>
  );
};
