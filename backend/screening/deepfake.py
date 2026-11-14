"""
DeepShield Spatial Deepfake Detection Engine.

Implements Channel 1 of the DeepShield screening architecture:
  - EfficientNet-B0 convolutional feature backbone
  - Transfer-learning binary classification head (authentic vs. manipulated face crops)
  - Frame-to-video score aggregation (mean, top-k, and 90th percentile)
"""

import os
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image


class EfficientNetB0Classifier(nn.Module):
    """
    EfficientNet-B0 adapted with a binary classification head for deepfake detection.
    """
    def __init__(self, pretrained: bool = True):
        super().__init__()
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        self.backbone = models.efficientnet_b0(weights=weights)

        # Replace 1000-class ImageNet head with binary fraud classifier
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, 1)  # Logit for binary classification
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)


class SpatialDeepfakeDetector:
    """
    Orchestrates batch inference over cropped facial frames and aggregates video scores.
    """
    def __init__(
        self,
        weights_path: Optional[str] = None,
        device: str = "cpu",
        operating_threshold: float = 0.50
    ):
        self.device = torch.device(device)
        self.operating_threshold = operating_threshold
        self.weights_path = weights_path

        # Initialize network
        self.model = EfficientNetB0Classifier(pretrained=True)

        # Load custom fine-tuned weights if provided and present
        self.is_custom_checkpoint = False
        if weights_path and os.path.exists(weights_path):
            try:
                state_dict = torch.load(weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.is_custom_checkpoint = True
            except Exception:
                self.is_custom_checkpoint = False

        self.model.to(self.device)
        self.model.eval()

        # Standard ImageNet normalization for EfficientNet-B0
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def preprocess_crops(self, face_crops: List[np.ndarray]) -> torch.Tensor:
        """
        Converts a list of RGB numpy arrays (224x224x3) into a normalized batch tensor.
        """
        tensors = [self.transform(crop) for crop in face_crops]
        return torch.stack(tensors).to(self.device)

    def predict(self, face_crops: List[np.ndarray]) -> Dict[str, Any]:
        """
        Runs batch prediction over extracted face crops and returns video-level risk scores.
        """
        if not face_crops:
            return {
                "channel": "SPATIAL",
                "raw_score": 0.75,
                "normalised_score": 75.0,
                "flagged": True,
                "highest_risk_frame_idx": 0,
                "frame_scores": [],
                "notes": "No face crops available for spatial evaluation."
            }

        batch_tensor = self.preprocess_crops(face_crops)

        with torch.no_grad():
            logits = self.model(batch_tensor).squeeze(-1)
            # Sigmoid maps logit to [0, 1] manipulation probability
            probs = torch.sigmoid(logits).cpu().numpy()

        # Ensure probs is an array even for 1 frame
        if probs.ndim == 0:
            probs = np.array([float(probs)])

        frame_scores = [float(p) for p in probs]

        # Frame-to-video aggregation (Mean & 90th percentile)
        mean_score = float(np.mean(frame_scores))
        p90_score = float(np.percentile(frame_scores, 90))
        highest_frame_idx = int(np.argmax(frame_scores))

        # Composite video score emphasizes high-percentile localized manipulation
        video_score = round(0.5 * mean_score + 0.5 * p90_score, 4)
        normalised_score = round(video_score * 100.0, 1)
        flagged = video_score >= self.operating_threshold

        notes = (
            f"Evaluated {len(face_crops)} face crops using EfficientNet-B0. "
            f"Mean manipulation probability={mean_score:.2f}, 90th percentile={p90_score:.2f}."
        )

        return {
            "channel": "SPATIAL",
            "raw_score": video_score,
            "normalised_score": normalised_score,
            "flagged": flagged,
            "highest_risk_frame_idx": highest_frame_idx,
            "frame_scores": [round(s, 3) for s in frame_scores],
            "is_custom_checkpoint": self.is_custom_checkpoint,
            "notes": notes
        }
