import json
import uuid
import tempfile
import os
import cv2
import numpy as np
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


class ScreeningLiveApiIntegrationTests(TestCase):
    """
    Tests live screening orchestration: Video processing + Telemetry + Fusion + Persistence + Dual Perspective.
    """
    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'online')
        self.assertEqual(response.data.get('service'), 'DeepShield Video Screening API')

    def test_live_screening_with_telemetry_only(self):
        payload = {
            "client_id": "sbi-branch-delhi",
            "telemetry": json.dumps({
                "device_label": "Integrated Webcam HD",
                "timestamps_ms": [i * 33.3 + (i % 3) for i in range(25)]
            }),
            "duration_s": 4.0,
            "frames_total": 120,
            "frames_used": 20
        }
        response = self.client.post('/api/v1/screen/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify Dual-Perspective response
        self.assertIn('applicant_view', response.data)
        self.assertIn('forensic_reviewer_view', response.data)

        # Applicant view check (safe and opaque)
        applicant = response.data['applicant_view']
        self.assertIn('status', applicant)
        self.assertIn('user_message', applicant)

        # Forensic reviewer view check (comprehensive)
        forensic = response.data['forensic_reviewer_view']
        self.assertEqual(forensic['client_id'], 'sbi-branch-delhi')
        self.assertIn('fused_score', forensic)
        self.assertIn('risk_band', forensic)
        self.assertIn('channel_scores', forensic)
        self.assertIn('audit_integrity_hash', forensic)

        # Verify database persistence
        session_id = response.data['session_id']
        session = ScreeningSession.objects.get(session_id=session_id)
        self.assertEqual(session.status, ScreeningSession.StatusChoices.COMPLETED)
        self.assertEqual(session.channel_results.count(), 3)
        self.assertIsNotNone(session.fusion_result)
        self.assertEqual(session.audit_logs.count(), 1)

    def test_virtual_camera_injection_escalates_and_records_audit(self):
        payload = {
            "client_id": "hdfc-onboarding",
            "telemetry": json.dumps({
                "device_label": "OBS Virtual Camera"
            })
        }
        response = self.client.post('/api/v1/screen/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        forensic = response.data['forensic_reviewer_view']
        self.assertTrue(forensic['escalated'])
        self.assertEqual(forensic['risk_band'], 'HIGH')
        self.assertGreaterEqual(forensic['fused_score'], 85.0)

        # Verify applicant sees safe retry instruction, not raw score
        applicant = response.data['applicant_view']
        self.assertEqual(applicant['status'], 'RETRY_REQUIRED')
        self.assertNotIn('85', applicant['user_message'])

    def test_session_detail_api(self):
        # Create a session via POST
        post_res = self.client.post('/api/v1/screen/', {
            "telemetry": json.dumps({"device_label": "Logitech C920"})
        }, format='multipart')
        session_id = post_res.data['session_id']

        # Query GET /sessions/<session_id>/
        detail_res = self.client.get(f'/api/v1/sessions/{session_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['session_id'], session_id)
        self.assertIn('channels', detail_res.data)
        self.assertIn('audit_history', detail_res.data)

    def test_human_officer_review_action(self):
        # 1. Create session
        post_res = self.client.post('/api/v1/screen/', {
            "telemetry": json.dumps({"device_label": "Logitech C920"})
        }, format='multipart')
        session_id = post_res.data['session_id']

        # 2. Officer submits review decision
        review_payload = {
            "officer_id": "OFFICER_PATEL_09",
            "decision": "APPROVED",
            "notes": "Reviewed visual frames manually; confirmed genuine applicant."
        }
        review_res = self.client.post(
            f'/api/v1/sessions/{session_id}/review/',
            review_payload,
            format='json'
        )
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)
        self.assertEqual(review_res.data['decision'], 'APPROVED')

        # 3. Verify audit log has 2 entries now: SESSION_SCREENED + OFFICER_APPROVED
        session = ScreeningSession.objects.get(session_id=session_id)
        self.assertEqual(session.audit_logs.count(), 2)
        latest_audit = session.audit_logs.first()
        self.assertEqual(latest_audit.action, 'OFFICER_APPROVED')
        self.assertEqual(latest_audit.actor, 'OFFICER_PATEL_09')

    def test_session_list_api(self):
        # Query GET /sessions/
        res = self.client.get('/api/v1/sessions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)


class DeepShieldModelSchemaTests(TestCase):
    """
    Tests persistence layer models: ScreeningSession, ChannelResult, FusionResult, EvidenceArtifact, ModelRegistry, AuditLog.
    """
    def test_complete_screening_session_lifecycle(self):
        session = ScreeningSession.objects.create(
            client_id="hdfc-bank-onboarding-test",
            status=ScreeningSession.StatusChoices.COMPLETED,
            duration_s=4.5,
            frames_total=135,
            frames_used=27
        )
        self.assertIsNotNone(session.session_id)
        self.assertEqual(session.status, "COMPLETED")

        ChannelResult.objects.create(
            session=session,
            channel=ChannelResult.ChannelChoices.SPATIAL,
            raw_score=0.12,
            normalised_score=12.0,
            flagged=False
        )
        ChannelResult.objects.create(
            session=session,
            channel=ChannelResult.ChannelChoices.TELEMETRY,
            raw_score=0.02,
            normalised_score=2.0,
            flagged=False
        )
        ChannelResult.objects.create(
            session=session,
            channel=ChannelResult.ChannelChoices.LIVENESS,
            raw_score=0.15,
            normalised_score=15.0,
            flagged=False
        )
        self.assertEqual(session.channel_results.count(), 3)

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
