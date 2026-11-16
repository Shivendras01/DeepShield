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
    LOW_MAX: float = 24.99       # < 25.0: Policy Auto-Approved
    GUARDED_MAX: float = 60.0    # 25.0 to 60.0: Grey-Area Manual Officer Review Required
    HIGH_MAX: float = 100.0      # > 60.0: Policy Auto-Rejected


RISK_BAND_RECOMMENDATIONS = {
    "LOW": "Low fraud risk (<25.0). Auto-approved under normal review policy; direct onboarding permitted.",
    "GUARDED": "Grey-area fraud risk (25.0–60.0). Compliance officer manual review required.",
    "HIGH": "High fraud risk (>60.0). Automatically rejected by security policy; retained for forensic audit."
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
        Maps a 0.0–100.0 score to DeepShield risk tiers:
        - < 25.0: LOW (Auto-Approved)
        - 25.0 to 60.0: GUARDED (Manual Officer Review Required)
        - > 60.0: HIGH (Auto-Rejected)
        """
        if score < 25.0:
            return "LOW"
        elif score <= 60.0:
            return "GUARDED"
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
        is_hard_block = False
        block_type = None

        # 2. Hierarchical Gating & Rule-Based Escalation Check:
        # Gate 1: Virtual Camera / Pre-recorded File Injection (Critical Capture Path Bypass)
        is_virtual_cam = telemetry_meta.get("virtual_camera_detected", False)
        is_file_upload = telemetry_meta.get("is_file_upload", False)
        is_pad_attack = liveness_meta.get("presentation_attack_detected", False)

        if is_file_upload or is_virtual_cam or s_t >= 0.85:
            escalated = True
            is_hard_block = True
            block_type = "VIRTUAL_CAMERA_INJECTION"
            final_score = 100.0
            if is_file_upload:
                escalation_reasons.append("Critical Gate 1 Failure: Pre-recorded video injection detected. File upload bypasses physical camera sensor.")
            else:
                escalation_reasons.append("Critical capture path bypass: virtual camera or software driver detected (Gate 1 Failure).")

        # Gate 2: Presentation Attack Detection (Digital Screen Replay or Static Spoofing)
        elif is_pad_attack or s_l >= 0.90:
            escalated = True
            is_hard_block = True
            block_type = "PRESENTATION_ATTACK_REPLAY"
            final_score = 100.0
            attack_desc = liveness_meta.get("attack_type", "digital screen replay or static spoof")
            escalation_reasons.append(f"Critical presentation attack: {attack_desc} detected via multi-spectral PAD analysis.")

        # Rule C: High-Confidence Facial Deepfake Manipulation / Spatial Alert
        if s_s >= 0.75 and not is_hard_block:
            escalated = True
            final_score = max(final_score, 82.0)
            escalation_reasons.append(f"High-confidence synthetic facial manipulation detected in visual frames (score={spatial_score:.1f}).")

        # Rule D: Severe Passive Liveness Failure (e.g. static photo, zero blinks, frozen face)
        if s_l >= 0.70 and not is_pad_attack and not is_hard_block:
            escalated = True
            final_score = max(final_score, 78.0)
            escalation_reasons.append("Severe physiological liveness failure: static image or unblinking playback.")

        # Rule E: Multi-Channel Corroboration (Two or more channels moderately elevated >= 0.50)
        elevated_channels = sum([s_s >= 0.50, s_l >= 0.50, s_t >= 0.50])
        if elevated_channels >= 2 and final_score < 75.0 and not is_hard_block:
            escalated = True
            final_score = max(final_score, 75.0)
            escalation_reasons.append("Corroborating indicators observed across multiple independent channels.")

        # Clamp final score between 0.0 and 100.0
        final_score = round(min(max(final_score, 0.0), 100.0), 1)
        risk_band = self.determine_risk_band(final_score)

        # Three-tier Policy Decision Rule:
        # 1. < 25.0: Auto-Approved
        # 2. > 60.0 or Hard Block: Auto-Rejected
        # 3. 25.0 - 60.0: Requires Manual Officer Review
        if is_hard_block or final_score > 60.0:
            policy_decision = "AUTO_REJECTED"
        elif final_score < 25.0:
            policy_decision = "AUTO_APPROVED"
        else:
            policy_decision = "REQUIRES_OFFICER_REVIEW"

        recommendation = (
            "CRITICAL SECURITY BLOCK: Immediate auto-rejection. Physical presentation attack or virtual camera injection detected."
            if is_hard_block else RISK_BAND_RECOMMENDATIONS[risk_band]
        )

        return {
            "fused_score": final_score,
            "base_score": round(base_fused_score, 1),
            "risk_band": risk_band,
            "policy_decision": policy_decision,
            "escalated": escalated,
            "is_hard_block": is_hard_block,
            "block_type": block_type,
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
