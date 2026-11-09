from django.contrib import admin
from .models import (
    ScreeningSession,
    ChannelResult,
    FusionResult,
    EvidenceArtifact,
    ModelRegistry,
    AuditLog,
)


@admin.register(ScreeningSession)
class ScreeningSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'client_id', 'status', 'duration_s', 'frames_used', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('session_id', 'client_id')
    readonly_fields = ('session_id', 'created_at')


@admin.register(ChannelResult)
class ChannelResultAdmin(admin.ModelAdmin):
    list_display = ('session', 'channel', 'raw_score', 'normalised_score', 'flagged', 'created_at')
    list_filter = ('channel', 'flagged')
    search_fields = ('session__session_id',)


@admin.register(FusionResult)
class FusionResultAdmin(admin.ModelAdmin):
    list_display = ('session', 'fused_score', 'risk_band', 'escalated', 'fusion_version', 'created_at')
    list_filter = ('risk_band', 'escalated')
    search_fields = ('session__session_id',)


@admin.register(EvidenceArtifact)
class EvidenceArtifactAdmin(admin.ModelAdmin):
    list_display = ('session', 'artifact_type', 'frame_index', 'checksum', 'created_at')
    list_filter = ('artifact_type',)
    search_fields = ('session__session_id', 'checksum')


@admin.register(ModelRegistry)
class ModelRegistryAdmin(admin.ModelAdmin):
    list_display = ('architecture', 'channel', 'export_format', 'train_dataset', 'checkpoint_hash', 'created_at')
    list_filter = ('channel', 'export_format')
    search_fields = ('architecture', 'checkpoint_hash')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('audit_id', 'session', 'action', 'actor', 'payload_hash', 'timestamp')
    list_filter = ('action', 'actor')
    search_fields = ('session__session_id', 'audit_id', 'payload_hash')
    # Append-only: prevent modifications in admin
    def has_change_permission(self, request, obj=None):
        return False
