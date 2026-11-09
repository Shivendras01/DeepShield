# DeepShield — Agent Handover & System Directives

> **Target Audience:** Future AI coding assistants, autonomous agents, and LLMs pair programming on the DeepShield repository.  
> **Repository:** `DeepShield` (B.Tech Minor Research Project, ITM University Gwalior)  
> **Authors & Roles:**  
> - **Shivendra Singh Chauhan (User):** Backend Architecture, Django REST Framework, Persistence & Audit, Telemetry Heuristics, Risk Fusion Engine, Containerization & Serving.  
> - **Divya:** ML Model Training (EfficientNet-B0 / Xception), Passive Liveness Module (MediaPipe Face Mesh + EAR), Grad-CAM Generation, React Dashboard Frontend.  
> **Current Active Branch:** `feature/backend-dbs-models`  
> **Remote Origin:** `https://github.com/Shivendras01/DeepShield.git`  
> **Last Updated:** Database ORM & Persistence Layer Implementation

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

The user strictly follows a professional feature-branch and atomic-commit workflow. **Never make monolithic 150k-line commits.**

### Git Standard Operating Procedure:
```bash
# 1. Start a feature from latest main
git switch main
git pull --ff-only origin main
git switch -c feature/<short-descriptive-name>

# 2. Make granular, atomic commits per logical change
git add <specific-file>
git commit -m "feat(scope): concise description"

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

### 🔄 Step 2: Persistence & Core Engines (In Progress)
- **Database Models (`backend/screening/models.py`):**
  - `ScreeningSession`: Session lifecycle (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), client identity, video metadata.
  - `ChannelResult`: Independent pre-fusion scores for `SPATIAL`, `LIVENESS`, `TELEMETRY`.
  - `FusionResult`: Combined 0–100 score, `LOW`/`GUARDED`/`ELEVATED`/`HIGH` risk bands, weights, and escalation status.
  - `EvidenceArtifact`: SHA-256 verified references for Grad-CAM heatmaps and EAR plots.
  - `ModelRegistry`: Model versioning and checkpoint hash tracking.
  - `AuditLog`: Append-only, tamper-evident log with payload SHA-256 hashes.
- **Django Admin (`backend/screening/admin.py`):** Registered with search, filters, and immutable audit logs.
- **Migrations:** `0001_initial.py` generated and applied.
- **Unit Tests (`backend/screening/tests.py`):** 4 tests covering API endpoints and full model lifecycle passing (`OK`).

---

## 4. Immediate Next Steps & Agent Roadmap

### Immediate Task (Current Turn):
1. **Commit current database work atomicaly** on branch `feature/backend-dbs-models`:
   - Commit 1: Models definition (`models.py`)
   - Commit 2: Database migration (`0001_initial.py`)
   - Commit 3: Django Admin registration (`admin.py`)
   - Commit 4: Test suite (`tests.py`)
   - Commit 5: Agent handover documentation (`agents.md`)
2. Push branch `feature/backend-dbs-models` to `origin` and merge into `main`.

### Next Backend Tasks for Shivendra (Independent Parallel Zone):
1. **Branch `feature/telemetry-engine`:**
   - Create `backend/screening/telemetry.py` (or `ml/telemetry/rules.py`).
   - Implement virtual camera detection heuristics: driver blacklists (OBS Virtual Camera, ManyCam, vMix, XSplit, CamTwist), resolution profile checks, and frame timestamp jitter variance calculation.
   - Unit tests for telemetry rule evaluations.
2. **Branch `feature/risk-fusion-engine`:**
   - Create `backend/screening/fusion.py`.
   - Implement normalized 0–100 scoring: $S = 100 \times (w_t s_t + w_l s_l + w_s s_s)$.
   - Implement rule-based escalation logic (e.g., if virtual camera detected $\rightarrow$ escalate risk band to `HIGH`).
3. **OpenCV Video Ingestion Pipeline:**
   - Implement frame extractor and face cropping utility (`backend/screening/video_processor.py`) using OpenCV.

### Checkpoints with Divya (Do NOT proceed until she delivers):
- **Checkpoint 2 (The Brain Transplant):** Wait for Divya to push trained PyTorch `.pth` weights and model class to `ml/deepfake/` before integrating real CNN inference into Django `apps.py`.
- **Checkpoint 3 (Explainability):** Wait for Divya to push Grad-CAM generator script before saving heatmap artifacts.

---

## 5. Architectural Invariants
1. **Never read across channels:** Spatial, Liveness, and Telemetry channels must be isolated and produce independent scores before reaching the Fusion Engine.
2. **Audit trails are append-only:** Never update or delete `AuditLog` rows.
3. **Keep models decoupled from views:** Inference logic should live in modular service classes (`ml/` or `screening/services/`), not embedded inside Django view functions.
