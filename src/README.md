# DeepShield Source Code Architecture

As indicated by the project guidelines (*"Folder structure may vary depending on the programming language, framework, and technology used"*), DeepShield is an enterprise full-stack system consisting of a Python/Django REST backend, an AI/ML computer vision pipeline, and a modern React/Vite web application.

---

## Source Code Organization

```
DeepShield/
│
├── backend/                   # Python Django REST Framework Service
│   ├── config/                # Django project settings, ASGI/WSGI, root URL routing
│   ├── screening/             # Core screening application
│   │   ├── engines/           # Multi-Gate Detection Engines
│   │   │   ├── deepfake_detector.py # Gate 3: EfficientNet-B0 CNN + Grad-CAM Saliency
│   │   │   ├── liveness_analyzer.py # Gate 2: MediaPipe 468 Landmark Mesh + EAR Dynamic Blinks
│   │   │   ├── video_processor.py   # OpenCV video decoding and frame sampling
│   │   │   └── telemetry.py         # Gate 1: Virtual camera and stream injection heuristics
│   │   ├── models.py          # Relational entities (Session, ChannelResult, FusionResult, AuditLog)
│   │   ├── serializers.py     # REST API serializers and payload validators
│   │   ├── views.py           # API endpoints (/screen/, /sessions/, /review/, /simulate/)
│   │   └── urls.py            # API routing
│   └── manage.py              # Django management CLI
│
├── frontend/                  # React 18 + Vite + Tailwind CSS Single Page Application
│   └── src/                   # Frontend source code
│       ├── components/        # UI component hierarchy
│       │   ├── applicant/     # Applicant Portal (multi-step KYC onboarding)
│       │   └── reviewer/      # Officer Dossier, Risk Gauge, Explainability Modals
│       ├── context/           # React context (LanguageContext: English & Hindi)
│       ├── i18n/              # Bilingual translation dictionaries
│       ├── pages/             # ApplicantPage, OfficerPage
│       └── services/          # API HTTP client (api.js)
│
└── ml/                        # Machine Learning Pipelines
    ├── models/                # Checkpoint storage (efficientnet_b0_deepfake.pth)
    ├── scripts/               # Training, validation, and evaluation scripts
    └── results/               # Training loss curves, ROC curve, and confusion matrix
```
