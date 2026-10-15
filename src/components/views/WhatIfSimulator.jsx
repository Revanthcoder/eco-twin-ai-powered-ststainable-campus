import React, { useState } from 'react';
import { Sliders, Zap, Droplets, AlertCircle, RefreshCw, Info, TrendingDown, BookmarkPlus, Trash2, Sparkles, Check } from 'lucide-react';
import campusApi from '../../services/api';

const BUILDINGS_LIST = [
  { id: 1, name: 'Academic Block' }, { id: 2, name: 'Library' },
  { id: 3, name: 'Cafeteria' }, { id: 4, name: 'Laboratory' }, { id: 5, name: 'Water Tank' }
];

const PRESETS = [
  {
    id: 'led-academic',
    label: '💡 LED Retrofit (Academic Block)',
    mode: 'energy',
    building: 1,
    scenarioName: 'Hallway & Classroom LED Retrofit',
    baselineWatts: 100,
    proposedWatts: 36,
    equipCount: 120,
    hoursPerDay: 14,
    days: 30
  },
  {
    id: 'hvac-lab',
    label: '❄️ HVAC Night Setback (Laboratory)',
    mode: 'energy',
    building: 4,
    scenarioName: 'Cleanroom Chiller Schedule Setback',
    baselineWatts: 450,
    proposedWatts: 220,
    equipCount: 16,
    hoursPerDay: 8,
    days: 30
  },
  {
    id: 'aerator-cafe',
    label: '🚿 Aerators (Cafeteria)',
    mode: 'water',
    building: 3,
    scenarioName: 'Commercial Dishwasher Valve & Sink Aerators',
    baselineDaily: 4800,
    proposedDaily: 2900,
    days: 30
  },
  {
    id: 'rain-tank',
    label: '🌧️ Greywater Recirculation (Water Tank)',
    mode: 'water',
    building: 5,
    scenarioName: 'Central Irrigation Greywater Recirculation',
    baselineDaily: 18500,
    proposedDaily: 12200,
    days: 30
  }
];

function ResultBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="sim-bar-row">
      <span className="sim-bar-label">{label}</span>
      <div className="sim-bar-track">
        <div className="sim-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="sim-bar-val">{value.toLocaleString()}</span>
    </div>
  );
}

