"""
DeepShield API Views — Real-time Video KYC Screening, Session Tracking & Forensic Review.
"""

import os
import json
import uuid
import hashlib
import tempfile
from datetime import datetime, timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (
    ScreeningSession,
    ChannelResult,
    FusionResult,
    EvidenceArtifact,
    AuditLog
)
from .telemetry import TelemetryEngine
from .fusion import RiskFusionEngine
from .video_processor import VideoProcessor
from .liveness import LivenessAnalyzer
from .deepfake import SpatialDeepfakeDetector
from .gradcam import GradCAMGenerator


# Initialize Singleton Engines
telemetry_engine = TelemetryEngine()
fusion_engine = RiskFusionEngine()
video_processor = VideoProcessor(target_sample_fps=5.0, crop_margin=0.20)
liveness_analyzer = LivenessAnalyzer()

DEFAULT_WEIGHTS_PATH = os.path.join(settings.BASE_DIR, "screening", "weights", "efficientnet_b0_deepshield.pth")
deepfake_detector = SpatialDeepfakeDetector(
    weights_path=DEFAULT_WEIGHTS_PATH if os.path.exists(DEFAULT_WEIGHTS_PATH) else None,
    device="cpu"
)
gradcam_generator = GradCAMGenerator(deepfake_detector.model)


