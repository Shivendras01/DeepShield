from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import json


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
