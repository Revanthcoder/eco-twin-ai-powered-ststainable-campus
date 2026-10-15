"""
Explainable Anomaly Rules Engine.
Evaluates deterministic threshold conditions, consecutive reading sequences,
dual-condition baseline deviations (% and absolute), bin capacities, and stale alerts.
"""

import math
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.config import config
from app.analytics.schemas import (
    SensorReading,
    AnomalyAlert,
    SensorEvaluationRequest,
    SensorEvaluationResponse
)
from app.analytics.cleaning import telemetry_cleaner, parse_timestamp


class AnomalyRulesEngine:
    """Evaluates sensor telemetry against transparent explainable rules."""

    def __init__(self):
        self.cfg = config.anomaly

    def evaluate_telemetry(self, request: SensorEvaluationRequest) -> SensorEvaluationResponse:
        """
        Runs complete explainable analytics suite:
        1. Cleans telemetry (deduplication, limits, stale check).
        2. Evaluates water flow N-consecutive rule.
        3. Evaluates energy baseline % and absolute deviation rule.
        4. Evaluates waste bin fill level threshold rule.
        5. Evaluates statistical Z-score outliers.
        6. Computes normalized resource KPIs.
        """
        now = parse_timestamp(request.reference_time) if request.reference_time else datetime.now(timezone.utc)
        
        # 1. Cleaning
        cleaned_readings, clean_report = telemetry_cleaner.clean_readings(request.readings, now)

        alerts: List[AnomalyAlert] = []

        # Group readings by sensor
        by_sensor: Dict[str, List[SensorReading]] = {}
        for r in cleaned_readings:
            by_sensor.setdefault(r.sensor_id, []).append(r)

        # 2. Stale sensor alerts
        for stale_id in clean_report.stale_sensors_flagged:
            sensor_series = by_sensor.get(stale_id, [])
            last_ts = sensor_series[-1].measured_at if sensor_series else "unknown"
            last_val = sensor_series[-1].value if sensor_series else 0.0
            alerts.append(AnomalyAlert(
                alert_id=f"alt-stale-{uuid.uuid4().hex[:6]}",
                rule_id="RULE-STALE-01",
                rule_name="Stale Sensor Inactivity Alert",
                severity="warning",
                sensor_id=stale_id,
                metric=sensor_series[-1].metric if sensor_series else "unknown",
                observed_value=last_val,
                threshold_value=self.cfg.stale_after_minutes,
                absolute_deviation=0.0,
                percentage_deviation=0.0,
                explanation=f"Sensor {stale_id} has not emitted telemetry for over {self.cfg.stale_after_minutes} minutes. Last packet was at {last_ts}.",
                evidence_readings=[{"timestamp": last_ts, "value": last_val}],
                is_stale=True
            ))

        # 3. Evaluate sensor-specific rules
        for sensor_id, series in by_sensor.items():
            if not series:
                continue
            
            metric = series[0].metric.lower()

            # Rule A: Water flow > configured_threshold for N consecutive readings
            if "water" in metric or metric == "flow":
                self._check_water_flow_consecutive(sensor_id, series, alerts)

            # Rule B: Energy baseline deviation (requires BOTH % and absolute deviation)
            elif "energy" in metric or "power" in metric or metric == "kw":
                self._check_energy_baseline(sensor_id, series, request.baseline_mean, alerts)

            # Rule C: Waste bin fullness threshold
            elif "waste" in metric or "bin" in metric:
                self._check_bin_fullness(sensor_id, series, alerts)

            # Rule D: General statistical Z-Score check for any metric with >= 3 readings
            if len(series) >= 3:
                self._check_z_score_outliers(sensor_id, series, alerts)

        # 4. Normalization calculations
        total_energy = sum(r.value for r in cleaned_readings if "energy" in r.metric.lower())
        total_water = sum(r.value for r in cleaned_readings if "water" in r.metric.lower())
        
        normalized = telemetry_cleaner.compute_normalized_metrics(
            energy_kwh=total_energy if total_energy > 0 else None,
            water_liters=total_water if total_water > 0 else None,
            area_m2=request.building_area_m2,
            occupancy_count=request.building_occupancy
        )

        freshness_status = {
            s_id: {
                "last_seen": series[-1].measured_at if series else None,
                "is_stale": s_id in clean_report.stale_sensors_flagged,
                "readings_count": len(series)
            }
            for s_id, series in by_sensor.items()
        }

        return SensorEvaluationResponse(
            anomalies_detected=len(alerts) > 0,
            alerts_count=len(alerts),
            alerts=alerts,
            cleaning_report=clean_report,
            normalized_metrics=normalized,
            sensor_freshness=freshness_status,
            summary=f"Processed {clean_report.total_received} telemetry events ({clean_report.valid_count} valid). Tripped {len(alerts)} explainable alerts."
        )

    def _check_water_flow_consecutive(
        self,
        sensor_id: str,
        series: List[SensorReading],
        alerts: List[AnomalyAlert]
    ):
        """Rule: water_flow > configured_threshold for N consecutive readings."""
        threshold = self.cfg.water_flow_max_lpm
        n_req = self.cfg.water_flow_consecutive_readings
        
        # Check last N readings
        if len(series) < n_req:
            return

        consecutive_above = []
        for r in reversed(series):
            if r.value > threshold:
                consecutive_above.append(r)
                if len(consecutive_above) == n_req:
                    break
            else:
                break

        if len(consecutive_above) == n_req:
            latest = consecutive_above[0]
            abs_dev = round(latest.value - threshold, 2)
            pct_dev = round((abs_dev / threshold) * 100, 1)
            
            evidence = [{"timestamp": r.measured_at, "value": r.value, "unit": r.unit} for r in reversed(consecutive_above)]
            
            alerts.append(AnomalyAlert(
                alert_id=f"alt-water-{uuid.uuid4().hex[:6]}",
                rule_id="RULE-WATER-N-CONSECUTIVE",
                rule_name="Sustained High Water Flow Leak Condition",
                severity="high" if latest.value > threshold * 1.5 else "warning",
                sensor_id=sensor_id,
                metric=latest.metric,
                observed_value=latest.value,
                threshold_value=threshold,
                absolute_deviation=abs_dev,
                percentage_deviation=pct_dev,
                explanation=(
                    f"Flow sensor {sensor_id} measured {latest.value} {latest.unit}, exceeding configured threshold "
                    f"of {threshold} {latest.unit} for {n_req} consecutive readings (+{pct_dev}% / +{abs_dev} {latest.unit}). "
                    f"Indicates unthrottled demand or active pipe leakage."
                ),
                evidence_readings=evidence
            ))

    def _check_energy_baseline(
        self,
        sensor_id: str,
        series: List[SensorReading],
        provided_baseline: Optional[float],
        alerts: List[AnomalyAlert]
    ):
        """
        Rule: energy_now > baseline_mean * (1 + deviation_fraction)
        AND abs(energy_now - baseline_mean) >= min_absolute_deviation.
        Requires BOTH relative percentage and minimum absolute deviation.
        """
        latest = series[-1]
        
        # Determine baseline mean: from argument or historical series mean
        if provided_baseline is not None and provided_baseline > 0:
            baseline = provided_baseline
        elif len(series) >= 2:
            baseline = sum(r.value for r in series[:-1]) / (len(series) - 1)
        else:
            return

        allowed_deviation_frac = self.cfg.energy_baseline_deviation_fraction
        min_abs_dev = self.cfg.energy_min_absolute_deviation_kw

        threshold = baseline * (1.0 + allowed_deviation_frac)
        abs_diff = latest.value - baseline

        # Both conditions must hold
        if latest.value > threshold and abs_diff >= min_abs_dev:
            pct_diff = round((abs_diff / baseline) * 100, 1)
            alerts.append(AnomalyAlert(
                alert_id=f"alt-energy-{uuid.uuid4().hex[:6]}",
                rule_id="RULE-ENERGY-DUAL-BASELINE",
                rule_name="Abnormal Baseline Power Deviation",
                severity="critical" if pct_diff > 50.0 else "high",
                sensor_id=sensor_id,
                metric=latest.metric,
                observed_value=latest.value,
                threshold_value=round(threshold, 2),
                absolute_deviation=round(abs_diff, 2),
                percentage_deviation=pct_diff,
                explanation=(
                    f"Power demand {latest.value} {latest.unit} exceeded baseline mean of {baseline:.1f} {latest.unit} "
                    f"by +{pct_diff}% (+{abs_diff:.1f} {latest.unit}). Satisfies both relative condition (> +{allowed_deviation_frac*100:.0f}%) "
                    f"and minimum absolute threshold (>= {min_abs_dev} {latest.unit})."
                ),
                evidence_readings=[
                    {"timestamp": latest.measured_at, "value": latest.value, "baseline": round(baseline, 2)}
                ]
            ))

    def _check_bin_fullness(
        self,
        sensor_id: str,
        series: List[SensorReading],
        alerts: List[AnomalyAlert]
    ):
        """Rule: bin_fullness_percent >= configured_bin_threshold."""
        latest = series[-1]
        val = latest.value
        warn_th = self.cfg.bin_fullness_warning_percent
        crit_th = self.cfg.bin_fullness_critical_percent

        if val >= warn_th:
            severity = "critical" if val >= crit_th else "warning"
            th = crit_th if val >= crit_th else warn_th
            alerts.append(AnomalyAlert(
                alert_id=f"alt-bin-{uuid.uuid4().hex[:6]}",
                rule_id="RULE-BIN-FULLNESS",
                rule_name="Waste Bin Capacity Overflow Risk",
                severity=severity,
                sensor_id=sensor_id,
                metric=latest.metric,
                observed_value=val,
                threshold_value=th,
                absolute_deviation=round(val - th, 1),
                percentage_deviation=round(((val - th) / th) * 100, 1),
                explanation=(
                    f"Waste bin sensor {sensor_id} measured {val}% capacity, exceeding {severity} limit of {th}%. "
                    f"Collection dispatch required to avoid litter spillover."
                ),
                evidence_readings=[{"timestamp": latest.measured_at, "value": val}]
            ))

    def _check_z_score_outliers(
        self,
        sensor_id: str,
        series: List[SensorReading],
        alerts: List[AnomalyAlert]
    ):
        """Statistical 2.5-sigma outlier rule."""
        values = [r.value for r in series]
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std_dev = math.sqrt(variance) or 1.0

        latest = series[-1]
        z = (latest.value - mean) / std_dev

        if z > self.cfg.z_score_threshold:
            alerts.append(AnomalyAlert(
                alert_id=f"alt-stat-{uuid.uuid4().hex[:6]}",
                rule_id="RULE-STAT-ZSCORE",
                rule_name="Statistical Sigma Outlier",
                severity="critical" if z > 3.5 else "warning",
                sensor_id=sensor_id,
                metric=latest.metric,
                observed_value=latest.value,
                threshold_value=round(mean + (self.cfg.z_score_threshold * std_dev), 2),
                absolute_deviation=round(latest.value - mean, 2),
                percentage_deviation=round(((latest.value - mean) / (mean or 1.0)) * 100, 1),
                explanation=(
                    f"Telemetry value {latest.value} is {z:.2f} standard deviations above the recent sample mean "
                    f"({mean:.2f} ± {std_dev:.2f})."
                ),
                evidence_readings=[{"timestamp": latest.measured_at, "value": latest.value, "z_score": round(z, 2)}]
            ))


anomaly_engine = AnomalyRulesEngine()
