"""
Unit tests for explainable sensor anomaly analytics, cleaning, and forecasting.
"""

from datetime import datetime, timedelta, timezone
from app.analytics.schemas import SensorReading, SensorEvaluationRequest
from app.analytics.cleaning import telemetry_cleaner
from app.analytics.anomaly_rules import anomaly_engine
from app.analytics.forecasting import telemetry_forecaster


def test_data_cleaning_deduplication_and_impossible_values():
    """Tests duplicate rejection and physical boundary enforcement."""
    now = datetime.now(timezone.utc)
    ts = now.isoformat()

    readings = [
        # Normal reading
        SensorReading(sensor_id="PWR-01", metric="energy", value=45.0, unit="kW", measured_at=ts),
        # Exact duplicate
        SensorReading(sensor_id="PWR-01", metric="energy", value=45.0, unit="kW", measured_at=ts),
        # Impossible negative power
        SensorReading(sensor_id="PWR-01", metric="energy", value=-500.0, unit="kW", measured_at=(now + timedelta(seconds=10)).isoformat()),
        # Impossible power exceeding physical limit (10000 kW)
        SensorReading(sensor_id="PWR-01", metric="energy", value=99999.0, unit="kW", measured_at=(now + timedelta(seconds=20)).isoformat())
    ]

    cleaned, report = telemetry_cleaner.clean_readings(readings, now)

    assert report.total_received == 4
    assert report.duplicates_removed == 1
    assert report.impossible_values_rejected == 2
    assert report.valid_count == 1
    assert len(cleaned) == 1
    assert cleaned[0].value == 45.0


def test_stale_sensor_detection():
    """Sensors whose last packet is older than stale_after_minutes are flagged."""
    now = datetime.now(timezone.utc)
    # Reading from 45 minutes ago
    old_ts = (now - timedelta(minutes=45)).isoformat()
    readings = [
        SensorReading(sensor_id="STALE-FLOW-01", metric="water_flow", value=12.0, unit="L/min", measured_at=old_ts)
    ]

    cleaned, report = telemetry_cleaner.clean_readings(readings, now)
    assert "STALE-FLOW-01" in report.stale_sensors_flagged

    # Check alert generation
    resp = anomaly_engine.evaluate_telemetry(SensorEvaluationRequest(readings=readings, reference_time=now.isoformat()))
    stale_alerts = [a for a in resp.alerts if a.rule_id == "RULE-STALE-01"]
    assert len(stale_alerts) == 1
    assert stale_alerts[0].is_stale is True


def test_water_flow_n_consecutive_rule():
    """Water flow alert trips ONLY after N consecutive readings above threshold."""
    now = datetime.now(timezone.utc)
    
    # 2 readings above threshold (threshold is 25.0, required consecutive is 3)
    readings_2 = [
        SensorReading(sensor_id="FLOW-01", metric="water_flow", value=32.0, unit="L/min", measured_at=(now - timedelta(seconds=20)).isoformat()),
        SensorReading(sensor_id="FLOW-01", metric="water_flow", value=34.0, unit="L/min", measured_at=(now - timedelta(seconds=10)).isoformat())
    ]
    resp_2 = anomaly_engine.evaluate_telemetry(SensorEvaluationRequest(readings=readings_2, reference_time=now.isoformat()))
    water_alerts_2 = [a for a in resp_2.alerts if a.rule_id == "RULE-WATER-N-CONSECUTIVE"]
    assert len(water_alerts_2) == 0 # Should NOT trip with only 2 readings

    # 3 consecutive readings above threshold -> MUST trip alert
    readings_3 = readings_2 + [
        SensorReading(sensor_id="FLOW-01", metric="water_flow", value=35.0, unit="L/min", measured_at=now.isoformat())
    ]
    resp_3 = anomaly_engine.evaluate_telemetry(SensorEvaluationRequest(readings=readings_3, reference_time=now.isoformat()))
    water_alerts_3 = [a for a in resp_3.alerts if a.rule_id == "RULE-WATER-N-CONSECUTIVE"]
    assert len(water_alerts_3) == 1
    assert water_alerts_3[0].observed_value == 35.0
    assert len(water_alerts_3[0].evidence_readings) == 3


