import React from 'react';
import { Award, Zap, Droplets, Trash2, Wind } from 'lucide-react';

export default function SustainabilityScoreGauge({
  score = 82,
  target = 90,
  subScores = { energy: 84, water: 72, waste: 86, carbonOffset: 79 }
}) {
  // SVG circular gauge math
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getTier = (s) => {
    if (s >= 85) return { name: 'Eco-Champion', grade: 'A+', color: '#10b981' };
    if (s >= 75) return { name: 'Eco-Leader', grade: 'A-', color: '#34d399' };
    if (s >= 60) return { name: 'Moderate Impact', grade: 'B', color: '#f59e0b' };
    return { name: 'High Impact Alert', grade: 'C', color: '#ef4444' };
  };

  const tier = getTier(score);

  return (
    <div className="sustainability-gauge-card glass-panel">
      <div className="gauge-header">
        <div className="gauge-title-box">
          <Award className="gauge-icon" size={20} />
          <div>
            <h3 className="gauge-card-title">Campus Sustainability Score</h3>
            <p className="gauge-card-subtitle">Composite ESG &amp; Conservation Index</p>
          </div>
        </div>
        <div className="tier-badge" style={{ borderColor: tier.color, color: tier.color }}>
          {tier.name} ({tier.grade})
        </div>
      </div>

      <div className="gauge-body">
        {/* Circular Gauge */}
        <div className="gauge-visual-wrap">
          <svg className="gauge-svg" width="190" height="190" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="14"
            />
            {/* Value stroke */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="url(#scoreGradient)"
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>

          <div className="gauge-center-content">
            <span className="gauge-score-value">{score}</span>
            <span className="gauge-score-total">/ 100</span>
            <span className="gauge-target-label">Target: {target}</span>
          </div>
        </div>

        {/* Sub-score Index Breakdown */}
        <div className="subscores-breakdown">
          <div className="subscore-item">
            <div className="subscore-label-row">
              <span className="subscore-name">
                <Zap size={14} className="text-emerald" /> Energy Efficiency
              </span>
              <span className="subscore-val">{subScores.energy}%</span>
            </div>
            <div className="subscore-track">
              <div className="subscore-fill energy" style={{ width: `${subScores.energy}%` }} />
            </div>
          </div>

          <div className="subscore-item">
            <div className="subscore-label-row">
              <span className="subscore-name">
                <Droplets size={14} className="text-cyan" /> Water Conservation
              </span>
              <span className="subscore-val">{subScores.water}%</span>
            </div>
            <div className="subscore-track">
              <div className="subscore-fill water" style={{ width: `${subScores.water}%` }} />
            </div>
          </div>

          <div className="subscore-item">
            <div className="subscore-label-row">
              <span className="subscore-name">
                <Trash2 size={14} className="text-teal" /> Waste Diversion
              </span>
              <span className="subscore-val">{subScores.waste}%</span>
            </div>
            <div className="subscore-track">
              <div className="subscore-fill waste" style={{ width: `${subScores.waste}%` }} />
            </div>
          </div>

          <div className="subscore-item">
            <div className="subscore-label-row">
              <span className="subscore-name">
                <Wind size={14} className="text-amber" /> Carbon Offset
              </span>
              <span className="subscore-val">{subScores.carbonOffset}%</span>
            </div>
            <div className="subscore-track">
              <div className="subscore-fill carbon" style={{ width: `${subScores.carbonOffset}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
