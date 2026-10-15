import React, { useState } from 'react';
import { TrendingUp, Leaf, Wind, Droplets, Zap, Trash2, Sun, Calendar, Download, Target, CheckCircle2 } from 'lucide-react';

// Monthly trend data (last 6 months)
const MONTHLY_TRENDS = [
  { month: 'May', energy: 3100, water: 29000, recycling: 76, co2: 1302, solar: 610 },
  { month: 'Jun', energy: 3050, water: 28500, recycling: 77, co2: 1281, solar: 720 },
  { month: 'Jul', energy: 2950, water: 27800, recycling: 79, co2: 1239, solar: 810 },
  { month: 'Aug', energy: 2900, water: 27000, recycling: 80, co2: 1218, solar: 790 },
  { month: 'Sep', energy: 2830, water: 26400, recycling: 81, co2: 1189, solar: 660 },
  { month: 'Oct', energy: 2785, water: 25900, recycling: 82, co2: 1170, solar: 620 },
];

const IMPACT_METRICS = [
  { label: 'CO₂ Avoided This Month', value: '1,170', unit: 'kg', delta: '-2.4%', icon: Wind, color: '#06b6d4', note: 'vs. Oct 2025 baseline' },
  { label: 'Solar Energy Generated', value: '620', unit: 'kWh', delta: '+4.1%', icon: Sun, color: '#f59e0b', note: 'across 3 solar-equipped buildings' },
  { label: 'Water Saved vs. Baseline', value: '3,100', unit: 'Liters', delta: '-10.7%', icon: Droplets, color: '#22d3ee', note: '30-day rolling average' },
  { label: 'Waste Diverted from Landfill', value: '345', unit: 'kg', delta: '+6.3%', icon: Trash2, color: '#34d399', note: 'composted + recycled' },
];

// Net Zero milestones
const NET_ZERO_MILESTONES = [
  { label: 'Solar Coverage > 20%', target: 2025, achieved: true, currentVal: '24.8%', targetVal: '20%' },
  { label: 'Recycling Rate > 80%', target: 2026, achieved: true, currentVal: '82.1%', targetVal: '80%' },
  { label: 'Energy -30% vs 2020', target: 2027, achieved: false, currentVal: '-18%', targetVal: '-30%', progress: 60 },
  { label: 'Water Neutral Campus', target: 2028, achieved: false, currentVal: '-10.7%', targetVal: '100% neutral', progress: 35 },
  { label: 'Zero Landfill Waste', target: 2029, achieved: false, currentVal: '18.3%', targetVal: '0%', progress: 45 },
  { label: 'Net-Zero Carbon', target: 2030, achieved: false, currentVal: '42%', targetVal: '100%', progress: 42 },
];

