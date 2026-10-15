import React from 'react';
import { Activity, RefreshCw, Database, Sparkles, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function Navbar({
  backendStatus,
  isDemoMode,
  onToggleDemoMode,
  onRefresh,
  isRefreshing
}) {
  return (
    <header className="navbar-container" role="banner">
      <div className="navbar-left">
        <div className="brand-badge">
          <div className="brand-icon-wrapper">
            <Activity className="brand-pulse-icon" size={22} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">EcoPulse AI</h1>
              <span className="brand-tag">v1.0</span>
            </div>
            <p className="brand-subtitle">Campus Sustainability Intelligence &amp; Digital Twin</p>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        {/* Backend Connectivity Status */}
        <div className="backend-status-pill" title={`FastAPI Backend at http://127.0.0.1:8000 (${backendStatus.database || 'SQLite'})`}>
          <Database size={15} className={backendStatus.online ? 'icon-online' : 'icon-offline'} />
          <span className="backend-text">
            {backendStatus.online ? 'FastAPI Connected' : 'Backend Offline'}
          </span>
          <span className={`status-dot ${backendStatus.online ? 'online' : 'offline'}`} />
        </div>

        {/* Demo Mode Toggle Switch */}
        <div className="demo-toggle-wrapper">
          <label className="demo-toggle-label" htmlFor="demo-mode-toggle">
            <Sparkles size={14} className={isDemoMode ? 'sparkle-active' : ''} />
            <span>Demo Data</span>
          </label>
          <button
            id="demo-mode-toggle"
            role="switch"
            aria-checked={isDemoMode}
            className={`toggle-switch ${isDemoMode ? 'active' : ''}`}
            onClick={onToggleDemoMode}
            title={isDemoMode ? "Click to use live FastAPI database" : "Click to enable synthetic demo data"}
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Refresh Action */}
        <button
          className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh campus telemetry"
          aria-label="Refresh telemetry data"
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          <span className="refresh-text">Sync</span>
        </button>
      </div>
    </header>
  );
}
