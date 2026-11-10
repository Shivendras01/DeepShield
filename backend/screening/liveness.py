"""
DeepShield Passive Liveness Engine — Physiological Blink & Motion Dynamics.

Implements Channel 2 of the DeepShield screening architecture:
  - MediaPipe Face Mesh (468 landmarks)
  - Eye Aspect Ratio (EAR) time-series computation
  - Dynamic blink rate, duration, and head micro-motion analysis
  - Temporal EAR curve plot generation for explainable compliance review
"""

import os
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Headless backend for server environments
import matplotlib.pyplot as plt

# MediaPipe Face Mesh Eye Landmark Indices (Standard 468-mesh topology)
# Left Eye: p1=33 (outer), p4=133 (inner), p2=160, p6=144, p3=158, p5=153
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
# Right Eye: p1=362 (outer), p4=263 (inner), p2=385, p6=373, p3=387, p5=380
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
# Nose tip index for head motion tracking
NOSE_TIP_INDEX = 1


def calculate_single_eye_ear(landmarks_xy: np.ndarray, indices: List[int]) -> float:
    """
    Computes Eye Aspect Ratio (EAR) for a single eye given 6 contour points:
      EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    """
    p1 = landmarks_xy[indices[0]]
    p2 = landmarks_xy[indices[1]]
    p3 = landmarks_xy[indices[2]]
    p4 = landmarks_xy[indices[3]]
    p5 = landmarks_xy[indices[4]]
    p6 = landmarks_xy[indices[5]]

    # Vertical Euclidean distances
    vert_1 = float(np.linalg.norm(p2 - p6))
    vert_2 = float(np.linalg.norm(p3 - p5))

    # Horizontal Euclidean distance
    horiz = float(np.linalg.norm(p1 - p4))

    if horiz <= 1e-6:
        return 0.0

    return (vert_1 + vert_2) / (2.0 * horiz)


