import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, MapPin, Filter, Search, Wrench, X } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import campusApi from '../../services/api';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function SmartAlerts({ alerts: initialAlerts = [] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);

  // Keep local state in sync with parent prop
  React.useEffect(() => { setAlerts(initialAlerts); }, [initialAlerts]);

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdating(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try { await campusApi.updateIssueStatus(id, newStatus); } catch { /* optimistic */ }
    setUpdating(null);
  };

  const filtered = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.description?.toLowerCase().includes(q) ||
        a.building_name?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const counts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="alerts-page animate-fade-in">
      <div className="alerts-page-header">
        <div>
          <h2 className="page-title">Smart Alerts &amp; Maintenance Triage</h2>
          <p className="page-subtitle">Prioritized campus sustainability issues — triage, resolve, or escalate</p>
        </div>
        <div className="alert-counts-row">
          {counts.critical > 0 && <span className="count-badge critical">{counts.critical} Critical</span>}
          {counts.high > 0 && <span className="count-badge high">{counts.high} High</span>}
          {counts.medium > 0 && <span className="count-badge medium">{counts.medium} Medium</span>}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="alerts-controls glass-panel">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="alerts-search"
            placeholder="Search by building, category, description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search alerts"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={13} /></button>
          )}
        </div>

        <div className="filter-group">
          <Filter size={14} className="text-muted" />
          <span className="filter-label">Severity:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map(s => (
            <button key={s}
              className={`filter-chip ${filterSeverity === s ? `chip-active-${s}` : ''}`}
              onClick={() => setFilterSeverity(s)}>
              {s === 'all' ? `All (${counts.all})` : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">Status:</span>
          {['all', 'open', 'in_progress', 'resolved'].map(s => (
            <button key={s}
              className={`filter-chip ${filterStatus === s ? 'chip-active-info' : ''}`}
              onClick={() => setFilterStatus(s)}>
              {s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-list-full">
        {filtered.length === 0 && (
          <div className="alerts-empty glass-panel">
            <CheckCircle2 size={36} className="text-emerald" />
            <p>No alerts match the current filters. {filterSeverity !== 'all' || filterStatus !== 'all' ? 'Try clearing the filters.' : 'Campus is clear!'}</p>
          </div>
        )}

        {filtered.map(alert => {
          const isExpanded = expandedId === alert.id;
          return (
            <div key={alert.id} className={`alert-card glass-panel severity-border-${alert.severity} ${isExpanded ? 'expanded' : ''}`}>
              <div className="alert-card-top" onClick={() => setExpandedId(isExpanded ? null : alert.id)}>
                {/* Left: Severity + Icon */}
                <div className="alert-sev-col">
                  <StatusBadge status={alert.severity} />
                </div>

                {/* Center: Main info */}
                <div className="alert-main-col">
                  <div className="alert-location-row">
                    <MapPin size={13} className="text-emerald" />
                    <strong>{alert.building_name || `Building #${alert.building_id}`}</strong>
                    <span className="alert-cat-chip">{alert.category?.replace('_', ' ')}</span>
                    <span className="alert-source-chip">{alert.source?.replace('_', ' ')}</span>
                  </div>
                  <p className="alert-card-desc">{alert.description}</p>
                </div>

                {/* Right: Status + Timestamp */}
                <div className="alert-status-col">
                  <StatusBadge status={alert.status} label={alert.status.replace('_', ' ')} size="sm" />
                  <span className="alert-ts">
                    <Clock size={11} />
                    {alert.created_at ? new Date(alert.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>

                {/* Expand chevron */}
                <span className={`expand-chevron ${isExpanded ? 'rotated' : ''}`}>▾</span>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="alert-card-details animate-fade-in">
                  {alert.estimatedWasteCostPerHour && (
                    <div className="detail-row">
                      <span className="detail-key">Estimated Impact:</span>
                      <span className="detail-val text-amber">{alert.estimatedWasteCostPerHour}</span>
                    </div>
                  )}
                  {alert.aiRecommendation && (
                    <div className="ai-rec-box">
                      <Wrench size={13} className="text-teal" />
                      <div>
                        <span className="ai-rec-label">AI Triage Recommendation</span>
                        <p className="ai-rec-text">{alert.aiRecommendation}</p>
                      </div>
                    </div>
                  )}
                  <div className="alert-actions-row">
                    {alert.status === 'open' && (
                      <button className="action-btn triage-btn"
                        disabled={updating === alert.id}
                        onClick={() => handleUpdateStatus(alert.id, 'in_progress')}>
                        {updating === alert.id ? '…' : '⚙️ Mark In Progress'}
                      </button>
                    )}
                    {alert.status === 'in_progress' && (
                      <button className="action-btn resolve-btn-full"
                        disabled={updating === alert.id}
                        onClick={() => handleUpdateStatus(alert.id, 'resolved')}>
                        {updating === alert.id ? '…' : <><CheckCircle2 size={14} /> Mark Resolved</>}
                      </button>
                    )}
                    {alert.status === 'resolved' && (
                      <button className="action-btn reopen-btn"
                        onClick={() => handleUpdateStatus(alert.id, 'open')}>
                        ↩ Reopen Issue
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
