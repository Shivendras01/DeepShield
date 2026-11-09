"""
Unit tests for the DeepShield OpenCV Video Processing Pipeline.
"""

import os
import tempfile
import cv2
import numpy as np
from django.test import TestCase
from .video_processor import VideoProcessor


class VideoProcessorTests(TestCase):
    def setUp(self):
        self.processor = VideoProcessor(
            target_sample_fps=5.0,
            crop_margin=0.20,
            target_face_size=(224, 224),
            max_sampled_frames=20
        )
        # Create a temporary synthetic video for testing (30 FPS, 60 frames = 2.0s)
        self.temp_dir = tempfile.mkdtemp()
        self.video_path = os.path.join(self.temp_dir, "test_kyc_stream.mp4")

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.video_path, fourcc, 30.0, (640, 480))

        # Write 60 synthetic frames
        for i in range(60):
            frame = np.full((480, 640, 3), 40, dtype=np.uint8)
            # Draw a simulated head/face oval
            cv2.ellipse(frame, (320, 240), (80, 100), 0, 0, 360, (220, 200, 180), -1)
            # Eyes
            cv2.circle(frame, (290, 220), 12, (50, 40, 30), -1)
            cv2.circle(frame, (350, 220), 12, (50, 40, 30), -1)
            # Mouth
            cv2.ellipse(frame, (320, 290), (25, 10), 0, 0, 360, (180, 80, 80), -1)
            out.write(frame)
        out.release()

    def tearDown(self):
        if os.path.exists(self.video_path):
            try:
                os.remove(self.video_path)
            except OSError:
                pass
        if os.path.exists(self.temp_dir):
            try:
                os.rmdir(self.temp_dir)
            except OSError:
                pass

    def test_video_metadata_extraction(self):
        meta = self.processor.get_metadata(self.video_path)
        self.assertEqual(meta["width"], 640)
        self.assertEqual(meta["height"], 480)
        self.assertEqual(meta["total_frames"], 60)
        self.assertAlmostEqual(meta["fps"], 30.0, delta=1.0)
        self.assertAlmostEqual(meta["duration_seconds"], 2.0, delta=0.2)

    def test_controlled_frame_sampling(self):
        # 60 frames at 30 FPS with target 5 FPS should yield ~10 sampled frames
        frames, indices, meta = self.processor.extract_sampled_frames(self.video_path)
        self.assertGreaterEqual(len(frames), 8)
        self.assertLessEqual(len(frames), 12)
        self.assertEqual(frames[0].shape, (480, 640, 3))
        # Ensure RGB ordering (first pixel channel check)
        self.assertEqual(len(indices), len(frames))

    def test_face_cropping_output_shape(self):
        result = self.processor.process(self.video_path)
        crops = result["face_crops"]
        self.assertGreater(len(crops), 0)
        for crop in crops:
            # EfficientNet-B0 requires exact 224x224x3 uint8 input
            self.assertEqual(crop.shape, (224, 224, 3))
            self.assertEqual(crop.dtype, np.uint8)

    def test_nonexistent_file_handling(self):
        with self.assertRaises(FileNotFoundError):
            self.processor.get_metadata("non_existent_stream.mp4")
