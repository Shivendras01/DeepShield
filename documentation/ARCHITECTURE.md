# DeepShield System Architecture & Security Specification

## 1. Executive Architecture Summary

DeepShield is a high-throughput, multi-spectral decision-support system designed to secure digital banking and Video-KYC (Customer Identification Procedures) against emerging biometric impersonation attacks. It processes short 5-second video streams through three independent verification gates before synthesizing an aggregated fraud risk score.

```
                                  [ Video-KYC Stream ]
                                            │
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │          GATE 1: VIDEO STREAM TELEMETRY          │
                  │  (Virtual Driver Detection, Timestamp Jitter)    │
                  └─────────────────────────┬────────────────────────┘
                                            │ PASS / HARD BLOCK
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │       GATE 2: PRESENTATION ATTACK DETECTION      │
                  │   (MediaPipe EAR Dynamic Blinks, FFT Moiré Grid) │
                  └─────────────────────────┬────────────────────────┘
                                            │ PASS / HARD BLOCK
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │      GATE 3: SPATIAL DEEPFAKE DETECTION          │
                  │    (EfficientNet-B0 CNN, Boundary Seam Artifacts)│
                  └─────────────────────────┬────────────────────────┘
                                            │
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │             WEIGHTED RISK FUSION ENGINE          │
                  │     Fused Score = 0.50*S + 0.30*L + 0.20*T       │
                  └─────────────────────────┬────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            [ AUTO-APPROVED ]     [ REQUIRES REVIEW ]      [ AUTO-REJECTED ]
              Score < 25.0            25.0 – 60.0             Score > 60.0
```

---

## 2. Multi-Gate Screening Pipeline

### Gate 1: Stream Telemetry & Injection Defense
- **Objective:** Intercept software-level stream spoofing before heavy neural network processing.
- **Analysis Vectors:**
  - Media device label inspection against known virtual camera patterns (e.g., `OBS Virtual Camera`, `ManyCam`, `vku`, `fake_cam`).
  - Video file container metadata checks (pre-recorded MP4/AVI vs live MediaRecorder blob).
  - Delivery timestamp jitter analysis (detecting constant frame deltas characteristic of file streaming).
- **Enforcement:** If virtual camera or direct file bypass is detected, Gate 1 issues an **Immediate Hard Block (Score = 100.0)**.

### Gate 2: Biometric Liveness & Presentation Attack Detection (PAD)
- **Objective:** Defeat 2D presentation attacks, physical photo cutouts, and smartphone OLED screen replays in compliance with ISO/IEC 30107.
- **Analysis Vectors:**
  - 468-point facial landmark mesh tracking via MediaPipe.
  - Temporal Eye Aspect Ratio (EAR) computation across frames:
    $$\text{EAR} = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2 \times ||p_1 - p_4||}$$
  - Spontaneous blink event detection (detecting physiological dips below threshold $\approx 0.22$).
  - FFT-based 2D spectrum analysis for screen pixel grid patterns (Moiré interference) and chrominance variance spikes.
- **Enforcement:** If screen replay or flatline blink dynamics are confirmed, Gate 2 triggers an **Immediate Hard Block (Score = 100.0)**.

### Gate 3: Spatial Deepfake Detection & Explainability
- **Objective:** Detect generative facial manipulations (GAN face-swaps, DeepFaceLab, FaceForensics++ synthetic artifacts).
- **Model Architecture:** EfficientNet-B0 CNN fine-tuned on aligned facial crops with PyTorch.
- **Explainability:**
  - Integrated Grad-CAM (Gradient-weighted Class Activation Mapping) computes coarse 2D heatmaps highlighting spatial regions triggering the deepfake classifier.
  - Generates forensic visual artifacts stored with SHA-256 integrity checksums.

---

## 3. Decision Matrix & Policy Tiers

| Fused Score Range | Risk Tier | Automated Policy Action | Reviewer Next Steps |
| :--- | :--- | :--- | :--- |
| **0.0 – 24.9** | **LOW** | **AUTO_APPROVED** | Straight-through processing; immediate account onboarding. |
| **25.0 – 60.0** | **GUARDED** | **REQUIRES_OFFICER_REVIEW** | Session flagged for manual inspection in Officer Dossier. |
| **60.1 – 100.0** | **HIGH** | **AUTO_REJECTED** | Onboarding rejected; anti-fraud team alert generated. |
| **Any Hard Block** | **CRITICAL** | **AUTO_REJECTED** | Immediate rejection; reason logged in immutable audit trail. |
