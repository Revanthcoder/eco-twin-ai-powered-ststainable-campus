import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, TrendingUp, TrendingDown, Minus, ZoomIn } from 'lucide-react';

/* ─── Synthetic Occupancy Data ─── */
const HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
               '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

const BUILDINGS = [
  { id: 1, name: 'Academic Block', icon: '🎓', capacity: 850 },
  { id: 2, name: 'Library',        icon: '📚', capacity: 400 },
  { id: 3, name: 'Cafeteria',      icon: '🍽️', capacity: 600 },
  { id: 4, name: 'Laboratory',     icon: '🔬', capacity: 250 },
  { id: 5, name: 'Water Tank',     icon: '🚰', capacity: 0   },
];

/** Returns occupancy 0–1 per building per hour (synthetic sinusoidal pattern) */
function syntheticOccupancy(buildingId, hourIdx) {
  const curves = {
    1: [0.05,0.12,0.65,0.88,0.92,0.90,0.75,0.80,0.87,0.85,0.72,0.50,0.28,0.14,0.06],
    2: [0.02,0.05,0.30,0.55,0.72,0.80,0.78,0.70,0.75,0.80,0.68,0.55,0.40,0.22,0.10],
    3: [0.02,0.05,0.10,0.25,0.45,0.70,0.95,0.90,0.55,0.40,0.30,0.65,0.75,0.35,0.12],
    4: [0.01,0.02,0.20,0.50,0.65,0.70,0.60,0.65,0.72,0.68,0.50,0.30,0.15,0.08,0.02],
    5: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  };
  const base = (curves[buildingId] || [])[hourIdx] ?? 0;
  return Math.min(1, Math.max(0, base + (Math.random() * 0.04 - 0.02)));
}

/** Heat color: low = teal, mid = amber, high = red */
function heatColor(ratio) {
  if (ratio === 0) return 'rgba(255,255,255,0.04)';
  if (ratio < 0.35) return `rgba(16,185,129,${0.15 + ratio * 0.5})`;
  if (ratio < 0.65) return `rgba(245,158,11,${0.25 + ratio * 0.4})`;
  if (ratio < 0.85) return `rgba(239,100,68,${0.35 + ratio * 0.3})`;
  return `rgba(239,68,68,${0.5 + ratio * 0.4})`;
}

function heatBorderColor(ratio) {
  if (ratio === 0) return 'rgba(255,255,255,0.07)';
  if (ratio < 0.35) return 'rgba(16,185,129,0.35)';
  if (ratio < 0.65) return 'rgba(245,158,11,0.45)';
  if (ratio < 0.85) return 'rgba(239,100,68,0.55)';
  return 'rgba(239,68,68,0.6)';
}

function heatLabel(ratio) {
  if (ratio === 0) return '—';
  if (ratio < 0.35) return 'Low';
  if (ratio < 0.65) return 'Moderate';
  if (ratio < 0.85) return 'High';
  return 'Peak';
}

/** Generate the full matrix once on mount */
function generateMatrix() {
  return BUILDINGS.map(b => ({
    ...b,
    occupancy: HOURS.map((_, hi) => syntheticOccupancy(b.id, hi)),
  }));
}

