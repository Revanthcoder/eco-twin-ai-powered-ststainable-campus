import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Zap,
  Droplets,
  Users,
  Leaf,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Radio,
  Sliders
} from 'lucide-react';
import CampusMap2D from './CampusMap2D';
import BuildingDetailPanel from './BuildingDetailPanel';
import SimulatorControlCard from './SimulatorControlCard';
import MapLayerControls from './MapLayerControls';
import WhatIfScenarioModal from './WhatIfScenarioModal';
import SensorTableView from './SensorTableView';
import campusApi from '../../services/api';
import '../../styles/DigitalTwin.css';

export default function DigitalTwinView({
  buildings = [],
  selectedBuilding,
  onSelectBuilding,
  isDemoMode,
  backendStatus,
  onUpdateAlertStatus
}) {
  const [twinOverview, setTwinOverview] = useState(null);
  const [allSensors, setAllSensors] = useState([]);
  const [simulatorState, setSimulatorState] = useState({ isRunning: false, tickCount: 0 });
  const [activeLayer, setActiveLayer] = useState('all'); // 'all' | 'energy' | 'water' | 'waste' | 'alerts'
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'table'
  const [statusFilter, setStatusFilter] = useState('all');
  const [whatIfModalOpen, setWhatIfModalOpen] = useState(false);
  const [whatIfTargetBuilding, setWhatIfTargetBuilding] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync Digital Twin Data
  const fetchTwinData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [overviewRes, simStatusRes, sensorsRes] = await Promise.all([
        campusApi.getTwinOverview(),
        campusApi.getSimulatorStatus(),
        campusApi.getSensors()
      ]);

      if (overviewRes?.data) setTwinOverview(overviewRes.data);
      if (simStatusRes) setSimulatorState(simStatusRes);
      if (sensorsRes?.data) setAllSensors(sensorsRes.data);
    } catch (err) {
      console.warn('Digital Twin sync notification:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTwinData();
    // Poll every 5s while simulator is running for smooth live UI updates
    const intervalId = setInterval(fetchTwinData, 5000);
    return () => clearInterval(intervalId);
  }, [fetchTwinData]);

  // Simulator Actions
  const handleStartSimulator = async (intervalSec) => {
    await campusApi.startSimulator(intervalSec);
    await fetchTwinData();
  };

  const handleStopSimulator = async () => {
    await campusApi.stopSimulator();
    await fetchTwinData();
  };

  const handleStepSimulator = async () => {
    await campusApi.stepSimulator();
    await fetchTwinData();
  };

  const handleResetData = async () => {
    if (window.confirm('Reset all campus buildings, readings, and alerts to clean seed baseline?')) {
      await campusApi.resetSimulatorData();
      await fetchTwinData();
    }
  };

  const handleInjectAnomaly = async (buildingId, type) => {
    await campusApi.injectAnomaly(buildingId, type);
    await fetchTwinData();
  };

  // Open What-If Modal
  const handleOpenWhatIf = (buildingObj) => {
    setWhatIfTargetBuilding(buildingObj || buildings[0]);
    setWhatIfModalOpen(true);
  };

  const ov = twinOverview || {};

  return (
    <div className="twin-container animate-fade-in">
      {/* Telemetry Status Notification Banner */}
      <div className={`twin-banner ${isDemoMode ? 'demo-active' : ''}`}>
        <div className="banner-content">
          {simulatorState.isRunning ? (
            <Radio size={16} className="text-emerald pulse-indicator" />
          ) : isDemoMode ? (
            <Sparkles size={16} className="text-purple" />
          ) : (
            <Radio size={16} className="text-teal" />
          )}
          <span>
            {isDemoMode ? (
              <strong>DEMO MODE ACTIVE — Displaying synthetic baseline telemetry for offline demonstration.</strong>
            ) : simulatorState.isRunning ? (
              <strong>LIVE SENSOR STREAM ACTIVE — Telemetry streaming from real-time Edge Simulator into SQLite persistence layer.</strong>
            ) : (
              <strong>DIGITAL TWIN ENGINE READY — Connected to Express API Gateway with 5 facilities and 20 edge sensors.</strong>
            )}
          </span>
        </div>
        <span className="banner-badge">
          {isDemoMode ? 'Synthetic Demo Mode' : simulatorState.isRunning ? 'Simulator Active' : 'Persistent Database'}
        </span>
      </div>

      {/* Campus Aggregate KPI Cards */}
      <div className="twin-kpi-bar">
        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Campus Real-Time Power</span>
            <Zap size={14} className="text-emerald" />
          </div>
          <div className="twin-kpi-val">
            {ov.energy?.current_kw || 459.7} <small>kW</small>
          </div>
          <div className="twin-kpi-sub">
            Total Today: <strong>{ov.energy?.total_kwh || 2785.0} kWh</strong>
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Water Flow Rate</span>
            <Droplets size={14} className="text-cyan" />
          </div>
          <div className="twin-kpi-val">
            {ov.water?.current_flow_lpm || 219.3} <small>L/min</small>
          </div>
          <div className="twin-kpi-sub">
            Total Today: <strong>{ov.water?.total_liters?.toLocaleString() || '25,900'} L</strong>
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Campus Occupancy</span>
            <Users size={14} className="text-teal" />
          </div>
          <div className="twin-kpi-val">
            {ov.occupancy?.current_count || 1075} <small>people</small>
          </div>
          <div className="twin-kpi-sub">
            Capacity: {ov.occupancy?.total_capacity || 2620} ({ov.occupancy?.occupancy_rate_percent || 41}%)
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Carbon Emissions</span>
            <Leaf size={14} className="text-emerald" />
          </div>
          <div className="twin-kpi-val">
            {ov.energy?.carbon_emissions_kg_co2e || 1169.7} <small>kg CO₂e</small>
          </div>
          <div className="twin-kpi-sub">
            Solar Offset: <strong>{ov.energy?.solar_offset_percent || 19.6}%</strong>
          </div>
        </div>

        <div className="twin-kpi-card">
          <div className="twin-kpi-header">
            <span>Active Issues</span>
            <AlertTriangle size={14} className="text-rose" />
          </div>
          <div className="twin-kpi-val" style={{ color: ov.alerts?.critical > 0 ? '#ef4444' : '#f59e0b' }}>
            {ov.alerts?.total ?? 4} <small>alerts</small>
          </div>
          <div className="twin-kpi-sub">
            Critical: <strong>{ov.alerts?.critical ?? 1}</strong> · Warning: <strong>{ov.alerts?.high ?? 1}</strong>
          </div>
        </div>
      </div>

      {/* Real-Time Sensor Simulator Control Card */}
      <SimulatorControlCard
        simulatorState={simulatorState}
        onStart={handleStartSimulator}
        onStop={handleStopSimulator}
        onStep={handleStepSimulator}
        onReset={handleResetData}
        onInjectAnomaly={handleInjectAnomaly}
        isRefreshing={isRefreshing}
      />

      {/* Map Layer and View Mode Controls */}
      <MapLayerControls
        activeLayer={activeLayer}
        onSelectLayer={setActiveLayer}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        statusFilter={statusFilter}
        onChangeStatusFilter={setStatusFilter}
      />

      {/* Main View: Interactive 2D Schematic Map OR Sensor Directory Table */}
      {viewMode === 'map' ? (
        <CampusMap2D
          buildings={buildings}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={onSelectBuilding}
          activeLayer={activeLayer}
          statusFilter={statusFilter}
        />
      ) : (
        <SensorTableView
          sensors={allSensors}
          onRefresh={fetchTwinData}
        />
      )}

      {/* Deep Building Telemetry Detail Panel (Opens when building is clicked) */}
      {selectedBuilding && (
        <BuildingDetailPanel
          building={selectedBuilding}
          onClose={() => onSelectBuilding(null)}
          onOpenSimulatorModal={handleOpenWhatIf}
          onUpdateAlertStatus={onUpdateAlertStatus}
        />
      )}

      {/* What-If Sustainability Scenario Modal */}
      <WhatIfScenarioModal
        building={whatIfTargetBuilding || selectedBuilding}
        buildings={buildings}
        isOpen={whatIfModalOpen}
        onClose={() => setWhatIfModalOpen(false)}
      />
    </div>
  );
}
