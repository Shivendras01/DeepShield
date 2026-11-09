import uuid
from django.db import models


class ScreeningSession(models.Model):
    """
    Tracks the lifecycle and core metadata of a single Video-KYC screening request.
    """
    class StatusChoices(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_id = models.CharField(max_length=128, default='anonymous-client', help_text="Identifier of the calling institution or application")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=32, choices=StatusChoices.choices, default=StatusChoices.PENDING, db_index=True)
    duration_s = models.FloatField(null=True, blank=True, help_text="Total duration of the video in seconds")
    frames_total = models.PositiveIntegerField(default=0, help_text="Total frames in the uploaded video")
    frames_used = models.PositiveIntegerField(default=0, help_text="Number of sampled frames analyzed")
    error_message = models.TextField(blank=True, default="", help_text="Failure reason if status is FAILED")

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Screening Session'
        verbose_name_plural = 'Screening Sessions'

    def __str__(self):
        return f"Session {self.session_id} [{self.status}]"


class ChannelResult(models.Model):
    """
    Stores isolated, independent outputs for each screening channel before fusion.
    """
    class ChannelChoices(models.TextChoices):
        SPATIAL = 'SPATIAL', 'Spatial Deepfake Detection'
        LIVENESS = 'LIVENESS', 'Passive Liveness (EAR)'
        TELEMETRY = 'TELEMETRY', 'Device & Stream Telemetry'

    session = models.ForeignKey(ScreeningSession, on_delete=models.CASCADE, related_name='channel_results')
    channel = models.CharField(max_length=32, choices=ChannelChoices.choices)
    raw_score = models.FloatField(help_text="Unnormalized model/engine output score")
    normalised_score = models.FloatField(help_text="Score normalized to 0.0 - 100.0 risk scale")
    flagged = models.BooleanField(default=False, help_text="True if this individual channel crossed its threat threshold")
    features_json = models.JSONField(default=dict, blank=True, help_text="Granular channel features (e.g. blink count, device string, jitter)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'channel')
        verbose_name = 'Channel Result'
        verbose_name_plural = 'Channel Results'

    def __str__(self):
        return f"{self.channel} for {self.session.session_id}: {self.normalised_score:.1f}"


class FusionResult(models.Model):
    """
    Stores the final combined Fraud Risk Score, risk band, and rule escalation decision.
    """
    class RiskBandChoices(models.TextChoices):
        LOW = 'LOW', 'Low Risk (0 - 24)'
        GUARDED = 'GUARDED', 'Guarded (25 - 49)'
        ELEVATED = 'ELEVATED', 'Elevated (50 - 74)'
        HIGH = 'HIGH', 'High Risk (75 - 100)'

    session = models.OneToOneField(ScreeningSession, on_delete=models.CASCADE, related_name='fusion_result')
    fusion_version = models.CharField(max_length=64, default='v1.0-weighted-escalated')
    weights_json = models.JSONField(default=dict, help_text="Weights applied across channels (e.g. {'spatial': 0.5, 'liveness': 0.3, 'telemetry': 0.2})")
    fused_score = models.FloatField(help_text="Final combined score from 0.0 to 100.0")
    risk_band = models.CharField(max_length=32, choices=RiskBandChoices.choices, default=RiskBandChoices.LOW)
    escalated = models.BooleanField(default=False, help_text="True if rule-based categorical escalation triggered")
    escalation_reason = models.CharField(max_length=255, blank=True, default="")
    recommendation = models.TextField(blank=True, default="", help_text="Indicative reviewer next step")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Fusion Result'
        verbose_name_plural = 'Fusion Results'

    def __str__(self):
        return f"Fusion {self.session.session_id}: {self.fused_score:.1f} ({self.risk_band})"


class EvidenceArtifact(models.Model):
    """
    References stored diagnostic artifacts (Grad-CAM heatmaps, EAR plots) with cryptographic checksums.
    """
    class ArtifactTypeChoices(models.TextChoices):
        GRADCAM_HEATMAP = 'GRADCAM_HEATMAP', 'Grad-CAM Saliency Map'
        EAR_TIME_SERIES = 'EAR_TIME_SERIES', 'EAR Temporal Blink Curve'
        FRAME_CROP = 'FRAME_CROP', 'Extracted Face Crop'

    session = models.ForeignKey(ScreeningSession, on_delete=models.CASCADE, related_name='evidence_artifacts')
    frame_index = models.PositiveIntegerField(null=True, blank=True, help_text="Frame index if artifact is tied to a specific frame")
    artifact_type = models.CharField(max_length=32, choices=ArtifactTypeChoices.choices)
    storage_ref = models.CharField(max_length=512, help_text="Relative URI or path to artifact file")
    checksum = models.CharField(max_length=64, help_text="SHA-256 hash of the artifact for non-repudiation")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Evidence Artifact'
        verbose_name_plural = 'Evidence Artifacts'

    def __str__(self):
        return f"{self.artifact_type} for {self.session.session_id}"


class ModelRegistry(models.Model):
    """
    Maintains cryptographic traceability of exact model checkpoints used during screening.
    """
    model_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.CharField(max_length=32, choices=ChannelResult.ChannelChoices.choices)
    architecture = models.CharField(max_length=128, help_text="Model architecture name, e.g. EfficientNet-B0")
    checkpoint_hash = models.CharField(max_length=64, help_text="SHA-256 hash of model weights file")
    train_dataset = models.CharField(max_length=255, help_text="Dataset used for training/validation")
    export_format = models.CharField(max_length=32, default='PyTorch', help_text="PyTorch .pth, ONNX FP32, ONNX INT8")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Model Registry Entry'
        verbose_name_plural = 'Model Registry'

    def __str__(self):
        return f"{self.architecture} ({self.channel}) [{self.export_format}]"


class AuditLog(models.Model):
    """
    Append-only immutable audit trail for forensic traceability of every screening event.
    """
    audit_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ScreeningSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.CharField(max_length=128, default='SYSTEM_PIPELINE', help_text="Component or reviewer who performed action")
    action = models.CharField(max_length=64, help_text="e.g. SESSION_INIT, CHANNELS_EVALUATED, FUSION_ESCALATED")
    payload_hash = models.CharField(max_length=64, help_text="SHA-256 hash of the payload/decision state")
    metadata_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"Audit [{self.action}] at {self.timestamp} by {self.actor}"
