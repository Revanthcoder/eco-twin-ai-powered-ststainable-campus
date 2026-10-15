import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Zap,
  Droplets,
  DollarSign,
  Leaf,
  Info,
  CheckCircle2,
  Sparkles,
  Calculator
} from 'lucide-react';
import campusApi from '../../services/api';

export default function WhatIfScenarioModal({
  building,
  buildings = [],
  isOpen,
  onClose
}) {
  const [selectedBuildingId, setSelectedBuildingId] = useState(building?.id || 1);
  const [metricType, setMetricType] = useState('energy'); // 'energy' | 'water'
  const [scenarioName, setScenarioName] = useState('Campus LED Lighting Retrofit');
  const [reductionPercent, setReductionPercent] = useState(25);
  const [days, setDays] = useState(30);
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (building?.id) {
      setSelectedBuildingId(building.id);
    }
  }, [building]);

  // Run calculation when parameters change
  useEffect(() => {
    if (!isOpen) return;
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
        console.warn('What-If simulation error:', err);
      } finally {
        if (isCurrent) setCalculating(false);
      }
    }

    const timer = setTimeout(runCalc, 150);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, selectedBuildingId, metricType, scenarioName, reductionPercent, days]);

  if (!isOpen) return null;

  const currentBuilding = buildings.find(b => b.id === Number(selectedBuildingId)) || building;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="whatif-title">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" id="whatif-title">
            <Sliders size={20} className="text-teal" />
            <span>What-If Sustainability Scenario Simulator</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Introduction Notice */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Model conservation interventions without modifying measured historical telemetry. Computes projected resource savings, utility cost reductions, and avoided carbon emissions using verified physical constants.
        </div>

        {/* Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Building Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Target Facility
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(Number(e.target.value))}
              className="action-pill-btn"
              style={{ width: '100%', outline: 'none' }}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.location || b.map_position})
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Resource Vector
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`layer-btn ${metricType === 'energy' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setMetricType('energy');
                  setScenarioName('LED Lighting & HVAC Setback');
                }}
              >
                <Zap size={14} />
                <span>Electricity</span>
              </button>
              <button
                className={`layer-btn ${metricType === 'water' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setMetricType('water');
                  setScenarioName('Low-Flow Fixtures & Leak Fix');
                }}
              >
                <Droplets size={14} />
                <span>Water</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reduction Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Conservation Target / Efficiency Improvement:</span>
            <strong style={{ color: '#10b981' }}>{reductionPercent}% Reduction</strong>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={reductionPercent}
            onChange={(e) => setReductionPercent(e.target.value)}
            style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>5% (Minor Setback)</span>
            <span>25% (Standard Retrofit)</span>
            <span>60% (Deep Decarbonization)</span>
          </div>
        </div>

        {/* Duration Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Projection Time Horizon
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { val: 30, label: '30 Days (Monthly Cycle)' },
              { val: 90, label: '90 Days (Academic Quarter)' },
              { val: 365, label: '365 Days (Annualized ESG)' }
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

        {/* Live Simulation Results Output */}
        {calculationResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Modeled Projections &amp; Savings ({calculationResult.period_days || days} Days)
            </div>

            <div className="scenario-results-grid">
              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Baseline Consumption</span>
                <span className="scenario-res-val" style={{ color: 'var(--text-primary)' }}>
                  {calculationResult.baseline_value?.toLocaleString()} <small style={{ fontSize: '0.75rem' }}>{calculationResult.unit}</small>
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Projected Consumption</span>
                <span className="scenario-res-val" style={{ color: '#38bdf8' }}>
                  {calculationResult.projected_value?.toLocaleString()} <small style={{ fontSize: '0.75rem' }}>{calculationResult.unit}</small>
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Avoided Consumption</span>
                <span className="scenario-res-val">
                  -{calculationResult.difference?.toLocaleString()} <small style={{ fontSize: '0.75rem' }}>{calculationResult.unit}</small>
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Estimated Cost Savings</span>
                <span className="scenario-res-val" style={{ color: '#fbbf24' }}>
                  ${calculationResult.cost_saved_usd?.toLocaleString()}
                </span>
              </div>

              <div className="scenario-res-card">
                <span className="scenario-res-lbl">Avoided Carbon</span>
                <span className="scenario-res-val" style={{ color: '#34d399' }}>
                  -{calculationResult.co2_avoided_kg?.toLocaleString()} <small style={{ fontSize: '0.75rem' }}>kg CO₂e</small>
                </span>
              </div>
            </div>

            {/* Assumptions Box */}
            <div className="scenario-assumptions-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                <Info size={13} className="text-teal" />
                <span>Documented Engineering Assumptions</span>
              </div>
              <p style={{ margin: 0 }}>{calculationResult.assumptions}</p>
              <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                <strong>Uncertainty Boundary:</strong> {calculationResult.uncertainty}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer Tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={12} />
            <span>ESTIMATE: What-if decision support model. Does not alter measured sensor records.</span>
          </span>
          <button className="sim-btn-primary" onClick={onClose}>
            <CheckCircle2 size={15} />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
