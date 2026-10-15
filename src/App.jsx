import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import EcoPulseDashboard from './components/dashboard/EcoPulseDashboard';
import DigitalTwinMap from './components/views/DigitalTwinMap';
import VisionScanner from './components/views/VisionScanner';
import SmartAlerts from './components/views/SmartAlerts';
import WhatIfSimulator from './components/views/WhatIfSimulator';
import EcoAssistant from './components/views/EcoAssistant';
import ImpactReports from './components/views/ImpactReports';
import OccupancyHeatmap from './components/views/OccupancyHeatmap';
import AgenticControlRoom from './components/views/AgenticControlRoom';
import campusApi from './services/api';
import { DEMO_CAMPUS_METRICS, DEMO_BUILDINGS, DEMO_ISSUES, DEMO_CONSUMPTION_HOURLY } from './services/demoData';
import './styles/App.css';
import './styles/features.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, database: 'checking' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

  const [metrics, setMetrics] = useState(DEMO_CAMPUS_METRICS);
  const [buildings, setBuildings] = useState(DEMO_BUILDINGS);
  const [alerts, setAlerts] = useState(DEMO_ISSUES);
  const [trends, setTrends] = useState(DEMO_CONSUMPTION_HOURLY);

  const syncTelemetry = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const health = await campusApi.checkHealth();
      setBackendStatus(health);

      const metricsRes = await campusApi.getCampusMetrics();
      if (metricsRes?.data) setMetrics(metricsRes.data);

      const buildingsRes = await campusApi.getBuildings();
      if (buildingsRes?.data) setBuildings(buildingsRes.data);

      const issuesRes = await campusApi.getIssues();
      if (issuesRes?.data) setAlerts(issuesRes.data);

      const trendsRes = await campusApi.getHourlyTrends();
      if (trendsRes?.data) setTrends(trendsRes.data);
    } catch (err) {
      console.warn('Telemetry sync note:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    syncTelemetry();
    const id = setInterval(syncTelemetry, 30000);
    return () => clearInterval(id);
  }, [syncTelemetry]);

  const handleToggleDemoMode = () => {
    const next = !isDemoMode;
    setIsDemoMode(next);
    campusApi.setDemoMode(next);
    syncTelemetry();
  };

  const handleUpdateAlertStatus = async (alertId, newStatus) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: newStatus } : a));
    try { await campusApi.updateIssueStatus(alertId, newStatus); } catch { /* optimistic */ }
  };

  const openAlertsCount = alerts.filter(a => a.status === 'open').length;

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <EcoPulseDashboard
            metrics={metrics} buildings={buildings} alerts={alerts} trends={trends}
            isDemoMode={isDemoMode} backendStatus={backendStatus}
            onUpdateAlertStatus={handleUpdateAlertStatus}
            onNavigateToTab={setActiveTab}
            onSelectBuilding={(b) => { setSelectedBuildingId(b.id); setActiveTab('digital-twin'); }}
          />
        );
      case 'digital-twin':
        return (
          <DigitalTwinMap
            buildings={buildings}
            alerts={alerts}
            selectedBuildingId={selectedBuildingId}
            onNavigateToAlerts={() => setActiveTab('smart-alerts')}
          />
        );
      case 'agentic-hub':
        return <AgenticControlRoom />;
      case 'occupancy':
        return <OccupancyHeatmap />;
      case 'vision-scanner':
        return <VisionScanner />;
      case 'smart-alerts':
        return <SmartAlerts alerts={alerts} />;
      case 'simulator':
        return <WhatIfSimulator />;
      case 'eco-assistant':
        return <EcoAssistant />;
      case 'impact-reports':
        return <ImpactReports />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} alertsCount={openAlertsCount} />
      <div className="main-viewport">
        <Navbar
          backendStatus={backendStatus}
          isDemoMode={isDemoMode}
          onToggleDemoMode={handleToggleDemoMode}
          onRefresh={syncTelemetry}
          isRefreshing={isRefreshing}
        />
        <main className="view-container">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
