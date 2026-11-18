# DeepShield REST API Specification

**Base URL:** `http://127.0.0.1:8000/api/v1`  
**Protocol:** HTTP / JSON / multipart/form-data  

---

## 1. Health & Readiness Probe

### `GET /health/`
Checks backend engine status, loaded neural network models, and active detection channels.

**Response `200 OK`:**
```json
{
  "status": "online",
  "service": "DeepShield Video Screening API",
  "version": "1.0.0",
  "channels": ["spatial_deepfake", "passive_liveness", "stream_telemetry"],
  "fusion_engine": "v1.0-weighted-escalated",
  "mediapipe_liveness": true,
  "spatial_model": "EfficientNet-B0",
  "custom_checkpoint_loaded": true,
  "timestamp": "2026-11-19T01:30:00Z"
}
```

---

## 2. Video Screening Submission

### `POST /screen/`
Submits a short 5-second video recording or file upload along with applicant metadata and client-side device telemetry.

**Request:** `multipart/form-data`
- `video`: Video binary file (`.webm`, `.mp4`).
- `client_id`: Organization or gateway identifier.
- `applicant_name`: Full legal applicant name.
- `id_type`: Government ID document type (`Aadhaar Card`, `PAN Card`, `Passport`).
- `id_number`: Government document identification number.
- `mobile`: Registered mobile number.
- `device_label`: Capture device label from `MediaDeviceInfo.label`.
- `is_file_upload`: Boolean string (`true` / `false`).

**Response `201 Created`:**
```json
{
  "session_id": "8a4e1ca2-f16b-4b7f-bbe5-e03f4c215900",
  "status": "COMPLETED",
  "fused_score": 4.0,
  "risk_band": "LOW",
  "policy_decision": "AUTO_APPROVED",
  "requires_review": false,
  "channels": {
    "spatial": { "score": 2.5, "flagged": false },
    "liveness": { "score": 6.0, "flagged": false, "blinks_detected": 3 },
    "telemetry": { "score": 5.0, "flagged": false }
  }
}
```

---

## 3. Session Queue & Forensic Dossier

### `GET /sessions/`
Retrieves the paginated list of screening sessions for compliance officers.

### `GET /sessions/<uuid:session_id>/`
Fetches the complete explainable forensic dossier for a specific session, including diagnostic artifact paths, channel details, and audit history.

### `POST /sessions/<uuid:session_id>/review/`
Submits a human compliance officer's adjudication.

**Request Body:** `application/json`
```json
{
  "decision": "APPROVED", // or "REJECTED"
  "notes": "Verified facial consistency and valid physical credentials."
}
```

---

## 4. Academic Viva Simulation Sandbox

### `POST /simulate/`
Allows evaluators and judges to instantly generate authentic past test cases across all three detection gates in 1 click.

**Request Body:** `application/json`
```json
{
  "scenario": "GENUINE" // Options: "GENUINE", "GATE1_INJECTION", "GATE2_REPLAY", "GATE3_DEEPFAKE", "GREY_AREA"
}
```

**Response `201 Created`:**
```json
{
  "status": "success",
  "scenario": "GENUINE",
  "session_id": "1c36d4b3-d64e-48a3-8819-1c251b62cf72",
  "applicant_name": "Shivendra Singh Chauhan (Live Verified KYC)",
  "fused_score": 8.5,
  "risk_band": "LOW",
  "policy_decision": "AUTO_APPROVED"
}
```
