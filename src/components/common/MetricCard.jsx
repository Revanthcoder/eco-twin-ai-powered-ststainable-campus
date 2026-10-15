import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  unit = '',
  delta = 0,
  deltaLabel = 'vs baseline',
  inverseDelta = false, // if true, negative delta is good (e.g., lower electricity is good)
  subtext = '',
  icon: Icon,
  variant = 'emerald', // 'emerald', 'teal', 'cyan', 'amber'
  onClick
}) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  
  // Decide whether the delta is considered 'good'
  const isFavorable = inverseDelta ? !isPositive : isPositive;

  return (
    <div
      className={`metric-card glass-panel variant-${variant} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value} ${unit}`}
    >
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-box">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="metric-value-row">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>

      <div className="metric-footer">
        <div className={`metric-delta ${isNeutral ? 'neutral' : isFavorable ? 'favorable' : 'unfavorable'}`}>
          {isNeutral ? (
            <Minus size={14} />
          ) : isPositive ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}
          <span>{isPositive ? `+${delta}%` : `${delta}%`}</span>
          <span className="delta-label">{deltaLabel}</span>
        </div>
        {subtext && <div className="metric-subtext">{subtext}</div>}
      </div>
    </div>
  );
}
