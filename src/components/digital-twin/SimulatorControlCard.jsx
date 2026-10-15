import React, { useState } from 'react';
import {
  Play,
  Square,
  FastForward,
  RotateCcw,
  AlertCircle,
  Radio,
  Sliders,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
  Droplets,
  Trash2
} from 'lucide-react';

export default function SimulatorControlCard({
  simulatorState = {},
  onStart,
  onStop,
  onStep,
  onReset,
  onInjectAnomaly,
  isRefreshing
}) {
  const [intervalSec, setIntervalSec] = useState(simulatorState.intervalSeconds || 10);
  const [anomalyMenuOpen, setAnomalyMenuOpen] = useState(false);
  const isRunning = simulatorState.isRunning;

  const handleStart = () => {
    onStart(intervalSec);
  };

  const handleInject = (buildingId, type) => {
    onInjectAnomaly(buildingId, type);
    setAnomalyMenuOpen(false);
  };

  return (
    <div className="sim-controls-card">
      {/* Header Row */}
      <div className="sim-header-row">
        <div className="sim-title-group">
          <Radio size={18} className={isRunning ? 'text-emerald' : 'text-rose'} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Real-Time Edge Sensor Simulator
            </h4>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Autonomous telemetry generator with diurnal load curves and SQLite persistence
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className={`sim-status-indicator ${isRunning ? 'running' : 'stopped'}`}>
          <span className="pulse-dot" />
          <span>{isRunning ? `Streaming (Every ${intervalSec}s)` : 'Simulator Idle'}</span>
        </div>
      </div>

      {/* Actions and Controls Row */}
      <div className="sim-actions-row">
        {/* Start / Stop Toggle */}
        {!isRunning ? (
          <button className="sim-btn-primary" onClick={handleStart} disabled={isRefreshing}>
            <Play size={15} />
            <span>Start Telemetry Stream</span>
          </button>
        ) : (
          <button className="sim-btn-primary sim-btn-stop" onClick={onStop} disabled={isRefreshing}>
            <Square size={15} />
            <span>Stop Simulator</span>
          </button>
        )}

        {/* Interval Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span>Interval:</span>
          <select
            value={intervalSec}
            onChange={(e) => {
              const val = Number(e.target.value);
              setIntervalSec(val);
              if (isRunning) onStart(val);
            }}
            className="action-pill-btn"
            style={{ outline: 'none', cursor: 'pointer', padding: '0.35rem 0.6rem' }}
          >
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
          </select>
        </div>

        {/* Single Manual Tick */}
        <button
          className="sim-btn-secondary"
          onClick={onStep}
          title="Advance telemetry loop by 1 step immediately"
        >
          <FastForward size={14} />
          <span>Step Once</span>
        </button>

        {/* Inject Controlled Anomaly Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="sim-btn-secondary"
            onClick={() => setAnomalyMenuOpen(!anomalyMenuOpen)}
            title="Inject an alert anomaly for hackathon live demo"
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
          >
            <AlertCircle size={14} />
            <span>Inject Test Anomaly</span>
          </button>

          {anomalyMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.4rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                zIndex: 100,
                minWidth: '240px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}
            >
              <button
                className="layer-btn"
                onClick={() => handleInject(4, 'energy_surge')}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
              >
                <Zap size={13} className="text-rose" />
                <span>Lab Chiller Surge (225 kW)</span>
              </button>
              <button
                className="layer-btn"
                onClick={() => handleInject(3, 'water_leak')}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
              >
                <Droplets size={13} className="text-cyan" />
                <span>Cafeteria Pipe Leak (85 L/m)</span>
              </button>
              <button
                className="layer-btn"
                onClick={() => handleInject(1, 'bin_overflow')}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
              >
                <Trash2 size={13} className="text-purple" />
                <span>Quad Bin Overflow (98%)</span>
              </button>
            </div>
          )}
        </div>

        {/* Reset Demo Data */}
        <button
          className="sim-btn-secondary"
          onClick={onReset}
          title="Reset database back to clean seeded baseline"
          style={{ marginLeft: 'auto' }}
        >
          <RotateCcw size={14} />
          <span>Reset Demo Baseline</span>
        </button>
      </div>

      {/* Simulator Loop Info Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
        <span>Ticks Generated: <strong>{simulatorState.tickCount || 0}</strong></span>
        <span>Last Tick: <strong>{simulatorState.lastTickTime ? new Date(simulatorState.lastTickTime).toLocaleTimeString() : 'Awaiting start'}</strong></span>
        <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Sparkles size={11} />
          <span>Simulated Edge Sensors · No External Hardware Required</span>
        </span>
      </div>
    </div>
  );
}
