"""
DeepShield Telemetry Engine — Video Injection Detection.

Analyzes capture-path telemetry metadata to detect virtual cameras, software loopback drivers,
and synthetic frame-timing regularity (indicating pre-recorded video injection).
"""

import re
from typing import Dict, Any, List, Optional
import numpy as np


# Blacklist of known virtual camera signatures and software loopback drivers
VIRTUAL_CAMERA_SIGNATURES = [
    r"obs(?:-|\s+)?(?:virtual)?(?:-|\s+)?camera",
    r"manycam",
    r"vmix\s*video",
    r"xsplit\s*vcam",
    r"camtwist",
    r"snap\s*camera",
    r"chromacam",
    r"epoccam",
    r"droidcam",
    r"ivcam",
    r"iriun\s*webcam",
    r"fake\s*camera",
    r"virtual\s*(?:web)?cam",
    r"software\s*camera",
    r"unity\s*virtual\s*camera",
    r"screen-capture-recorder",
]

COMPILED_VIRTUAL_CAM_PATTERNS = [
    re.compile(pattern, re.IGNORECASE) for pattern in VIRTUAL_CAMERA_SIGNATURES
]


class TelemetryEngine:
    """
    Evaluates capture path and stream telemetry to identify video injection attacks.
    """

    def __init__(
        self,
        jitter_min_std_ms: float = 1.0,
        expected_nominal_fps: float = 30.0
    ):
        """
        :param jitter_min_std_ms: Minimum expected std-dev of frame intervals in ms for genuine hardware.
                                 Below this threshold, video is flagged as unnaturally regular (prerecorded playback).
        :param expected_nominal_fps: Default reference frame rate.
        """
        self.jitter_min_std_ms = jitter_min_std_ms
        self.expected_nominal_fps = expected_nominal_fps

    def check_device_identity(self, device_label: str) -> Dict[str, Any]:
        """
        Checks camera device name against known virtual camera drivers.
        """
        if not device_label or not isinstance(device_label, str):
            return {
                "is_virtual": False,
                "confidence": 0.0,
                "matched_pattern": None,
                "reason": "No device label provided by client"
            }

        cleaned_label = device_label.strip()
        for pattern in COMPILED_VIRTUAL_CAM_PATTERNS:
            match = pattern.search(cleaned_label)
            if match:
                return {
                    "is_virtual": True,
                    "confidence": 0.98,
                    "matched_pattern": match.group(0),
                    "reason": f"Known virtual camera signature detected: '{match.group(0)}'"
                }

        return {
            "is_virtual": False,
            "confidence": 0.85,
            "matched_pattern": None,
            "reason": f"Device label '{cleaned_label}' does not match known virtual camera patterns"
        }

    def analyze_frame_timing(self, timestamps_ms: Optional[List[float]]) -> Dict[str, Any]:
        """
        Analyzes timestamp intervals between consecutive frames.
        Real hardware sensors exhibit micro-jitter; prerecorded injected loops
        frequently produce zero-variance or unnaturally static intervals.
        """
        if not timestamps_ms or len(timestamps_ms) < 10:
            return {
                "timing_analyzed": False,
                "is_unnatural_playback": False,
                "mean_interval_ms": None,
                "jitter_std_ms": None,
                "effective_fps": None,
                "reason": "Insufficient frame timestamp samples (minimum 10 frames required)"
            }

        intervals = np.diff(timestamps_ms)
        # Filter out non-positive intervals (timestamp anomalies or duplicate frames)
        valid_intervals = intervals[intervals > 0]

        if len(valid_intervals) < 8:
            return {
                "timing_analyzed": False,
                "is_unnatural_playback": False,
                "mean_interval_ms": None,
                "jitter_std_ms": None,
                "effective_fps": None,
                "reason": "Irregular or non-monotonic timestamps provided"
            }

        mean_interval = float(np.mean(valid_intervals))
        std_interval = float(np.std(valid_intervals))
        effective_fps = float(1000.0 / mean_interval) if mean_interval > 0 else 0.0

        # Pre-recorded injection playback check: std deviation unnaturally close to 0
        is_unnatural_playback = std_interval < self.jitter_min_std_ms

        reason = (
            f"Unnaturally rigid frame intervals (std={std_interval:.2f}ms < {self.jitter_min_std_ms}ms) "
            f"indicative of software/prerecorded playback."
            if is_unnatural_playback else
            f"Natural frame-rate jitter observed (std={std_interval:.2f}ms at {effective_fps:.1f} FPS)."
        )

        return {
            "timing_analyzed": True,
            "is_unnatural_playback": is_unnatural_playback,
            "mean_interval_ms": round(mean_interval, 2),
            "jitter_std_ms": round(std_interval, 3),
            "effective_fps": round(effective_fps, 1),
            "sample_count": len(valid_intervals),
            "reason": reason
        }

    def evaluate(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregates device identity, timing analysis, and metadata into a normalized telemetry score.
        :param telemetry: Dict containing 'device_label', 'timestamps_ms', 'resolution', etc.
        :return: Dict containing raw_score, normalised_score (0-100), flagged, and diagnostic details.
        """
        telemetry = telemetry or {}
        device_label = telemetry.get("device_label", "")
        timestamps = telemetry.get("timestamps_ms", [])

        # 1. Device identity check
        device_check = self.check_device_identity(device_label)

        # 2. Frame timing regularity check
        timing_check = self.analyze_frame_timing(timestamps)

        # 3. Compute heuristic risk score (0.0 to 100.0)
        risk_score = 5.0
        reasons = []

        if device_check["is_virtual"]:
            # Virtual camera is a severe red flag for KYC
            risk_score = 95.0
            reasons.append(device_check["reason"])
        else:
            reasons.append(device_check["reason"])

        if timing_check["timing_analyzed"] and timing_check["is_unnatural_playback"]:
            # Add risk for synthetic / software playback timing
            risk_score = max(risk_score, 75.0)
            reasons.append(timing_check["reason"])
        elif timing_check["timing_analyzed"]:
            reasons.append(timing_check["reason"])

        # Cap between 0.0 and 100.0
        normalised_score = min(max(risk_score, 0.0), 100.0)
        raw_score = normalised_score / 100.0
        flagged = normalised_score >= 50.0

        return {
            "channel": "TELEMETRY",
            "raw_score": round(raw_score, 4),
            "normalised_score": round(normalised_score, 1),
            "flagged": flagged,
            "virtual_camera_detected": device_check["is_virtual"],
            "device_identity": device_check,
            "timing_analysis": timing_check,
            "reasons": reasons,
            "notes": "; ".join(reasons)
        }
