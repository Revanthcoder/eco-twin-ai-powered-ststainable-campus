import React from 'react';
import {
  Building2,
  Zap,
  Droplets,
  Users,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Activity
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function CampusMap2D({
  buildings = [],
  selectedBuilding,
  onSelectBuilding,
  activeLayer = 'all',
  statusFilter = 'all'
}) {
  // Filter buildings by status if selected
  const filteredBuildings = buildings.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  // Position classes map for the 5 campus buildings
  const getGridClass = (buildingId) => {
    switch (Number(buildingId)) {
      case 1: return 'node-pos-acad';
      case 2: return 'node-pos-libr';
      case 3: return 'node-pos-cafe';
      case 4: return 'node-pos-labs';
      case 5: return 'node-pos-util';
      default: return '';
    }
  };

  return (
    <div className="campus-map-card">
      {/* Map Header & Legend */}
      <div className="map-card-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Interactive Campus Spatial Digital Twin
          </h3>
          <p style={{ fontSize: '0.82rem', margin: '0.2rem 0 0 0', color: 'var(--text-secondary)' }}>
            Schematic microgrid with 5 connected facility nodes. Click any building to open telemetry &amp; sensor diagnostics.
          </p>
        </div>

        {/* Status Legend */}
        <div className="map-legend" role="note" aria-label="Building health status legend">
          <div className="legend-item">
            <span className="legend-dot healthy" />
            <span>Healthy (Optimal)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot warning" />
            <span>Warning (Elevated)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot critical" />
            <span>Critical Anomaly</span>
          </div>
        </div>
      </div>

      {/* Schematic Map Canvas */}
      <div className="schematic-map-viewport" role="region" aria-label="Campus Interactive Map">
        {/* SVG Utility Pipelines & Microgrid Power Distribution Lines */}
        <svg className="schematic-grid-lines" viewBox="0 0 1000 480" preserveAspectRatio="none">
          {/* Water Distribution Loop from Water Tank (Node 5, right) to Cafeteria, Labs, Acad */}
          <path
            d="M 850 360 L 650 360 L 650 200 L 250 200 L 250 360"
            fill="none"
            className="grid-pipe-line"
          />
          {/* Campus Electrical Smart Grid Backbone from Central Substation/Labs to Library & Acad */}
          <path
            d="M 600 360 L 600 120 L 750 120 M 600 120 L 300 120"
            fill="none"
            className="grid-power-line"
          />
        </svg>

        {/* Building Nodes */}
        {filteredBuildings.map((b) => {
          const isSelected = selectedBuilding && selectedBuilding.id === b.id;
          const gridClass = getGridClass(b.id);
          const statusClass = `status-${b.status || 'healthy'}`;

          return (
            <div
              key={b.id}
              className={`building-node-card ${gridClass} ${statusClass} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectBuilding(b)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBuilding(b);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${b.name}, status ${b.status}`}
            >
              {/* Node Top Row: Name, Code & Status Badge */}
              <div className="node-top-row">
                <div className="node-title-group">
                  <span className="node-name">{b.name}</span>
                  <span className="node-zone-code">{b.code} · {b.location || b.map_position}</span>
                </div>
                <StatusBadge status={b.status} size="sm" />
              </div>

              {/* Dynamic Telemetry Grid customized by activeLayer */}
              <div className="node-metrics-grid">
                {(activeLayer === 'all' || activeLayer === 'energy') && (
                  <div className="node-metric-cell">
                    <span className="node-metric-lbl">
                      <Zap size={11} className="text-emerald" /> Power
                    </span>
                    <span className="node-metric-val">
                      {b.current_kw || Math.round(b.energyUsageKWh / 6)} <small>kW</small>
                    </span>
                  </div>
                )}

                {(activeLayer === 'all' || activeLayer === 'water') && (
                  <div className="node-metric-cell">
                    <span className="node-metric-lbl">
                      <Droplets size={11} className="text-cyan" /> Flow
                    </span>
                    <span className="node-metric-val">
                      {b.current_water_lpm || 12} <small>L/min</small>
                    </span>
                  </div>
                )}

                {(activeLayer === 'all' || activeLayer === 'waste') && (
                  <div className="node-metric-cell">
                    <span className="node-metric-lbl">
                      <Trash2 size={11} className="text-purple" /> Waste
                    </span>
                    <span className="node-metric-val">
                      {b.id === 1 ? '91%' : b.id === 3 ? '78%' : '42%'} <small>fill</small>
                    </span>
                  </div>
                )}

                {activeLayer === 'alerts' && (
                  <div className="node-metric-cell" style={{ gridColumn: 'span 2' }}>
                    <span className="node-metric-lbl">
                      <AlertTriangle size={11} className="text-amber" /> Issue Summary
                    </span>
                    <span className="node-metric-val" style={{ fontSize: '0.78rem' }}>
                      {b.status_reasons?.[0] || 'Operational baseline'}
                    </span>
                  </div>
                )}

                {(activeLayer === 'all' || activeLayer === 'energy') && (
                  <div className="node-metric-cell">
                    <span className="node-metric-lbl">
                      <Users size={11} className="text-teal" /> People
                    </span>
                    <span className="node-metric-val">
                      {b.occupancy_count || Math.round(b.occupancyRate * 5 || 50)}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Row: Sustainability Score & Alerts */}
              <div className="node-bottom-row">
                <div className="node-score-tag">
                  Score: <strong>{b.sustainabilityScore || 85}</strong>
                </div>

                {b.status !== 'healthy' && (
                  <div className="node-alert-pill">
                    <AlertTriangle size={12} />
                    <span>Issue Detected</span>
                  </div>
                )}

                {b.status === 'healthy' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#10b981' }}>
                    <CheckCircle2 size={12} />
                    <span>Optimal</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
