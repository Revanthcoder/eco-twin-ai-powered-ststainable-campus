"""
Telemetry Data Cleaning and Normalization Service.
Handles deduplication, physical range validation, missing readings,
freshness auditing, and resource intensity normalization.
"""

from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional
from app.config import config
from app.analytics.schemas import SensorReading, DataCleaningReport, NormalizedMetrics


def parse_timestamp(ts_str: str) -> datetime:
    """Safely parse ISO 8601 timestamp string into UTC datetime."""
    try:
        # Replace Z with UTC offset
        clean_str = ts_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


class TelemetryCleaner:
    """Performs rigorous cleaning and unit normalization on sensor streams."""

    def __init__(self):
        self.limits = config.anomaly.sensor_physical_limits
        self.stale_threshold_minutes = config.anomaly.stale_after_minutes

    def clean_readings(
        self,
        readings: List[SensorReading],
        now_dt: Optional[datetime] = None
    ) -> Tuple[List[SensorReading], DataCleaningReport]:
        """
        Cleans an input list of sensor readings:
        - Drops exact duplicates (sensor_id + timestamp).
        - Rejects impossible/unphysical values.
        - Audits time gaps between consecutive readings.
        - Identifies stale sensors.
        """
        now = now_dt or datetime.now(timezone.utc)
        total_received = len(readings)
        seen_keys = set()
        cleaned: List[SensorReading] = []
        
        duplicates_count = 0
        impossible_count = 0
        missing_intervals = 0
        stale_sensors = []
        actions: List[str] = []

        # Sort readings chronologically
        sorted_readings = sorted(readings, key=lambda r: parse_timestamp(r.measured_at))

        last_ts_by_sensor: Dict[str, datetime] = {}

        for r in sorted_readings:
            # 1. Deduplication check
            key = (r.sensor_id, r.measured_at)
            if key in seen_keys:
                duplicates_count += 1
                continue
            seen_keys.add(key)

            # 2. Impossible value check against physical boundaries
            metric_limit = self.limits.get(r.metric)
            if metric_limit:
                min_val = metric_limit.get("min", -1e9)
                max_val = metric_limit.get("max", 1e9)
                if r.value < min_val or r.value > max_val:
                    impossible_count += 1
                    actions.append(
                        f"Dropped reading for {r.sensor_id}: value {r.value} outside physical bounds [{min_val}, {max_val}]"
                    )
                    continue

            # 3. Missing time interval check (gap > 180s for IoT streams)
            current_ts = parse_timestamp(r.measured_at)
            if r.sensor_id in last_ts_by_sensor:
                prev_ts = last_ts_by_sensor[r.sensor_id]
                gap_seconds = (current_ts - prev_ts).total_seconds()
                if gap_seconds > 300: # 5 minute unexpected gap
                    missing_intervals += 1
                    actions.append(f"Telemetry downtime gap of {gap_seconds:.0f}s detected for {r.sensor_id}")

            last_ts_by_sensor[r.sensor_id] = current_ts
            cleaned.append(r)

        # 4. Freshness check against reference now
        for sensor_id, last_ts in last_ts_by_sensor.items():
            age_minutes = (now - last_ts).total_seconds() / 60.0
            if age_minutes > self.stale_threshold_minutes:
                stale_sensors.append(sensor_id)
                actions.append(
                    f"Sensor {sensor_id} flagged STALE: last reading arrived {age_minutes:.1f}m ago (> {self.stale_threshold_minutes}m threshold)"
                )

        report = DataCleaningReport(
            total_received=total_received,
            valid_count=len(cleaned),
            duplicates_removed=duplicates_count,
            impossible_values_rejected=impossible_count,
            missing_intervals_detected=missing_intervals,
            stale_sensors_flagged=stale_sensors,
            cleaning_actions=actions
        )

        return cleaned, report

    def compute_normalized_metrics(
        self,
        energy_kwh: Optional[float] = None,
        water_liters: Optional[float] = None,
        area_m2: Optional[float] = None,
        occupancy_count: Optional[int] = None
    ) -> Optional[NormalizedMetrics]:
        """Normalizes resource consumption into standardized building intensities."""
        energy_intensity = None
        water_intensity = None
        basis_parts = []

        if energy_kwh is not None and area_m2 is not None and area_m2 > 0:
            energy_intensity = round(energy_kwh / area_m2, 4)
            basis_parts.append(f"Energy: {energy_intensity} kWh/m² across {area_m2} m²")

        if water_liters is not None and occupancy_count is not None and occupancy_count > 0:
            water_intensity = round(water_liters / occupancy_count, 2)
            basis_parts.append(f"Water: {water_intensity} L/person for {occupancy_count} occupants")

        if not basis_parts:
            return None

        return NormalizedMetrics(
            energy_intensity_kwh_per_m2=energy_intensity,
            water_intensity_l_per_person=water_intensity,
            normalization_basis="; ".join(basis_parts)
        )


telemetry_cleaner = TelemetryCleaner()
