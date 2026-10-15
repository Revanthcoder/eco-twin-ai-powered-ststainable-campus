import React, { useState } from 'react';
import { Sparkles, Radio, Calendar, Download, RefreshCw } from 'lucide-react';
import SustainabilityScoreGauge from './SustainabilityScoreGauge';
import MetricsGrid from './MetricsGrid';
import ConsumptionTrendChart from './ConsumptionTrendChart';
import CampusStatusSummary from './CampusStatusSummary';
import RecentAlertsList from './RecentAlertsList';
import EnergyLeaderboard from './EnergyLeaderboard';

export default function EcoPulseDashboard({
  metrics,
  buildings,
  alerts,
  trends,
  isDemoMode,
  backendStatus,
  onUpdateAlertStatus,
  onNavigateToTab,
  onSelectBuilding
}) {
  const [timeframe, setTimeframe] = useState('24h'); // 'live' | '24h' | '7d' | '30d'

  return (
    <div className="dashboard-content animate-fade-in">
      {/* Telemetry Status Banner */}
      <div className={`status-notification-banner ${isDemoMode ? 'demo-banner' : 'live-banner'}`}>
        <div className="banner-left">
          {isDemoMode ? (
            <Sparkles size={16} className="text-purple" />
          ) : (
            <Radio size={16} className="text-emerald pulse-indicator" />
          )}
          <span className="banner-message">
            {isDemoMode ? (
              <strong>DEMO TELEMETRY ACTIVE — Simulated baseline values for offline hackathon demonstration.</strong>
            ) : (
              <strong>LIVE BACKEND CONNECTED — Streaming telemetry from FastAPI SQLite (ecotwin-backend @ 127.0.0.1:8000).</strong>
            )}
          </span>
        </div>
        <div className="banner-source-tag">
          {isDemoMode ? 'Synthetic Data Mode' : 'Database: Connected'}
        </div>
      </div>

      {/* Control Bar: Timeframe & Quick Actions */}
      <div className="dashboard-controls-bar">
        <div>
          <h2 className="dashboard-heading">Campus Environmental Intelligence</h2>
          <p className="dashboard-subheading">Aggregated IoT telemetry across 5 facility micro-grids</p>
        </div>

        <div className="timeframe-selector" role="group" aria-label="Timeframe selection">
          <button
            className={`time-btn ${timeframe === 'live' ? 'active' : ''}`}
            onClick={() => setTimeframe('live')}
          >
            Real-Time
          </button>
          <button
            className={`time-btn ${timeframe === '24h' ? 'active' : ''}`}
            onClick={() => setTimeframe('24h')}
          >
            Past 24 Hours
          </button>
          <button
            className={`time-btn ${timeframe === '7d' ? 'active' : ''}`}
            onClick={() => setTimeframe('7d')}
          >
            7 Days
          </button>
          <button
            className={`time-btn ${timeframe === '30d' ? 'active' : ''}`}
            onClick={() => setTimeframe('30d')}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Top Grid: Sustainability Gauge & 4 Key Resource Metrics */}
      <div className="dashboard-top-grid">
        <SustainabilityScoreGauge
          score={metrics.sustainabilityScore}
          target={metrics.scoreTarget}
          subScores={metrics.subScores}
        />
        <MetricsGrid
          metrics={metrics}
          onNavigateToTab={onNavigateToTab}
        />
      </div>

      {/* Middle Grid: 24h Telemetry Trend & 5 Campus Zones Summary */}
      <div className="dashboard-middle-grid">
        <ConsumptionTrendChart trends={trends} />
        <CampusStatusSummary
          buildings={buildings}
          onSelectBuilding={onSelectBuilding}
          onOpenMap={() => onNavigateToTab('digital-twin')}
        />
      </div>

      {/* Resource Leaderboard */}
      <EnergyLeaderboard buildings={buildings} onNavigateToTab={onNavigateToTab} />

      {/* Bottom Section: Active Alerts Ticker */}
      <div className="dashboard-bottom-section">
        <RecentAlertsList
          alerts={alerts}
          onUpdateStatus={onUpdateAlertStatus}
          onViewAllAlerts={() => onNavigateToTab('smart-alerts')}
        />
      </div>
    </div>
  );
}
