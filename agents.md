# DeepShield — Agent Handover & System Directives

> **Target Audience:** Future AI coding assistants, autonomous agents, and LLMs pair programming on the DeepShield repository.  
> **Repository:** `DeepShield` (B.Tech Minor Research Project, ITM University Gwalior)  
> **Authors & Roles:**  
> - **Shivendra Singh Chauhan (User):** Backend Architecture, Django REST Framework, Persistence & Audit, Telemetry Heuristics, Risk Fusion Engine, Containerization & Serving.  
> - **Divya:** ML Model Training (EfficientNet-B0 / Xception), Passive Liveness Module (MediaPipe Face Mesh + EAR), Grad-CAM Generation, React Dashboard Frontend.  
> **Current Active Branch:** `feature/risk-fusion-engine`  
> **Remote Origin:** `https://github.com/Shivendras01/DeepShield.git`  
> **Last Updated:** Risk Fusion Engine Implementation & Categorical Escalation

---

## 1. Project Context & Threat Model

DeepShield is an academic research prototype focused on screening short video-KYC (Know Your Customer) sessions for two distinct attack vectors:
1. **Facial Deepfakes & Synthetic Facial Manipulation:** Detecting generated or swapped faces using spatial CNN feature representations.
2. **Video Injection & Presentation Attacks:** Detecting prerecorded, looped, or stream-injected video feeds delivered through virtual cameras or manipulated capture pipelines.

### Critical System Boundaries & Scope Guardrails
When generating code, documentation, or responses, all agents **must strictly adhere** to these principles:
- **Audio Deepfakes & Voice Cloning are OUT OF SCOPE:** Do NOT install audio processing libraries (`librosa`, `torchaudio`, `soundfile`). Audio is deferred to future roadmap phases.
- **Decision Support System:** DeepShield is a screening and risk-scoring tool for reviewers (producing a 0–100 Fraud Risk Score with 4 risk bands: `LOW`, `GUARDED`, `ELEVATED`, `HIGH`). It does NOT certify legal identity or replace human compliance officers.
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
- `POST /api/v1/screen/` dummy endpoint returns the complete 3-channel contract, risk score, risk band, and evidence URLs.
- Placeholder mock evidence images generated in `backend/media/evidence/`.
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

### 🔄 Step 2C: Risk Fusion Engine (Current Branch: `feature/risk-fusion-engine`)
- **Risk Fusion Engine (`backend/screening/fusion.py`):**
  - Calculates weighted combination: $S = 100 \times (0.50 s_s + 0.30 s_l + 0.20 s_t)$.
  - Implements **rule-based categorical escalation** (virtual camera detection, high-confidence deepfake manipulation, severe liveness failure, or multi-channel corroboration) to prevent single strong threats from being diluted.
  - Maps to 4 risk tiers (`LOW`, `GUARDED`, `ELEVATED`, `HIGH`) and actionable reviewer advice.
- **Unit Tests (`backend/screening/test_fusion.py`):** 6 test suites verifying bona-fide sessions, single-channel escalations, multi-channel corroborations, weight constraints, and score normalization.
- All 14 tests passing (`OK`).

---

## 4. Immediate Next Steps & Agent Roadmap

### Immediate Task (Current Turn):
1. **Make 2 meaningful, simple commits** on branch `feature/risk-fusion-engine`:
   - Commit 1: Core fusion engine & updated documentation (`fusion.py`, `agents.md`).
   - Commit 2: Unit test suite (`test_fusion.py`).
2. Push branch `feature/risk-fusion-engine` to `origin`, open PR, and merge into `main`.

### Next Backend Tasks for Shivendra:
1. **Branch `feature/video-processor` (OpenCV Frame Ingestion):**
   - Create `backend/screening/video_processor.py` for decoding `.mp4`/`.webm` clips, sampling frames at fixed FPS stride, and extracting face bounding crops.
2. **Wire Live Pipeline to View:**
   - Connect Telemetry, Fusion, and Video Processor into `POST /api/v1/screen/` and record results into `ScreeningSession`, `ChannelResult`, and `FusionResult` tables.

### Checkpoints with Divya (Do NOT proceed until she delivers):
- **Checkpoint 2 (The Brain Transplant):** Wait for Divya to push trained PyTorch `.pth` weights and model class to `ml/deepfake/` before integrating real CNN inference into Django `apps.py`.
- **Checkpoint 3 (Explainability):** Wait for Divya to push Grad-CAM generator script before saving heatmap artifacts.
