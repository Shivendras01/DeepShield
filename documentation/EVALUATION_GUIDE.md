# DeepShield Project Evaluation & Testing Guide

**Evaluator Guide for Mr. Neeraj Goyal & Assistant Prof. Anjali Saraswat**

---

## 1. Quick Verification Checklist

Follow these steps to evaluate the full operational capabilities of the DeepShield system:

### A. Live Applicant Portal Demonstration
1. Open Google Chrome or any modern browser and navigate to:
   `http://localhost:5173`
2. Fill out the applicant registration form:
   - **Name:** Shivendra Singh Chauhan
   - **ID Type:** Aadhaar Card (UIDAI)
   - **ID Number:** XXXX-XXXX-9041
3. Click **Proceed to e-KYC Instructions**, review the guidelines, and click **Proceed to Camera Check**.
4. Allow camera permissions and click **Start 5-Second Recording**.
5. Look naturally into the camera and blink 1–2 times.
6. The system automatically records for exactly 5 seconds, samples 24 frames, runs multi-gate inference, and renders the **Verification Successful** screen.

---

### B. Officer Dossier & Forensic Explainability Evaluation
1. In the top navigation bar, click on **Officer Dossier**.
2. Locate the most recently completed session in the queue table.
3. Click **Inspect Dossier** to examine the deep forensic breakdown:
   - **Risk Fusion Engine Gauge:** Visual score indicator and risk band.
   - **Three Independent Signals:** Spatial CNN score, Liveness EAR score, and Stream Telemetry score.
   - **Explainability Artifacts:**
     - Click **Applicant Video** to play back the recorded video.
     - Click **Grad-CAM Spatial** to zoom into the neural activation heatmap.
     - Click **EAR Blink Curve** to inspect the temporal eye-openness waveform with labeled blink valleys.
   - **Export Audit Certificate (PDF):** Click the top button to generate and download an official compliance audit certificate.

---

### C. Evaluating All 3 Security Gates via 1-Click Simulation Sandbox
To test attack defense capabilities without requiring specialized hardware:
1. In the **Officer Dossier**, expand the **Judge Viva Simulation Sandbox** banner.
2. Click each of the 5 test buttons to evaluate the specific gate defense:
   - **Gate 1: Stream Injection (OBS Virtual Camera Bypass):** Triggers immediate Hard Block (`Score = 100.0`, `AUTO_REJECTED`).
   - **Gate 2: Presentation Attack (Screen Replay):** Flags smartphone display Moiré grid and flatline blink dynamics (`Score = 100.0`, `AUTO_REJECTED`).
   - **Gate 3: AI Deepfake (Face-Swap GAN):** Flags synthetic facial boundary seams via EfficientNet-B0 and Grad-CAM (`Score = 82.5`, `AUTO_REJECTED`).
   - **Grey-Area Risk (Borderline):** Scores in the 25.0–60.0 range; requires human officer review (`REQUIRES_OFFICER_REVIEW`).
   - **Genuine Applicant (Live Stream):** Verified organic blinks and physical CMOS sensor (`Score = 8.5`, `AUTO_APPROVED`).
