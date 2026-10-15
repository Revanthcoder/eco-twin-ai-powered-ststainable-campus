import React from 'react';
import { Building2, ArrowRight, Zap, Droplets, AlertCircle } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function CampusStatusSummary({ buildings = [], onSelectBuilding, onOpenMap }) {
  return (
    <div className="campus-summary-card glass-panel">
      <div className="summary-header">
        <div className="summary-title-group">
          <Building2 size={18} className="text-teal" />
          <div>
            <h3 className="summary-card-title">Campus Zone Sustainability Status</h3>
            <p className="summary-card-subtitle">Real-time status across 5 monitored facility nodes</p>
          </div>
        </div>
        <button className="view-map-btn" onClick={onOpenMap}>
          <span>Open Digital Twin</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="buildings-row-grid">
        {buildings.map((b) => (
          <div
            key={b.id}
            className={`building-mini-card status-${b.status}`}
            onClick={() => onSelectBuilding(b)}
            tabIndex={0}
            role="button"
            aria-label={`View telemetry for ${b.name}`}
          >
            <div className="b-header">
              <span className="b-name">{b.name}</span>
              <StatusBadge status={b.status} size="sm" />
            </div>

            <div className="b-zone">{b.map_position}</div>

            <div className="b-stats-grid">
              <div className="b-stat">
                <span className="b-stat-label">
                  <Zap size={11} className="text-emerald" /> Energy
                </span>
                <span className="b-stat-val">{b.energyUsageKWh} <small>kWh</small></span>
              </div>
              <div className="b-stat">
                <span className="b-stat-label">
                  <Droplets size={11} className="text-cyan" /> Water
                </span>
                <span className="b-stat-val">{b.waterUsageL} <small>L</small></span>
              </div>
            </div>

            <div className="b-footer">
              <div className="b-score-pill">
                Score: <strong>{b.sustainabilityScore}</strong>
              </div>
              {b.activeIssuesCount > 0 && (
                <div className="b-alert-indicator">
                  <AlertCircle size={12} />
                  <span>{b.activeIssuesCount} issue</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
