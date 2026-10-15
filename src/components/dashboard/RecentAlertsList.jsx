import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, MapPin, ArrowRight, Wrench } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function RecentAlertsList({ alerts = [], onUpdateStatus, onViewAllAlerts }) {
  return (
    <div className="recent-alerts-card glass-panel">
      <div className="alerts-card-header">
        <div className="alerts-title-group">
          <AlertTriangle size={18} className="text-amber" />
          <div>
            <h3 className="alerts-card-title">Active Campus Sustainability Alerts</h3>
            <p className="alerts-card-subtitle">Prioritized automated detection and telemetry flags</p>
          </div>
        </div>
        <button className="view-all-alerts-btn" onClick={onViewAllAlerts}>
          <span>View All ({alerts.length})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="alerts-list">
        {alerts.slice(0, 3).map((alert) => (
          <div key={alert.id} className={`alert-row severity-${alert.severity}`}>
            <div className="alert-badge-col">
              <StatusBadge status={alert.severity} size="sm" />
            </div>

            <div className="alert-content-col">
              <div className="alert-meta-top">
                <span className="alert-location">
                  <MapPin size={12} className="text-emerald" />
                  <strong>{alert.building_name || `Building #${alert.building_id}`}</strong>
                </span>
                <span className="alert-category-tag">{alert.category.replace('_', ' ')}</span>
                <span className="alert-time">
                  <Clock size={11} />
                  {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                </span>
              </div>

              <p className="alert-desc">{alert.description}</p>

              {alert.aiRecommendation && (
                <div className="alert-rec-box">
                  <Wrench size={12} className="text-teal" />
                  <span><strong>AI Triage:</strong> {alert.aiRecommendation}</span>
                </div>
              )}
            </div>

            <div className="alert-action-col">
              {alert.status === 'open' ? (
                <button
                  className="alert-action-btn ack-btn"
                  onClick={() => onUpdateStatus(alert.id, 'in_progress')}
                  title="Mark as in progress"
                >
                  Triage
                </button>
              ) : alert.status === 'in_progress' ? (
                <button
                  className="alert-action-btn resolve-btn"
                  onClick={() => onUpdateStatus(alert.id, 'resolved')}
                  title="Mark as resolved"
                >
                  <CheckCircle2 size={13} />
                  <span>Resolve</span>
                </button>
              ) : (
                <span className="resolved-tag">Resolved</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