export default function WhatIfSimulator() {
  const [mode, setMode] = useState('energy'); // 'energy' | 'water'
  const [building, setBuilding] = useState(4); // Laboratory default (highest energy)
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [savedSuccessFlash, setSavedSuccessFlash] = useState(false);

  // Energy params
  const [scenarioName, setScenarioName] = useState('LED Lighting Retrofit');
  const [baselineWatts, setBaselineWatts] = useState(100);
  const [proposedWatts, setProposedWatts] = useState(40);
  const [hoursPerDay, setHoursPerDay] = useState(12);
  const [days, setDays] = useState(30);
  const [equipCount, setEquipCount] = useState(80);

  // Water params
  const [waterScenarioName, setWaterScenarioName] = useState('Low-Flow Aerator Installation');
  const [baselineDaily, setBaselineDaily] = useState(4800);
  const [proposedDaily, setProposedDaily] = useState(3200);
  const [waterDays, setWaterDays] = useState(30);

  const applyPreset = (preset) => {
    setMode(preset.mode);
    setBuilding(preset.building);
    setResult(null);
    setError('');

    if (preset.mode === 'energy') {
      setScenarioName(preset.scenarioName);
      setBaselineWatts(preset.baselineWatts);
      setProposedWatts(preset.proposedWatts);
      setEquipCount(preset.equipCount);
      setHoursPerDay(preset.hoursPerDay);
      setDays(preset.days);
    } else {
      setWaterScenarioName(preset.scenarioName);
      setBaselineDaily(preset.baselineDaily);
      setProposedDaily(preset.proposedDaily);
      setWaterDays(preset.days);
    }
  };

  const handleRun = async () => {
    setError('');
    setResult(null);

    if (mode === 'energy' && proposedWatts >= baselineWatts) {
      setError('Proposed wattage must be lower than baseline to show savings.');
      return;
    }
    if (mode === 'water' && proposedDaily >= baselineDaily) {
      setError('Proposed daily usage must be lower than baseline to show savings.');
      return;
    }

    setIsRunning(true);
    try {
      const payload = mode === 'energy'
        ? { type: 'energy', building_id: building, scenarioName, baselinePowerWatts: baselineWatts, proposedPowerWatts: proposedWatts, operatingHoursPerDay: hoursPerDay, days, equipmentCount: equipCount }
        : { type: 'water', building_id: building, scenarioName: waterScenarioName, baselineDailyLiters: baselineDaily, proposedDailyLiters: proposedDaily, days: waterDays };

      const res = await campusApi.runSimulation(payload);
      setResult(res);
    } catch {
      setError('Simulation failed. Please check your inputs and try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveScenario = () => {
    if (!result) return;
    const item = {
      id: Date.now(),
      name: result.scenario_name,
      type: result.simulation_type,
      building: BUILDINGS_LIST.find(b => b.id === building)?.name || 'Campus',
      saved: result.estimated_difference,
      percent: result.percent_saved,
      unit: result.unit,
      co2: result.co2_avoided_kg,
      cost: result.cost_saved_usd
    };
    setSavedScenarios(prev => [item, ...prev]);
    setSavedSuccessFlash(true);
    setTimeout(() => setSavedSuccessFlash(false), 2000);
  };

  const handleRemoveSaved = (id) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="sim-page animate-fade-in">
      <div className="sim-header">
        <div>
          <h2 className="page-title">What-If Conservation Simulator</h2>
          <p className="page-subtitle">Model building energy and hydraulic interventions, evaluate ROI, and compare scenarios side-by-side</p>
        </div>
        <div className="info-pill">
          <Info size={14} />
          <span>Calculations use standard engineering models (0.42 kg CO₂/kWh, $0.14/kWh institutional tariff). All results are labeled estimates.</span>
        </div>
      </div>

      {/* Preset selector bar */}
      <div className="preset-picker-bar glass-panel">
        <span className="preset-picker-title">
          <Sparkles size={14} className="text-emerald" /> Quick Intervention Presets:
        </span>
        <div className="preset-btn-group">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              className="preset-btn"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sim-body">
        {/* Config Panel */}
        <div className="sim-config glass-panel">
          {/* Mode Toggle */}
          <div className="sim-mode-toggle">
            <button className={`mode-btn ${mode === 'energy' ? 'active' : ''}`} onClick={() => { setMode('energy'); setResult(null); }}>
              <Zap size={16} /> Energy / Electricity
            </button>
            <button className={`mode-btn ${mode === 'water' ? 'active' : ''}`} onClick={() => { setMode('water'); setResult(null); }}>
              <Droplets size={16} /> Water Conservation
            </button>
          </div>

          <div className="sim-field">
            <label className="sim-label">Campus Building Target</label>
            <select className="sim-select" value={building} onChange={e => setBuilding(Number(e.target.value))}>
              {BUILDINGS_LIST.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {mode === 'energy' ? (
            <>
              <div className="sim-field">
                <label className="sim-label">Scenario Name</label>
                <input className="sim-input" value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="e.g. LED Retrofit" />
              </div>
              <div className="sim-field-row">
                <div className="sim-field">
                  <label className="sim-label">Baseline Power (W)</label>
                  <input className="sim-input" type="number" min={1} value={baselineWatts} onChange={e => setBaselineWatts(Number(e.target.value))} />
                  <span className="sim-field-hint">e.g. 100 W fixture</span>
                </div>
                <div className="sim-field">
                  <label className="sim-label">Proposed Power (W)</label>
                  <input className="sim-input" type="number" min={1} value={proposedWatts} onChange={e => setProposedWatts(Number(e.target.value))} />
                  <span className="sim-field-hint">e.g. 40 W LED</span>
                </div>
              </div>
              <div className="sim-field-row">
                <div className="sim-field">
                  <label className="sim-label">Units / Fixtures</label>
                  <input className="sim-input" type="number" min={1} value={equipCount} onChange={e => setEquipCount(Number(e.target.value))} />
                </div>
                <div className="sim-field">
                  <label className="sim-label">Hours / Day</label>
                  <input className="sim-input" type="number" min={1} max={24} value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} />
                </div>
                <div className="sim-field">
                  <label className="sim-label">Period (Days)</label>
                  <input className="sim-input" type="number" min={1} max={365} value={days} onChange={e => setDays(Number(e.target.value))} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="sim-field">
                <label className="sim-label">Scenario Name</label>
                <input className="sim-input" value={waterScenarioName} onChange={e => setWaterScenarioName(e.target.value)} placeholder="e.g. Low-Flow Aerators" />
              </div>
              <div className="sim-field-row">
                <div className="sim-field">
                  <label className="sim-label">Baseline Daily (L)</label>
                  <input className="sim-input" type="number" min={1} value={baselineDaily} onChange={e => setBaselineDaily(Number(e.target.value))} />
                  <span className="sim-field-hint">Measured daily flow</span>
                </div>
                <div className="sim-field">
                  <label className="sim-label">Proposed Daily (L)</label>
                  <input className="sim-input" type="number" min={0} value={proposedDaily} onChange={e => setProposedDaily(Number(e.target.value))} />
                  <span className="sim-field-hint">Target with fixtures</span>
                </div>
                <div className="sim-field">
                  <label className="sim-label">Period (Days)</label>
                  <input className="sim-input" type="number" min={1} max={365} value={waterDays} onChange={e => setWaterDays(Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="sim-error" role="alert"><AlertCircle size={15} />{error}</div>
          )}

          <button className="run-sim-btn" onClick={handleRun} disabled={isRunning} aria-busy={isRunning}>
            {isRunning ? <><RefreshCw size={16} className="spin-icon" /> Computing Projection…</> : <><Sliders size={16} /> Run Simulation</>}
          </button>
        </div>

        {/* Results Panel */}
        <div className="sim-results-col">
          {!result && !isRunning && (
            <div className="sim-results-empty glass-panel">
              <TrendingDown size={40} className="text-emerald" />
              <h3>Configure or Select a Preset Scenario</h3>
              <p>Adjust parameters or click a preset at top, then click <strong>Run Simulation</strong> to estimate savings.</p>
            </div>
          )}

          {result && (
            <div className="sim-results-card glass-panel animate-fade-in">
              {/* Mandatory ESTIMATE disclaimer */}
              <div className="sim-disclaimer-banner" role="status">
                <AlertCircle size={14} />
                <span><strong>SIMULATION ESTIMATE</strong> — {result.data_classification || result.assumptions}</span>
              </div>

              <div className="sim-results-header-row">
                <div>
                  <h3 className="sim-results-title">{result.scenario_name}</h3>
                  <p className="sim-results-type">
                    {result.simulation_type === 'water' ? '💧 Water Conservation Scenario' : '⚡ Energy Efficiency Scenario'} · {BUILDINGS_LIST.find(b => b.id === building)?.name}
                  </p>
                </div>
                <button
                  className={`save-scenario-btn ${savedSuccessFlash ? 'saved-done' : ''}`}
                  onClick={handleSaveScenario}
                >
                  {savedSuccessFlash ? <><Check size={14} /> Saved!</> : <><BookmarkPlus size={14} /> Save to Compare</>}
                </button>
              </div>

              {/* Savings Hero */}
              <div className="sim-savings-hero">
                <div className="savings-number">
                  {result.estimated_difference?.toLocaleString()}
                  <span className="savings-unit"> {result.unit}</span>
                </div>
                <div className="savings-label">Estimated savings over simulation period</div>
                {result.percent_saved && (
                  <div className="savings-pct"><TrendingDown size={16} /> {result.percent_saved}% reduction</div>
                )}
              </div>

              {/* Comparison Bars */}
              <div className="sim-comparison">
                <h4 className="sim-compare-title">Baseline vs. Projected</h4>
                <ResultBar label="Baseline" value={result.baseline_result} max={result.baseline_result} color="rgba(239,68,68,0.6)" />
                <ResultBar label="Projected" value={result.scenario_result} max={result.baseline_result} color="rgba(16,185,129,0.7)" />
              </div>

              {/* Extra metrics for energy */}
              {result.co2_avoided_kg && (
                <div className="sim-extra-metrics">
                  <div className="extra-metric">
                    <span className="em-label">CO₂ Avoided</span>
                    <span className="em-val">{result.co2_avoided_kg} kg</span>
                  </div>
                  <div className="extra-metric">
                    <span className="em-label">Cost Saved (est.)</span>
                    <span className="em-val">${result.cost_saved_usd}</span>
                  </div>
                </div>
              )}

              <p className="sim-assumptions"><strong>Engineering Model:</strong> {result.assumptions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Table (when scenarios are saved) */}
      {savedScenarios.length > 0 && (
        <div className="sim-comparison-card glass-panel animate-fade-in">
          <div className="sim-compare-header">
            <h3 className="esg-table-title">
              <BookmarkPlus size={17} className="text-emerald" /> Saved Scenario Comparison ({savedScenarios.length})
            </h3>
            <button className="clear-comparison-btn" onClick={() => setSavedScenarios([])}>
              Clear All
            </button>
          </div>
          <div className="esg-table-wrap">
            <table className="esg-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Type</th>
                  <th>Target Building</th>
                  <th>Estimated Savings</th>
                  <th>% Saved</th>
                  <th>CO₂ Avoided</th>
                  <th>Cost Impact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {savedScenarios.map(s => (
                  <tr key={s.id}>
                    <td className="month-cell"><strong>{s.name}</strong></td>
                    <td>{s.type === 'energy' ? '⚡ Energy' : '💧 Water'}</td>
                    <td>{s.building}</td>
                    <td className="td-good">{s.saved.toLocaleString()} {s.unit}</td>
                    <td className="td-good">{s.percent}%</td>
                    <td>{s.co2 ? `${s.co2} kg` : '—'}</td>
                    <td className="td-solar">{s.cost ? `$${s.cost}` : '—'}</td>
                    <td>
                      <button className="remove-row-btn" onClick={() => handleRemoveSaved(s.id)} title="Remove scenario">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
