import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Zap,
  Droplets,
  DollarSign,
  Leaf,
  Info,
  CheckCircle2,
  Sparkles,
  Calculator,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import campusApi from '../../services/api';

export default function WhatIfScenarioView({ buildings = [], onNavigateToTab }) {
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildings[0]?.id || 1);
  const [metricType, setMetricType] = useState('energy'); // 'energy' | 'water'
  const [scenarioPreset, setScenarioPreset] = useState('led'); // 'led' | 'hvac' | 'aerators' | 'solar'
  const [scenarioName, setScenarioName] = useState('Campus LED Lighting Retrofit');
  const [reductionPercent, setReductionPercent] = useState(25);
  const [days, setDays] = useState(30);
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Sync building ID when buildings load
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [buildings, selectedBuildingId]);

  // Handle Preset changes
  const handlePresetSelect = (preset) => {
    setScenarioPreset(preset);
    if (preset === 'led') {
      setMetricType('energy');
      setScenarioName('Facility LED Lighting Retrofit');
      setReductionPercent(30);
    } else if (preset === 'hvac') {
      setMetricType('energy');
      setScenarioName('HVAC Temperature Setback (2°C Adjustment)');
      setReductionPercent(20);
    } else if (preset === 'aerators') {
      setMetricType('water');
      setScenarioName('Low-Flow Aerator Installation & Pipe Valve Repair');
      setReductionPercent(35);
    } else if (preset === 'dishwasher') {
      setMetricType('water');
      setScenarioName('Commercial Kitchen Water Heat Exchanger');
      setReductionPercent(25);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    setCalculating(true);

    async function runCalc() {
      try {
        const payload = {
          building_id: selectedBuildingId,
          metric_type: metricType,
          scenario_name: scenarioName,
          reduction_percent: Number(reductionPercent),
          days: Number(days)
        };
        const result = await campusApi.runWhatIfSimulation(payload);
        if (isCurrent && result) {
          setCalculationResult(result);
        }
      } catch (err) {
        console.warn('Simulation execution note:', err);
      } finally {
        if (isCurrent) setCalculating(false);
      }
    }

    const timer = setTimeout(runCalc, 100);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [selectedBuildingId, metricType, scenarioName, reductionPercent, days]);

  const currentBuilding = buildings.find(b => b.id === Number(selectedBuildingId)) || buildings[0];

  return (
    <div className="twin-container animate-fade-in">
      {/* Title & Description Banner */}
      <div className="twin-banner">
        <div className="banner-content">
          <Sliders size={20} className="text-teal" />
          <div>
            <strong style={{ fontSize: '1.05rem', display: 'block' }}>
              What-If Sustainability Conservation Simulator
            </strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Physics and engineering scenario studio for evaluating energy and water reduction interventions.
            </span>
          </div>
        </div>
        <span className="banner-badge">Decision Support Sandbox</span>
      </div>

      {/* Main Studio Card */}
      <div className="campus-map-card" style={{ gap: '1.5rem' }}>
        {/* Scenario Presets Row */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
            Recommended Conservation Scenarios
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {[
              { id: 'led', label: 'LED Lighting Retrofit', icon: Zap, metric: 'energy', color: 'text-emerald' },
              { id: 'hvac', label: 'HVAC Temperature Setback', icon: Zap, metric: 'energy', color: 'text-emerald' },
              { id: 'aerators', label: 'Low-Flow Aerators & Fixes', icon: Droplets, metric: 'water', color: 'text-cyan' },
              { id: 'dishwasher', label: 'Dishwasher Recirculation', icon: Droplets, metric: 'water', color: 'text-cyan' }
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = scenarioPreset === p.id;
              return (
                <button
                  key={p.id}
                  className={`building-mini-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(p.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? '#10b981' : 'var(--border-color)'}`,
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Icon size={16} className={p.color} />
                    <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{p.label}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    Vector: {p.metric}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Facility Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              1. Monitored Facility Target
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(Number(e.target.value))}
              className="action-pill-btn"
              style={{ width: '100%', outline: 'none', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.location || b.map_position})
                </option>
              ))}
            </select>
          </div>

          {/* Time Horizon */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              2. Analysis Duration (Time Horizon)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { val: 30, label: '30 Days' },
                { val: 90, label: '90 Days' },
                { val: 365, label: '1 Year (365d)' }
              ].map((p) => (
                <button
                  key={p.val}
                  className={`action-pill-btn ${days === p.val ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setDays(p.val)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Reduction Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              3. Proposed Reduction Target:
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>
              {reductionPercent}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={65}
            step={5}
            value={reductionPercent}
            onChange={(e) => setReductionPercent(e.target.value)}
            style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>5% Minor Efficiency</span>
            <span>25% Standard Equipment Retrofit</span>
            <span>65% Deep Decarbonization Overhaul</span>
          </div>
        </div>

        {/* Dynamic Calculation Results Output */}
        {calculationResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Projected Outcomes &amp; Environmental Returns ({calculationResult.period_days} Days)
            </h4>

            <div className="scenario-results-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Baseline Resource Demand</span>
                <span className="scenario-res-val" style={{ color: 'var(--text-primary)' }}>
                  {calculationResult.baseline_value?.toLocaleString()}{' '}
                  <small style={{ fontSize: '0.72rem' }}>{calculationResult.unit}</small>
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Projected Consumption</span>
                <span className="scenario-res-val" style={{ color: '#38bdf8' }}>
                  {calculationResult.projected_value?.toLocaleString()}{' '}
                  <small style={{ fontSize: '0.72rem' }}>{calculationResult.unit}</small>
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Avoided Resource Quantity</span>
                <span className="scenario-res-val">
                  -{calculationResult.difference?.toLocaleString()}{' '}
                  <small style={{ fontSize: '0.72rem' }}>{calculationResult.unit}</small>
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Projected Utility Cost Savings</span>
                <span className="scenario-res-val" style={{ color: '#fbbf24' }}>
                  ${calculationResult.cost_saved_usd?.toLocaleString()}
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Avoided Greenhouse Gas</span>
                <span className="scenario-res-val" style={{ color: '#34d399' }}>
                  -{calculationResult.co2_avoided_kg?.toLocaleString()}{' '}
                  <small style={{ fontSize: '0.72rem' }}>kg CO₂e</small>
                </span>
              </div>
            </div>

            {/* Documented Assumptions Box (PDF Page 2 Requirement) */}
            <div className="scenario-assumptions-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                <Info size={14} className="text-teal" />
                <span>Documented Model Assumptions &amp; Methodologies</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>{calculationResult.assumptions}</p>
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Uncertainty Boundary:</strong> {calculationResult.uncertainty}
              </div>
            </div>

            {/* Transparency Banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#c084fc' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={13} />
                <span>ESTIMATE — Decision support engineering model. Measured sensor logs remain unaltered.</span>
              </span>
              <button
                className="sim-btn-primary"
                onClick={() => onNavigateToTab('digital-twin')}
              >
                <span>View in Digital Twin Map</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