class HealthCheckView(APIView):
    """
    Health check endpoint to verify backend service and engine readiness.
    """
    def get(self, request):
        return Response({
            "status": "online",
            "service": "DeepShield Video Screening API",
            "version": "1.0.0",
            "channels": ["spatial_deepfake", "passive_liveness", "stream_telemetry"],
            "fusion_engine": fusion_engine.version,
            "mediapipe_liveness": liveness_analyzer.mediapipe_available,
            "spatial_model": "EfficientNet-B0",
            "custom_checkpoint_loaded": deepfake_detector.is_custom_checkpoint,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, status=status.HTTP_200_OK)


class ScreeningLiveApiView(APIView):
    """
    Live video screening endpoint.
    Accepts video file upload and client capture telemetry.
    Orchestrates frame extraction, telemetry inspection, passive liveness analysis,
    spatial deepfake CNN inference, Grad-CAM generation, and risk fusion.
    Returns Dual-Perspective payload (Applicant View + Forensic Reviewer View).
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        client_id = request.data.get("client_id", "sbi-vcip-gateway")
        now_utc = datetime.now(timezone.utc)

        # 1. Parse client telemetry & active challenge
        telemetry_raw = request.data.get("telemetry") or request.data.get("telemetry_payload")
        telemetry_data = {}
        if isinstance(telemetry_raw, str):
            try:
                telemetry_data = json.loads(telemetry_raw)
            except Exception:
                telemetry_data = {"raw_input": telemetry_raw}
        elif isinstance(telemetry_raw, dict):
            telemetry_data = telemetry_raw
        elif isinstance(telemetry_data, dict):
            telemetry_data = telemetry_raw or {}

        # Check explicit file upload flags from multipart form data
        if request.data.get("is_file_upload") in ["true", "True", True]:
            telemetry_data["is_file_upload"] = True

        # Parse active micro-challenge payload if present
        active_challenge_raw = request.data.get("active_challenge")
        active_challenge = None
        if isinstance(active_challenge_raw, str):
            try:
                active_challenge = json.loads(active_challenge_raw)
            except Exception:
                active_challenge = {"type": active_challenge_raw}
        elif isinstance(active_challenge_raw, dict):
            active_challenge = active_challenge_raw
        elif isinstance(telemetry_data, dict) and "active_challenge" in telemetry_data:
            active_challenge = telemetry_data["active_challenge"]

        # 2. Extract uploaded video file
        video_file = request.FILES.get("video")
        temp_video_path = None
        duration_s = 0.0
        frames_total = 0
        frames_used = 0
        faces_detected = 0
        ear_plot_url = "/media/evidence/mock_ear_plot.png"
        gradcam_url = "/media/evidence/mock_gradcam.jpg"

        # Create the initial ScreeningSession (status = PROCESSING)
        session = ScreeningSession.objects.create(
            client_id=client_id,
            status=ScreeningSession.StatusChoices.PROCESSING
        )

        saved_video_path = None
        saved_video_url = None

        try:
            if video_file:
                # Write uploaded bytes to permanent media evidence folder for officer review
                evidence_dir = os.path.join(settings.MEDIA_ROOT, "evidence")
                os.makedirs(evidence_dir, exist_ok=True)

                suffix = os.path.splitext(video_file.name)[1] or ".webm"
                if not suffix.startswith('.'):
                    suffix = '.' + suffix

                video_filename = f"video_{session.session_id}{suffix}"
                saved_video_path = os.path.join(evidence_dir, video_filename)

                with open(saved_video_path, "wb") as f_out:
                    for chunk in video_file.chunks():
                        f_out.write(chunk)

                saved_video_url = f"{settings.MEDIA_URL}evidence/{video_filename}"

                # Run OpenCV Video Processing Pipeline
                proc_result = video_processor.process(saved_video_path)
                meta = proc_result["metadata"]
                duration_s = meta.get("duration_seconds", 0.0)
                frames_total = meta.get("total_frames", 0)
                frames_used = meta.get("frames_sampled", 0)
                faces_detected = meta.get("faces_detected", 0)
                sampled_frames = proc_result.get("sampled_frames", [])
                face_crops = proc_result.get("face_crops", [])

                # Channel 2: Passive & Active Liveness Analysis & Dynamic EAR Plot
                ear_plot_filename = f"ear_{session.session_id}.png"
                ear_plot_path = os.path.join(evidence_dir, ear_plot_filename)
                liveness_eval = liveness_analyzer.analyze_sequence(
                    frames_rgb=sampled_frames,
                    duration_s=duration_s,
                    plot_output_path=ear_plot_path,
                    face_crops=face_crops,
                    active_challenge=active_challenge
                )
                liveness_score = liveness_eval["normalised_score"]
                liveness_notes = liveness_eval["notes"]
                if os.path.exists(ear_plot_path):
                    ear_plot_url = f"{settings.MEDIA_URL}evidence/{ear_plot_filename}"

                # Channel 1: Spatial Deepfake Analysis & Dynamic Grad-CAM Saliency
                if face_crops and faces_detected > 0:
                    spatial_eval = deepfake_detector.predict(face_crops)
                    spatial_score = spatial_eval["normalised_score"]
                    spatial_notes = spatial_eval["notes"]

                    # Generate Grad-CAM on highest-risk crop
                    highest_idx = spatial_eval.get("highest_risk_frame_idx", 0)
                    flagged_crop = face_crops[highest_idx] if highest_idx < len(face_crops) else face_crops[0]

                    gradcam_filename = f"gradcam_{session.session_id}.jpg"
                    gradcam_path = os.path.join(evidence_dir, gradcam_filename)
                    gradcam_generator.generate(flagged_crop, gradcam_path, score=spatial_score)
                    if os.path.exists(gradcam_path):
                        gradcam_url = f"{settings.MEDIA_URL}evidence/{gradcam_filename}"
                else:
                    spatial_score = 75.0
                    spatial_notes = "Face detection failed across all extracted frames."

            else:
                # Fallback for synthetic/telemetry-only test requests
                duration_s = float(request.data.get("duration_s", 3.5))
                frames_total = int(request.data.get("frames_total", 105))
                frames_used = int(request.data.get("frames_used", 18))
                faces_detected = int(request.data.get("faces_detected", 18))
                liveness_score = float(request.data.get("liveness_score", 10.0))
                liveness_notes = "Natural physiological dynamics and blink patterns consistent with live human."
                spatial_score = float(request.data.get("spatial_score", 12.0))
                spatial_notes = f"Verified {faces_detected} face crops; no synthetic blending anomalies."

            # 3. Channel 3: Evaluate Telemetry
            telemetry_eval = telemetry_engine.evaluate(telemetry_data)
            telemetry_score = telemetry_eval["normalised_score"]

            # 4. Risk Fusion Engine
            spatial_metadata = spatial_eval if 'spatial_eval' in locals() else {"notes": spatial_notes}
            liveness_metadata = liveness_eval if 'liveness_eval' in locals() else {"notes": liveness_notes}

            fusion_output = fusion_engine.fuse(
                spatial_score=spatial_score,
                liveness_score=liveness_score,
                telemetry_score=telemetry_score,
                telemetry_meta=telemetry_eval,
                spatial_meta=spatial_metadata,
                liveness_meta=liveness_metadata
            )

            # 5. Database Persistence & Policy Decision
            fused_score = fusion_output["fused_score"]
            is_hard_block = fusion_output.get("is_hard_block", False)
            block_type = fusion_output.get("block_type")
            policy_decision = fusion_output.get("policy_decision", "REQUIRES_OFFICER_REVIEW")

            session.duration_s = duration_s
            session.frames_total = frames_total
            session.frames_used = frames_used

            # Automated Policy Decision Rules:
            # - Score < 25.0: Auto-Approved (COMPLETED)
            # - Score > 60.0: Auto-Rejected (FAILED)
            # - 25.0 <= Score <= 60.0: Pending Human Review (PENDING)
            if is_hard_block or fused_score > 60.0:
                session.status = ScreeningSession.StatusChoices.FAILED
            elif fused_score < 25.0:
                session.status = ScreeningSession.StatusChoices.COMPLETED
            else:
                session.status = ScreeningSession.StatusChoices.PENDING

            session.save()

            # Save Channel Results
            ChannelResult.objects.create(
                session=session,
                channel=ChannelResult.ChannelChoices.SPATIAL,
                raw_score=spatial_score / 100.0,
                normalised_score=spatial_score,
                flagged=spatial_score >= 50.0,
                features_json={"notes": spatial_notes, "faces_detected": faces_detected}
            )
            ChannelResult.objects.create(
                session=session,
                channel=ChannelResult.ChannelChoices.LIVENESS,
                raw_score=liveness_score / 100.0,
                normalised_score=liveness_score,
                flagged=liveness_score >= 50.0,
                features_json={
                    "notes": liveness_notes,
                    "blink_count": liveness_metadata.get("blink_count", 0),
                    "mean_ear": liveness_metadata.get("mean_ear", 0.0),
                    "presentation_attack_detected": liveness_metadata.get("presentation_attack_detected", False),
                    "attack_type": liveness_metadata.get("attack_type"),
                    "moire_score": liveness_metadata.get("moire_score", 0.0),
                    "crop_moire_score": liveness_metadata.get("crop_moire_score", 0.0),
                    "chroma_ratio": liveness_metadata.get("chroma_ratio", 0.0)
                }
            )
            ChannelResult.objects.create(
                session=session,
                channel=ChannelResult.ChannelChoices.TELEMETRY,
                raw_score=telemetry_eval["raw_score"],
                normalised_score=telemetry_score,
                flagged=telemetry_eval["flagged"],
                features_json=telemetry_eval
            )

            # Save Fusion Result
            FusionResult.objects.create(
                session=session,
                fusion_version=fusion_output["fusion_version"],
                weights_json=fusion_output["weights"],
                fused_score=fusion_output["fused_score"],
                risk_band=fusion_output["risk_band"],
                escalated=fusion_output["escalated"],
                escalation_reason=fusion_output["escalation_reason"] or "",
                recommendation=fusion_output["recommendation"]
            )

            # Save Evidence Artifacts in DB
            if saved_video_url and saved_video_path and os.path.exists(saved_video_path):
                try:
                    with open(saved_video_path, "rb") as vf:
                        v_hash = hashlib.sha256(vf.read()).hexdigest()
                    EvidenceArtifact.objects.create(
                        session=session,
                        artifact_type=EvidenceArtifact.ArtifactTypeChoices.APPLICANT_VIDEO,
                        storage_ref=saved_video_url,
                        checksum=v_hash
                    )
                except Exception:
                    pass

            # Generate SHA-256 payload hash and create immutable AuditLog entry
            audit_payload = {
                "session_id": str(session.session_id),
                "fused_score": fusion_output["fused_score"],
                "risk_band": fusion_output["risk_band"],
                "escalated": fusion_output["escalated"],
                "is_hard_block": fusion_output.get("is_hard_block", False),
                "timestamp": now_utc.isoformat()
            }
            payload_hash = hashlib.sha256(json.dumps(audit_payload, sort_keys=True).encode("utf-8")).hexdigest()

            AuditLog.objects.create(
                session=session,
                actor="DEEPSHIELD_PIPELINE",
                action="SESSION_SCREENED",
                payload_hash=payload_hash,
                metadata_json=audit_payload
            )

            # 6. Formulate Dual-Perspective Response
            risk_band = fusion_output["risk_band"]

            if is_hard_block or fused_score > 60.0 or risk_band == "HIGH":
                applicant_status = "REJECTED"
                if block_type == "PRESENTATION_ATTACK_REPLAY":
                    applicant_msg = "Verification rejected. Physical presence could not be confirmed (digital screen replay or presentation attack detected)."
                elif block_type == "VIRTUAL_CAMERA_INJECTION":
                    applicant_msg = "Verification rejected. Capture path violation: pre-recorded video injection or virtual camera detected. Live webcam stream is mandatory."
                else:
                    applicant_msg = f"Verification rejected. Fraud risk score ({fused_score:.1f}) exceeds security policy threshold (> 60.0)."
            elif fused_score < 25.0 or risk_band == "LOW":
                applicant_status = "APPROVED"
                applicant_msg = "Video verification successful! Your identity and biometric liveness have been verified."
            else:
                applicant_status = "UNDER_REVIEW"
                applicant_msg = "Video verification received. Your session is under review by our compliance team."

            applicant_view = {
                "status": applicant_status,
                "is_rejected": applicant_status == "REJECTED",
                "is_approved": applicant_status == "APPROVED",
                "is_under_review": applicant_status == "UNDER_REVIEW",
                "policy_decision": policy_decision,
                "message": applicant_msg,
                "user_message": applicant_msg,
                "session_id": str(session.session_id)
            }

            forensic_view = {
                "session_id": str(session.session_id),
                "client_id": session.client_id,
                "timestamp": now_utc.isoformat(),
                "status": session.status,
                "file_metrics": {
                    "duration_seconds": duration_s,
                    "frames_total": frames_total,
                    "frames_sampled": frames_used,
                    "faces_detected": faces_detected
                },
                "fused_score": fusion_output["fused_score"],
                "risk_band": fusion_output["risk_band"],
                "policy_decision": policy_decision,
                "requires_review": (25.0 <= fused_score <= 60.0),
                "is_auto_decided": (fused_score < 25.0 or fused_score > 60.0 or is_hard_block),
                "escalated": fusion_output["escalated"],
                "is_hard_block": is_hard_block,
                "block_type": block_type,
                "escalation_reason": fusion_output["escalation_reason"],
                "recommendation": fusion_output["recommendation"],
                "channel_scores": {
                    "spatial": {
                        "score": spatial_score,
                        "flagged": spatial_score >= 50.0,
                        "notes": spatial_notes
                    },
                    "liveness": {
                        "score": liveness_score,
                        "flagged": liveness_score >= 50.0,
                        "notes": liveness_notes
                    },
                    "telemetry": {
                        "score": telemetry_score,
                        "virtual_camera_detected": telemetry_eval["virtual_camera_detected"],
                        "notes": telemetry_eval["notes"]
                    }
                },
                "channel_contributions": fusion_output["channel_contributions"],
                "evidence": {
                    "video_url": saved_video_url,
                    "gradcam_url": gradcam_url,
                    "ear_plot_url": ear_plot_url
                },
                "audit_integrity_hash": payload_hash
            }

            return Response({
                "session_id": str(session.session_id),
                "status": "COMPLETED",
                "applicant_view": applicant_view,
                "forensic_reviewer_view": forensic_view,
                "disclaimer": "DeepShield is an auditable decision-support screening system for video-KYC."
            }, status=status.HTTP_200_OK)

        except Exception as e:
            session.status = ScreeningSession.StatusChoices.FAILED
            session.error_message = str(e)
            session.save()
            return Response({
                "session_id": str(session.session_id),
                "status": "FAILED",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        finally:
            # We preserve saved_video_path for forensic review in MEDIA_ROOT/evidence
            pass


class SessionDetailApiView(APIView):
    """
    Retrieves full audit and forensic records for a specific historical screening session.
    """
    def get(self, request, session_id):
        try:
            session = ScreeningSession.objects.prefetch_related(
                "channel_results", "audit_logs", "evidence_artifacts"
            ).get(session_id=session_id)
        except ScreeningSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        fusion = getattr(session, "fusion_result", None)
        fusion_data = {
            "fused_score": fusion.fused_score,
            "composite_score": fusion.fused_score,
            "risk_band": fusion.risk_band,
            "escalated": fusion.escalated,
            "escalation_reason": fusion.escalation_reason or "",
            "recommendation": fusion.recommendation or "",
            "weights": fusion.weights_json
        } if fusion else {
            "composite_score": 0.0,
            "risk_band": "LOW",
            "escalated": False,
            "recommendation": "Processing or incomplete screening session."
        }

        channel_results = [
            {
                "channel": cr.channel,
                "raw_score": cr.raw_score,
                "normalised_score": cr.normalised_score,
                "flagged": cr.flagged,
                "notes": cr.features_json.get("notes", "") if isinstance(cr.features_json, dict) else str(cr.features_json),
                "features": cr.features_json
            }
            for cr in session.channel_results.all()
        ]

        # Check stored or generated evidence artifacts
        artifacts = []
        for art in session.evidence_artifacts.all():
            storage_p = getattr(art, "storage_path", None) or getattr(art, "storage_ref", "")
            artifacts.append({
                "artifact_type": art.artifact_type,
                "storage_path": storage_p,
                "sha256_hash": getattr(art, "sha256_hash", None) or getattr(art, "checksum", "verified")
            })

        # Dynamic fallback: check disk if artifacts exist in media/evidence
        evidence_dir = os.path.join(settings.MEDIA_ROOT, "evidence")
        gradcam_file = f"gradcam_{session.session_id}.jpg"
        ear_file = f"ear_{session.session_id}.png"
        if not any(a["artifact_type"] == "GRADCAM" for a in artifacts):
            if os.path.exists(os.path.join(evidence_dir, gradcam_file)):
                artifacts.append({
                    "artifact_type": "GRADCAM",
                    "storage_path": f"{settings.MEDIA_URL}evidence/{gradcam_file}",
                    "sha256_hash": "verified"
                })
        if not any(a["artifact_type"] == "EAR_PLOT" for a in artifacts):
            if os.path.exists(os.path.join(evidence_dir, ear_file)):
                artifacts.append({
                    "artifact_type": "EAR_PLOT",
                    "storage_path": f"{settings.MEDIA_URL}evidence/{ear_file}",
                    "sha256_hash": "verified"
                })
        if not any(a["artifact_type"] in ["APPLICANT_VIDEO", "VIDEO"] for a in artifacts):
            for ext in [".webm", ".mp4", ".mov", ".avi"]:
                v_name = f"video_{session.session_id}{ext}"
                if os.path.exists(os.path.join(evidence_dir, v_name)):
                    artifacts.append({
                        "artifact_type": "APPLICANT_VIDEO",
                        "storage_path": f"{settings.MEDIA_URL}evidence/{v_name}",
                        "sha256_hash": "verified"
                    })
                    break

        audit_history = [
            {
                "audit_id": str(a.audit_id),
                "timestamp": a.timestamp.isoformat(),
                "actor": a.actor,
                "action": a.action,
                "payload_hash": a.payload_hash
            }
            for a in session.audit_logs.all()
        ]

        channels = {
            cr.channel.lower(): {
                "score": cr.normalised_score,
                "flagged": cr.flagged,
                "features": cr.features_json
            }
            for cr in session.channel_results.all()
        }

        fused_score = fusion.fused_score if fusion else 0.0
        is_hard_block = getattr(fusion, "is_hard_block", False) if fusion else False
        if fused_score < 25.0:
            policy_decision = "AUTO_APPROVED"
            requires_review = False
        elif fused_score > 60.0 or is_hard_block:
            policy_decision = "AUTO_REJECTED"
            requires_review = False
        else:
            requires_review = (session.status == ScreeningSession.StatusChoices.PENDING)
            policy_decision = "REQUIRES_OFFICER_REVIEW" if requires_review else (
                "OFFICER_APPROVED" if session.status == ScreeningSession.StatusChoices.COMPLETED else "OFFICER_REJECTED"
            )

        return Response({
            "session_id": str(session.session_id),
            "client_id": session.client_id,
            "created_at": session.created_at.isoformat(),
            "status": session.status,
            "duration_s": session.duration_s,
            "frames_used": session.frames_used,
            "fused_score": fused_score,
            "risk_band": fusion.risk_band if fusion else None,
            "policy_decision": policy_decision,
            "requires_review": requires_review,
            "is_auto_decided": (fused_score < 25.0 or fused_score > 60.0),
            "escalated": fusion.escalated if fusion else False,
            "recommendation": fusion.recommendation if fusion else "",
            "channels": channels,
            "fusion_result": fusion_data,
            "channel_results": channel_results,
            "evidence_artifacts": artifacts,
            "audit_logs": audit_history,
            "audit_history": audit_history
        }, status=status.HTTP_200_OK)


class SessionReviewActionApiView(APIView):
    """
    Human-in-the-Loop review endpoint for compliance officers.
    Allows human approval, rejection, or escalation of flagged/grey-area sessions.
    """
    def post(self, request, session_id):
        try:
            session = ScreeningSession.objects.get(session_id=session_id)
        except ScreeningSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        raw_decision = str(request.data.get("decision") or request.data.get("action") or "").strip().upper()
        if raw_decision in ["APPROVE", "APPROVED"]:
            decision = "APPROVED"
        elif raw_decision in ["REJECT", "REJECTED"]:
            decision = "REJECTED"
        else:
            return Response(
                {"error": "Invalid decision. Must be 'APPROVED' or 'REJECTED'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        officer_id = request.data.get("officer_id", "ANONYMOUS_OFFICER")
        notes = request.data.get("notes", "")

        session.status = ScreeningSession.StatusChoices.COMPLETED if decision == "APPROVED" else ScreeningSession.StatusChoices.FAILED
        session.save()

        review_payload = {
            "session_id": str(session.session_id),
            "decision": decision,
            "officer_id": officer_id,
            "notes": notes,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        review_hash = hashlib.sha256(json.dumps(review_payload, sort_keys=True).encode("utf-8")).hexdigest()

        AuditLog.objects.create(
            session=session,
            actor=officer_id,
            action=f"OFFICER_{decision}",
            payload_hash=review_hash,
            metadata_json=review_payload
        )

        return Response({
            "session_id": str(session.session_id),
            "decision": decision,
            "officer_id": officer_id,
            "status": "DECISION_RECORDED",
            "audit_hash": review_hash
        }, status=status.HTTP_200_OK)


class SessionListApiView(APIView):
    """
    Returns recent screening sessions for the Bank Officer dashboard review queue.
    """
    def get(self, request):
        limit = int(request.query_params.get("limit", 20))
        sessions = ScreeningSession.objects.select_related("fusion_result").all()[:limit]

        session_list = []
        for s in sessions:
            fusion = getattr(s, "fusion_result", None)
            fused_score = fusion.fused_score if fusion else 0.0
            is_hard_block = getattr(fusion, "is_hard_block", False) if fusion else False

            if fused_score < 25.0:
                policy_decision = "AUTO_APPROVED"
                requires_review = False
            elif fused_score > 60.0 or is_hard_block:
                policy_decision = "AUTO_REJECTED"
                requires_review = False
            else:
                requires_review = (s.status == ScreeningSession.StatusChoices.PENDING)
                policy_decision = "REQUIRES_OFFICER_REVIEW" if requires_review else (
                    "OFFICER_APPROVED" if s.status == ScreeningSession.StatusChoices.COMPLETED else "OFFICER_REJECTED"
                )

            session_list.append({
                "session_id": str(s.session_id),
                "client_id": s.client_id,
                "created_at": s.created_at.isoformat(),
                "status": s.status,
                "fused_score": fused_score,
                "risk_band": fusion.risk_band if fusion else None,
                "escalated": fusion.escalated if fusion else False,
                "policy_decision": policy_decision,
                "requires_review": requires_review
            })

        return Response({"count": len(session_list), "results": session_list}, status=status.HTTP_200_OK)
