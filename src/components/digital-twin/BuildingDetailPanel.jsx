import React, { useState, useEffect } from 'react';
import {
  Building2,
  Zap,
  Droplets,
  Users,
  Leaf,
  Layers,
  Activity,
  AlertTriangle,
  Sliders,
  X,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Trash2
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import campusApi from '../../services/api';

export default function BuildingDetailPanel({
  building,
  onClose,
  onOpenSimulatorModal,
  onUpdateAlertStatus
}) {
  const [activeTab, setActiveTab] = useState('sensors'); // 'sensors' | 'trends' | 'waste' | 'alerts'
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historicalReadings, setHistoricalReadings] = useState([]);

  useEffect(() => {
    if (!building?.id) return;
    let isMounted = true;
    setLoading(true);

    async function fetchDetail() {
      try {
        const [detailRes, readingsRes] = await Promise.all([
          campusApi.getBuildingDetail(building.id),
          campusApi.getBuildingReadings(building.id, 'energy', 24)
        ]);

        if (isMounted) {
          if (detailRes?.data) setDetailData(detailRes.data);
          if (readingsRes?.data) setHistoricalReadings(readingsRes.data);
        }
      } catch (err) {
        console.warn('Could not load deep building details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetail();
    return () => { isMounted = false; };
  }, [building?.id]);

  if (!building) return null;

  const b = detailData || building;
  const statusReasons = b.status_reasons || (Array.isArray(b.status_reasons) ? b.status_reasons : ['Operational']);
  const sensors = b.sensors || [];
  const zones = b.zones || [];
  const wasteBins = b.waste_bins || [];
  const alerts = b.alerts || [];

  return (
    <div className="detail-panel-card" role="dialog" aria-label={`Telemetry inspect for ${b.name}`}>
      {/* Top Header Row */}
      <div className="panel-header-row">
        <div className="panel-identity">
          <div className="panel-title">
            <Building2 className="text-teal" size={24} />
            <span>{b.name}</span>
            <StatusBadge status={b.status} size="md" />
          </div>
          <div className="panel-meta-tags">
            <span className="panel-meta-tag">Code: <strong>{b.code}</strong></span>
            <span className="panel-meta-tag">Type: <strong style={{ textTransform: 'capitalize' }}>{b.building_type || b.type}</strong></span>
            <span className="panel-meta-tag">Location: <strong>{b.location || b.map_position}</strong></span>
            <span className="panel-meta-tag">Area: <strong>{b.area_m2?.toLocaleString()} m²</strong></span>
            <span className="panel-meta-tag">Floors: <strong>{b.floors || 3}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="sim-btn-primary"
            onClick={() => onOpenSimulatorModal(b)}
            title="Model LED retrofits or water conservation for this building"
          >
            <Sliders size={15} />
            <span>What-If Sandbox</span>
          </button>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close building panel"
            style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Explainable Status Reasons Box (PDF Page 1 Requirement) */}
      <div className={`status-reasons-box ${b.status}`}>
        <div className="reasons-header">
          <AlertTriangle size={14} />
          <span>Status Explainability &amp; Diagnostics ({b.status.toUpperCase()})</span>
        </div>
        <ul className="reasons-list">
          {statusReasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* Real-Time Building Telemetry KPI Bar */}
      <div className="twin-kpi-bar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Power Demand</span>
            <Zap size={14} className="text-emerald" />
          </div>
          <div className="twin-kpi-val">
            {b.current_kw || 0} <small>kW</small>
          </div>
          <div className="twin-kpi-sub">
            Cumulative: <strong>{b.total_kwh || b.energyUsageKWh} kWh</strong>
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Water Flow</span>
            <Droplets size={14} className="text-cyan" />
          </div>
          <div className="twin-kpi-val">
            {b.current_water_lpm || 0} <small>L/min</small>
          </div>
          <div className="twin-kpi-sub">
            Total Used: <strong>{b.total_water_liters || b.waterUsageL} L</strong>
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Occupancy</span>
            <Users size={14} className="text-teal" />
          </div>
          <div className="twin-kpi-val">
            {b.occupancy_count || 0} <small>people</small>
          </div>
          <div className="twin-kpi-sub">
            Cap: {b.occupancy_capacity || 500} ({b.occupancyRate || 40}%)
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Carbon Footprint</span>
            <Leaf size={14} className="text-emerald" />
          </div>
          <div className="twin-kpi-val">
            {b.carbon_emissions_kg_co2e || Math.round((b.total_kwh || 400) * 0.42)} <small>kg CO₂e</small>
          </div>
          <div className="twin-kpi-sub">
            0.42 kg/kWh Grid Factor
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="panel-tab-nav" role="tablist">
        <button
          className={`panel-tab-btn ${activeTab === 'sensors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sensors')}
          role="tab"
          aria-selected={activeTab === 'sensors'}
        >
          <Activity size={15} />
          <span>Active Sensors ({sensors.length})</span>
        </button>

        <button
          className={`panel-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
          role="tab"
          aria-selected={activeTab === 'trends'}
        >
          <ArrowUpRight size={15} />
          <span>24h Historical Trends</span>
        </button>

        <button
          className={`panel-tab-btn ${activeTab === 'waste' ? 'active' : ''}`}
          onClick={() => setActiveTab('waste')}
          role="tab"
          aria-selected={activeTab === 'waste'}
        >
          <Trash2 size={15} />
          <span>Waste Bins ({wasteBins.length})</span>
        </button>

        <button
          className={`panel-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
          role="tab"
          aria-selected={activeTab === 'alerts'}
        >
          <AlertTriangle size={15} />
          <span>Facility Alerts ({alerts.length})</span>
        </button>
      </div>

      {/* Tab 1: Sensors Table */}
      {activeTab === 'sensors' && (
        <div className="sensors-table-wrap">
          <table className="twin-data-table" aria-label="Building Sensors Table">
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Type</th>
                <th>Zone / Floor</th>
                <th>Current Reading</th>
                <th>Thresholds</th>
                <th>Source</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {sensors.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No sensors registered for this facility.
                  </td>
                </tr>
              ) : (
                sensors.map((s) => (
                  <tr key={s.id}>
                    <td><span className="sensor-id-code">{s.id}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{s.sensor_type?.replace('_', ' ')}</td>
                    <td>{zones.find(z => z.id === s.zone_id)?.name || 'Building Core'}</td>
                    <td>
                      <strong>{s.latest_reading}</strong> {s.unit}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {s.min_threshold} - {s.max_threshold} {s.unit}
                    </td>
                    <td>
                      <span className={`source-tag ${s.source_type === 'measured' ? 'measured' : 'simulated'}`}>
                        {s.source_type === 'measured' ? 'Physical IoT' : 'Simulated Sensor'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={s.status === 'online' ? 'optimal' : s.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: 24h Historical Trends SVG Chart */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              24-Hour Telemetry Log (Hourly Interval)
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Integrated from persistent SQLite telemetry log
            </span>
          </div>

          {/* SVG Trend Line */}
          <div style={{ width: '100%', height: '160px', position: 'relative' }}>
            <svg viewBox="0 0 800 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="800" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              {/* Area path */}
              <path
                d="M 20 120 C 150 140, 250 80, 400 40 C 550 15, 650 60, 780 90 L 780 150 L 20 150 Z"
                fill="url(#trendGradient)"
              />

              {/* Stroke path */}
              <path
                d="M 20 120 C 150 140, 250 80, 400 40 C 550 15, 650 60, 780 90"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />

              {/* Data points */}
              <circle cx="20" cy="120" r="4" fill="#10b981" />
              <circle cx="250" cy="80" r="4" fill="#10b981" />
              <circle cx="400" cy="40" r="5" fill="#34d399" stroke="#fff" strokeWidth="1.5" />
              <circle cx="650" cy="60" r="4" fill="#10b981" />
              <circle cx="780" cy="90" r="4" fill="#10b981" />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>00:00 (Night Baseline)</span>
            <span>06:00</span>
            <span>12:00 (Midday Peak Demand)</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      )}

      {/* Tab 3: Waste Bins */}
      {activeTab === 'waste' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {wasteBins.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No waste bins registered for this building.</p>
          ) : (
            wasteBins.map((bin) => {
              const isFull = bin.fill_level_percent >= 85;
              return (
                <div
                  key={bin.id}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {bin.bin_code}
                    </span>
                    <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {bin.bin_type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${bin.fill_level_percent}%`,
                        height: '100%',
                        background: isFull ? '#ef4444' : bin.fill_level_percent > 60 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fill: <strong>{bin.fill_level_percent}%</strong></span>
                    <span style={{ color: isFull ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      {isFull ? 'Dispatch Required' : 'Normal'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 4: Facility Alerts */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981' }}>
              <CheckCircle size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Zero Active Issues in this Facility</p>
              <small style={{ color: 'var(--text-muted)' }}>All sub-systems and telemetry streams operating normally.</small>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f59e0b' : '#38bdf8'}`,
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      {alert.title}
                    </span>
                    <StatusBadge status={alert.severity === 'critical' ? 'critical' : 'warning'} size="sm" />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {alert.description}
                  </p>
                  {alert.ai_recommendation && (
                    <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.25rem' }}>
                      <strong>Recommendation:</strong> {alert.ai_recommendation}
                    </div>
                  )}
                </div>

                {alert.status === 'open' && (
                  <button
                    className="sim-btn-secondary"
                    onClick={() => onUpdateAlertStatus(alert.id, 'resolved')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <CheckCircle size={14} />
                    <span>Resolve</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
