# DeepShield — Agent Handover & System Directives

> **Target Audience:** Future AI coding assistants, autonomous agents, and LLMs pair programming on the DeepShield repository.  
> **Repository:** `DeepShield` (B.Tech Minor Research Project, ITM University Gwalior)  
> **Authors & Roles:**  
> - **Shivendra Singh Chauhan (User):** Backend Architecture, System Engineering, Full-Stack Delivery, Video Pipeline, Risk Fusion, Telemetry & Serving.  
> - **Divya (Project Partner):** Project Co-author (Machine Learning & Research). Due to hardware unavailability, Shivendra + Antigravity are implementing all modules end-to-end.  
> **Current Active Branch:** `feature/passive-liveness`  
> **Remote Origin:** `https://github.com/Shivendras01/DeepShield.git`  
> **Last Updated:** Channel 2: Passive Liveness Engine & EAR Plot Generation

---

## 1. Project Context & Threat Model

DeepShield is an academic research prototype focused on screening short video-KYC (Know Your Customer) sessions for two distinct attack vectors:
1. **Facial Deepfakes & Synthetic Facial Manipulation:** Detecting generated or swapped faces using spatial CNN feature representations.
2. **Video Injection & Presentation Attacks:** Detecting prerecorded, looped, or stream-injected video feeds delivered through virtual cameras or manipulated capture pipelines.

### Critical System Boundaries & Scope Guardrails
When generating code, documentation, or responses, all agents **must strictly adhere** to these principles:
- **Audio Deepfakes & Voice Cloning are OUT OF SCOPE:** Do NOT install audio processing libraries (`librosa`, `torchaudio`, `soundfile`). Audio is deferred to future roadmap phases.
- **Decision Support System:** DeepShield is an internal screening and decision-support tool for banking compliance officers (producing a 0–100 Fraud Risk Score with 4 risk bands: `LOW`, `GUARDED`, `ELEVATED`, `HIGH`). It does NOT certify legal identity or replace human officers.
- **Dual-Perspective API Security:** Never expose internal risk scores, Grad-CAM heatmaps, or technical heuristics directly to applicants/untrusted clients (preventing adversarial oracle attacks). The API returns two distinct payloads: `applicant_view` (safe and opaque) and `forensic_reviewer_view` (internal compliance portal).
- **Passive Liveness Is Indicative:** Eye Aspect Ratio (EAR) and blink statistics provide behavioral evidence, not absolute proof.
- **Client Telemetry Is Spoofable:** Device headers and browser stream telemetry are corroborative signals, not hardware attestation.

---

## 2. Team Workflow & Git Conventions

The user strictly follows a professional feature-branch and atomic-commit workflow. **Never commit directly to `main` without asking.** Always provide simple, human-readable commit messages (2–3 commits per feature) that are easy to explain during academic evaluation. Group `agents.md` updates inside one of the main commits rather than creating separate tiny docs commits.

### Git Standard Operating Procedure:
```bash
# 1. Start a feature from latest main
git switch main
git pull --ff-only origin main
git switch -c feature/<short-descriptive-name>

# 2. Make granular, human-readable commits
git add <specific-files>
git commit -m "Natural language description"

# 3. Before merging or pushing
git fetch origin
git rebase origin/main
git push -u origin feature/<short-descriptive-name>
```

---

## 3. Current Implementation Status

### ✅ Step 1: The API Handshake (Completed & on `main`)
- Django project scaffolded in `backend/` with `config` and app `screening`.
- Permissive CORS configured for React frontend at `http://localhost:5173`.
- `GET /api/v1/health/` online.
- Documented in `docs/api_contract.md`.
- Initial root commit and handshake pushed to GitHub `origin/main`.

### ✅ Step 2A: Persistence & Database Layer (Completed & on `main`)
- **Database Models (`backend/screening/models.py`):**
  - `ScreeningSession`: Session lifecycle (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), client identity, video metadata.
  - `ChannelResult`: Independent pre-fusion scores for `SPATIAL`, `LIVENESS`, `TELEMETRY`.
  - `FusionResult`: Combined 0–100 score, `LOW`/`GUARDED`/`ELEVATED`/`HIGH` risk bands, weights, and escalation status.
  - `EvidenceArtifact`: SHA-256 verified references for Grad-CAM heatmaps and EAR plots.
  - `ModelRegistry`: Model versioning and checkpoint hash tracking.
  - `AuditLog`: Append-only, tamper-evident log with payload SHA-256 hashes.
