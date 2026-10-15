import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function FeaturePlaceholder({ title, description, icon: Icon, nextPhaseNumber, onBackToDashboard }) {
  return (
    <div className="feature-placeholder-card glass-panel animate-fade-in">
      <div className="placeholder-icon-circle">
        {Icon && <Icon size={36} className="text-emerald" />}
      </div>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-desc">{description}</p>

      <div className="phase-pill">
        <Sparkles size={14} className="text-teal" />
        <span>Ready for Phase {nextPhaseNumber} Implementation</span>
      </div>

      <div className="placeholder-actions">
        <button className="primary-btn" onClick={onBackToDashboard}>
          <span>Return to EcoPulse Dashboard</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
