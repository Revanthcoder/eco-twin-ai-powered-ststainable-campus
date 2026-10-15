import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import EcoPulseDashboard from './components/dashboard/EcoPulseDashboard';
import FeaturePlaceholder from './components/views/FeaturePlaceholder';
import campusApi from './services/api';
import { DEMO_CAMPUS_METRICS, DEMO_BUILDINGS, DEMO_ISSUES, DEMO_CONSUMPTION_HOURLY } from './services/demoData';
import { MapPin, Camera, AlertTriangle, Sliders, Bot, TrendingUp } from 'lucide-react';
import './styles/App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, database: 'checking' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Core telemetry state
  const [metrics, setMetrics] = useState(DEMO_CAMPUS_METRICS);
  const [buildings, setBuildings] = useState(DEMO_BUILDINGS);
  const [alerts, setAlerts] = useState(DEMO_ISSUES);
  const [trends, setTrends] = useState(DEMO_CONSUMPTION_HOURLY);

  // Sync telemetry from API
  const syncTelemetry = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Health Check
      const health = await campusApi.checkHealth();
      setBackendStatus(health);

      // 2. Metrics & Buildings
      const metricsRes = await campusApi.getCampusMetrics();
      if (metricsRes?.data) setMetrics(metricsRes.data);

      const buildingsRes = await campusApi.getBuildings();
      if (buildingsRes?.data) setBuildings(buildingsRes.data);

      const issuesRes = await campusApi.getIssues();
      if (issuesRes?.data) setAlerts(issuesRes.data);

      const trendsRes = await campusApi.getHourlyTrends();
      if (trendsRes?.data) setTrends(trendsRes.data);
    } catch (err) {
      console.warn("Telemetry synchronization note:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic heartbeat
  useEffect(() => {
    syncTelemetry();
    const intervalId = setInterval(syncTelemetry, 30000); // 30s background sync
    return () => clearInterval(intervalId);
  }, [syncTelemetry]);

  // Handle Demo Mode Toggle
  const handleToggleDemoMode = () => {
    const nextMode = !isDemoMode;
    setIsDemoMode(nextMode);
    campusApi.setDemoMode(nextMode);
    syncTelemetry();
  };

  // Handle Alert Status Update (Triage / Resolve)
  const handleUpdateAlertStatus = async (alertId, newStatus) => {
    // Optimistic UI update
    setAlerts((prevAlerts) =>
      prevAlerts.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );

    try {
      await campusApi.updateIssueStatus(alertId, newStatus);
    } catch (e) {
      console.error("Failed to update status on server:", e);
    }
  };

  // Handle Building Selection
  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setActiveTab('digital-twin');
  };

  // Count open alerts
  const openAlertsCount = alerts.filter((a) => a.status === 'open').length;

  return (
    <div className="app-layout">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertsCount={openAlertsCount}
      />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Navbar */}
        <Navbar
          backendStatus={backendStatus}
          isDemoMode={isDemoMode}
          onToggleDemoMode={handleToggleDemoMode}
          onRefresh={syncTelemetry}
          isRefreshing={isRefreshing}
        />

        {/* Dynamic View Router */}
        <main className="view-container">
          {activeTab === 'dashboard' && (
            <EcoPulseDashboard
              metrics={metrics}
              buildings={buildings}
              alerts={alerts}
              trends={trends}
              isDemoMode={isDemoMode}
              backendStatus={backendStatus}
              onUpdateAlertStatus={handleUpdateAlertStatus}
              onNavigateToTab={setActiveTab}
              onSelectBuilding={handleSelectBuilding}
            />
          )}

          {activeTab === 'digital-twin' && (
            <FeaturePlaceholder
              title="Interactive Digital Twin (Campus 2D Map)"
              description="A clickable, real-time spatial digital twin map of the 5 campus zones (Academic Block, Library, Cafeteria, Laboratory, Water Tank) with dynamic color-coded sustainability health markers (Green, Yellow, Red) and deep telemetry inspect panels."
              icon={MapPin}
              nextPhaseNumber="2"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'vision-scanner' && (
            <FeaturePlaceholder
              title="AI Vision Scanner (Infrastructure Diagnostics)"
              description="Upload campus facility photos (pipe valves, HVAC vents, chillers, solar arrays) with instant preview, validation, and real-time computer vision detection bounding boxes for leaks, thermal loss, or maintenance anomalies."
              icon={Camera}
              nextPhaseNumber="3"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'smart-alerts' && (
            <FeaturePlaceholder
              title="Smart Alerts &amp; Maintenance Triage"
              description="Comprehensive issue management categorized by severity (Critical, High, Medium, Low), zone coordinates, live status, and one-click maintenance workflow actions."
              icon={AlertTriangle}
              nextPhaseNumber="4"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'simulator' && (
            <FeaturePlaceholder
              title="What-If Conservation Simulator"
              description="Physics-based scenario modeling studio to adjust energy and water loads (LED retrofits, HVAC setback, low-flow fixtures) and compute projected cost savings and avoided CO2 emissions with transparent estimation labeling."
              icon={Sliders}
              nextPhaseNumber="5"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'eco-assistant' && (
            <FeaturePlaceholder
              title="Eco AI Assistant (Conversational Sustainability Agent)"
              description="Context-aware chat assistant equipped with live telemetry citations, sustainability recommendations, and explicit sensor uncertainty boundaries."
              icon={Bot}
              nextPhaseNumber="6"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'impact-reports' && (
            <FeaturePlaceholder
              title="Impact Reports &amp; ESG Trends"
              description="Institutional sustainability trends, carbon emissions offsets, and printable environmental compliance summaries."
              icon={TrendingUp}
              nextPhaseNumber="7"
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
