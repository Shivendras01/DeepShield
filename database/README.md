# Database Configuration & Schema Documentation

DeepShield utilizes a robust relational schema designed to store multi-modal video screening telemetry, biometric analysis channels, explainability artifacts, and cryptographic audit records.

---

## 1. Supported Database Engines

- **Development & Viva Evaluation:** SQLite 3 (configured by default; zero external configuration needed).
- **Enterprise / Production Banking:** PostgreSQL 14+ or MySQL 8.0+.

---

## 2. Relational Entity Overview

| Table Name | Primary Key | Description |
| :--- | :--- | :--- |
| `screening_session` | `session_id` (UUID) | Master record for each 5-second Video-KYC verification attempt. |
| `channel_result` | `id` (BigSerial) | Isolated per-channel scoring (`SPATIAL`, `LIVENESS`, `TELEMETRY`). |
| `fusion_result` | `id` (BigSerial) | Fused fraud risk score (0–100), risk tier, and policy escalation reason. |
| `evidence_artifact`| `id` (BigSerial) | URI references and SHA-256 digests for Grad-CAM maps, EAR plots, and video clips. |
| `model_registry` | `model_id` (UUID) | Cryptographic provenance of active neural network weights. |
| `audit_log` | `audit_id` (UUID) | Immutable, append-only log capturing every system and officer action. |

---

## 3. Database Initialization & Migration Commands

To initialize or migrate the database using Django ORM:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Inspect migration plan
python manage.py showmigrations

# 3. Apply schema migrations
python manage.py migrate

# 4. (Optional) Create superuser for Django Admin interface
python manage.py createsuperuser
```

---

## 4. Production PostgreSQL Configuration

To switch from SQLite to PostgreSQL in production, update your `.env` file in the backend:

```env
DATABASE_URL=postgres://deepshield_user:your_password@localhost:5432/deepshield_db
```

Or update `backend/config/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'deepshield_db',
        'USER': 'deepshield_user',
        'PASSWORD': 'your_secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```