def test_energy_baseline_dual_deviation_rule():
    """
    Energy baseline rule requires BOTH relative percentage (> 25%)
    AND minimum absolute deviation (>= 10 kW).
    """
    now = datetime.now(timezone.utc)
    ts = now.isoformat()
    baseline = 20.0 # Baseline = 20 kW

    # Scenario A: Percentage is 30% (+6 kW), but absolute difference (6 kW) is less than min 10 kW -> DO NOT TRIP
    readings_a = [
        SensorReading(sensor_id="PWR-A", metric="energy", value=26.0, unit="kW", measured_at=ts)
    ]
    resp_a = anomaly_engine.evaluate_telemetry(
        SensorEvaluationRequest(readings=readings_a, baseline_mean=baseline, reference_time=ts)
    )
    energy_alerts_a = [a for a in resp_a.alerts if a.rule_id == "RULE-ENERGY-DUAL-BASELINE"]
    assert len(energy_alerts_a) == 0

    # Scenario B: Both percentage (> 25%) and absolute deviation (>= 10 kW) exceeded -> MUST TRIP
    # 20 kW baseline -> 35 kW observed (+15 kW = +75% deviation, >= 10 kW)
    readings_b = [
        SensorReading(sensor_id="PWR-B", metric="energy", value=35.0, unit="kW", measured_at=ts)
    ]
    resp_b = anomaly_engine.evaluate_telemetry(
        SensorEvaluationRequest(readings=readings_b, baseline_mean=baseline, reference_time=ts)
    )
    energy_alerts_b = [a for a in resp_b.alerts if a.rule_id == "RULE-ENERGY-DUAL-BASELINE"]
    assert len(energy_alerts_b) == 1
    assert energy_alerts_b[0].percentage_deviation == 75.0
    assert energy_alerts_b[0].absolute_deviation == 15.0


def test_bin_fullness_rules():
    """Tests bin fullness warning (>= 80%) and critical (>= 95%) alerts."""
    now = datetime.now(timezone.utc).isoformat()
    
    # 85% -> warning
    r_warn = [SensorReading(sensor_id="BIN-01", metric="waste_bin", value=85.0, unit="%", measured_at=now)]
    resp_warn = anomaly_engine.evaluate_telemetry(SensorEvaluationRequest(readings=r_warn, reference_time=now))
    assert resp_warn.alerts[0].severity == "warning"

    # 98% -> critical
    r_crit = [SensorReading(sensor_id="BIN-02", metric="waste_bin", value=98.0, unit="%", measured_at=now)]
    resp_crit = anomaly_engine.evaluate_telemetry(SensorEvaluationRequest(readings=r_crit, reference_time=now))
    assert resp_crit.alerts[0].severity == "critical"


def test_normalization_calculations():
    """Validates kWh per m² and L per person normalization formulas."""
    norm = telemetry_cleaner.compute_normalized_metrics(
        energy_kwh=2285.0,
        water_liters=25000.0,
        area_m2=22850.0,
        occupancy_count=1000
    )
    assert norm is not None
    assert norm.energy_intensity_kwh_per_m2 == 0.1 # 2285 / 22850 = 0.1 kWh/m2
    assert norm.water_intensity_l_per_person == 25.0 # 25000 / 1000 = 25.0 L/person


def test_forecasting_data_sufficiency_and_uncertainty():
    """
    Forecasting must return honest limitation when < 5 readings exist,
    and compute regression with uncertainty bounds when >= 5 exist.
    """
    now = datetime.now(timezone.utc)
    
    # < 5 readings -> Unavailable with honest limitation
    few_readings = [
        SensorReading(sensor_id="S1", metric="energy", value=40.0, unit="kW", measured_at=now.isoformat()),
        SensorReading(sensor_id="S1", metric="energy", value=42.0, unit="kW", measured_at=(now + timedelta(minutes=15)).isoformat())
    ]
    resp_few = telemetry_forecaster.generate_forecast(few_readings)
    assert resp_few.forecast_available is False
    assert len(resp_few.limitations) > 0
    assert "Insufficient historical data" in resp_few.limitations[0]

    # >= 5 readings -> Computes regression and uncertainty envelope
    series = [
        SensorReading(sensor_id="S1", metric="energy", value=40.0 + i * 2, unit="kW", measured_at=(now + timedelta(minutes=15*i)).isoformat())
        for i in range(6)
    ]
    resp_full = telemetry_forecaster.generate_forecast(series, horizon_steps=3)
    assert resp_full.forecast_available is True
    assert len(resp_full.predictions) == 3
    for p in resp_full.predictions:
        assert p.predicted_value > 0
        assert p.lower_bound <= p.predicted_value <= p.upper_bound