export default function OccupancyHeatmap() {
  const [matrix, setMatrix] = useState(() => generateMatrix());
  const [selectedCell, setSelectedCell] = useState(null); // { bIdx, hIdx }
  const [currentHourIdx, setCurrentHourIdx] = useState(null);
  const [animating, setAnimating] = useState(false);
  const animRef = useRef(null);

  /* Find closest real hour on mount */
  useEffect(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let best = 0, bestDiff = Infinity;
    HOURS.forEach((h, i) => {
      const [hr, mn] = h.split(':').map(Number);
      const diff = Math.abs(nowMins - (hr * 60 + mn));
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    setCurrentHourIdx(best);
  }, []);

  /* Live refresh every 30s with slight jitter */
  useEffect(() => {
    const id = setInterval(() => {
      setMatrix(generateMatrix());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  /* Play animation */
  const handlePlayAnimation = () => {
    if (animating) return;
    setAnimating(true);
    let i = 0;
    animRef.current = setInterval(() => {
      setCurrentHourIdx(i);
      i++;
      if (i >= HOURS.length) {
        clearInterval(animRef.current);
        setAnimating(false);
      }
    }, 280);
  };

  useEffect(() => () => clearInterval(animRef.current), []);

  /* Summary stats for current hour */
  const currentData = currentHourIdx !== null
    ? matrix.map(b => ({
        name: b.name,
        icon: b.icon,
        capacity: b.capacity,
        ratio: b.occupancy[currentHourIdx],
        count: Math.round(b.occupancy[currentHourIdx] * b.capacity),
      }))
    : [];

  const totalOccupied = currentData.reduce((s, b) => s + b.count, 0);
  const totalCapacity = BUILDINGS.reduce((s, b) => s + b.capacity, 0);
  const overallRatio = totalCapacity > 0 ? totalOccupied / totalCapacity : 0;

  const selectedInfo = selectedCell
    ? {
        building: matrix[selectedCell.bIdx],
        hour: HOURS[selectedCell.hIdx],
        ratio: matrix[selectedCell.bIdx].occupancy[selectedCell.hIdx],
      }
    : null;

  return (
    <div className="occ-page animate-fade-in">
      {/* Header */}
      <div className="occ-header">
        <div>
          <h2 className="page-title">Campus Occupancy Heatmap</h2>
          <p className="page-subtitle">
            Hourly occupancy density across all 5 campus zones — synthetic demo telemetry, refreshed every 30s
          </p>
        </div>
        <button
          className={`occ-play-btn ${animating ? 'occ-play-btn--running' : ''}`}
          onClick={handlePlayAnimation}
          disabled={animating}
          title="Replay 24h animation"
        >
          {animating ? '▶ Playing…' : '▶ Animate Day'}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="occ-kpi-strip glass-panel">
        <div className="occ-kpi">
          <span className="occ-kpi-label"><Users size={13} /> Total Present</span>
          <span className="occ-kpi-val">{totalOccupied.toLocaleString()}</span>
        </div>
        <div className="occ-kpi">
          <span className="occ-kpi-label"><ZoomIn size={13} /> Campus Load</span>
          <span className="occ-kpi-val">{Math.round(overallRatio * 100)}%</span>
        </div>
        <div className="occ-kpi">
          <span className="occ-kpi-label"><Clock size={13} /> Current Hour</span>
          <span className="occ-kpi-val">{currentHourIdx !== null ? HOURS[currentHourIdx] : '—'}</span>
        </div>
        <div className="occ-kpi">
          <span className="occ-kpi-label">Peak Zone</span>
          <span className="occ-kpi-val">
            {currentData.length > 0
              ? currentData.filter(b => b.capacity > 0).reduce((a, b) => b.ratio > a.ratio ? b : a, { ratio: 0, icon: '—', name: '—' }).icon + ' ' +
                currentData.filter(b => b.capacity > 0).reduce((a, b) => b.ratio > a.ratio ? b : a, { ratio: 0, name: '—' }).name
              : '—'}
          </span>
        </div>
        {/* Heat legend */}
        <div className="occ-legend">
          <span className="occ-legend-label">Low</span>
          <div className="occ-legend-bar" />
          <span className="occ-legend-label">Peak</span>
        </div>
      </div>

      <div className="occ-body">
        {/* Heatmap Grid */}
        <div className="occ-heatmap-card glass-panel">
          <div className="occ-heatmap-title">
            Hourly Heat Matrix
            <span className="occ-heatmap-hint">Click any cell to inspect</span>
          </div>

          {/* Hour axis */}
          <div className="occ-grid-container">
            <div className="occ-building-labels">
              <div className="occ-corner-cell" />
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className={`occ-hour-label ${i === currentHourIdx ? 'current-hour' : ''}`}
                >
                  {h.replace(':00', '')}
                </div>
              ))}
            </div>

            {matrix.map((building, bIdx) => (
              <div key={building.id} className="occ-row">
                <div className="occ-row-label">
                  <span className="occ-row-icon">{building.icon}</span>
                  <span className="occ-row-name">{building.name.split(' ')[0]}</span>
                </div>
                {building.occupancy.map((ratio, hIdx) => (
                  <div
                    key={hIdx}
                    className={`occ-cell ${selectedCell?.bIdx === bIdx && selectedCell?.hIdx === hIdx ? 'occ-cell--selected' : ''} ${hIdx === currentHourIdx ? 'occ-cell--current-col' : ''}`}
                    style={{
                      background: heatColor(ratio),
                      border: `1px solid ${heatBorderColor(ratio)}`,
                    }}
                    onClick={() => setSelectedCell(
                      selectedCell?.bIdx === bIdx && selectedCell?.hIdx === hIdx ? null : { bIdx, hIdx }
                    )}
                    title={`${building.name} @ ${HOURS[hIdx]}: ${Math.round(ratio * 100)}% (${Math.round(ratio * building.capacity)} pax)`}
                  >
                    {ratio > 0.6 && (
                      <span className="occ-cell-pct">{Math.round(ratio * 100)}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* X-axis label */}
          <div className="occ-x-label">← Morning &nbsp;&nbsp; Midday &nbsp;&nbsp; Evening →</div>
        </div>

        {/* Right panel: Building cards + Inspect detail */}
        <div className="occ-right-col">
          {/* Building cards */}
          <div className="occ-building-cards glass-panel">
            <div className="occ-panel-title">
              <Users size={15} className="text-emerald" />
              Live Building Snapshot
              {currentHourIdx !== null && (
                <span className="occ-time-badge">{HOURS[currentHourIdx]}</span>
              )}
            </div>
            {currentData.filter(b => b.capacity > 0).map((b, i) => {
              const pct = Math.round(b.ratio * 100);
              const color = b.ratio < 0.35 ? '#10b981' : b.ratio < 0.65 ? '#f59e0b' : '#ef4444';
              return (
                <div key={i} className="occ-bcard">
                  <div className="occ-bcard-top">
                    <span className="occ-bcard-icon">{b.icon}</span>
                    <div className="occ-bcard-info">
                      <div className="occ-bcard-name">{b.name}</div>
                      <div className="occ-bcard-count">{b.count} / {b.capacity} pax</div>
                    </div>
                    <span className="occ-bcard-pct" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="occ-bcard-bar-track">
                    <div
                      className="occ-bcard-bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <div className="occ-bcard-status" style={{ color }}>
                    {b.ratio > 0.85 ? <><TrendingUp size={11} /> Peak load</> :
                     b.ratio > 0.55 ? <><TrendingUp size={11} /> Busy</> :
                     b.ratio > 0.25 ? <><Minus size={11} /> Moderate</> :
                     <><TrendingDown size={11} /> Low traffic</>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cell detail panel */}
          {selectedInfo ? (
            <div className="occ-detail-card glass-panel animate-fade-in">
              <div className="occ-detail-header">
                <span className="occ-detail-icon">{selectedInfo.building.icon}</span>
                <div>
                  <div className="occ-detail-name">{selectedInfo.building.name}</div>
                  <div className="occ-detail-hour">{selectedInfo.hour}</div>
                </div>
              </div>
              <div className="occ-detail-stat">
                <span>Occupancy</span>
                <strong style={{
                  color: selectedInfo.ratio < 0.35 ? '#10b981' : selectedInfo.ratio < 0.65 ? '#f59e0b' : '#ef4444'
                }}>
                  {Math.round(selectedInfo.ratio * 100)}%
                </strong>
              </div>
              <div className="occ-detail-stat">
                <span>Headcount (est.)</span>
                <strong>{Math.round(selectedInfo.ratio * selectedInfo.building.capacity)} pax</strong>
              </div>
              <div className="occ-detail-stat">
                <span>Capacity</span>
                <strong>{selectedInfo.building.capacity} pax</strong>
              </div>
              <div className="occ-detail-heat" style={{
                background: heatColor(selectedInfo.ratio),
                border: `1px solid ${heatBorderColor(selectedInfo.ratio)}`,
              }}>
                {heatLabel(selectedInfo.ratio)} Density
              </div>
              <p className="occ-detail-note">
                AI Insight: {selectedInfo.ratio > 0.8
                  ? 'High occupancy — HVAC and lighting should be at full capacity for this zone.'
                  : selectedInfo.ratio > 0.5
                  ? 'Moderate occupancy — consider energy setback for adjacent unoccupied zones.'
                  : selectedInfo.ratio > 0.2
                  ? 'Low occupancy — lighting auto-dimming recommended to save energy.'
                  : 'Zone largely unoccupied — apply energy hibernation mode.'}
              </p>
            </div>
          ) : (
            <div className="occ-detail-empty glass-panel">
              <ZoomIn size={28} className="text-muted" />
              <p>Click any heatmap cell to see occupancy detail and AI energy recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
