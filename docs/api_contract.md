# DeepShield API Contract (v1.0 Live Pipeline)

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
  "version": "1.0.0",
  "channels": ["spatial_deepfake", "passive_liveness", "stream_telemetry"],
  "fusion_engine": "v1.0-weighted-escalated",
  "timestamp": "2026-11-11T02:20:00Z"
}
```

---

### 2. Video Screening (Live Multi-Channel Pipeline)
* **Endpoint:** `POST /screen/`
* **Content-Type:** `multipart/form-data`
* **Request Fields:**
  * `video` *(optional/file)*: Recorded video file (`.webm` or `.mp4`).
  * `telemetry` *(optional/string)*: JSON-stringified client metadata, e.g.:
    ```json
    {
      "device_label": "Integrated Camera (04f2:b6d9)",
      "timestamps_ms": [0.0, 33.2, 67.1, 100.4, 133.5]
    }
    ```
  * `client_id` *(optional/string)*: Institutional client identifier (default: `"sbi-vcip-gateway"`).

* **Response (200 OK — Dual-Perspective Payload):**
```json
{
  "session_id": "4a713807-6bb9-4976-b333-e71e7a02c3ef",
  "status": "COMPLETED",

  "applicant_view": {
    "status": "APPROVED",
    "user_message": "Video verification successful. Your KYC application has been verified.",
    "session_id": "4a713807-6bb9-4976-b333-e71e7a02c3ef"
  },

  "forensic_reviewer_view": {
    "session_id": "4a713807-6bb9-4976-b333-e71e7a02c3ef",
    "client_id": "sbi-vcip-gateway",
    "timestamp": "2026-11-11T02:20:10.123456+00:00",
    "status": "COMPLETED",
    "file_metrics": {
      "duration_seconds": 3.8,
      "frames_total": 114,
      "frames_sampled": 19,
      "faces_detected": 19
    },
    "fused_score": 14.5,
    "risk_band": "LOW",
    "escalated": false,
    "escalation_reason": null,
    "recommendation": "No channel raised a material indicator. Proceed under normal review; retain audit record.",
    "channel_scores": {
      "spatial": { "score": 12.0, "flagged": false, "notes": "Verified 19 face crops; no synthetic blending anomalies." },
      "liveness": { "score": 10.0, "flagged": false, "notes": "Natural physiological dynamics and blink patterns consistent with live human." },
      "telemetry": { "score": 5.0, "virtual_camera_detected": false, "notes": "Hardware sensor timings and frame regularity consistent with live capture." }
    },
    "channel_contributions": {
      "spatial_contribution": 6.0,
      "liveness_contribution": 3.0,
      "telemetry_contribution": 1.0
    },
    "evidence": {
      "gradcam_url": "/media/evidence/mock_gradcam.jpg",
      "ear_plot_url": "/media/evidence/mock_ear_plot.png"
    },
    "audit_integrity_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
  },

  "disclaimer": "DeepShield is an auditable decision-support screening system for video-KYC."
}
```

---

### 3. Session Detail
* **Endpoint:** `GET /sessions/<uuid:session_id>/`
* **Response (200 OK):** Full historical session record, channel scores, and append-only audit trail.

---

### 4. Officer Review Action (Human-in-the-Loop)
* **Endpoint:** `POST /sessions/<uuid:session_id>/review/`
* **Request (JSON):**
```json
{
  "officer_id": "OFFICER_PATEL_09",
  "decision": "APPROVED",
  "notes": "Reviewed facial boundary manually; confirmed genuine applicant in unusual lighting."
}
```
* **Response (200 OK):**
```json
{
  "session_id": "4a713807-6bb9-4976-b333-e71e7a02c3ef",
  "decision": "APPROVED",
  "officer_id": "OFFICER_PATEL_09",
  "status": "DECISION_RECORDED",
  "audit_hash": "b83f...c12a"
}
```

---

### 5. Session Queue List
* **Endpoint:** `GET /sessions/?limit=20`
* **Response (200 OK):** List of recent sessions for review queue.
