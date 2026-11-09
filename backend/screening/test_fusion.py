"""
Unit tests for the DeepShield Risk Fusion Engine.
"""

from django.test import TestCase
from .fusion import RiskFusionEngine


class RiskFusionEngineTests(TestCase):
    def setUp(self):
        self.engine = RiskFusionEngine(
            weight_spatial=0.50,
            weight_liveness=0.30,
            weight_telemetry=0.20
        )

    def test_clean_bona_fide_session(self):
        # All three channels nominal
        result = self.engine.fuse(
            spatial_score=8.0,
            liveness_score=12.0,
            telemetry_score=5.0
        )
        self.assertEqual(result["risk_band"], "LOW")
        self.assertFalse(result["escalated"])
        self.assertLess(result["fused_score"], 20.0)
        self.assertIn("normal review", result["recommendation"])

    def test_virtual_camera_injection_escalation(self):
        # Clean face and natural liveness, but injected via OBS virtual camera
        # Without escalation: 0.50*5 + 0.30*5 + 0.20*95 = 2.5 + 1.5 + 19 = 23.0 (which would be LOW!)
        # With escalation: Must bump to HIGH (>= 85.0)
        result = self.engine.fuse(
            spatial_score=5.0,
            liveness_score=5.0,
            telemetry_score=95.0,
            telemetry_meta={"virtual_camera_detected": True}
        )
        self.assertTrue(result["escalated"])
        self.assertEqual(result["risk_band"], "HIGH")
        self.assertGreaterEqual(result["fused_score"], 85.0)
        self.assertIn("Critical capture path bypass", result["escalation_reason"])

    def test_spatial_deepfake_escalation(self):
        # Genuine webcam, natural blinks, but face pixels are swapped by AI (Spatial = 92)
        result = self.engine.fuse(
            spatial_score=92.0,
            liveness_score=15.0,
            telemetry_score=5.0
        )
        self.assertTrue(result["escalated"])
        self.assertEqual(result["risk_band"], "HIGH")
        self.assertGreaterEqual(result["fused_score"], 82.0)
        self.assertIn("High-confidence synthetic facial manipulation", result["escalation_reason"])

    def test_dual_channel_corroboration_escalation(self):
        # Two channels moderately elevated (Spatial = 52, Liveness = 55)
        result = self.engine.fuse(
            spatial_score=52.0,
            liveness_score=55.0,
            telemetry_score=10.0
        )
        self.assertTrue(result["escalated"])
        self.assertEqual(result["risk_band"], "HIGH")
        self.assertGreaterEqual(result["fused_score"], 75.0)
        self.assertIn("Corroborating indicators", result["escalation_reason"])

    def test_score_normalization_flexibility(self):
        # Supports both [0, 1.0] fractions and [0, 100.0] percentages
        res_fraction = self.engine.fuse(spatial_score=0.20, liveness_score=0.20, telemetry_score=0.20)
        res_percent = self.engine.fuse(spatial_score=20.0, liveness_score=20.0, telemetry_score=20.0)
        self.assertEqual(res_fraction["fused_score"], res_percent["fused_score"])

    def test_invalid_weights_raise_error(self):
        with self.assertRaises(ValueError):
            RiskFusionEngine(weight_spatial=0.6, weight_liveness=0.6, weight_telemetry=0.1)