function MiniTrendLine({ data, color, height = 40 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120; const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="120" height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

function TrendChart({ data, metricKey, color, unit }) {
  const vals = data.map(d => d[metricKey]);
  const max = Math.max(...vals);
  const h = 120; const w = 480;

  const pts = vals.map((v, i) => {
    const x = 30 + (i / (vals.length - 1)) * (w - 60);
    const y = h - 10 - ((v - Math.min(...vals)) / (max - Math.min(...vals) || 1)) * (h - 20);
    return { x, y, v, month: data[i].month };
  });

  const pathD = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${h - 10} L ${pts[0].x} ${h - 10} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="report-trend-svg">
      <defs>
        <linearGradient id={`tg-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#tg-${metricKey})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#0f172a" stroke={color} strokeWidth="2" />
          <text x={p.x} y={h + 14} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)" fontFamily="monospace">
            {p.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Export CSV of monthly trends */
function exportCSV() {
  const headers = ['Month', 'Energy (kWh)', 'Water (L)', 'Recycling (%)', 'CO2 (kg)', 'Solar (kWh)'];
  const rows = MONTHLY_TRENDS.map(r =>
    [r.month + ' 2026', r.energy, r.water, r.recycling, r.co2, r.solar].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus-esg-report-oct2026.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImpactReports() {
  const [activeChart, setActiveChart] = useState('energy');
  const [exportedFlash, setExportedFlash] = useState(false);

  const handleExport = () => {
    exportCSV();
    setExportedFlash(true);
    setTimeout(() => setExportedFlash(false), 2000);
  };

  const chartConfigs = {
    energy: { key: 'energy', label: 'Grid Energy (kWh)', color: '#10b981', unit: 'kWh' },
    water: { key: 'water', label: 'Water Consumption (L)', color: '#06b6d4', unit: 'L' },
    recycling: { key: 'recycling', label: 'Recycling Rate (%)', color: '#2dd4bf', unit: '%' },
    co2: { key: 'co2', label: 'CO₂ Footprint (kg)', color: '#f59e0b', unit: 'kg' },
    solar: { key: 'solar', label: 'Solar Generation (kWh)', color: '#fbbf24', unit: 'kWh' },
  };

  const active = chartConfigs[activeChart];
  const achievedCount = NET_ZERO_MILESTONES.filter(m => m.achieved).length;

  return (
    <div className="reports-page animate-fade-in">
      <div className="reports-header">
        <div>
          <h2 className="page-title">Impact Reports &amp; ESG Trends</h2>
          <p className="page-subtitle">6-month sustainability trend analysis — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="reports-header-actions">
          <div className="reports-period-pill">
            <Calendar size={14} /> May 2026 – Oct 2026
          </div>
          <button
            className={`export-csv-btn ${exportedFlash ? 'export-csv-btn--success' : ''}`}
            onClick={handleExport}
            title="Download ESG data as CSV"
          >
            {exportedFlash
              ? <><CheckCircle2 size={14} /> Exported!</>
              : <><Download size={14} /> Export CSV</>}
          </button>
        </div>
      </div>

      {/* Impact KPI Cards */}
      <div className="impact-kpi-grid">
        {IMPACT_METRICS.map((m, i) => {
          const Icon = m.icon;
          const trend = MONTHLY_TRENDS.map(d => {
            if (m.label.includes('CO')) return d.co2;
            if (m.label.includes('Solar')) return d.solar;
            if (m.label.includes('Water')) return d.water;
            return d.energy;
          });
          return (
            <div key={i} className="impact-kpi-card glass-panel">
              <div className="ikpi-top">
                <div className="ikpi-icon" style={{ background: `${m.color}22`, border: `1px solid ${m.color}44` }}>
                  <Icon size={18} style={{ color: m.color }} />
                </div>
                <span className={`ikpi-delta ${m.delta.startsWith('+') ? 'delta-pos' : 'delta-neg'}`}>{m.delta}</span>
              </div>
              <div className="ikpi-value">{m.value} <span className="ikpi-unit">{m.unit}</span></div>
              <div className="ikpi-label">{m.label}</div>
              <div className="ikpi-note">{m.note}</div>
              <div className="ikpi-sparkline">
                <MiniTrendLine data={trend} color={m.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      <div className="reports-trend-card glass-panel">
        <div className="reports-chart-header">
          <div className="chart-title-group">
            <TrendingUp size={18} className="text-emerald" />
            <div>
              <h3 className="chart-card-title">6-Month Campus Sustainability Trends</h3>
              <p className="chart-card-subtitle">Monthly aggregate from IoT sensor telemetry</p>
            </div>
          </div>
          <div className="reports-chart-tabs">
            {Object.entries(chartConfigs).map(([key, cfg]) => (
              <button key={key}
                className={`chart-tab ${activeChart === key ? 'active' : ''}`}
                onClick={() => setActiveChart(key)}>
                {cfg.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="reports-svg-wrap">
          <TrendChart data={MONTHLY_TRENDS} metricKey={active.key} color={active.color} unit={active.unit} />
        </div>
        <div className="reports-chart-footer">
          <span style={{ color: active.color }}>■ {active.label}</span>
          <span className="report-data-source">Source: Campus EcoTwin IoT Gateway · Updated monthly</span>
        </div>
      </div>

      {/* Net Zero 2030 Progress Tracker */}
      <div className="netzero-card glass-panel">
        <div className="netzero-header">
          <div className="netzero-title-group">
            <Target size={18} className="text-emerald" />
            <div>
              <h3 className="netzero-title">Net Zero 2030 Roadmap</h3>
              <p className="netzero-subtitle">
                {achievedCount} of {NET_ZERO_MILESTONES.length} milestones achieved &middot; {Math.round((achievedCount / NET_ZERO_MILESTONES.length) * 100)}% complete
              </p>
            </div>
          </div>
          <div className="netzero-overall-ring">
            <svg width="54" height="54" viewBox="0 0 54 54">
              <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="5" />
              <circle cx="27" cy="27" r="22" fill="none" stroke="#10b981" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - achievedCount / NET_ZERO_MILESTONES.length)}`}
                strokeLinecap="round"
                transform="rotate(-90 27 27)"
              />
              <text x="27" y="31" textAnchor="middle" fontSize="11" fontWeight="800" fill="#34d399" fontFamily="monospace">
                {Math.round((achievedCount / NET_ZERO_MILESTONES.length) * 100)}%
              </text>
            </svg>
          </div>
        </div>

        <div className="netzero-milestones">
          {NET_ZERO_MILESTONES.map((m, i) => (
            <div key={i} className={`netzero-milestone ${m.achieved ? 'netzero-milestone--done' : ''}`}>
              <div className="nz-check">
                {m.achieved
                  ? <CheckCircle2 size={18} className="text-emerald" />
                  : <div className="nz-pending-circle" />}
              </div>
              <div className="nz-content">
                <div className="nz-label-row">
                  <span className="nz-label">{m.label}</span>
                  <span className={`nz-target-year ${m.achieved ? 'nz-done' : ''}`}>
                    {m.achieved ? '✓ Achieved' : `Target: ${m.target}`}
                  </span>
                </div>
                <div className="nz-progress-row">
                  <div className="nz-bar-track">
                    <div
                      className="nz-bar-fill"
                      style={{
                        width: m.achieved ? '100%' : `${m.progress || 0}%`,
                        background: m.achieved
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #06b6d4, #22d3ee)',
                      }}
                    />
                  </div>
                  <span className="nz-current">{m.currentVal}</span>
                  <span className="nz-slash">/</span>
                  <span className="nz-target">{m.targetVal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ESG Summary Table */}
      <div className="esg-table-card glass-panel">
        <h3 className="esg-table-title">
          <Leaf size={17} className="text-emerald" /> Monthly ESG Performance Summary
        </h3>
        <div className="esg-table-wrap">
          <table className="esg-table">
            <thead>
              <tr>
                <th>Month</th>
                <th><Zap size={12} /> Energy (kWh)</th>
                <th><Droplets size={12} /> Water (L)</th>
                <th>♻️ Recycling (%)</th>
                <th><Wind size={12} /> CO₂ (kg)</th>
                <th><Sun size={12} /> Solar (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_TRENDS.map((row, i) => {
                const prev = MONTHLY_TRENDS[i - 1];
                const eDown = prev && row.energy < prev.energy;
                const wDown = prev && row.water < prev.water;
                const rUp = prev && row.recycling > prev.recycling;
                return (
                  <tr key={row.month} className={i === MONTHLY_TRENDS.length - 1 ? 'latest-row' : ''}>
                    <td className="month-cell">{row.month} 2026 {i === MONTHLY_TRENDS.length - 1 && <span className="latest-tag">Latest</span>}</td>
                    <td className={eDown ? 'td-good' : ''}>{row.energy.toLocaleString()}</td>
                    <td className={wDown ? 'td-good' : ''}>{row.water.toLocaleString()}</td>
                    <td className={rUp ? 'td-good' : ''}>{row.recycling}%</td>
                    <td>{row.co2.toLocaleString()}</td>
                    <td className="td-solar">{row.solar}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="esg-footnote">
          Green highlights indicate improvement vs. prior month. Data is synthetic demo telemetry labeled for hackathon demonstration.
        </p>
      </div>
    </div>
  );
}
