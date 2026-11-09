import json
import uuid
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import (
    ScreeningSession,
    ChannelResult,
    FusionResult,
    EvidenceArtifact,
    ModelRegistry,
    AuditLog,
)


class DummyScreeningApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'online')
        self.assertEqual(response.data.get('service'), 'DeepShield Video Screening API')

    def test_dummy_screening_json_payload(self):
        payload = {
            "telemetry": json.dumps({
                "device_label": "Integrated Webcam HD",
                "resolution": "1280x720",
                "fps": 30
            })
        }
        response = self.client.post('/api/v1/screen/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('session_id', response.data)
        self.assertIn('fused_score', response.data)
        self.assertIn('risk_band', response.data)
        self.assertIn('channel_scores', response.data)
        self.assertIn('evidence', response.data)
        self.assertEqual(response.data['risk_band'], 'LOW')

    def test_dummy_screening_with_mock_video_file(self):
        mock_video = SimpleUploadedFile(
            "sample_kyc.webm",
            b"fake video stream bytes for testing handshake",
            content_type="video/webm"
        )
        response = self.client.post(
            '/api/v1/screen/',
            {'video': mock_video, 'telemetry': json.dumps({"browser": "Chrome 122"})},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['file_info']['name'], 'sample_kyc.webm')
        self.assertGreater(response.data['file_info']['size_bytes'], 0)


class DeepShieldModelSchemaTests(TestCase):
    """
    Tests persistence layer models: ScreeningSession, ChannelResult, FusionResult, EvidenceArtifact, ModelRegistry, AuditLog.
    """
    def test_complete_screening_session_lifecycle(self):
        # 1. Create a screening session
        session = ScreeningSession.objects.create(
            client_id="hdfc-bank-onboarding-test",
            status=ScreeningSession.StatusChoices.COMPLETED,
            duration_s=4.5,
            frames_total=135,
            frames_used=27
        )
        self.assertIsNotNone(session.session_id)
        self.assertEqual(session.status, "COMPLETED")

        # 2. Add isolated ChannelResults
        spatial_result = ChannelResult.objects.create(
            session=session,
            channel=ChannelResult.ChannelChoices.SPATIAL,
            raw_score=0.12,
            normalised_score=12.0,
            flagged=False,
            features_json={"model": "EfficientNet-B0", "max_frame_anomaly": 0.18}
        )
        telemetry_result = ChannelResult.objects.create(
            session=session,
            channel=ChannelResult.ChannelChoices.TELEMETRY,
            raw_score=0.02,
            normalised_score=2.0,
            flagged=False,
            features_json={"device": "Integrated Camera", "jitter_ms": 11.2}
        )
        liveness_result = ChannelResult.objects.create(
            session=session,
            channel=ChannelResult.ChannelChoices.LIVENESS,
            raw_score=0.15,
            normalised_score=15.0,
            flagged=False,
            features_json={"blink_count": 3, "mean_ear": 0.29}
        )
        self.assertEqual(session.channel_results.count(), 3)

        # 3. Add FusionResult
        fusion = FusionResult.objects.create(
            session=session,
            fusion_version="v1.0-weighted",
            weights_json={"spatial": 0.5, "liveness": 0.3, "telemetry": 0.2},
            fused_score=9.6,
            risk_band=FusionResult.RiskBandChoices.LOW,
            escalated=False,
            recommendation="Proceed under normal review."
        )
        self.assertEqual(session.fusion_result.fused_score, 9.6)

        # 4. Add EvidenceArtifact
        artifact = EvidenceArtifact.objects.create(
            session=session,
            frame_index=15,
            artifact_type=EvidenceArtifact.ArtifactTypeChoices.GRADCAM_HEATMAP,
            storage_ref="/media/evidence/session_test_frame_15.jpg",
            checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )
        self.assertEqual(session.evidence_artifacts.count(), 1)

        # 5. Add AuditLog entry
        audit = AuditLog.objects.create(
            session=session,
            actor="SYSTEM_PIPELINE",
            action="SESSION_SCORED",
            payload_hash="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
            metadata_json={"fused_score": 9.6, "risk_band": "LOW"}
        )
        self.assertEqual(session.audit_logs.count(), 1)

        # 6. ModelRegistry
        registry = ModelRegistry.objects.create(
            channel=ChannelResult.ChannelChoices.SPATIAL,
            architecture="EfficientNet-B0",
            checkpoint_hash="b2d28f0920556e9c0c8a5a76985a19859f5a04de22a8626fcf0113c415e9ff04",
            train_dataset="FaceForensics++ c23",
            export_format="PyTorch .pth"
        )
        self.assertIsNotNone(registry.model_id)
