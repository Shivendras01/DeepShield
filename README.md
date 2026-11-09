# DeepShield

> **Technical Title:** Video Injection & Deepfake Detection API for Banking/KYC Fraud: A Hybrid Architecture for Real-Time Identity-Verification Security  
> **Project Type:** B.Tech Minor Project & Research Prototype  
> **Institution:** ITM University Gwalior  

---

## 1. Project Overview

**DeepShield** is a student research prototype designed to screen short video-KYC (Know Your Customer) sessions for security threats commonly encountered in digital banking and identity verification. The system evaluates video streams to detect synthetic visual manipulations and unauthorized video injection, producing a normalized risk assessment accompanied by interpretable evidence indicators to assist human reviewers.

### Academic & Practical Scope
- **Research Prototype:** Developed as a B.Tech minor project at ITM University Gwalior.
- **Decision Support System:** DeepShield provides risk scores and supporting diagnostic signals for compliance reviewers.
- **Important System Disclaimers:**
  - DeepShield is **not** a complete standalone KYC or identity-establishment platform.
  - It does **not** independently verify or certify a subject's legal identity.
  - It is **not** certified for production banking security deployments.

---

## 2. Problem Being Addressed

Digital customer onboarding and video-KYC workflows face emerging threats from two distinct attack vectors:

1. **Facial Deepfakes & Synthetic Facial Manipulation:** Adversaries utilize generative models (e.g., autoencoders, GANs, diffusion-based face swaps) to impersonate legitimate individuals or generate synthetic identities.
2. **Video Injection & Presentation Attacks:** Adversaries bypass the physical camera sensor by piping prerecorded, looped, or digitally modified video directly into virtual camera devices, browser media streams, or operating system video pipelines.

Existing commercial and academic solutions frequently evaluate either facial artifacts or injection heuristics in isolation. DeepShield explores a hybrid, multi-channel screening architecture combining spatial deepfake detection, passive biometric liveness dynamics, and capture stream telemetry.

---

## 3. Planned Three-Channel Architecture

DeepShield evaluates video-KYC sessions across three independent detection channels:

```
                            Video-KYC Session Input
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
  [ Channel 1 ]                  [ Channel 2 ]                  [ Channel 3 ]
Spatial Deepfake               Passive Liveness                Video-Injection
   Detection                      Indicators                      Detection
 (EfficientNet-B0               (EAR, Blinks,                (Capture Telemetry,
  & Xception)                    Landmarks)                    Virtual Cams)
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                                       ▼
                            [ Risk Fusion Engine ]
                           Normalized Score: 0 - 100
                                       │
                                       ▼
                       [ Reviewer Decision Dashboard ]
                     (Grad-CAM, EAR Traces, Telemetry)
```

### Channel 1: Spatial Deepfake Detection
- **Primary Model:** EfficientNet-B0 (lightweight, computationally efficient CNN architecture suitable for frame-level feature extraction).
- **Comparison Baseline:** Xception (standard academic benchmark architecture for face manipulation datasets).
- **Inputs:** Extracted video frames and aligned facial crops.
- **Status:** Models will be trained and evaluated in later project phases; no pre-trained weights are assumed to exist.

### Channel 2: Passive Liveness Indicators
- **Methodology:** Evaluates dynamic physiological behaviors across the video timeline without requiring active user prompts.
- **Key Indicators:**
  - Facial landmark tracking (via MediaPipe Face Mesh / 68-point landmarks).
  - Eye Aspect Ratio (EAR) computation per frame.
  - Blink rate, blink duration, and temporal blink statistics.
- **Disclaimer:** Passive liveness indicators provide corroborative evidence of human presence, but are **not** conclusive proof of authenticity.

