import React from 'react';
import { Zap, Droplets, Trash2, Recycle, AlertTriangle } from 'lucide-react';
import MetricCard from '../common/MetricCard';

export default function MetricsGrid({ metrics, onNavigateToTab }) {
  if (!metrics) return null;

  return (
    <div className="metrics-grid">
      {/* Electricity Metric */}
      <MetricCard
        title="Electricity Usage"
        value={metrics.electricity.totalKWh.toLocaleString()}
        unit="kWh"
        delta={metrics.electricity.deltaPercent}
        deltaLabel="vs past 24h"
        inverseDelta={true}
        subtext={`Peak Demand: ${metrics.electricity.peakDemandKW} kW | Solar Offset: ${metrics.electricity.solarOffsetPercent}%`}
        icon={Zap}
        variant="emerald"
        onClick={() => onNavigateToTab('simulator')}
      />

      {/* Water Metric */}
      <MetricCard
        title="Water Consumption"
        value={metrics.water.totalLiters.toLocaleString()}
        unit="Liters"
        delta={metrics.water.deltaPercent}
        deltaLabel="vs baseline"
        inverseDelta={true}
        subtext={`Alert: ~${metrics.water.leakEstimatedLitersPerHr} L/hr estimated leak in Cafeteria`}
        icon={Droplets}
        variant="cyan"
        onClick={() => onNavigateToTab('smart-alerts')}
      />

      {/* Waste Generation */}
      <MetricCard
        title="Campus Waste"
        value={metrics.waste.totalKg.toLocaleString()}
        unit="kg"
        delta={-4.1}
        deltaLabel="landfill reduction"
        inverseDelta={true}
        subtext={`Diverted: ${metrics.waste.divertedKg} kg | Composted: ${metrics.waste.compostedKg} kg`}
        icon={Trash2}
        variant="teal"
        onClick={() => onNavigateToTab('impact-reports')}
      />

      {/* Recycling Rate */}
      <MetricCard
        title="Recycling &amp; Diversion"
        value={`${metrics.recyclingRate.percentage}%`}
        unit=""
        delta={metrics.recyclingRate.deltaPercent}
        deltaLabel="this quarter"
        inverseDelta={false}
        subtext={`Campus Target: ${metrics.recyclingRate.target}% (3.9% to goal)`}
        icon={Recycle}
        variant="emerald"
        onClick={() => onNavigateToTab('impact-reports')}
      />
    </div>
  );
}
