"""
Unit tests for the DeepShield Telemetry Engine.
"""

from django.test import TestCase
import numpy as np
from .telemetry import TelemetryEngine


class TelemetryEngineTests(TestCase):
    def setUp(self):
        self.engine = TelemetryEngine(jitter_min_std_ms=1.0)

    def test_legitimate_hardware_camera(self):
        # 30 frames at ~30 FPS with normal physical hardware sensor jitter (std ~ 3.0ms)
        np.random.seed(42)
        intervals = np.random.normal(loc=33.3, scale=3.0, size=30)
        timestamps = list(np.cumsum(intervals))

        payload = {
            "device_label": "Integrated Camera (04f2:b6d9)",
            "timestamps_ms": timestamps
        }

        result = self.engine.evaluate(payload)
        self.assertFalse(result["virtual_camera_detected"])
        self.assertFalse(result["flagged"])
        self.assertLess(result["normalised_score"], 20.0)
        self.assertFalse(result["timing_analysis"]["is_unnatural_playback"])

    def test_obs_virtual_camera_detection(self):
        virtual_devices = [
            "OBS Virtual Camera",
            "ManyCam Video Source",
            "vMix Video Capture",
            "Snap Camera",
            "EpocCam",
            "Unity Virtual Camera"
        ]

        for device in virtual_devices:
            result = self.engine.evaluate({"device_label": device})
            self.assertTrue(result["virtual_camera_detected"], f"Failed to detect {device}")
            self.assertTrue(result["flagged"])
            self.assertGreaterEqual(result["normalised_score"], 90.0)

    def test_unnatural_playback_timing(self):
        # Perfectly synthetic 33.333ms intervals with 0.000ms jitter (pre-recorded video injection)
        timestamps = [i * 33.333 for i in range(25)]

        payload = {
            "device_label": "HD Pro Webcam C920",
            "timestamps_ms": timestamps
        }

        result = self.engine.evaluate(payload)
        self.assertFalse(result["virtual_camera_detected"])
        self.assertTrue(result["timing_analysis"]["is_unnatural_playback"])
        self.assertTrue(result["flagged"])
        self.assertGreaterEqual(result["normalised_score"], 70.0)

    def test_empty_and_corrupt_telemetry(self):
        # Empty payload handled safely
        empty_result = self.engine.evaluate({})
        self.assertFalse(empty_result["flagged"])
        self.assertFalse(empty_result["virtual_camera_detected"])
        self.assertFalse(empty_result["timing_analysis"]["timing_analyzed"])

        # Corrupted non-monotonic timestamps
        bad_result = self.engine.evaluate({
            "device_label": "Generic Camera",
            "timestamps_ms": [100, 50, 20]
        })
        self.assertFalse(bad_result["flagged"])
        self.assertFalse(bad_result["timing_analysis"]["timing_analyzed"])
