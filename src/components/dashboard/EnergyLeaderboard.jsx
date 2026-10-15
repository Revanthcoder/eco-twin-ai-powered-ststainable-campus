import React, { useState } from 'react';
import { Trophy, Zap, Droplets, TrendingDown, Award, ArrowRight } from 'lucide-react';

const MODES = [
  { id: 'energy', label: 'Energy', icon: Zap, unit: 'kWh', color: '#10b981' },
  { id: 'water',  label: 'Water',  icon: Droplets, unit: 'L', color: '#06b6d4' },
];

function getMedal(rank) {
  if (rank === 1) return { emoji: '🥇', label: 'Best', color: '#fbbf24' };
  if (rank === 2) return { emoji: '🥈', label: '2nd',  color: '#94a3b8' };
  if (rank === 3) return { emoji: '🥉', label: '3rd',  color: '#d97706' };
  return { emoji: null, label: `#${rank}`, color: 'var(--text-muted)' };
}

export default function EnergyLeaderboard({ buildings = [], onNavigateToTab }) {
  const [mode, setMode] = useState('energy');

  const cfg = MODES.find(m => m.id === mode);
  const Icon = cfg.icon;

  /* Sort ascending = least consumption = best rank */
  const ranked = [...buildings]
    .filter(b => b.id !== 5) // exclude utility node (Water Tank)
    .map(b => ({
      ...b,
      value: mode === 'energy' ? (b.energyUsageKWh ?? 0) : (b.waterUsageL ?? 0),
    }))
    .sort((a, b) => a.value - b.value);

  const max = ranked.reduce((m, b) => Math.max(m, b.value), 1);

  return (
    <div className="leaderboard-card glass-panel">
      <div className="lb-header">
        <div className="lb-title-group">
          <Trophy size={17} className="text-amber" />
          <div>
            <div className="lb-card-title">Resource Leaderboard</div>
            <div className="lb-card-subtitle">Lowest consumption = best rank</div>
          </div>
        </div>
        <div className="lb-mode-tabs">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`lb-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <m.icon size={12} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lb-list">
        {ranked.map((b, i) => {
          const rank = i + 1;
          const medal = getMedal(rank);
          const pct = Math.round((b.value / max) * 100);
          const statusColor = b.status === 'optimal' ? '#10b981' : b.status === 'warning' ? '#f59e0b' : '#ef4444';

          return (
            <div key={b.id} className={`lb-row ${rank === 1 ? 'lb-row--top' : ''}`}>
              <div className="lb-rank-col">
                {medal.emoji
                  ? <span className="lb-medal">{medal.emoji}</span>
                  : <span className="lb-rank-num" style={{ color: medal.color }}>{medal.label}</span>}
              </div>
              <div className="lb-name-col">
                <div className="lb-building-name">{b.name}</div>
                <div className="lb-building-zone">{b.map_position?.split(' — ')[1] || b.type}</div>
              </div>
              <div className="lb-bar-col">
                <div className="lb-bar-track">
                  <div
                    className="lb-bar-fill"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}99, ${cfg.color})` }}
                  />
                </div>
              </div>
              <div className="lb-value-col">
                <span className="lb-value" style={{ color: rank === 1 ? cfg.color : 'var(--text-primary)' }}>
                  {b.value.toLocaleString()}
                </span>
                <span className="lb-unit">{cfg.unit}</span>
              </div>
              <div className="lb-status-dot" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            </div>
          );
        })}
      </div>

      {ranked.length > 0 && (
        <div className="lb-footer">
          <div className="lb-insight">
            <TrendingDown size={12} className="text-emerald" />
            <span>
              <strong>{ranked[0].name}</strong> uses {Math.round((1 - ranked[0].value / max) * 100)}% less {cfg.label.toLowerCase()} than the highest consumer
            </span>
          </div>
          <button className="lb-cta" onClick={() => onNavigateToTab?.('digital-twin')}>
            View on Map <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
