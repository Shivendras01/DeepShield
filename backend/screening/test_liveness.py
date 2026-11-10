"""
Unit tests for the DeepShield Passive Liveness Engine.
"""

import os
import tempfile
import numpy as np
from django.test import TestCase
from .liveness import LivenessAnalyzer, calculate_single_eye_ear, LEFT_EYE_INDICES


class LivenessEngineTests(TestCase):
    def setUp(self):
        self.analyzer = LivenessAnalyzer(ear_blink_threshold=0.21)

    def test_ear_mathematical_calculation(self):
        # 1. Synthesize an open eye (height = 30, width = 100 -> EAR = (30+30)/(2*100) = 0.30)
        open_eye_coords = np.zeros((500, 2), dtype=np.float32)
        open_eye_coords[LEFT_EYE_INDICES[0]] = [0, 50]    # p1 (outer)
        open_eye_coords[LEFT_EYE_INDICES[3]] = [100, 50]  # p4 (inner)
        open_eye_coords[LEFT_EYE_INDICES[1]] = [30, 35]   # p2
        open_eye_coords[LEFT_EYE_INDICES[5]] = [30, 65]   # p6 (dist = 30)
        open_eye_coords[LEFT_EYE_INDICES[2]] = [70, 35]   # p3
        open_eye_coords[LEFT_EYE_INDICES[4]] = [70, 65]   # p5 (dist = 30)

        open_ear = calculate_single_eye_ear(open_eye_coords, LEFT_EYE_INDICES)
        self.assertAlmostEqual(open_ear, 0.30, places=2)

        # 2. Synthesize a closed eye (height = 8, width = 100 -> EAR = (8+8)/(2*100) = 0.08)
        closed_eye_coords = np.zeros((500, 2), dtype=np.float32)
        closed_eye_coords[LEFT_EYE_INDICES[0]] = [0, 50]
        closed_eye_coords[LEFT_EYE_INDICES[3]] = [100, 50]
        closed_eye_coords[LEFT_EYE_INDICES[1]] = [30, 46]
        closed_eye_coords[LEFT_EYE_INDICES[5]] = [30, 54]  # dist = 8
        closed_eye_coords[LEFT_EYE_INDICES[2]] = [70, 46]
        closed_eye_coords[LEFT_EYE_INDICES[4]] = [70, 54]  # dist = 8

        closed_ear = calculate_single_eye_ear(closed_eye_coords, LEFT_EYE_INDICES)
        self.assertAlmostEqual(closed_ear, 0.08, places=2)
        self.assertLess(closed_ear, self.analyzer.ear_blink_threshold)

    def test_blink_counting_from_time_series(self):
        # Simulated EAR series: Open -> Blink 1 -> Open -> Blink 2 -> Open
        ear_series = [
            0.32, 0.31, 0.32,      # Open
            0.18, 0.15,            # Blink 1 (below 0.21)
            0.31, 0.30, 0.32,      # Open
            0.17,                  # Blink 2 (below 0.21)
            0.31, 0.30             # Open
        ]

        count, blink_frames = self.analyzer.count_blinks(ear_series)
        self.assertEqual(count, 2)
        self.assertEqual(len(blink_frames), 2)
        self.assertEqual(blink_frames[0], 3)
        self.assertEqual(blink_frames[1], 8)

    def test_ear_plot_generation(self):
        ear_series = [0.30, 0.31, 0.16, 0.30, 0.15, 0.31]
        blink_frames = [2, 4]

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            plot_path = tmp.name

        try:
            saved_path = self.analyzer.generate_ear_plot(ear_series, plot_path, blink_frames)
            self.assertTrue(os.path.exists(saved_path))
            self.assertGreater(os.path.getsize(saved_path), 1000)
        finally:
            if os.path.exists(plot_path):
                os.remove(plot_path)

    def test_empty_sequence_handling(self):
        result = self.analyzer.analyze_sequence([])
        self.assertTrue(result["flagged"])
        self.assertGreaterEqual(result["normalised_score"], 80.0)
        self.assertEqual(result["blink_count"], 0)
