# DeepShield API Contract (Step 1 Handshake)

## Base URL
`http://localhost:8000/api/v1`

---

### 1. Health Check
* **Endpoint:** `GET /health/`
* **Response (200 OK):**
```json
{
  "status": "online",
  "service": "DeepShield Video Screening API",
  "version": "1.0.0-mvp",
  "channels": ["spatial_deepfake", "passive_liveness", "stream_telemetry"],
  "timestamp": "2026-11-09T11:42:00Z"
}
```

---

### 2. Video Screening (Handshake Dummy Endpoint)
* **Endpoint:** `POST /screen/`
* **Content-Type:** `multipart/form-data`
* **Request Fields:**
  * `video` *(required/file)*: Recorded video file (`.webm` or `.mp4`).
  * `telemetry` *(optional/string)*: JSON-stringified client metadata, e.g.:
    ```json
    {
      "device_label": "Integrated Camera (04f2:b6d9)",
      "resolution": "1280x720",
      "frame_rate": 30,
      "user_agent": "Mozilla/5.0..."
    }
    ```

* **Response (200 OK):**
```json
{
  "session_id": "4a713807-6bb9-4976-b333-e71e7a02c3ef",
  "timestamp": "2026-11-09T11:42:10.123456+00:00",
  "status": "COMPLETED",
  "file_info": {
    "name": "stream_buffer.webm",
    "size_bytes": 1048576,
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
      "flagged": false,
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
      "virtual_camera_detected": false,
      "reported_device": "Integrated Camera (04f2:b6d9)",
      "frame_jitter_ms": 11.8,
      "notes": "Hardware sensor timings and frame regularity consistent with live capture."
    }
  },
  "fusion_metadata": {
    "engine_version": "v1.0-dummy-handshake",
    "weights": { "spatial": 0.5, "liveness": 0.3, "telemetry": 0.2 },
    "escalated": false
  },
  "evidence": {
    "gradcam_url": "/media/evidence/mock_gradcam.jpg",
    "ear_plot_url": "/media/evidence/mock_ear_plot.png"
  },
  "disclaimer": "DeepShield is a research prototype decision-support tool for video-KYC. It does not certify legal identity."
}
```
