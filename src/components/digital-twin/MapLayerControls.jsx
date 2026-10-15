import React from 'react';
import { Layers, Zap, Droplets, Trash2, AlertTriangle, Map, Table, Filter } from 'lucide-react';

export default function MapLayerControls({
  activeLayer,
  onSelectLayer,
  viewMode,
  onChangeViewMode,
  statusFilter,
  onChangeStatusFilter
}) {
  const layers = [
    { id: 'all', label: 'All Telemetry', icon: Layers },
    { id: 'energy', label: 'Energy (kW)', icon: Zap },
    { id: 'water', label: 'Water (L/min)', icon: Droplets },
    { id: 'waste', label: 'Waste Bins (%)', icon: Trash2 },
    { id: 'alerts', label: 'Alerts & Health', icon: AlertTriangle }
  ];

  return (
    <div className="twin-controls-bar">
      {/* Telemetry Layer Toggles */}
      <div className="layer-toggle-group" role="group" aria-label="Map Layer Selection">
        {layers.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              className={`layer-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectLayer(layer.id)}
              aria-pressed={isActive}
            >
              <Icon size={14} />
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* View Mode & Filter Controls */}
      <div className="view-actions-group">
        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Filter size={14} className="text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => onChangeStatusFilter(e.target.value)}
            className="action-pill-btn"
            style={{ cursor: 'pointer', outline: 'none' }}
            aria-label="Filter buildings by health status"
          >
            <option value="all">All Buildings</option>
            <option value="healthy">Healthy Only</option>
            <option value="warning">Warning Status</option>
            <option value="critical">Critical Anomaly</option>
          </select>
        </div>

        {/* View Mode: Map vs Table */}
        <button
          className={`action-pill-btn ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => onChangeViewMode('map')}
          title="Interactive Schematic Campus Map"
          aria-label="Switch to Schematic Map view"
        >
          <Map size={14} />
          <span>Map</span>
        </button>

        <button
          className={`action-pill-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => onChangeViewMode('table')}
          title="Accessible Sensor Directory Table"
          aria-label="Switch to Sensor Directory Table view"
        >
          <Table size={14} />
          <span>Sensors Table</span>
        </button>
      </div>
    </div>
  );
}
