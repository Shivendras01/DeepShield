# DeepShield — Agent Handover & System Directives

> **Target Audience:** Future AI coding assistants, autonomous agents, and LLMs pair programming on the DeepShield repository.  
> **Repository:** `DeepShield` (B.Tech Minor Research Project, ITM University Gwalior)  
> **Last Updated:** Initial Project Setup (Phase 1)

---

## 1. Project Context & Objectives

DeepShield is an academic research prototype focused on screening short video-KYC (Know Your Customer) sessions for two specific identity-fraud threats:

1. **Facial Deepfakes & Synthetic Facial Manipulation:** Detecting generated or swapped faces using deep convolutional neural network feature representations.
2. **Video Injection & Presentation Attacks:** Detecting prerecorded, looped, or stream-injected video feeds delivered through virtual cameras or manipulated capture pipelines.

### Critical System Boundaries & Disclaimers
When generating code, documentation, or responses, all agents **must strictly adhere** to these principles:
- **Not a Full KYC Platform:** DeepShield is a screening and risk-scoring tool for reviewers; it does not perform complete customer onboarding, document verification (e.g., Aadhaar, PAN, Passport), or database identity matching.
- **No Conclusive Identity Claims:** The system provides probabilistic risk scores (0–100) and evidentiary artifacts. It does **not** independently establish or certify legal identity.
- **Passive Liveness Is Indicative, Not Conclusive:** Eye Aspect Ratio (EAR) and blink statistics provide evidence of human behavioral dynamics, but must never be framed as foolproof proof of a live subject.
- **Client Telemetry Is Spoofable:** Device headers and browser stream telemetry can be intercepted and faked. They are corroborative signals, not infallible guarantees.

---

## 2. Strict Scope Restrictions

> [!IMPORTANT]
> **Audio Deepfakes & Voice Cloning are OUT OF SCOPE.**
> - Do **NOT** install audio processing libraries (e.g., `librosa`, `torchaudio`, `soundfile`).
> - Do **NOT** add audio extraction steps, voice models, or speech analysis endpoints.
> - DeepShield is strictly bounded to visual frame analysis, facial landmarks, and capture telemetry.

---

## 3. Work Completed by Initializing Agent (Phase 1)

The following foundational tasks have been executed and verified:

1. **Directory Architecture:** Created the standardized project directory structure:
   - `docs/`: System documentation, research notes, and architectural specifications.
   - `ml/`: Modular ML subsystem containing:
     - `ml/preprocessing/`: Frame extraction, face detection, cropping, and landmark extraction.
     - `ml/training/`: Training pipelines, dataset loaders, and Colab training routines.
     - `ml/evaluation/`: Metric computation (AUC-ROC, EER, accuracy, confusion matrix).
     - `ml/deepfake/`: Channel 1 models (EfficientNet-B0 primary, Xception baseline).
     - `ml/liveness/`: Channel 2 passive liveness (EAR, blink dynamics).
     - `ml/telemetry/`: Channel 3 video-injection and virtual camera heuristics.
     - `ml/fusion/`: Risk aggregation engine producing a normalized 0–100 score.
     - `ml/explainability/`: Grad-CAM heatmap generation and EAR trace plotting.
     - `ml/tests/`: Unit tests for ML submodules.
   - `backend/`: Django REST Framework service layout.
   - `frontend/`: React + Vite + TypeScript reviewer dashboard layout.
   - `tests/`: End-to-end and cross-component integration test suite.
2. **Core Documentation & Environment Files:**
   - `README.md`: Complete academic project overview, three-channel architecture, technology stack, and repo tree.
   - `.gitignore`: Robust ignore rules covering Python, PyTorch checkpoints, dataset video formats, Django artifacts, Node modules, and environment secrets.
   - `.env.example`: Central configuration template for development and inference parameters.
   - `agents.md`: This comprehensive agent-to-agent operational guide.

---

## 4. Architectural Rules for Subsequent Agents

Future agents modifying this codebase must observe the following constraints:

### A. Channel Specifications
- **Channel 1 (Spatial Deepfake):**
  - Primary Model: `EfficientNet-B0` (lightweight, efficient parameter count for real-time inference).
  - Baseline Model: `Xception` (for academic benchmarking).
  - Do not substitute arbitrary architectures unless explicitly directed by the user.
- **Channel 2 (Passive Liveness):**
  - Based on facial landmarks (68 landmarks or MediaPipe Face Mesh), Eye Aspect Ratio (EAR), and temporal blink statistics.
- **Channel 3 (Video Injection):**
  - Evaluates capture telemetry, video container properties, frame timestamps/jitter, and browser media device metadata.

### B. Risk Fusion Engine
- The fusion engine will combine outputs from all three channels into a normalized risk score from `0` to `100` (higher score = higher assessed fraud risk).
- **Rule:** Do not invent hardcoded final weights or thresholds prematurely. Fusion calibration must be informed by empirical validation against benchmark datasets.

### C. Explainability Standards
- Flagged frames should support **Grad-CAM** saliency maps.
- Liveness outputs should generate temporal **EAR graphs**.
- Diagnostic breakdowns must link directly to the underlying channel scores.

### D. Coding & Tooling Standards
- **Python / PyTorch:** Write modular, type-annotated code with docstrings. Keep data pipelines detached from API endpoints.
- **Backend:** Django REST Framework for clean RESTful APIs and background job management.
- **Frontend:** React with TypeScript and Vite. Emphasize responsive, clean UI design suited for compliance officers.
- **Preserve Existing Work:** Never delete or overwrite existing user code without prior inspection and confirmation.

---

## 5. Development Roadmap for Future Phases

Incoming agents should reference this roadmap when prompted by the user to proceed with subsequent phases:

| Phase | Title | Primary Objectives & Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Project Setup** | *(Completed)* Directory layout, README, `.gitignore`, `.env.example`, `agents.md`. |
| **Phase 2** | **ML Preprocessing** | Video frame extraction, face detection/alignment, facial landmark extraction utilities in `ml/preprocessing/`. |
| **Phase 3** | **Channel 1 (Deepfake)** | EfficientNet-B0 and Xception model definition, training/fine-tuning scripts for Google Colab, checkpoint loaders in `ml/deepfake/`. |
| **Phase 4** | **Channel 2 & 3** | EAR calculation and blink frequency tracking in `ml/liveness/`; telemetry anomaly detection in `ml/telemetry/`. |
| **Phase 5** | **Fusion & Explainability** | Risk aggregation logic (0–100 score) in `ml/fusion/`; Grad-CAM overlay and EAR plotting in `ml/explainability/`. |
| **Phase 6** | **Backend API** | Django REST Framework API for video upload, processing orchestrator, database models for KYC sessions in `backend/`. |
| **Phase 7** | **Frontend Reviewer UI** | React + Vite + TypeScript dashboard displaying session details, risk gauges, video players, and Grad-CAM overlays in `frontend/`. |
| **Phase 8** | **Integration & Evaluation** | Benchmark evaluation scripts, cross-channel validation, Docker Compose deployment setup. |

---

## 6. Pre-Flight Checklist for Incoming AI Models

Before submitting any code changes, verify:
- [ ] Are you only implementing what the user explicitly requested for the current turn?
- [ ] Is audio processing completely absent from the proposed solution?
- [ ] Are models and weights structured to load from configurable paths (`MODEL_WEIGHTS_DIR`)?
- [ ] Are all new files located within the correct subdirectories in `DeepShield/`?
- [ ] Have you preserved all existing code, comments, and structure?
