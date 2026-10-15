import React, { useState } from 'react';
import { Activity, Search, Filter, Send, CheckCircle, AlertCircle } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import campusApi from '../../services/api';

export default function SensorTableView({ sensors = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ingestSensorId, setIngestSensorId] = useState(null);
  const [ingestValue, setIngestValue] = useState('');
  const [ingestStatus, setIngestStatus] = useState(null);

  const filteredSensors = sensors.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.building_name && s.building_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.zone_name && s.zone_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || s.sensor_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleIngest = async (sensorId) => {
    if (!ingestValue || isNaN(Number(ingestValue))) return;
    try {
      setIngestStatus('submitting');
      await campusApi.ingestSensorReading(sensorId, {
        value: Number(ingestValue),
        source: 'manual_ui_test'
      });
      setIngestStatus('success');
      setTimeout(() => {
        setIngestSensorId(null);
        setIngestValue('');
        setIngestStatus(null);
        if (onRefresh) onRefresh();
      }, 1000);
    } catch {
      setIngestStatus('error');
    }
  };

  return (
    <div className="campus-map-card" style={{ gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Campus Sensor Directory &amp; Edge Ingestion
          </h3>
          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Complete registry of all {sensors.length} physical and simulated sensors across campus
          </p>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search ID, building..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="action-pill-btn"
              style={{ paddingLeft: '2rem', width: '180px', outline: 'none' }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="action-pill-btn"
            style={{ outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Sensor Types</option>
            <option value="energy">Power / Energy (kW)</option>
            <option value="water_flow">Water Flow (L/min)</option>
            <option value="occupancy">Occupancy (People)</option>
            <option value="temperature">Temperature (°C)</option>
          </select>
        </div>
      </div>

      {/* Sensors Table */}
      <div className="sensors-table-wrap">
        <table className="twin-data-table" aria-label="Campus Sensor Inventory">
          <thead>
            <tr>
              <th>Sensor ID</th>
              <th>Facility</th>
              <th>Zone / Floor</th>
              <th>Type</th>
              <th>Latest Telemetry</th>
              <th>Operating Limits</th>
              <th>Data Source</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSensors.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  No matching sensors found.
                </td>
              </tr>
            ) : (
              filteredSensors.map((s) => (
                <tr key={s.id}>
                  <td><span className="sensor-id-code">{s.id}</span></td>
                  <td><strong>{s.building_name || `Building ${s.building_id}`}</strong></td>
                  <td>{s.zone_name || 'Ground Core'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.sensor_type?.replace('_', ' ')}</td>
                  <td>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                      {s.latest_reading}
                    </span>{' '}
                    <small style={{ color: 'var(--text-muted)' }}>{s.unit}</small>
                  </td>
                  <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
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
                  <td>
                    {ingestSensorId === s.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          placeholder="Val"
                          value={ingestValue}
                          onChange={(e) => setIngestValue(e.target.value)}
                          style={{ width: '60px', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                        />
                        <button
                          className="sim-btn-primary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleIngest(s.id)}
                        >
                          Send
                        </button>
                        <button
                          className="modal-close-btn"
                          onClick={() => setIngestSensorId(null)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="sim-btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          setIngestSensorId(s.id);
                          setIngestValue(String(s.latest_reading));
                        }}
                        title="Simulate sending a new sensor reading to this sensor"
                      >
                        <Send size={11} />
                        <span>Inject</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
