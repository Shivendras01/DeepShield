"""
DeepShield Grad-CAM Saliency Map Generator.

Implements Confidence-Scaled Gradient-weighted Class Activation Mapping (Grad-CAM)
for EfficientNet-B0 to produce explainable visual evidence of spatial forgery.
Supports dual-mode visualization:
  - Low Risk (< 35): Verified Natural Biometrics (cool cyan/green subdued overlay)
  - High Risk (>= 35): Synthetic Anomaly Saliency (vivid red/amber heat alert)
"""

import os
from typing import Optional
import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAMGenerator:
    """
    Computes confidence-scaled Grad-CAM saliency heatmaps on flagged facial crops.
    """
    def __init__(self, detector_model):
        """
        :param detector_model: EfficientNetB0Classifier model instance.
        """
        self.model = detector_model
        self.device = next(self.model.parameters()).device

        # Target layer is the final convolutional block in EfficientNet-B0
        self.target_layer = self.model.backbone.features[-1]

        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None

        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0]

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate(
        self,
        face_crop_rgb: np.ndarray,
        output_path: str,
        score: float = 50.0,
        colormap: Optional[int] = None
    ) -> str:
        """
        Generates and saves a confidence-scaled Grad-CAM heatmap overlay onto the original face crop.

        :param face_crop_rgb: Original face crop image (224x224x3, uint8 RGB).
        :param output_path: File path where overlay image should be saved.
        :param score: Spatial fraud risk score (0.0 to 100.0). Scales saliency intensity.
        :param colormap: Optional OpenCV colormap override.
        :return: Saved file path.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        h, w, _ = face_crop_rgb.shape
        face_bgr = cv2.cvtColor(face_crop_rgb, cv2.COLOR_RGB2BGR)

        # 1. Forward & Backward tensor pass
        transform_input = face_crop_rgb.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        norm_img = (transform_input - mean) / std

        tensor = torch.from_numpy(norm_img.transpose(2, 0, 1)).unsqueeze(0).float().to(self.device)
        tensor.requires_grad = True

        self.model.zero_grad()
        output = self.model(tensor).squeeze()
        output.backward(retain_graph=True)

        if self.activations is None or self.gradients is None:
            # Fallback in case hooks failed
            cv2.imwrite(output_path, face_bgr)
            return output_path

        # 2. Compute raw Grad-CAM activation map
        grads = self.gradients.cpu().data.numpy()[0]
        acts = self.activations.cpu().data.numpy()[0]
        weights = np.mean(grads, axis=(1, 2))

        cam = np.zeros(acts.shape[1:], dtype=np.float32)
        for i, w_val in enumerate(weights):
            cam += w_val * acts[i]

        cam = np.maximum(cam, 0)
        cam_max = np.max(cam)
        if cam_max > 0:
            cam = cam / cam_max
        else:
            cam = np.zeros_like(cam)

        # Resize heatmap to match original crop dimensions (224x224)
        heatmap = cv2.resize(cam, (w, h))

        # 3. Confidence Scaling & Dual-Mode Saliency
        # Scale intensity by fraud probability (score / 100)
        fraud_prob = min(max(float(score) / 100.0, 0.0), 1.0)
        is_authentic = score < 35.0

        if is_authentic:
            # Cool verification mode: subdued cyan/emerald highlights
            active_colormap = colormap if colormap is not None else cv2.COLORMAP_SUMMER
            # Attenuate overlay intensity for authentic face so skin is natural and visible
            heatmap_scaled = np.uint8(255 * (heatmap * (0.15 + 0.35 * fraud_prob)))
            heatmap_colored = cv2.applyColorMap(heatmap_scaled, active_colormap)
            overlay = cv2.addWeighted(face_bgr, 0.85, heatmap_colored, 0.15, 0)
            badge_text = f"Verified: Natural Biometrics (Risk {score:.1f})"
            badge_color = (34, 197, 94)  # Tailwind emerald-500
        else:
            # Alert mode: high-contrast red/amber synthetic anomaly map
            active_colormap = colormap if colormap is not None else cv2.COLORMAP_JET
            heatmap_scaled = np.uint8(255 * (heatmap * (0.35 + 0.65 * fraud_prob)))
            heatmap_colored = cv2.applyColorMap(heatmap_scaled, active_colormap)
            overlay = cv2.addWeighted(face_bgr, 0.55, heatmap_colored, 0.45, 0)
            badge_text = f"Anomaly Saliency (Risk {score:.1f})"
            badge_color = (239, 68, 68)  # Tailwind red-500

        # 4. Render sleek forensic diagnostic badge on bottom
        cv2.rectangle(overlay, (0, h - 26), (w, h), (15, 23, 42), -1)
        # Small accent indicator dot
        cv2.circle(overlay, (12, h - 13), 4, badge_color, -1)
        cv2.putText(
            overlay,
            badge_text,
            (22, h - 9),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.36,
            (248, 250, 252),
            1,
            cv2.LINE_AA
        )

        cv2.imwrite(output_path, overlay)
        return output_path
