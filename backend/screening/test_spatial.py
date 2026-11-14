"""
Unit tests for the DeepShield Spatial Deepfake Detector & Grad-CAM Generator.
"""

import os
import tempfile
import cv2
import numpy as np
from django.test import TestCase
from .deepfake import SpatialDeepfakeDetector
from .gradcam import GradCAMGenerator


class SpatialDeepfakeTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.detector = SpatialDeepfakeDetector(device="cpu")
        cls.gradcam = GradCAMGenerator(cls.detector.model)

    def test_spatial_detector_prediction_on_crops(self):
        # Generate 3 synthetic face crops (224x224x3 uint8)
        crops = [
            np.full((224, 224, 3), 120, dtype=np.uint8),
            np.full((224, 224, 3), 160, dtype=np.uint8),
            np.full((224, 224, 3), 90, dtype=np.uint8)
        ]

        result = self.detector.predict(crops)
        self.assertEqual(result["channel"], "SPATIAL")
        self.assertIn("normalised_score", result)
        self.assertIn("raw_score", result)
        self.assertGreaterEqual(result["normalised_score"], 0.0)
        self.assertLessEqual(result["normalised_score"], 100.0)
        self.assertEqual(len(result["frame_scores"]), 3)
        self.assertIn(result["highest_risk_frame_idx"], [0, 1, 2])

    def test_gradcam_heatmap_generation(self):
        # Synthetic face crop
        crop = np.zeros((224, 224, 3), dtype=np.uint8)
        cv2.circle(crop, (112, 112), 60, (200, 180, 160), -1)

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            output_path = tmp.name

        try:
            saved_path = self.gradcam.generate(crop, output_path)
            self.assertTrue(os.path.exists(saved_path))
            self.assertGreater(os.path.getsize(saved_path), 1000)

            # Verify image dimensions
            img = cv2.imread(saved_path)
            self.assertEqual(img.shape, (224, 224, 3))
        finally:
            if os.path.exists(output_path):
                os.remove(output_path)

    def test_spatial_detector_empty_crops(self):
        result = self.detector.predict([])
        self.assertTrue(result["flagged"])
        self.assertEqual(result["normalised_score"], 75.0)
