import React, { useState } from 'react';
import { Bot, Shield, Zap, Droplets, Wrench, CheckCircle2, AlertCircle, Clock, Play, Pause, RefreshCw, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react';

const INITIAL_AGENTS = [
  {
    id: 'hvac-governor',
    name: 'HVAC Climate Governor Agent',
    icon: Zap,
    color: '#10b981',
    zone: 'Zone A & D',
    status: 'active',
    mode: 'autonomous',
    confidence: '98.2%',
    policy: 'Setback thermostat by 2.5°C when zone occupancy drops below 25% for >15 minutes.',
    currentAction: 'Applying 23.5°C setback in Academic Lecture Hall 3 (occupancy 12%).',
    savingsToday: '64.5 kWh saved',
    actionsTodayCount: 14
  },
  {
    id: 'hydraulic-sentinel',
    name: 'Hydraulic Leak Sentinel Agent',
    icon: Droplets,
    color: '#06b6d4',
    zone: 'Zone C & E',
    status: 'active',
    mode: 'autonomous',
    confidence: '96.5%',
    policy: 'Throttle solenoid shutoff valve when differential flow exceeds 100 L/hr during non-service hours.',
    currentAction: 'Pulsed throttle on Cafeteria line valve #V-102 (prevented ~850 L loss).',
    savingsToday: '1,420 L preserved',
    actionsTodayCount: 8
  },
  {
    id: 'microgrid-dispatcher',
    name: 'Solar & Battery Microgrid Dispatcher',
    icon: Sparkles,
    color: '#f59e0b',
    zone: 'Campus-wide Grid',
    status: 'active',
    mode: 'autonomous',
    confidence: '99.1%',
    policy: 'Discharge rooftop battery storage during grid peak tariff window ($0.18/kWh).',
    currentAction: 'Discharging 42 kW battery reserve to Laboratory cleanroom computing cluster.',
    savingsToday: '$38.20 avoided cost',
    actionsTodayCount: 11
  },
  {
    id: 'work-order-agent',
    name: 'Autonomous Maintenance Dispatcher',
    icon: Wrench,
    color: '#a855f7',
    zone: 'All Facilities',
    status: 'active',
    mode: 'supervised',
    confidence: '94.0%',
    policy: 'Generate facility work order and notify duty technician when vision anomaly confidence > 90%.',
    currentAction: 'Prepared Work Order #WO-882 for Cafeteria silicone valve replacement.',
    savingsToday: '3.5 hrs triage saved',
    actionsTodayCount: 5
  }
];

const INITIAL_LOG = [
  {
    id: 1,
    time: '2 mins ago',
    agent: 'HVAC Climate Governor',
    color: '#10b981',
    action: 'Reduced HVAC fan speed to 40% in Library Silent Hall after occupancy dropped to 18%.',
    impact: 'Saved 3.8 kWh',
    status: 'executed'
  },
  {
    id: 2,
    time: '18 mins ago',
    agent: 'Hydraulic Leak Sentinel',
    color: '#06b6d4',
    action: 'Sent pulse command to Cafeteria dishwasher sub-meter valve to arrest night overflow.',
    impact: 'Saved 140 L/hr',
    status: 'executed'
  },
  {
    id: 3,
    time: '42 mins ago',
    agent: 'Solar & Battery Microgrid Dispatcher',
    color: '#f59e0b',
    action: 'Routed 80 kW surplus rooftop solar generation to charge central Battery Bank B.',
    impact: 'Stored 40 kWh clean energy',
    status: 'executed'
  },
  {
    id: 4,
    time: '1 hr ago',
    agent: 'Autonomous Maintenance Dispatcher',
    color: '#a855f7',
    action: 'Parsed Vision AI image; filed high-priority ticket for Cafeteria dishwasher gasket replacement.',
    impact: 'Assigned to Tech #4',
    status: 'executed'
  }
];

export default function AgenticControlRoom() {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [logs, setLogs] = useState(INITIAL_LOG);
  const [globalMode, setGlobalMode] = useState('autonomous'); // 'autonomous' | 'supervised'
  const [simulating, setSimulating] = useState(false);

  const toggleAgent = (id) => {
    setAgents(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'active' ? 'paused' : 'active';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleSimulateAction = () => {
    setSimulating(true);
    setTimeout(() => {
      const newEntry = {
        id: Date.now(),
        time: 'Just now',
        agent: 'HVAC Climate Governor',
        color: '#10b981',
        action: 'Autonomous setback active: Dimmed Hallway 3A fixtures by 30% based on ambient lux sensors.',
        impact: 'Saved 1.2 kWh',
        status: 'executed'
      };
      setLogs(prev => [newEntry, ...prev]);
      setSimulating(false);
    }, 700);
  };

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <div className="agent-page animate-fade-in">
      {/* Header */}
      <div className="agent-header">
        <div>
          <h2 className="page-title">Agentic AI Autonomous Policy Hub</h2>
          <p className="page-subtitle">Multi-agent campus intelligence running autonomous continuous optimization policies</p>
        </div>

        <div className="agent-header-controls">
          <div className="mode-pill-wrap">
            <span className="mode-label"><Shield size={13} /> Operation:</span>
            <button
              className={`mode-btn-sm ${globalMode === 'autonomous' ? 'active-green' : ''}`}
              onClick={() => setGlobalMode('autonomous')}
            >
              Full Autonomous
            </button>
            <button
              className={`mode-btn-sm ${globalMode === 'supervised' ? 'active-purple' : ''}`}
              onClick={() => setGlobalMode('supervised')}
            >
              Human-in-Loop
            </button>
          </div>

          <button
            className="sim-action-btn"
            onClick={handleSimulateAction}
            disabled={simulating}
          >
            {simulating ? <><RefreshCw size={13} className="spin-icon" /> Triggering…</> : <><Sparkles size={13} /> Trigger Agent Cycle</>}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="agent-kpis glass-panel">
        <div className="agent-kpi">
          <span className="kpi-label">Active Agents</span>
          <span className="kpi-val text-emerald">{activeCount} / {agents.length} Online</span>
        </div>
        <div className="agent-kpi">
          <span className="kpi-label">Decisions Today</span>
          <span className="kpi-val">38 Actions</span>
        </div>
        <div className="agent-kpi">
          <span className="kpi-label">Total Energy Saved Today</span>
          <span className="kpi-val text-emerald">102.7 kWh</span>
        </div>
        <div className="agent-kpi">
          <span className="kpi-label">Water Waste Prevented</span>
          <span className="kpi-val text-cyan">1,420 Liters</span>
        </div>
        <div className="agent-kpi">
          <span className="kpi-label">Average Confidence</span>
          <span className="kpi-val text-purple">97.0%</span>
        </div>
      </div>

      {/* Agents Cards Grid */}
      <div className="agents-grid">
        {agents.map(agent => {
          const Icon = agent.icon;
          const isActive = agent.status === 'active';
          return (
            <div key={agent.id} className={`agent-card glass-panel ${isActive ? 'agent-card--active' : 'agent-card--paused'}`}>
              <div className="agent-card-header">
                <div className="agent-icon-box" style={{ background: `${agent.color}20`, border: `1px solid ${agent.color}50` }}>
                  <Icon size={20} style={{ color: agent.color }} />
                </div>
                <div className="agent-title-col">
                  <h3 className="agent-name">{agent.name}</h3>
                  <span className="agent-zone">{agent.zone} · Confidence: <strong>{agent.confidence}</strong></span>
                </div>
                <button
                  className={`agent-toggle-btn ${isActive ? 'toggle-active' : 'toggle-paused'}`}
                  onClick={() => toggleAgent(agent.id)}
                  title={isActive ? 'Pause Agent' : 'Resume Agent'}
                >
                  {isActive ? <><Pause size={12} /> Running</> : <><Play size={12} /> Paused</>}
                </button>
              </div>

              <div className="agent-policy-box">
                <span className="policy-label"><SlidersHorizontal size={12} /> Active Policy Rule:</span>
                <p className="policy-desc">{agent.policy}</p>
              </div>

              <div className="agent-action-box">
                <div className="action-tag-row">
                  <span className="action-live-tag">
                    <span className="live-dot" /> Live Action
                  </span>
                  <span className="action-savings-tag">{agent.savingsToday}</span>
                </div>
                <p className="action-text">{agent.currentAction}</p>
              </div>

              <div className="agent-card-footer">
                <span className="action-count">{agent.actionsTodayCount} automated optimizations today</span>
                <span className="agent-mode-badge">{globalMode === 'autonomous' ? '⚡ Autonomous' : '👤 Supervised'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Decision Timeline / Audit Log */}
      <div className="agent-log-card glass-panel">
        <div className="log-header">
          <div className="log-title-row">
            <Clock size={16} className="text-emerald" />
            <h3 className="log-title">Autonomous Agent Decision Stream &amp; Audit Trail</h3>
          </div>
          <span className="log-badge">ISO 50001 Verified Log</span>
        </div>

        <div className="log-timeline">
          {logs.map(item => (
            <div key={item.id} className="log-item animate-fade-in">
              <div className="log-time-col">
                <span className="log-time">{item.time}</span>
              </div>
              <div className="log-dot-col">
                <span className="log-dot" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
              </div>
              <div className="log-content-col">
                <div className="log-meta">
                  <strong style={{ color: item.color }}>{item.agent}</strong>
                  <span className="log-impact-chip">{item.impact}</span>
                </div>
                <p className="log-action-text">{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
