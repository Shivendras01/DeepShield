# DeepShield: Video Injection & AI Deepfake Screening System for Banking and Video-KYC

> **Academic Degree:** Bachelor of Technology (B.Tech) in Artificial Intelligence & Machine Learning  
> **Institution:** Department of Computer Science & Engineering, ITM University Gwalior  
> **Course:** Minor Research Project (Minor-2)  
> **Evaluator:** Mr. Neeraj Goyal  
> **Faculty Project Guide:** Assistant Prof. Anjali Saraswat  

---

## 1. Project Title
**DeepShield — A Multi-Spectral Hybrid Screening Architecture for Real-Time Video-KYC Spoofing and Deepfake Defense in Digital Banking**

---

## 2. Project Description / Overview
**DeepShield** is an enterprise-grade AI decision-support platform designed to secure digital banking and Video-KYC (Customer Identification Procedures) against sophisticated identity fraud. It evaluates short 5-second video streams across three independent, multi-spectral verification gates to intercept synthetic manipulations, screen replays, and virtual camera injections before financial onboarding.

Unlike conventional monolithic biometric classifiers that evaluate facial textures in isolation, DeepShield utilizes an asymmetric, layered defense pipeline:
1. **Gate 1 (Hardware & Stream Telemetry):** Intercepts pre-recorded video files and virtual camera drivers (e.g., OBS Virtual Camera, ManyCam) directly at the operating system and browser interface level.
2. **Gate 2 (Biometric Liveness & Presentation Attack Detection):** Tracks 468 facial mesh landmarks in real time via MediaPipe to compute temporal Eye Aspect Ratio (EAR) physiological blink curves, combined with FFT 2D spectrum analysis to identify digital screen replay Moiré grids (ISO/IEC 30107 compliant).
3. **Gate 3 (Spatial Deepfake Saliency):** Uses an optimized PyTorch EfficientNet-B0 CNN to detect subtle boundary blending seams, digital warping, and generative facial synthesis artifacts, with full visual explainability via Grad-CAM heatmaps.
4. **Weighted Risk Fusion Engine:** Normalizes independent multi-signal heuristics into a calibrated **Fraud Risk Score (0.0 to 100.0)** with automated straight-through processing for genuine customers and an interactive forensic dossier for compliance officers.

---

## 3. Problem Statement
Digital financial inclusion initiatives and remote bank account opening increasingly rely on Video-KYC (V-CIP) to establish customer identities. However, the rapid democratization of generative AI (deepfakes) and software-defined virtual cameras has created critical vulnerabilities in the verification process:

1. **Virtual Stream Injection Attacks:** Fraudsters bypass the physical webcam by piping pre-recorded footage of legitimate individuals or loopback videos through virtual camera drivers directly into browser WebRTC streams.
2. **Digital Screen Presentation Attacks:** Attackers hold high-resolution smartphone OLED screens or tablets displaying pre-recorded biometric footage in front of a real webcam.
3. **Generative Face-Swap Deepfakes:** Adversaries utilize generative adversarial networks (GANs) or diffusion models to transpose the face of an impostor onto an authorized identity credential.
4. **The "Black Box" Problem:** Traditional deep learning models output raw confidence numbers without explainable evidence, leaving compliance officers unable to justify regulatory audit decisions under RBI V-CIP guidelines.

---

## 4. Project Objectives
- **Multi-Gate Screening Architecture:** Implement three independent detection gates (Stream Telemetry, Biometric Liveness, and Spatial Deepfake Detection) running in a pipeline to minimize false acceptance rates (FAR).
- **Sub-3-Second Real-Time Processing:** Sample and process exactly 24 representative frames from a 5-second capture session within 3 seconds on standard CPU/GPU infrastructure.
- **Explainable Forensic Artifacts:** Provide automated visual explainability for human officers via integrated Grad-CAM activation heatmaps and temporal EAR blink waveforms.
- **Deterministic Regulatory Policy:** Implement a multi-tier decision matrix:
  - **Score < 25.0:** Auto-Approved (Zero-friction customer onboarding).
  - **Score 25.0 – 60.0:** Requires Officer Review (Borderline audit queue).
  - **Score > 60.0 or Hard Block:** Auto-Rejected (Immediate fraud prevention).
- **Tamper-Evident Auditability:** Ensure every session, diagnostic channel score, and officer review action is cryptographically anchored using SHA-256 digests in an append-only audit log.

---

## 5. Technologies and Tools Used

### Backend & AI Pipeline
- **Python 3.12 / 3.10+** — Core runtime environment.
- **Django 5.0+ & Django REST Framework (DRF)** — RESTful API services and asynchronous screening endpoints.
- **PyTorch 2.0+ & Torchvision** — Neural network inference, tensor operations, and Grad-CAM backpropagation.
- **EfficientNet-B0 CNN** — Primary lightweight spatial deepfake classifier.
- **MediaPipe (Google)** — 468-point 3D facial landmark mesh tracking for non-invasive passive liveness.
- **OpenCV (cv2)** — Video stream decoding, frame rate extraction, face cropping, and FFT spectral decomposition.
- **Matplotlib & Pillow** — Dynamic server-side rendering of EAR time-series plots and Grad-CAM heatmaps.

