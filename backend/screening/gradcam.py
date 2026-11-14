"""
DeepShield Grad-CAM Saliency Map Generator.

Implements Gradient-weighted Class Activation Mapping (Grad-CAM)
for EfficientNet-B0 to produce explainable visual evidence of spatial forgery.
"""

import os
from typing import Optional
import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAMGenerator:
    """
    Computes post-hoc Grad-CAM saliency heatmaps on flagged facial crops.
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
        colormap: int = cv2.COLORMAP_JET
    ) -> str:
        """
        Generates and saves a Grad-CAM heatmap overlay onto the original face crop.

        :param face_crop_rgb: Original face crop image (224x224x3, uint8 RGB).
        :param output_path: File path where overlay image should be saved.
        :param colormap: OpenCV colormap for heatmap rendering.
        :return: Saved file path.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Prepare normalized tensor for single image
        transform_input = face_crop_rgb.astype(np.float32) / 255.0
        # ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        norm_img = (transform_input - mean) / std

        tensor = torch.from_numpy(norm_img.transpose(2, 0, 1)).unsqueeze(0).float().to(self.device)
        tensor.requires_grad = True

        # Forward pass
        self.model.zero_grad()
        output = self.model(tensor).squeeze()

        # Backward pass on the manipulation logit
        output.backward(retain_graph=True)

        if self.activations is None or self.gradients is None:
            # Fallback in case hooks failed: save raw crop
            cv2.imwrite(output_path, cv2.cvtColor(face_crop_rgb, cv2.COLOR_RGB2BGR))
            return output_path

        # Global average pooling of gradients: (batch, channels, H, W) -> (channels,)
        grads = self.gradients.cpu().data.numpy()[0]
        acts = self.activations.cpu().data.numpy()[0]

        weights = np.mean(grads, axis=(1, 2))  # Shape: (1280,)

        # Linear combination of activations weighted by gradient importance
        cam = np.zeros(acts.shape[1:], dtype=np.float32)  # Shape: (7, 7)
        for i, w in enumerate(weights):
            cam += w * acts[i]

        # Apply ReLU to retain only positive influence on fraud score
        cam = np.maximum(cam, 0)

        # Normalize between 0.0 and 1.0
        cam_max = np.max(cam)
        if cam_max > 0:
            cam = cam / cam_max
        else:
            cam = np.zeros_like(cam)

        # Resize heatmap to match original crop dimensions (224x224)
        h, w, _ = face_crop_rgb.shape
        heatmap = cv2.resize(cam, (w, h))

        # Convert heatmap to uint8 colormap (BGR for OpenCV)
        heatmap_uint8 = np.uint8(255 * heatmap)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, colormap)

        # Convert original face crop from RGB to BGR for blending
        face_bgr = cv2.cvtColor(face_crop_rgb, cv2.COLOR_RGB2BGR)

        # Alpha blend 60% original face + 40% Grad-CAM heatmap
        overlay = cv2.addWeighted(face_bgr, 0.60, heatmap_colored, 0.40, 0)

        # Draw explanatory diagnostic badge on bottom of frame
        cv2.rectangle(overlay, (0, h - 24), (w, h), (15, 23, 42), -1)
        cv2.putText(
            overlay,
            "DeepShield Grad-CAM Saliency",
            (8, h - 7),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )

        cv2.imwrite(output_path, overlay)
        return output_path