- Registered in Django Admin with immutable audit logs.
- Migration `0001_initial.py` applied.

### ✅ Step 2B: Telemetry Engine (Merged into `main` via PR #1)
- **Telemetry Engine (`backend/screening/telemetry.py`):**
  - Identifies virtual camera signatures (OBS Virtual Camera, ManyCam, vMix, Snap Camera, etc.).
  - Calculates frame timestamp jitter (standard deviation of inter-frame intervals) to detect unnaturally rigid pre-recorded video injection playback.
  - Outputs normalized 0–100 telemetry risk score with human-readable diagnostic reasons.

### ✅ Step 2C: Risk Fusion Engine (Merged into `main` via PR #2)
- **Risk Fusion Engine (`backend/screening/fusion.py`):**
  - Calculates weighted combination: $S = 100 \times (0.50 s_s + 0.30 s_l + 0.20 s_t)$.
  - Implements **rule-based categorical escalation** (virtual camera detection, high-confidence deepfake manipulation, severe liveness failure, or multi-channel corroboration).
  - Maps to 4 risk tiers (`LOW`, `GUARDED`, `ELEVATED`, `HIGH`) and actionable reviewer advice.

### ✅ Step 2D: Video Processing Pipeline (Merged into `main` via PR #3)
- **Video Processor (`backend/screening/video_processor.py`):**
  - Opens and inspects `.mp4`/`.webm` streams (fps, duration, frame counts).
  - Performs controlled frame sampling at a configurable stride (target 5 FPS).
  - Detects faces with OpenCV and crops with a 20% margin to preserve blending boundaries.
  - Resizes crops to $224 \times 224$ uint8 for downstream EfficientNet-B0 inference.

### ✅ Step 2E: Live Screening API & Reviewer Workflow (Merged into `main` via PR #4)
- **Live Pipeline View (`backend/screening/views.py`):**
  - Orchestrates video decoding $\rightarrow$ telemetry inspection $\rightarrow$ risk fusion $\rightarrow$ database persistence.
  - Writes records to `ScreeningSession`, `ChannelResult` (x3), `FusionResult`, and immutable `AuditLog` with SHA-256 payload hashes.
  - Dual-Perspective response payload: `applicant_view` (opaque status) + `forensic_reviewer_view` (internal review portal).
- **Human-in-the-Loop Review Endpoints:**
  - `GET /api/v1/sessions/`: Session review queue.
  - `GET /api/v1/sessions/<id>/`: Full historical forensic report.
  - `POST /api/v1/sessions/<id>/review/`: Bank officer approval/rejection action logging.

### 🔄 Step 2F: Passive Liveness Engine (Current Branch: `feature/passive-liveness`)
- **Passive Liveness Analyzer (`backend/screening/liveness.py`):**
  - Uses MediaPipe Face Mesh (468 landmarks) to isolate eye contours.
  - Computes Eye Aspect Ratio (EAR) per frame: $\text{EAR} = (\|p2-p6\| + \|p3-p5\|) / (2 \cdot \|p1-p4\|)$.
  - Derives blink count, mean EAR, and nose-tip micro-motion variance.
  - Detects static presentation / photo replay attacks (0 blinks + 0 motion $\rightarrow$ High Risk 90.0).
  - Generates dark-themed EAR temporal curve plots saved into `media/evidence/ear_<session_id>.png`.
  - Wired into `views.py` for live video uploads.
- **Unit Tests (`backend/screening/test_liveness.py`):** 4 test suites verifying geometric EAR calculation, blink transitions, plot generation, and empty inputs.
- All 25 screening tests passing (`OK`).

---

## 4. Master Development Roadmap (Next Steps)

1. **Branch `feature/spatial-deepfake-gradcam`:**
   - Install `torch` and `torchvision`.
   - Implement `backend/screening/deepfake.py` using PyTorch `EfficientNet-B0`.
   - Implement Grad-CAM saliency generator extracting heatmaps on flagged face crops and saving them to `media/evidence/`.
   - Wire spatial deepfake inference into `POST /api/v1/screen/`.
2. **Branch `feature/frontend-dashboard`:**
   - Initialize `frontend/` with Vite, React, and Tailwind CSS.
   - Build View A: Applicant Webcam KYC capture screen (showing clean applicant status).
   - Build View B: Bank Officer Forensic Audit Dashboard (0–100 Risk Gauge, Grad-CAM viewer, EAR curve, Audit trail, Approve/Reject buttons).