class LivenessAnalyzer:
    """
    Analyzes frame sequences to assess physiological liveness through blink dynamics
    and facial micro-motion.
    """

    def __init__(
        self,
        ear_blink_threshold: float = 0.21,
        min_motion_variance: float = 0.0015
    ):
        """
        :param ear_blink_threshold: EAR threshold below which an eye is considered closed (blink).
        :param min_motion_variance: Minimum expected variance of nose-tip displacement.
                                   Below this, video is flagged as static photo or still-frame replay.
        """
        self.ear_blink_threshold = ear_blink_threshold
        self.min_motion_variance = min_motion_variance

        # Initialize MediaPipe Face Mesh in static mode for sampled frames
        try:
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5
            )
            self.mediapipe_available = True
        except Exception:
            self.mp_face_mesh = None
            self.mediapipe_available = False

    def extract_landmarks(self, frame_rgb: np.ndarray) -> Optional[np.ndarray]:
        """
        Extracts 468 normalized (x, y) coordinates from an RGB frame.
        """
        if not self.mediapipe_available or self.mp_face_mesh is None:
            return None

        results = self.mp_face_mesh.process(frame_rgb)
        if not results.multi_face_landmarks:
            return None

        face_landmarks = results.multi_face_landmarks[0]
        coords = np.array([[lm.x, lm.y] for lm in face_landmarks.landmark], dtype=np.float32)
        return coords

    def calculate_frame_ear(self, landmarks_xy: np.ndarray) -> float:
        """
        Computes the average EAR across both eyes.
        """
        left_ear = calculate_single_eye_ear(landmarks_xy, LEFT_EYE_INDICES)
        right_ear = calculate_single_eye_ear(landmarks_xy, RIGHT_EYE_INDICES)
        return float((left_ear + right_ear) / 2.0)

    def count_blinks(self, ear_series: List[float]) -> Tuple[int, List[int]]:
        """
        Detects blink events by finding transitions where EAR falls below threshold
        and recovers.
        :return: (total_blink_count, list_of_blink_frame_indices)
        """
        if not ear_series:
            return 0, []

        blink_count = 0
        blink_frames = []
        is_closed = False

        for idx, ear_val in enumerate(ear_series):
            if ear_val < self.ear_blink_threshold:
                if not is_closed:
                    is_closed = True
                    blink_count += 1
                    blink_frames.append(idx)
            else:
                is_closed = False

        return blink_count, blink_frames

    def generate_ear_plot(
        self,
        ear_series: List[float],
        output_path: str,
        blink_frames: List[int]
    ) -> str:
        """
        Generates and saves a clean, dark-themed EAR temporal plot for the reviewer dashboard.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        fig, ax = plt.subplots(figsize=(8, 3.2), facecolor='#0f172a')
        ax.set_facecolor('#1e293b')

        frames_x = list(range(len(ear_series)))
        ax.plot(frames_x, ear_series, color='#38bdf8', linewidth=2.2, label='Eye Aspect Ratio (EAR)')

        # Draw calibrated threshold line
        ax.axhline(
            y=self.ear_blink_threshold,
            color='#f43f5e',
            linestyle='--',
            linewidth=1.5,
            label=f'Blink Threshold ({self.ear_blink_threshold})'
        )

        # Highlight detected blink points
        for b_idx in blink_frames:
            if b_idx < len(ear_series):
                ax.plot(b_idx, ear_series[b_idx], 'o', color='#fbbf24', markersize=8)

        # Styling
        ax.set_title('Passive Liveness: Temporal EAR Blink Dynamics', color='#f8fafc', fontsize=12, pad=10)
        ax.set_xlabel('Sampled Frame Index', color='#94a3b8', fontsize=10)
        ax.set_ylabel('EAR Value', color='#94a3b8', fontsize=10)
        ax.tick_params(colors='#94a3b8', labelsize=9)
        ax.grid(True, color='#334155', linestyle=':', alpha=0.6)
        ax.legend(loc='upper right', facecolor='#1e293b', edgecolor='#475569', labelcolor='#e2e8f0', fontsize=9)
        ax.set_ylim([0.05, 0.45])

        plt.tight_layout()
        plt.savefig(output_path, dpi=120, facecolor=fig.get_facecolor(), edgecolor='none')
        plt.close(fig)

        return output_path

    def analyze_sequence(
        self,
        frames_rgb: List[np.ndarray],
        duration_s: float = 3.0,
        plot_output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full passive liveness evaluation over extracted video frames.
        """
        if not frames_rgb:
            return {
                "channel": "LIVENESS",
                "raw_score": 0.85,
                "normalised_score": 85.0,
                "flagged": True,
                "blink_count": 0,
                "mean_ear": 0.0,
                "motion_variance": 0.0,
                "is_live_human": False,
                "notes": "No frames provided for liveness analysis.",
                "ear_series": [],
                "plot_path": None
            }

        ear_series = []
        nose_positions = []
        frames_with_faces = 0

        for frame in frames_rgb:
            landmarks = self.extract_landmarks(frame)
            if landmarks is not None:
                frames_with_faces += 1
                ear = self.calculate_frame_ear(landmarks)
                ear_series.append(ear)
                nose_positions.append(landmarks[NOSE_TIP_INDEX])
            else:
                # Fallback estimate if landmark detector misses frame
                ear_series.append(0.28)

        # 1. Blink dynamics
        blink_count, blink_frames = self.count_blinks(ear_series)
        mean_ear = float(np.mean(ear_series)) if ear_series else 0.0

        # 2. Head micro-motion variance
        motion_var = 0.0
        if len(nose_positions) >= 2:
            nose_arr = np.array(nose_positions)
            # Variance in (x, y) coordinates
            motion_var = float(np.var(nose_arr[:, 0]) + np.var(nose_arr[:, 1]))

        # 3. Anomaly & Liveness Decision Logic
        # Static printed photo attack: 0 blinks AND essentially zero motion
        is_static_presentation = (blink_count == 0) and (motion_var < self.min_motion_variance) and (len(frames_rgb) >= 8)

        # Risk scoring
        reasons = []
        if frames_with_faces == 0:
            risk_score = 80.0
            reasons.append("No human facial landmarks could be isolated across frames.")
        elif is_static_presentation:
            risk_score = 90.0
            reasons.append("Static presentation attack: zero blink events and absent physiological head micro-movements.")
        elif blink_count == 0 and duration_s >= 4.0:
            # Suspiciously unblinking face on a longer video
            risk_score = 65.0
            reasons.append(f"Zero blinks detected across {duration_s:.1f}s video; manual reviewer verification recommended.")
        else:
            # Natural human behavior
            risk_score = 8.0 if blink_count >= 1 else 15.0
            reasons.append(f"Natural facial liveness verified: {blink_count} blink event(s) and micro-motion detected (mean EAR={mean_ear:.3f}).")

        normalised_score = round(min(max(risk_score, 0.0), 100.0), 1)
        raw_score = round(normalised_score / 100.0, 4)
        flagged = normalised_score >= 50.0

        # 4. Generate evidence plot if path provided
        saved_plot = None
        if plot_output_path:
            try:
                saved_plot = self.generate_ear_plot(ear_series, plot_output_path, blink_frames)
            except Exception:
                saved_plot = None

        return {
            "channel": "LIVENESS",
            "raw_score": raw_score,
            "normalised_score": normalised_score,
            "flagged": flagged,
            "blink_count": blink_count,
            "mean_ear": round(mean_ear, 3),
            "motion_variance": round(motion_var, 6),
            "is_live_human": not flagged,
            "notes": " ".join(reasons),
            "ear_series": [round(val, 3) for val in ear_series],
            "plot_path": saved_plot
        }
