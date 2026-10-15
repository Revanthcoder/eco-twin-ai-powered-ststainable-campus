import React, { useState } from 'react';
import { BarChart3, Sun, Zap, Droplets } from 'lucide-react';

export default function ConsumptionTrendChart({ trends = [] }) {
  const [activeMetric, setActiveMetric] = useState('energy'); // 'energy' | 'water' | 'solar'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!trends || trends.length === 0) return null;

  // Chart dimension constants
  const chartHeight = 180;
  const chartWidth = 560;
  const paddingX = 40;
  const paddingY = 20;

  // Determine max values for scaling
  const maxEnergy = Math.max(...trends.map(t => t.energy), 600);
  const maxWater = Math.max(...trends.map(t => t.water), 5000);
  const maxVal = activeMetric === 'water' ? maxWater : maxEnergy;

  const points = trends.map((item, index) => {
    const x = paddingX + (index / (trends.length - 1)) * (chartWidth - paddingX * 2);
    let rawVal = 0;
    if (activeMetric === 'water') rawVal = item.water;
    else if (activeMetric === 'solar') rawVal = item.solar;
    else rawVal = item.energy;

    const y = chartHeight - paddingY - (rawVal / maxVal) * (chartHeight - paddingY * 2);
    return { x, y, rawVal, time: item.time, item };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  const getMetricColor = () => {
    if (activeMetric === 'water') return { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)', name: 'Water (L)' };
    if (activeMetric === 'solar') return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', name: 'Solar PV (kWh)' };
    return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', name: 'Grid Energy (kWh)' };
  };

  const metricConfig = getMetricColor();

  return (
    <div className="consumption-chart-card glass-panel">
      <div className="chart-header">
        <div className="chart-title-group">
          <BarChart3 size={18} className="text-emerald" />
          <div>
            <h3 className="chart-card-title">24-Hour Campus Consumption &amp; Solar Profile</h3>
            <p className="chart-card-subtitle">Synchronized 2-hour interval IoT readings</p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="chart-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeMetric === 'energy'}
            className={`chart-tab ${activeMetric === 'energy' ? 'active' : ''}`}
            onClick={() => setActiveMetric('energy')}
          >
            <Zap size={13} />
            <span>Electricity</span>
          </button>
          <button
            role="tab"
            aria-selected={activeMetric === 'solar'}
            className={`chart-tab ${activeMetric === 'solar' ? 'active' : ''}`}
            onClick={() => setActiveMetric('solar')}
          >
            <Sun size={13} />
            <span>Solar PV</span>
          </button>
          <button
            role="tab"
            aria-selected={activeMetric === 'water'}
            className={`chart-tab ${activeMetric === 'water' ? 'active' : ''}`}
            onClick={() => setActiveMetric('water')}
          >
            <Droplets size={13} />
            <span>Water Flow</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Telemetry Chart */}
      <div className="svg-chart-wrapper">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="telemetry-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricConfig.stroke} stopOpacity="0.35" />
              <stop offset="100%" stopColor={metricConfig.stroke} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

          {/* Filled Area */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={metricConfig.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint === idx ? 5.5 : 3.5}
              fill="#0f172a"
              stroke={metricConfig.stroke}
              strokeWidth="2"
              className="chart-data-point"
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredPoint !== null && (
          <div
            className="chart-hover-tooltip"
            style={{
              left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
              top: `${(points[hoveredPoint].y / chartHeight) * 100}%`
            }}
          >
            <div className="tooltip-time">{points[hoveredPoint].time}</div>
            <div className="tooltip-val">
              {points[hoveredPoint].rawVal.toLocaleString()}{' '}
              <span className="tooltip-unit">{activeMetric === 'water' ? 'L' : 'kWh'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Time axis ticks */}
      <div className="chart-x-axis">
        {trends.filter((_, i) => i % 2 === 0).map((t, idx) => (
          <span key={idx} className="axis-label">{t.time}</span>
        ))}
      </div>
    </div>
  );
}