### Channel 3: Video-Injection Detection
- **Methodology:** Detects virtual cameras, loopback video drivers, frame timing anomalies, and capture path tampering.
- **Key Indicators:**
  - Media device enumeration and driver identity flags (e.g., OBS Virtual Camera, ManyCam).
  - Frame delivery timestamp jitter and anomalies indicative of prerecorded playback.
  - Video stream container and encoding characteristic checks.
- **Disclaimer:** Client-reported telemetry can be intercepted and faked; it serves as corroborative signal rather than guaranteed proof.

---

## 4. Risk Fusion & Scoring

- Outputs from all three channels feed into a centralized **Risk-Fusion Engine**.
- The engine computes a normalized fraud risk score from **`0` to `100`**:
  - **0 – 29:** Low Risk (nominal session characteristics).
  - **30 – 69:** Moderate Risk (anomalies detected requiring manual inspection).
  - **70 – 100:** High Risk (strong synthetic manipulation or injection indicators).
- *Note:* Final weights, calibration curves, and decision thresholds will be determined experimentally in later phases.

---

## 5. Planned Explainability Features

To support compliance and audit workflows, DeepShield will generate interpretable diagnostic artifacts:
- **Grad-CAM Visualizations:** Coarse 2D heatmaps highlighting spatial regions triggering deepfake model activations on flagged frames.
- **Temporal EAR Traces:** Time-series line plots displaying eye-closure dynamics and blink detections over the session duration.
- **Telemetry Inspection Panel:** Detailed view of reported camera devices, capture pipeline metadata, and timing jitter metrics.
- **Per-Channel Score Breakdown:** Granular sub-scores alongside the composite risk index.

---

## 6. Planned Technology Stack

| Layer | Component | Planned Technology |
| :--- | :--- | :--- |
| **Machine Learning** | Frameworks & Architectures | Python, PyTorch, EfficientNet-B0, Xception |
| **Preprocessing** | Video & Face Processing | OpenCV, MediaPipe Face Mesh / Dlib |
| **Backend API** | REST API & Orchestration | Django REST Framework, Celery |
| **Database** | Metadata & Audit Storage | PostgreSQL |
| **Frontend** | Reviewer Dashboard | React, Vite, TypeScript, Tailwind CSS |
| **Inference** | Runtime Acceleration | ONNX Runtime |
| **Deployment** | Packaging & Environment | Docker, Docker Compose |
| **Model Research** | Training Environment | Google Colab (GPU accelerated) |

---

## 7. Strict Scope Restrictions

> [!IMPORTANT]
> **Audio deepfake detection and voice-clone analysis are strictly OUT OF SCOPE.**  
> DeepShield exclusively targets visual frames, facial landmarks, and capture pipeline telemetry. No audio-processing dependencies (`librosa`, `torchaudio`, etc.) or speech models are included.

---

## 8. Repository Layout

```
DeepShield/
│
├── README.md               # Project overview, architecture & specifications
├── .gitignore              # Git ignore rules for ML, Python & Node
├── .env.example            # Environment configuration template
├── agents.md               # System directives & handover documentation for AI agents
│
├── docs/                   # Research notes, diagrams & evaluation reports
│
├── ml/                     # Machine learning subsystem
│   ├── preprocessing/      # Frame extraction, face detection & alignment
│   ├── training/           # Model training pipelines & Colab scripts
│   ├── evaluation/         # Benchmark evaluation metrics (AUC-ROC, EER)
│   ├── deepfake/           # Channel 1: EfficientNet-B0 & Xception implementations
│   ├── liveness/           # Channel 2: Landmark & EAR temporal calculation
│   ├── telemetry/          # Channel 3: Video-injection heuristics & capture checks
│   ├── fusion/             # Multi-channel risk-scoring engine
│   ├── explainability/     # Grad-CAM generation & EAR visualization
│   └── tests/              # Unit tests for ML submodules
│
├── backend/                # Django REST Framework API service
├── frontend/               # React + Vite + TypeScript reviewer dashboard
└── tests/                  # System-level integration test suite
```
