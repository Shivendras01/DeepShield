# DeepShield — Agent Handover & System Directives

> **Target Audience:** Future AI coding assistants, autonomous agents, and LLMs pair programming on the DeepShield repository.  
> **Repository:** `DeepShield` (B.Tech Minor Research Project, ITM University Gwalior)  
> **Authors & Roles:**  
> - **Shivendra Singh Chauhan (User):** Backend Architecture, System Engineering, Full-Stack Delivery, Video Pipeline, Risk Fusion, Telemetry & Serving.  
> - **Divya (Project Partner):** Project Co-author (Machine Learning & Research). Due to hardware unavailability, Shivendra + Antigravity are implementing all modules end-to-end.  
> **Current Active Branch:** `feature/spatial-deepfake-gradcam`  
> **Remote Origin:** `https://github.com/Shivendras01/DeepShield.git`  
> **Last Updated:** Channel 1: Spatial Deepfake AI (EfficientNet-B0) & Grad-CAM Heatmaps

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

### ✅ Step 2F: Passive Liveness Engine (Merged into `main` via PR #5)
- **Passive Liveness Analyzer (`backend/screening/liveness.py`):**
  - Uses MediaPipe Face Mesh (468 landmarks) to isolate eye contours.
  - Computes Eye Aspect Ratio (EAR) per frame: $\text{EAR} = (\|p2-p6\| + \|p3-p5\|) / (2 \cdot \|p1-p4\|)$.
  - Derives blink count, mean EAR, and nose-tip micro-motion variance.
  - Detects static presentation / photo replay attacks (0 blinks + 0 motion $\rightarrow$ High Risk 90.0).
  - Generates dark-themed EAR temporal curve plots saved into `media/evidence/ear_<session_id>.png`.
  - Wired into `views.py` for live video uploads.
- **Unit Tests (`backend/screening/test_liveness.py`):** 4 test suites verifying geometric EAR calculation, blink transitions, plot generation, and empty inputs.

### 🔄 Step 2G: Channel 1 — Spatial Deepfake AI & Grad-CAM (Current Branch: `feature/spatial-deepfake-gradcam`)
- **PyTorch EfficientNet-B0 Classifier (`backend/screening/deepfake.py`):**
  - Custom classification head over `features` backbone with Dropout(0.4) and Linear projection.
  - Preprocessing with standard ImageNet mean/std normalization on $(224 \times 224)$ face crops.
  - Dual aggregation over frame-level logits: mean video score and 90th-percentile anomaly capture score.
- **Grad-CAM Explainability Engine (`backend/screening/gradcam.py`):**
  - Forward-backward gradient hooks on final convolutional layer (`features[-1]`).
  - Global average pooled feature weights yielding high-resolution spatial heatmap.
  - Jet colormap overlay blended with original face crop ($\alpha=0.55$) and saved to `media/evidence/gradcam_<session_id>.jpg`.
- **Colab Training Pipeline & Notebook (`ml/training/`):**
  - `ml/training/train_efficientnet.py`: Standalone CLI script.
  - `ml/training/DeepShield_Colab_Training.ipynb`: Interactive Google Colab notebook preconfigured with Kaggle API authentication, tripartite dataset setup (FF++ baseline, WildDeepfake real-world upgrade, Celeb-DF v2 unseen test benchmark), 2-stage transfer learning, and auto-generation of publication figures (ROC-AUC, confusion matrix, loss curves).
  - Model weights directory configured at `backend/screening/weights/efficientnet_b0_deepshield.pth` with dynamic key remapping (`is_custom_checkpoint=True`).
  - Evaluation figures and research report assets cataloged in `ml/results/` (`training_curves.png`, `roc_curve.png`, `confusion_matrix.png`, `gradcam_sample.png`).
- **Pipeline Wiring & Unit Tests (`backend/screening/test_spatial.py`):**
  - Dynamic artifact registration in `EvidenceArtifact` with SHA-256 integrity hashes.
  - All 28 tests passing (`OK`).

---

## 4. Master Development Roadmap (Next Steps)

1. **Branch `feature/frontend-dashboard` (Step 4):**
   - Initialize `frontend/` using Vite + React + Tailwind CSS.
   - **View 1 (Applicant KYC Screen):** Live webcam recording, status progression, and clean friendly result badge (Approved / Review / Retry).
   - **View 2 (Bank Officer Forensic Portal):**
     - Review queue table with risk badges.
     - Forensic Inspector: 0–100 Fraud Risk Gauge, 3-channel breakdown cards, dual evidence viewers (interactive Grad-CAM heatmap viewer + EAR temporal blink chart), and append-only audit trail viewer.
     - Human-in-the-Loop decision panel: Approve / Reject buttons submitting to `POST /api/v1/sessions/<id>/review/`.