### Frontend Application
- **React 18** — High-performance user interface library.
- **Vite** — Next-generation frontend build tooling and instant Hot Module Replacement (HMR).
- **Tailwind CSS** — Enterprise banking UI theme with dark/light compliance palettes.
- **Lucide Icons & Framer Motion** — Micro-interactions, animated risk gauges, and iconography.
- **HTML5 WebRTC / MediaDevices API** — In-browser hardware camera capture and stream constraint validation.

### Database & Security
- **SQLite 3** — Default transactional storage for development and academic viva evaluation.
- **PostgreSQL 14+** — Production enterprise database backend.
- **SHA-256 Cryptographic Hashing** — Evidence artifact integrity and tamper-evident audit logging.

---

## 6. Key Features and Functionalities

| Feature Module | Technical Implementation | Practical Benefit |
| :--- | :--- | :--- |
| **Stream Injection Defense (Gate 1)** | `telemetry.py` hardware label matching & container timing analysis | Hard-blocks OBS Virtual Camera and pre-recorded video injection instantly (Score = 100.0). |
| **Presentation Attack Detection (Gate 2)**| MediaPipe EAR landmark dynamics + FFT Moiré subpixel analysis | Detects 2D digital screen replays and absent spontaneous blink patterns. |
| **Spatial Deepfake Detection (Gate 3)**| PyTorch EfficientNet-B0 CNN fine-tuned on synthetic facial boundaries | Detects GAN facial blending seams, boundary warping, and synthetic generative artifacts. |
| **Explainable Forensic Artifacts** | PyTorch Grad-CAM hook + Matplotlib EAR time-series generator | Generates visual heatmaps and eye-closure plots stored with SHA-256 verification hashes. |
| **Weighted Risk Fusion Engine** | Calibrated formula: $0.50 \times \text{Spatial} + 0.30 \times \text{Liveness} + 0.20 \times \text{Telemetry}$ | Provides a unified 0–100 risk score and triggers categorical hard-block escalations. |
| **Officer Forensic Dossier** | React 18 dashboard with modal artifact inspection & audit logs | Enables human compliance officers to inspect videos, heatmaps, and submit review decisions. |
| **1-Click Judge Simulation Sandbox** | DRF `/api/v1/simulate/` endpoint with authentic past test records | Evaluators can trigger live simulations of all 5 security scenarios in one click. |
| **Official Audit Certification** | In-browser PDF generation service with session hashes and timestamps | Produces downloadable compliance certificates for regulatory filing. |

---

## 7. System Requirements

### Hardware Requirements
- **Processor:** Intel Core i5 / AMD Ryzen 5 or higher (minimum 4 physical cores).
- **RAM:** 8 GB RAM minimum (16 GB recommended for concurrent inference).
- **GPU (Optional):** NVIDIA GPU with CUDA support for accelerated batch inference (runs smoothly on CPU via optimized Torch FP32).
- **Camera:** Standard 720p or 1080p hardware webcam.

### Software Requirements
- **Operating System:** Windows 10/11, macOS (Apple Silicon or Intel), or Ubuntu 22.04 LTS.
- **Python:** Version 3.10, 3.11, or 3.12.
- **Node.js:** Version 18.0.0 or higher.
- **Web Browser:** Google Chrome 110+, Microsoft Edge, or Mozilla Firefox (with camera permissions enabled).

---

## 8. Installation Instructions

### Step 1: Clone the Repository
```bash
git clone https://github.com/Shivendras01/DeepShield.git
cd DeepShield
```

### Step 2: Backend Environment Setup
```bash
# 1. Create a Python virtual environment
python -m venv venv

# 2. Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On Linux / macOS:
source venv/bin/activate

# 3. Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Frontend Environment Setup
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js packages
npm install

# 3. Return to the project root
cd ..
```

---

## 9. Steps to Run the Project

### 1. Launch the Django Backend Server
Open a terminal in the project root:
```bash
# Activate virtual environment
.\venv\Scripts\activate

# Navigate to backend and apply migrations
cd backend
python manage.py migrate

# Start the REST API server on port 8000
python manage.py runserver 127.0.0.1:8000
```
> The API will be available at: `http://127.0.0.1:8000/api/v1/health/`

### 2. Launch the React Vite Frontend
Open a second terminal:
```bash
cd frontend
npm run dev
```
> The interactive application will be available at: `http://localhost:5173`

---

## 10. Database Configuration

DeepShield uses **SQLite 3** by default for zero-configuration local development and evaluation.

### Database Setup Commands:
```bash
cd backend
# Check pending migrations
python manage.py showmigrations

# Apply database migrations
python manage.py migrate

# (Optional) Create superuser for Django Admin portal (http://127.0.0.1:8000/admin/)
python manage.py createsuperuser
```

