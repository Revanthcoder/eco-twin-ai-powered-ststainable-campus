"""
Telemetry Forecasting Service.
Implements honest baseline and linear regression forecasting with explicit
uncertainty bounds and documented limitations.
Adheres to PDF: "Synthetic data cannot establish real-world predictive accuracy."
"""

import math
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.analytics.schemas import SensorReading, ForecastResponse, ForecastPoint
from app.analytics.cleaning import parse_timestamp


class TelemetryForecaster:
    """Forecasting engine with strict data sufficiency checks and uncertainty reporting."""

    MIN_READINGS_REQUIRED = 5

    def generate_forecast(
        self,
        readings: List[SensorReading],
        horizon_steps: int = 5,
        step_minutes: int = 15
    ) -> ForecastResponse:
        """
        Projects future values only when sufficient historical points exist.
        Returns explicit limitation when data is insufficient.
        """
        if len(readings) < self.MIN_READINGS_REQUIRED:
            return ForecastResponse(
                forecast_available=False,
                model_type="none",
                horizon_steps=0,
                r_squared=None,
                predictions=[],
                limitations=[
                    f"Insufficient historical data: received {len(readings)} points, but at least {self.MIN_READINGS_REQUIRED} are required for regression.",
                    "Synthetic or truncated data cannot establish real-world predictive accuracy.",
                    "Forecasting withheld until adequate baseline readings accumulate."
                ]
            )

        # Sort readings by time
        sorted_r = sorted(readings, key=lambda r: parse_timestamp(r.measured_at))
        
        # Numerical time indices x = [0, 1, ..., n-1]
        n = len(sorted_r)
        x = list(range(n))
        y = [r.value for r in sorted_r]

        mean_x = sum(x) / n
        mean_y = sum(y) / n

        # Ordinary Least Squares (OLS) Linear Regression
        numer = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        denom = sum((x[i] - mean_x) ** 2 for i in range(n))

        if denom == 0:
            slope = 0.0
            intercept = mean_y
            r_squared = 0.0
        else:
            slope = numer / denom
            intercept = mean_y - slope * mean_x

            # R-squared calculation
            ss_tot = sum((y[i] - mean_y) ** 2 for i in range(n))
            ss_res = sum((y[i] - (slope * x[i] + intercept)) ** 2 for i in range(n))
            r_squared = max(0.0, round(1.0 - (ss_res / (ss_tot or 1.0)), 3))

        # Standard error of residuals for 95% confidence interval
        residuals = [y[i] - (slope * x[i] + intercept) for i in range(n)]
        var_res = sum(e ** 2 for e in residuals) / max(1, n - 2)
        std_err = math.sqrt(var_res)

        last_ts = parse_timestamp(sorted_r[-1].measured_at)
        predictions: List[ForecastPoint] = []

        for step in range(1, horizon_steps + 1):
            future_idx = (n - 1) + step
            pred_val = round(max(0.0, slope * future_idx + intercept), 2)
            
            # Uncertainty widens with horizon distance
            uncertainty_margin = round(1.96 * std_err * math.sqrt(1 + 1/n + ((future_idx - mean_x)**2)/max(1.0, denom)), 2)
            lower = round(max(0.0, pred_val - uncertainty_margin), 2)
            upper = round(pred_val + uncertainty_margin, 2)

            future_ts = (last_ts + timedelta(minutes=step * step_minutes)).isoformat() + "Z"
            predictions.append(ForecastPoint(
                timestamp=future_ts,
                predicted_value=pred_val,
                lower_bound=lower,
                upper_bound=upper
            ))

        return ForecastResponse(
            forecast_available=True,
            model_type="Ordinary Least Squares (OLS) with 95% Confidence Envelope",
            horizon_steps=horizon_steps,
            r_squared=r_squared,
            predictions=predictions,
            limitations=[
                "Linear regression assumes steady state building operations without sudden schedule shifts.",
                "Uncertainty envelope widens further out in the horizon.",
                "Weather fluctuations and holiday breaks are not accounted for in basic telemetry regression."
            ]
        )


telemetry_forecaster = TelemetryForecaster()
