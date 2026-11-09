"""
DeepShield Risk Fusion Engine.

Combines independent, normalized scores from the three detection channels:
  1. Spatial Deepfake Detection (s_s)
  2. Passive Liveness Dynamics (s_l)
  3. Capture & Stream Telemetry (s_t)

Implements weighted fusion with rule-based categorical escalation to prevent
severe single-channel threats from being diluted by benign channels.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class RiskBandConfig:
    LOW_MAX: float = 24.99
    GUARDED_MAX: float = 49.99
    ELEVATED_MAX: float = 74.99
    HIGH_MAX: float = 100.0


RISK_BAND_RECOMMENDATIONS = {
    "LOW": "No channel raised a material indicator. Proceed under normal review; retain audit record.",
    "GUARDED": "One channel mildly elevated; no corroboration. Proceed; retain evidence for later sampling.",
    "ELEVATED": "One strong indicator or two moderate ones. Manual review with per-channel evidence displayed.",
    "HIGH": "Strong indicator, or corroboration across channels. Escalate to specialist review; do not auto-decide."
}


class RiskFusionEngine:
    """
    Fuses multi-channel screening signals into a unified 0–100 Fraud Risk Score.
    """

    def __init__(
        self,
        weight_spatial: float = 0.50,
        weight_liveness: float = 0.30,
        weight_telemetry: float = 0.20,
        version: str = "v1.0-weighted-escalated"
    ):
        # Validate weights sum to 1.0
        total_weight = weight_spatial + weight_liveness + weight_telemetry
        if not abs(total_weight - 1.0) < 1e-4:
            raise ValueError(f"Fusion weights must sum to 1.0. Got {total_weight:.4f}")

        self.w_spatial = weight_spatial
        self.w_liveness = weight_liveness
        self.w_telemetry = weight_telemetry
        self.version = version

    @staticmethod
    def determine_risk_band(score: float) -> str:
        """
        Maps a 0.0–100.0 score to the 4 DeepShield risk tiers.
        """
        if score <= RiskBandConfig.LOW_MAX:
            return "LOW"
        elif score <= RiskBandConfig.GUARDED_MAX:
            return "GUARDED"
        elif score <= RiskBandConfig.ELEVATED_MAX:
            return "ELEVATED"
        return "HIGH"

    def fuse(
        self,
        spatial_score: float,
        liveness_score: float,
        telemetry_score: float,
        telemetry_meta: Optional[Dict[str, Any]] = None,
        spatial_meta: Optional[Dict[str, Any]] = None,
        liveness_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes weighted score fusion and applies rule-based categorical escalation.

        :param spatial_score: Normalized spatial risk score (0.0 to 100.0 or 0.0 to 1.0).
        :param liveness_score: Normalized liveness risk score (0.0 to 100.0 or 0.0 to 1.0).
        :param telemetry_score: Normalized telemetry risk score (0.0 to 100.0 or 0.0 to 1.0).
        :param telemetry_meta: Metadata dict from TelemetryEngine (e.g. virtual_camera_detected).
        :param spatial_meta: Metadata dict from spatial classifier.
        :param liveness_meta: Metadata dict from liveness analyzer.
        :return: Comprehensive fusion result dict.
        """
        # Ensure scores are on a 0.0 to 1.0 float scale for mathematical combination
        s_s = spatial_score / 100.0 if spatial_score > 1.0 else max(0.0, min(1.0, spatial_score))
        s_l = liveness_score / 100.0 if liveness_score > 1.0 else max(0.0, min(1.0, liveness_score))
        s_t = telemetry_score / 100.0 if telemetry_score > 1.0 else max(0.0, min(1.0, telemetry_score))

        telemetry_meta = telemetry_meta or {}
        spatial_meta = spatial_meta or {}
        liveness_meta = liveness_meta or {}

        # 1. Base Weighted Score (0.0 to 100.0)
        base_fused_score = 100.0 * (
            (self.w_spatial * s_s) +
            (self.w_liveness * s_l) +
            (self.w_telemetry * s_t)
        )

        final_score = base_fused_score
        escalated = False
        escalation_reasons = []

        # 2. Rule-Based Escalation Check:
        # Rule A: Virtual Camera / Software Device Injection (Critical Capture Path Bypass)
        is_virtual_cam = telemetry_meta.get("virtual_camera_detected", False)
        if is_virtual_cam or s_t >= 0.85:
            escalated = True
            final_score = max(final_score, 85.0)
            escalation_reasons.append("Critical capture path bypass: virtual camera or software driver detected.")

        # Rule B: High-Confidence Facial Deepfake Manipulation
        if s_s >= 0.85:
            escalated = True
            final_score = max(final_score, 82.0)
            escalation_reasons.append("High-confidence synthetic facial manipulation detected in visual frames.")

        # Rule C: Severe Passive Liveness Failure (e.g. static photo, zero blinks, frozen face)
        if s_l >= 0.85:
            escalated = True
            final_score = max(final_score, 78.0)
            escalation_reasons.append("Severe physiological liveness failure: static image or looped playback.")

        # Rule D: Multi-Channel Corroboration (Two or more channels moderately elevated >= 0.50)
        elevated_channels = sum([s_s >= 0.50, s_l >= 0.50, s_t >= 0.50])
        if elevated_channels >= 2 and final_score < 75.0:
            escalated = True
            final_score = max(final_score, 75.0)
            escalation_reasons.append("Corroborating indicators observed across multiple independent channels.")

        # Clamp final score between 0.0 and 100.0
        final_score = round(min(max(final_score, 0.0), 100.0), 1)
        risk_band = self.determine_risk_band(final_score)
        recommendation = RISK_BAND_RECOMMENDATIONS[risk_band]

        return {
            "fused_score": final_score,
            "base_score": round(base_fused_score, 1),
            "risk_band": risk_band,
            "escalated": escalated,
            "escalation_reason": "; ".join(escalation_reasons) if escalation_reasons else None,
            "recommendation": recommendation,
            "weights": {
                "spatial": self.w_spatial,
                "liveness": self.w_liveness,
                "telemetry": self.w_telemetry
            },
            "channel_contributions": {
                "spatial_contribution": round(self.w_spatial * s_s * 100.0, 1),
                "liveness_contribution": round(self.w_liveness * s_l * 100.0, 1),
                "telemetry_contribution": round(self.w_telemetry * s_t * 100.0, 1)
            },
            "fusion_version": self.version
        }
