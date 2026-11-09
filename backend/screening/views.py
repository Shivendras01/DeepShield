import json
import uuid
from datetime import datetime, timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser


class HealthCheckView(APIView):
    """
    Health check endpoint to verify backend status.
    """
    def get(self, request):
        return Response({
            "status": "online",
            "service": "DeepShield Video Screening API",
            "version": "1.0.0-mvp",
            "channels": ["spatial_deepfake", "passive_liveness", "stream_telemetry"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, status=status.HTTP_200_OK)


class ScreeningDummyApiView(APIView):
    """
    Dummy screening endpoint for Step 1 Handshake.
    Accepts video file upload and client telemetry metadata.
    Returns simulated 3-channel evaluation, fused risk score, and evidence URLs.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        session_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        # Extract uploaded video file if provided
        video_file = request.FILES.get('video')
        video_name = video_file.name if video_file else "stream_buffer.webm"
        video_size_bytes = video_file.size if video_file else 0

        # Extract telemetry metadata (supports JSON body or multipart form string)
        telemetry_raw = request.data.get('telemetry')
        telemetry_data = {}
        if isinstance(telemetry_raw, str):
            try:
                telemetry_data = json.loads(telemetry_raw)
            except Exception:
                telemetry_data = {"raw": telemetry_raw}
        elif isinstance(telemetry_data, dict):
            telemetry_data = telemetry_raw or {}

        # Dummy scores conforming to DeepShield 4-tier risk bands
        # Default mock: Low risk bona-fide session
        mock_response = {
            "session_id": session_id,
            "timestamp": now_iso,
            "status": "COMPLETED",
            "file_info": {
                "name": video_name,
                "size_bytes": video_size_bytes,
                "duration_seconds": 3.8
            },
            "fused_score": 14.5,
            "risk_band": "LOW",
            "recommendation": "Proceed under normal review; retain audit record.",
            "channel_scores": {
                "spatial": {
                    "channel_name": "Spatial Deepfake Detection (EfficientNet-B0)",
                    "raw_score": 0.08,
                    "normalized_risk_score": 8.0,
                    "flagged": False,
                    "confidence": 0.96,
                    "notes": "Face crops extracted cleanly; no synthetic facial artifacts detected."
                },
                "liveness": {
                    "channel_name": "Passive Liveness (MediaPipe EAR)",
                    "raw_score": 0.12,
                    "normalized_risk_score": 12.0,
                    "blink_count": 4,
                    "average_ear": 0.285,
                    "head_pose_variance": 0.042,
                    "notes": "Normal blink rate and micro-motions detected across frames."
                },
                "telemetry": {
                    "channel_name": "Capture & Stream Telemetry",
                    "raw_score": 0.05,
                    "normalized_risk_score": 5.0,
                    "virtual_camera_detected": False,
                    "reported_device": telemetry_data.get("device_label", "Default Camera (Integrated)"),
                    "frame_jitter_ms": 11.8,
                    "notes": "Hardware sensor timings and frame regularity consistent with live capture."
                }
            },
            "fusion_metadata": {
                "engine_version": "v1.0-dummy-handshake",
                "weights": {"spatial": 0.50, "liveness": 0.30, "telemetry": 0.20},
                "escalated": False
            },
            "evidence": {
                "gradcam_url": "/media/evidence/mock_gradcam.jpg",
                "ear_plot_url": "/media/evidence/mock_ear_plot.png"
            },
            "disclaimer": "DeepShield is a research prototype decision-support tool for video-KYC. It does not certify legal identity."
        }

        return Response(mock_response, status=status.HTTP_200_OK)