### Production PostgreSQL Setup (Optional):
To connect to an enterprise PostgreSQL instance, configure the `DATABASE_URL` environment variable in `backend/.env`:
```env
DATABASE_URL=postgres://deepshield_user:your_password@localhost:5432/deepshield_db
```
For complete database entity relationships and ANSI SQL DDL scripts, see [`database/schema.sql`](database/schema.sql) and [`database/README.md`](database/README.md).

---

## 11. Screenshots of the Working Project

### 1. Applicant Identity Verification Form (Step 1)
*Applicant inputs legal name, registered mobile number, and government identification document (Aadhaar, PAN, Passport) under a 256-bit encrypted session.*

![Applicant Identity Verification Form](screenshots/01_applicant_identity_form.png)

---

### 2. Biometric Verification Guidelines (Step 2)
*Clear user onboarding instructions detailing room lighting, direct facial gaze, blink frequency, and the prohibition of physical masks or screen cutouts.*

![Biometric Verification Guidelines](screenshots/02_verification_guidelines.png)

---

### 3. Automated 5-Second Passive Biometric Video Capture (Step 3)
*Real-time browser camera check verifying genuine hardware camera sensors. The session records exactly 5 seconds without requiring awkward head turns.*

![Passive Biometric Video Capture](screenshots/03_biometric_camera_viewport.png)

---

### 4. Verification Successful Modal (Auto-Approval Confirmation)
*Instant straight-through onboarding screen displayed to the applicant upon completing multi-gate verification with a low risk score.*

![Verification Successful](screenshots/04_verification_successful.png)

---

### 5. Officer Review Queue & Audit Records Table
*Compliance officer portal displaying all screening sessions, timestamps, status badges, computed fraud risk scores, and review actions.*

![Officer Review Queue](screenshots/05_officer_review_queue.png)

---

### 6. Explainable Forensic Dossier (3 Channels, Grad-CAM, & EAR Dynamics)
*Comprehensive forensic investigation view displaying the calibrated Risk Gauge, 3-signal diagnostics, synchronized video playback, spatial Grad-CAM heatmap, and temporal EAR eye-blink curves.*

![Explainable Forensic Dossier](screenshots/06_forensic_dossier_explainability.png)

---

## 12. Repository Structure

```
DeepShield/
│
├── README.md                      # Comprehensive project documentation and evaluation guide
├── .gitignore                     # Git ignore rules for node_modules, venv, and checkpoints
├── requirements.txt               # Python package dependencies
├── package.json                   # Root workspace package scripts
│
├── src/                           # Source code architecture reference and mapping
│   └── README.md                  # Architectural breakdown of backend, frontend, and ml
│
├── public/                        # Public static assets, branding, and hero graphics
│   └── hero.png                   # System banner and architectural overview diagram
│
├── screenshots/                   # High-resolution screenshots of the working system
│   ├── 01_applicant_identity_form.png
│   ├── 02_verification_guidelines.png
│   ├── 03_biometric_camera_viewport.png
│   ├── 04_verification_successful.png
│   ├── 05_officer_review_queue.png
│   └── 06_forensic_dossier_explainability.png
│
├── documentation/                 # Technical documentation and evaluation manuals
│   ├── ARCHITECTURE.md            # Detailed multi-gate system architecture & fusion math
│   ├── API_SPECIFICATION.md       # REST API endpoint reference and payload examples
│   └── EVALUATION_GUIDE.md        # Step-by-step evaluator testing checklist for teachers
│
├── database/                      # Relational database artifacts and SQL DDL
│   ├── schema.sql                 # Complete relational table schema DDL (PostgreSQL & SQLite)
│   └── README.md                  # Database setup instructions and migration commands
│
├── backend/                       # Python Django REST Framework application
│   ├── config/                    # Django project configuration & settings
│   ├── screening/                 # Core screening app, models, views, and detection engines
│   └── manage.py                  # Django CLI
│
├── frontend/                      # React 18 + Vite + Tailwind CSS dashboard
│   ├── src/                       # Frontend UI components, pages, context, and services
│   ├── package.json               # Frontend dependencies
│   └── vite.config.js             # Vite configuration
│
└── ml/                            # Machine learning models, training scripts, and metrics
    ├── models/                    # Model weight checkpoint references
    ├── scripts/                   # Model training and synthetic data generation scripts
    └── results/                   # Confusion matrix, ROC curve, and training curves
```

---

## 13. Team Members' Names and Enrollment Numbers

| Full Name | Enrollment Number | Programme | Role in Project |
| :--- | :--- | :--- | :--- |
| **Shivendra Singh Chauhan** | **BETN1AI25069** | B.Tech CSE (AI & ML), Semester VII | Full-Stack Pipeline, Gate 1 Telemetry & Gate 2 Liveness |
| **Divya** | **BETN1AI25113** | B.Tech CSE (AI & ML), Semester VII | Gate 3 EfficientNet CNN, Grad-CAM Explainability & Research |

### Faculty Guide & Evaluator
- **Faculty Project Guide:** Assistant Prof. Anjali Saraswat, Department of Computer Science & Engineering
- **Project Evaluator:** Mr. Neeraj Goyal, Department of Computer Science & Engineering
- **Department:** Department of Computer Science & Engineering, ITM University Gwalior
