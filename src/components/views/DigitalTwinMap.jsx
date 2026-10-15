import React, { useState, useEffect } from 'react';
import { MapPin, Zap, Droplets, AlertTriangle, X, Activity, Building2, Sun, Radio, Layers, Sliders, ArrowRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

// Campus zone layout — positions match the 5 fictional locations from the backend
const CAMPUS_ZONES = [
  {
    id: 1, name: 'Academic Block', type: 'academic', zone: 'Zone A',
    cx: 160, cy: 130, width: 120, height: 75,
    icon: '🎓', color: { optimal: '#10b981', warning: '#f59e0b', critical: '#ef4444' }
  },
  {
    id: 2, name: 'Library', type: 'library', zone: 'Zone B',
    cx: 330, cy: 180, width: 100, height: 65,
    icon: '📚', color: { optimal: '#10b981', warning: '#f59e0b', critical: '#ef4444' }
  },
  {
    id: 3, name: 'Cafeteria', type: 'cafeteria', zone: 'Zone C',
    cx: 195, cy: 290, width: 115, height: 70,
    icon: '🍽️', color: { optimal: '#10b981', warning: '#f59e0b', critical: '#ef4444' }
  },
  {
    id: 4, name: 'Laboratory', type: 'laboratory', zone: 'Zone D',
    cx: 370, cy: 290, width: 130, height: 80,
    icon: '🔬', color: { optimal: '#10b981', warning: '#f59e0b', critical: '#ef4444' }
  },
  {
    id: 5, name: 'Water Tank', type: 'utility', zone: 'Zone E',
    cx: 270, cy: 400, width: 90, height: 60,
    icon: '🚰', color: { optimal: '#10b981', warning: '#f59e0b', critical: '#ef4444' }
  },
];

// Campus walkways
const CAMPUS_PATHS = [
  'M 100 170 L 270 230 L 270 370 L 315 370',
  'M 270 230 L 270 130 L 220 130',
  'M 330 180 L 330 260',
  'M 220 290 L 300 290 L 300 360',
];

// Energy microgrid conduits (from solar panels @ 420, 70)
const SOLAR_GRID_LINES = [
  'M 420 70 L 160 130', // to Academic Block
  'M 420 70 L 330 180', // to Library
  'M 420 70 L 370 290', // to Lab
];

// Water network mains (from Water Tank @ 270, 400)
const WATER_PIPES = [
  'M 270 400 L 195 290', // to Cafeteria
  'M 270 400 L 370 290', // to Lab
  'M 270 400 L 160 130', // to Academic
];

const TICKER_EVENTS = [
  '⚡ Solar Array generating 280 kW peak output to Academic Block & Lab',
  '💧 Cafeteria inlet pipe differential flow indicates active loss of ~140 L/hr',
  '🔋 Grid Battery Buffer at 91% capacity — Micro-grid operating in self-supply mode',
  '🌡️ Cleanroom HVAC differential pressure sensor stable at 45 Pa',
  '♻️ Composting digester in Zone C logged 190 kg organic diversion today',
  '🌿 ISO 50001 continuous audit telemetry streaming at 100% signal strength'
];

function getBuildingColor(status, mode = 'status', building = {}) {
  if (mode === 'energy') {
    const kwh = building.energyUsageKWh || 0;
    if (kwh > 1000) return '#ef4444';
    if (kwh > 500) return '#f59e0b';
    return '#10b981';
  }
  if (mode === 'water') {
    const l = building.waterUsageL || 0;
    if (l > 10000) return '#06b6d4';
    if (l > 3000) return '#38bdf8';
    return '#2dd4bf';
  }
  if (status === 'critical') return '#ef4444';
  if (status === 'warning') return '#f59e0b';
  return '#10b981';
}

function getBuildingGlow(status, mode = 'status', building = {}) {
  const color = getBuildingColor(status, mode, building);
  if (color === '#ef4444') return 'rgba(239,68,68,0.35)';
  if (color === '#f59e0b') return 'rgba(245,158,11,0.35)';
  if (color.startsWith('#06') || color.startsWith('#38')) return 'rgba(6,182,212,0.35)';
  return 'rgba(16,185,129,0.35)';
}

export default function DigitalTwinMap({ buildings = [], alerts = [], onNavigateToAlerts, selectedBuildingId = null }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mapLayer, setMapLayer] = useState('status'); // 'status' | 'energy' | 'water'
  const [tickerIndex, setTickerIndex] = useState(0);

  // Rotating telemetry ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % TICKER_EVENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const mergedBuildings = CAMPUS_ZONES.map(zone => {
    const live = buildings.find(b => b.id === zone.id) || {};
    return { ...zone, ...live, status: live.status || 'optimal' };
  });

  useEffect(() => {
    if (selectedBuildingId) {
      const found = mergedBuildings.find(b => b.id === selectedBuildingId);
      if (found) setSelectedBuilding(found);
    }
  }, [selectedBuildingId, buildings]);

  const filtered = filterStatus === 'all'
    ? mergedBuildings
    : mergedBuildings.filter(b => b.status === filterStatus);

  const buildingAlerts = selectedBuilding
    ? alerts.filter(a => a.building_id === selectedBuilding.id || a.building_name === selectedBuilding.name)
    : [];

  return (
    <div className="dt-page animate-fade-in">
      {/* Page header */}
      <div className="dt-header">
        <div>
          <h2 className="dt-title">Interactive Campus Digital Twin</h2>
          <p className="dt-subtitle">Real-time facility telemetry, micro-grid energy pathways, and hydraulic nodes</p>
        </div>

        {/* Map Layer Mode Switcher */}
        <div className="dt-layer-tabs">
          <button
            className={`layer-btn ${mapLayer === 'status' ? 'active' : ''}`}
            onClick={() => setMapLayer('status')}
          >
            <Activity size={13} /> Facility Status
          </button>
          <button
            className={`layer-btn ${mapLayer === 'energy' ? 'active' : ''}`}
            onClick={() => setMapLayer('energy')}
          >
            <Zap size={13} /> Solar &amp; Power Grid
          </button>
          <button
            className={`layer-btn ${mapLayer === 'water' ? 'active' : ''}`}
            onClick={() => setMapLayer('water')}
          >
            <Droplets size={13} /> Water Mains
          </button>
        </div>

        <div className="dt-legend">
          <button className={`legend-btn ${filterStatus === 'all' ? 'active-all' : ''}`} onClick={() => setFilterStatus('all')}>All Zones</button>
          <span className="legend-dot" style={{ background: '#10b981' }} />
          <button className={`legend-btn ${filterStatus === 'optimal' ? 'active-green' : ''}`} onClick={() => setFilterStatus('optimal')}>Optimal</button>
          <span className="legend-dot" style={{ background: '#f59e0b' }} />
          <button className={`legend-btn ${filterStatus === 'warning' ? 'active-yellow' : ''}`} onClick={() => setFilterStatus('warning')}>Warning</button>
          <span className="legend-dot" style={{ background: '#ef4444' }} />
          <button className={`legend-btn ${filterStatus === 'critical' ? 'active-red' : ''}`} onClick={() => setFilterStatus('critical')}>Critical</button>
        </div>
      </div>

      <div className="dt-body">
        {/* SVG Map Card */}
        <div className="dt-map-card glass-panel">
          <div className="dt-map-card-header">
            <span className="dt-map-label">EcoPulse Campus — North Academic Hub</span>
            <div className="live-badge">
              <span className="live-ping" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>

          <svg
            viewBox="0 0 520 480"
            className="campus-svg"
            role="img"
            aria-label="Interactive 2D Campus Sustainability Map"
          >
            <defs>
              <radialGradient id="mapBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(16,185,129,0.05)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.02)" />
              </radialGradient>
              {mergedBuildings.map(b => (
                <filter key={`glow-${b.id}`} id={`glow-${b.id}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {/* Ground */}
            <rect x="50" y="50" width="420" height="390" rx="12" fill="url(#mapBg)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Green zones / trees decoration */}
            <circle cx="430" cy="130" r="20" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
            <circle cx="450" cy="150" r="12" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.15)" strokeWidth="1" />
            <circle cx="100" cy="380" r="18" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
            <circle cx="80" cy="360" r="12" fill="rgba(16,185,129,0.1)" />
            <circle cx="430" cy="390" r="15" fill="rgba(16,185,129,0.1)" />

            {/* Walkways */}
            {CAMPUS_PATHS.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
            ))}
            {CAMPUS_PATHS.map((d, i) => (
              <path key={`inner-${i}`} d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
            ))}

            {/* Solar Microgrid Overlay (when in energy mode) */}
            {mapLayer === 'energy' && SOLAR_GRID_LINES.map((d, i) => (
              <g key={`solar-line-${i}`}>
                <path d={d} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" className="energy-flow-pulse" opacity="0.85" />
              </g>
            ))}

            {/* Water Mains Overlay (when in water mode) */}
            {mapLayer === 'water' && WATER_PIPES.map((d, i) => (
              <g key={`water-line-${i}`}>
                <path d={d} fill="none" stroke="#06b6d4" strokeWidth="3" strokeDasharray="8 4" className="water-flow-pulse" opacity="0.85" />
              </g>
            ))}

            {/* Solar panel grid decoration at top */}
            {[0, 1, 2, 3].map(i => (
              <rect key={i} x={400 + i * 12} y={60} width={10} height={16} rx="2"
                fill="rgba(6,182,212,0.2)" stroke="rgba(6,182,212,0.5)" strokeWidth="0.8" />
            ))}
            <text x="398" y="85" fontSize="7" fill="rgba(6,182,212,0.8)" fontFamily="monospace" fontWeight="bold">SOLAR 280kW</text>

            {/* Buildings */}
            {mergedBuildings.map(b => {
              const visible = filtered.find(f => f.id === b.id);
              const color = getBuildingColor(b.status, mapLayer, b);
              const glow = getBuildingGlow(b.status, mapLayer, b);
              const isSelected = selectedBuilding?.id === b.id;
              const x = b.cx - b.width / 2;
              const y = b.cy - b.height / 2;

              return (
                <g key={b.id}
                  onClick={() => setSelectedBuilding(isSelected ? null : b)}
                  className="campus-building-group"
                  style={{ opacity: visible ? 1 : 0.2, cursor: 'pointer', outline: 'none' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${b.name} — ${b.status}`}
                  filter={`url(#glow-${b.id})`}
                >
                  {/* Base shadow */}
                  <rect x={x + 3} y={y + 3} width={b.width} height={b.height} rx="8" fill={glow} />

                  {/* Body */}
                  <rect x={x} y={y} width={b.width} height={b.height} rx="8"
                    fill={isSelected ? color : `rgba(${color === '#ef4444' ? '239,68,68' : color === '#f59e0b' ? '245,158,11' : color === '#06b6d4' ? '6,182,212' : '16,185,129'},0.18)`}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />

                  {/* Pulsing warning indicator */}
                  {b.status !== 'optimal' && (
                    <rect x={x - 4} y={y - 4} width={b.width + 8} height={b.height + 8} rx="11"
                      fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 4"
                      opacity="0.6" className="pulse-indicator"
                    />
                  )}

                  {/* Building name */}
                  <text x={b.cx} y={b.cy - 8} textAnchor="middle"
                    fontSize="10" fontWeight="700" fill={color} fontFamily="Plus Jakarta Sans, sans-serif">
                    {b.name}
                  </text>

                  {/* Secondary info based on active layer */}
                  <text x={b.cx} y={b.cy + 6} textAnchor="middle"
                    fontSize="8" fill="rgba(255,255,255,0.7)" fontFamily="monospace">
                    {mapLayer === 'energy'
                      ? `${b.energyUsageKWh ?? '—'} kWh`
                      : mapLayer === 'water'
                      ? `${b.waterUsageL ?? '—'} L`
                      : b.zone}
                  </text>

                  {/* Score badge */}
                  <rect x={b.cx - 16} y={b.cy + 13} width={32} height={14} rx="7"
                    fill="rgba(0,0,0,0.5)" />
                  <text x={b.cx} y={b.cy + 23} textAnchor="middle"
                    fontSize="8" fontWeight="700" fill={color} fontFamily="monospace">
                    {b.sustainabilityScore || '—'}
                  </text>

                  {/* Alert dot */}
                  {(b.activeIssuesCount > 0) && (
                    <>
                      <circle cx={x + b.width - 6} cy={y + 6} r="6" fill="#ef4444" />
                      <text x={x + b.width - 6} y={y + 9} textAnchor="middle"
                        fontSize="7" fontWeight="700" fill="white">{b.activeIssuesCount}</text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Compass rose */}
            <g transform="translate(478, 68)">
              <circle cx="0" cy="0" r="12" fill="rgba(15,23,42,0.7)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text x="0" y="-5" textAnchor="middle" fontSize="8" fill="rgba(16,185,129,0.8)" fontWeight="700">N</text>
              <line x1="0" y1="-9" x2="0" y2="-4" stroke="rgba(16,185,129,0.7)" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Live Activity Ticker Bar */}
          <div className="map-ticker-strip">
            <Radio size={13} className="text-emerald pulse-indicator" />
            <span className="ticker-label">STREAM:</span>
            <span className="ticker-text">{TICKER_EVENTS[tickerIndex]}</span>
          </div>

          {/* Map key */}
          <div className="map-key-row">
            <span className="map-key-item"><span className="map-key-dot" style={{ background: '#10b981' }} />Optimal Zone</span>
            <span className="map-key-item"><span className="map-key-dot" style={{ background: '#f59e0b' }} />Warning Zone</span>
            <span className="map-key-item"><span className="map-key-dot" style={{ background: '#ef4444' }} />Critical Zone</span>
            <span className="map-key-item"><span className="map-key-dot" style={{ background: '#06b6d4' }} />Solar Array (280kW)</span>
          </div>
        </div>

        {/* Inspect Panel */}
        <div className="dt-inspect-panel">
          {selectedBuilding ? (
            <div className="inspect-card glass-panel animate-fade-in">
              <div className="inspect-header">
                <div className="inspect-title-row">
                  <h3 className="inspect-name">{selectedBuilding.name}</h3>
                  <StatusBadge status={selectedBuilding.status} />
                </div>
                <button className="inspect-close" onClick={() => setSelectedBuilding(null)} aria-label="Close panel">
                  <X size={16} />
                </button>
              </div>

              <p className="inspect-zone">{selectedBuilding.map_position || selectedBuilding.zone}</p>
              <p className="inspect-desc">{selectedBuilding.description || 'Campus facility node.'}</p>

              <div className="inspect-stats-grid">
                <div className="inspect-stat">
                  <div className="istat-label"><Zap size={13} className="text-emerald" /> Energy</div>
                  <div className="istat-val">{selectedBuilding.energyUsageKWh ?? '—'} <span>kWh</span></div>
                </div>
                <div className="inspect-stat">
                  <div className="istat-label"><Droplets size={13} className="text-cyan" /> Water</div>
                  <div className="istat-val">{selectedBuilding.waterUsageL ?? '—'} <span>L</span></div>
                </div>
                <div className="inspect-stat">
                  <div className="istat-label"><Sun size={13} className="text-amber" /> Solar Gen</div>
                  <div className="istat-val">{selectedBuilding.solarGenerationKWh ?? '—'} <span>kWh</span></div>
                </div>
                <div className="inspect-stat">
                  <div className="istat-label"><Activity size={13} className="text-teal" /> Occupancy</div>
                  <div className="istat-val">{selectedBuilding.occupancyRate ?? '—'}<span>%</span></div>
                </div>
              </div>

              {/* Score ring */}
              <div className="inspect-score-row">
                <div className="inspect-score-ring" style={{ '--score-color': getBuildingColor(selectedBuilding.status) }}>
                  <span className="ring-val">{selectedBuilding.sustainabilityScore ?? '—'}</span>
                  <span className="ring-label">Score</span>
                </div>
                <div className="inspect-score-info">
                  <div className="score-tier">{selectedBuilding.sustainabilityScore >= 85 ? '🏆 Eco-Champion' : selectedBuilding.sustainabilityScore >= 70 ? '🌿 Eco-Leader' : '⚠️ Needs Attention'}</div>
                  <div className="score-updated">Updated: {selectedBuilding.lastUpdated || 'Recently'}</div>
                </div>
              </div>

              {/* Active Alerts for this building */}
              {buildingAlerts.length > 0 && (
                <div className="inspect-alerts">
                  <div className="inspect-alerts-title">
                    <AlertTriangle size={14} className="text-amber" />
                    Active Issues ({buildingAlerts.length})
                  </div>
                  {buildingAlerts.map(a => (
                    <div key={a.id} className={`inspect-alert-row sev-${a.severity}`}>
                      <StatusBadge status={a.severity} size="sm" />
                      <span className="ialert-text">{a.description}</span>
                    </div>
                  ))}
                  <button className="inspect-goto-alerts" onClick={onNavigateToAlerts}>
                    <AlertTriangle size={13} /> View in Smart Alerts
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="inspect-empty glass-panel">
              <MapPin size={32} className="text-muted" />
              <p>Click a building on the map to inspect its live telemetry, micro-grid balance, and active alerts.</p>
              <div className="dt-summary-pills">
                {mergedBuildings.map(b => (
                  <button key={b.id} className={`dt-summary-pill status-pill-${b.status}`}
                    onClick={() => setSelectedBuilding(b)}>
                    <span className="pill-dot" style={{ background: getBuildingColor(b.status) }} />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
