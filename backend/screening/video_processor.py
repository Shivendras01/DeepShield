"""
DeepShield Video Processing Pipeline.

Uses OpenCV to decode video streams, perform controlled frame sampling,
detect faces, and extract normalized face crops with configurable margin
to capture manipulation blending boundaries.
"""

import os
from typing import Dict, Any, List, Tuple, Optional
import cv2
import numpy as np


class VideoProcessor:
    """
    Handles video decoding, stride-based frame extraction, and face-crop normalization.
    """

    def __init__(
        self,
        target_sample_fps: float = 5.0,
        crop_margin: float = 0.20,
        target_face_size: Tuple[int, int] = (224, 224),
        max_sampled_frames: int = 30
    ):
        """
        :param target_sample_fps: Number of frames to extract per second of video.
        :param crop_margin: Percentage margin added around detected face bbox (0.20 = 20%).
        :param target_face_size: Output resolution for face crops (width, height).
        :param max_sampled_frames: Hard ceiling on sampled frames to bound compute time.
        """
        self.target_sample_fps = target_sample_fps
        self.crop_margin = crop_margin
        self.target_face_size = target_face_size
        self.max_sampled_frames = max_sampled_frames

        # Load OpenCV's built-in frontal face cascade detector with safe fallback
        haarcascade_dir = getattr(cv2.data, 'haarcascades', '')
        cascade_path = os.path.join(haarcascade_dir, "haarcascade_frontalface_default.xml")
        if os.path.exists(cascade_path):
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            self.face_cascade = None

    def get_metadata(self, video_path: str) -> Dict[str, Any]:
        """
        Extracts stream metadata without decoding all frames.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"OpenCV could not open video file: {video_path}")

        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration_s = round(total_frames / fps, 2) if fps > 0 and total_frames > 0 else 0.0

            return {
                "fps": round(fps, 2),
                "total_frames": total_frames,
                "width": width,
                "height": height,
                "duration_seconds": duration_s
            }
        finally:
            cap.release()

    def extract_sampled_frames(self, video_path: str) -> Tuple[List[np.ndarray], List[int], Dict[str, Any]]:
        """
        Extracts frames at a controlled stride (e.g. 5 FPS) converted to RGB.
        :return: (frames_rgb_list, frame_indices_list, metadata)
        """
        metadata = self.get_metadata(video_path)
        fps = metadata["fps"]
        stride = max(1, int(round(fps / self.target_sample_fps)))

        cap = cv2.VideoCapture(video_path)
        frames_rgb = []
        indices = []
        current_frame_idx = 0

        try:
            while cap.isOpened() and len(frames_rgb) < self.max_sampled_frames:
                ret, frame_bgr = cap.read()
                if not ret:
                    break

                if current_frame_idx % stride == 0:
                    # Convert OpenCV default BGR to RGB
                    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                    frames_rgb.append(frame_rgb)
                    indices.append(current_frame_idx)

                current_frame_idx += 1

            return frames_rgb, indices, metadata
        finally:
            cap.release()

    def crop_face_with_margin(
        self,
        frame_rgb: np.ndarray,
        bbox: Tuple[int, int, int, int]
    ) -> np.ndarray:
        """
        Expands face bounding box by crop_margin to retain facial blending boundaries,
        then resizes to target_face_size (224x224).
        """
        h_img, w_img, _ = frame_rgb.shape
        x, y, w, h = bbox

        # Margin expansion
        margin_x = int(w * self.crop_margin)
        margin_y = int(h * self.crop_margin)

        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(w_img, x + w + margin_x)
        y2 = min(h_img, y + h + margin_y)

        cropped = frame_rgb[y1:y2, x1:x2]
        if cropped.size == 0:
            return cv2.resize(frame_rgb, self.target_face_size)

        return cv2.resize(cropped, self.target_face_size, interpolation=cv2.INTER_LINEAR)

    def extract_face_crops(
        self,
        frames_rgb: List[np.ndarray]
    ) -> Tuple[List[np.ndarray], List[Optional[Tuple[int, int, int, int]]]]:
        """
        Detects primary face in each frame and returns normalized 224x224 face crops.
        """
        face_crops = []
        bboxes = []

        for frame in frames_rgb:
            detected_faces = []
            if self.face_cascade is not None:
                gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
                detected_faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=4,
                    minSize=(50, 50)
                )

            if len(detected_faces) > 0:
                # Select largest face by area (primary KYC applicant)
                largest_face = max(detected_faces, key=lambda b: b[2] * b[3])
                crop = self.crop_face_with_margin(frame, tuple(largest_face))
                face_crops.append(crop)
                bboxes.append(tuple(largest_face))
            else:
                # Fallback: center crop for off-angle frames or fallback mode
                h, w, _ = frame.shape
                min_dim = min(h, w)
                center_y, center_x = h // 2, w // 2
                x1 = max(0, center_x - min_dim // 2)
                y1 = max(0, center_y - min_dim // 2)
                center_crop = frame[y1:y1 + min_dim, x1:x1 + min_dim]
                face_crops.append(cv2.resize(center_crop, self.target_face_size))
                bboxes.append(None)

        return face_crops, bboxes

    def process(self, video_path: str) -> Dict[str, Any]:
        """
        High-level pipeline method: reads video, samples frames, and crops faces.
        """
        frames_rgb, indices, metadata = self.extract_sampled_frames(video_path)
        face_crops, bboxes = self.extract_face_crops(frames_rgb)

        faces_detected_count = sum(1 for b in bboxes if b is not None)

        return {
            "metadata": {
                **metadata,
                "frames_sampled": len(frames_rgb),
                "faces_detected": faces_detected_count,
                "crop_margin": self.crop_margin,
                "target_face_size": self.target_face_size
            },
            "sampled_frames": frames_rgb,
            "face_crops": face_crops,
            "frame_indices": indices,
            "bounding_boxes": bboxes
        }
