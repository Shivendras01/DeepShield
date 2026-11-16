import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  Eye, 
  Camera, 
  Activity, 
  Cpu, 
  Layers, 
  FileText, 
  Check, 
  X, 
  AlertTriangle,
  History,
  Lock,
  ExternalLink,
  ShieldAlert,
  Maximize2,
  ZoomIn,
  Play,
  Video as VideoIcon
} from 'lucide-react';
import RiskGauge from './RiskGauge';
import ForensicReportModal from './ForensicReportModal';
import { resolveMediaUrl, api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function ForensicDossier({ session, onBack, onReviewSubmitted }) {
  const { t, lang } = useLanguage();
  const [officerNotes, setOfficerNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Lightbox / Zoom Modal State
  const [activeModalArtifact, setActiveModalArtifact] = useState(null);

  // Keyboard shortcut listener: ESC to close Lightbox modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModalArtifact(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!session) return null;

  const fusion = session.fusion_result || {};
  const channels = session.channel_results || [];
  const artifacts = session.evidence_artifacts || [];
  const auditLogs = session.audit_logs || [];

  const spatialChan = channels.find(c => c.channel === 'SPATIAL') || {};
  const livenessChan = channels.find(c => c.channel === 'LIVENESS') || {};
  const telemetryChan = channels.find(c => c.channel === 'TELEMETRY') || {};

  const gradcamArtifact = artifacts.find(a => a.artifact_type === 'GRADCAM_HEATMAP' || a.artifact_type === 'GRADCAM');
  const earArtifact = artifacts.find(a => a.artifact_type === 'EAR_TIME_SERIES' || a.artifact_type === 'EAR_PLOT');
  const videoArtifact = artifacts.find(a => a.artifact_type === 'APPLICANT_VIDEO' || a.artifact_type === 'VIDEO');

  // Video fallback URL
  const applicantVideoUrl = videoArtifact 
    ? resolveMediaUrl(videoArtifact.storage_path)
    : (session.evidence?.video_url ? resolveMediaUrl(session.evidence.video_url) : resolveMediaUrl(`/media/evidence/video_${session.session_id}.webm`));

  // Determine if this is a Critical Attack (Presentation Attack / Replay or Virtual Cam)
  const isVirtualCam = Boolean(
    telemetryChan.features_json?.virtual_camera_detected ||
    telemetryChan.features_json?.is_file_upload ||
    telemetryChan.normalised_score >= 85.0 ||
    fusion.block_type === 'VIRTUAL_CAMERA_INJECTION'
  );
  const isPadAttack = Boolean(
    livenessChan.features_json?.presentation_attack_detected ||
    livenessChan.normalised_score >= 90.0 ||
    fusion.block_type === 'PRESENTATION_ATTACK_REPLAY'
  );
  const isCriticalAttack = isVirtualCam || isPadAttack || Boolean(fusion.is_hard_block) || ((fusion.fused_score ?? session.fused_score ?? 0) >= 95.0);
  const score = fusion.fused_score ?? fusion.composite_score ?? session.fused_score ?? 0;

  const handleReviewAction = async (action) => {
    setSubmittingAction(action);
    setActionError(null);
    try {
      const decision = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      await api.submitReview(session.session_id, {
        decision,
        action,
        notes: officerNotes || `Officer action: ${decision} via Forensic Portal.`
      });
      setActionSuccess(`Application successfully marked as ${decision}.`);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to submit review action.');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Back Button, Export PDF Certificate & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors flex items-center space-x-1.5"
        >
          <span>← Back to Review Queue</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-canvas-card hover:bg-canvas-subtle border border-emerald-bank/40 hover:border-emerald-bank text-emerald-bank hover:text-emerald-dark text-xs font-bold shadow-soft-sm transition-all flex items-center space-x-2"
          >
            <FileText className="w-4 h-4 text-emerald-bank" />
            <span>{lang === 'hi' ? '📄 ऑडिट प्रमाणपत्र (PDF)' : '📄 Export Audit Certificate (PDF)'}</span>
          </button>

          <div className="flex items-center space-x-2 text-xs text-ink-muted">
            <span className="font-mono text-[11px]">ID: {session.session_id}</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
              isCriticalAttack 
                ? 'bg-wine-soft border-wine-border text-wine-bank' 
                : 'bg-canvas-subtle border-canvas-border text-ink'
            }`}>
              {isCriticalAttack ? 'CRITICAL FRAUD' : session.status}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CRITICAL SECURITY BLOCK / HARD REJECTION CRIMSON BANNER       */}
      {/* ============================================================== */}
      {isCriticalAttack && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-wine-soft via-red-950/25 to-wine-soft border-2 border-wine-border shadow-soft-md flex items-start space-x-3.5 text-xs animate-in fade-in duration-300">
          <ShieldAlert className="w-6 h-6 text-wine-bank flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-sm text-wine-bank uppercase tracking-wider">
                {isVirtualCam
                  ? '🚨 CRITICAL SECURITY BLOCK: VIDEO INJECTION / STREAM BYPASS DETECTED (GATE 1 FAILURE)'
                  : (isPadAttack
                    ? '🚨 CRITICAL SECURITY BLOCK: PRESENTATION ATTACK DETECTED (GATE 2 FAILURE)'
                    : '🚨 CRITICAL SECURITY BLOCK: CRITICAL FRAUD DETECTED')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-wine-bank text-white text-[10px] font-black uppercase tracking-wide shadow-sm">
                SCORE 100.0 HARD REJECTION
              </span>
            </div>
            <p className="text-ink font-semibold text-xs leading-relaxed">
              {isVirtualCam
                ? (telemetryChan.features_json?.notes || 'Critical Gate 1 Failure: Pre-recorded video injection or virtual camera driver detected. Bypass of live webcam hardware sensor violates RBI VCIP / Video-KYC regulations.')
                : (isPadAttack
                  ? `The multi-spectral ISO/IEC 30107 PAD engine confirmed a physical presentation attack (${livenessChan.features_json?.attack_type || 'Digital Screen Replay'}). Subpixel Moiré grid or chrominance distortion confirms an external smartphone/monitor display rather than a live human presence.`
                  : (fusion.escalation_reason || 'Critical security failure: security threshold exceeded.'))}
            </p>
            <p className="text-[11px] text-ink-muted">
              Biometric evaluation aborted to prevent adversarial probing. System policy automatically permanently blocked this session.
            </p>
          </div>
        </div>
      )}

      {/* Main Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 cols): Risk Gauge & Escalation & Officer Action */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Executive Fraud Gauge Card */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
              <span>Risk Fusion Engine</span>
              <span className="text-emerald-bank font-mono text-[11px]">v1.0 Fused</span>
            </div>

            <RiskGauge 
              score={fusion.fused_score || fusion.composite_score || session.fused_score || 0.0} 
              band={isCriticalAttack ? 'HIGH' : (fusion.risk_band || session.risk_band)} 
            />

            {/* Weights & Formula Explanation */}
            <div className="w-full mt-4 pt-4 border-t border-canvas-border grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-canvas-subtle border border-canvas-border">
                <span className="block text-[10px] text-ink-muted font-bold">Spatial</span>
                <span className="font-mono font-semibold text-ink">50%</span>
              </div>
              <div className="p-2 rounded-lg bg-canvas-subtle border border-canvas-border">
                <span className="block text-[10px] text-ink-muted font-bold">Liveness</span>
                <span className="font-mono font-semibold text-ink">30%</span>
              </div>
              <div className="p-2 rounded-lg bg-canvas-subtle border border-canvas-border">
                <span className="block text-[10px] text-ink-muted font-bold">Telemetry</span>
                <span className="font-mono font-semibold text-ink">20%</span>
              </div>
            </div>

            {/* Rule Escalation Warning */}
            {fusion.escalated && (
              <div className="w-full mt-4 p-3 rounded-xl bg-wine-soft border border-wine-border text-xs text-wine-bank flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Policy Rule Escalation Active:</span>
                  <span className="text-[11px] leading-relaxed">{fusion.recommendation}</span>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* THREE-TIER POLICY DECISION CARD                                */}
          {/* 1. Score < 25: Auto-Approved (No Buttons)                      */}
          {/* 2. Score > 60: Auto-Rejected (No Buttons)                      */}
          {/* 3. 25 <= Score <= 60: Requires Manual Officer Review (Buttons) */}
          {/* ============================================================== */}

          {/* TIER 1: AUTO-APPROVED (SCORE < 25.0) */}
          {score < 25.0 && (
            <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-3.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-bank uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Policy Auto-Approved Record</span>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                Fraud risk score <strong className="text-emerald-bank font-mono font-bold">{score.toFixed(1)} / 100</strong> is strictly below the policy review threshold (&lt; 25.0). This session was automatically approved and direct onboarding was granted.
              </p>

              <div className="p-3.5 rounded-xl bg-emerald-soft border border-emerald-border text-xs text-emerald-bank font-semibold flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Status: Auto-Approved by System Policy — No Officer Action Needed</span>
              </div>
            </div>
          )}

          {/* TIER 2: AUTO-REJECTED (SCORE > 60.0 OR CRITICAL ATTACK) */}
          {(score > 60.0 || isCriticalAttack) && (
            <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-3.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-wine-bank uppercase tracking-wider">
                <XCircle className="w-4 h-4" />
                <span>Policy Auto-Rejected Record</span>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                Fraud risk score <strong className="text-wine-bank font-mono font-bold">{score.toFixed(1)} / 100</strong> exceeds the critical security threshold (&gt; 60.0). This session was automatically rejected and permanently blocked by automated security policy.
              </p>

              <div className="p-3.5 rounded-xl bg-wine-soft border border-wine-border text-xs text-wine-bank font-semibold flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Status: Auto-Rejected by System Policy — No Officer Action Needed</span>
              </div>
            </div>
          )}

          {/* TIER 3: GREY-AREA HUMAN OFFICER REVIEW (25.0 <= SCORE <= 60.0) */}
          {score >= 25.0 && score <= 60.0 && !isCriticalAttack && (
            <div className="p-6 rounded-2xl bg-canvas-card border border-amber-border/60 shadow-soft-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-bank uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Compliance Officer Review Required</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-soft border border-amber-border text-amber-bank text-[10px] font-bold">
                  25–60 GREY AREA
                </span>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                This session scored <strong className="text-amber-bank font-mono font-bold">{score.toFixed(1)}</strong>, which falls in the 25.0–60.0 boundary requiring human verification. Your final decision will log directly to the immutable audit trail.
              </p>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  {t('officer_notes_label')}
                </label>
                <textarea
                  rows={3}
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder={t('officer_notes_placeholder')}
                  className="w-full p-3 rounded-xl bg-canvas-subtle border border-canvas-border text-xs text-ink focus:outline-none focus:border-emerald-bank transition-colors resize-none"
                />
              </div>

              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-soft border border-emerald-border text-xs text-emerald-bank font-semibold">
                  {actionSuccess}
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-wine-soft border border-wine-border text-xs text-wine-bank font-semibold">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleReviewAction('REJECT')}
                  disabled={submittingAction !== null}
                  className="py-2.5 px-4 rounded-xl bg-wine-soft hover:bg-wine-border text-wine-bank text-xs font-bold border border-wine-border transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>{submittingAction === 'REJECT' ? 'Recording...' : t('btn_reject')}</span>
                </button>

                <button
                  onClick={() => handleReviewAction('APPROVE')}
                  disabled={submittingAction !== null}
                  className="py-2.5 px-4 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-soft" />
                  <span>{submittingAction === 'APPROVE' ? 'Recording...' : t('btn_approve')}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (7 cols): 3-Channel Breakdown & Visual Evidence Artifacts */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 3 Channels Diagnostic Matrix */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-4">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              {t('channel_diagnostics')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Channel 1: Spatial Deepfake */}
              <div className="p-4 rounded-xl bg-canvas-subtle border border-canvas-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink flex items-center space-x-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>{t('chan_spatial_title')}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      spatialChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                    }`}>
                      {spatialChan.normalised_score?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-3">
                    {spatialChan.notes || 'EfficientNet-B0 analyzed frame crops.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-canvas-border/60">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    spatialChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                  }`}>
                    {spatialChan.normalised_score > 50 ? 'Synthetic Artifact Alert' : 'Biometric Texture Verified'}
                  </span>
                </div>
              </div>

              {/* Channel 2: Passive Liveness */}
              <div className="p-4 rounded-xl bg-canvas-subtle border border-canvas-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>{t('chan_liveness_title')}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      livenessChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                    }`}>
                      {livenessChan.normalised_score?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-3">
                    {livenessChan.notes || 'MediaPipe FaceLandmarker blink & PAD analysis.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-canvas-border/60">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    livenessChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                  }`}>
                    {livenessChan.features_json?.presentation_attack_detected
                      ? '⚠️ Screen Replay Detected (Moiré / Color)'
                      : livenessChan.normalised_score > 50
                      ? '⚠️ Presentation Attack / Flagged'
                      : 'Biometric Liveness Verified'}
                  </span>
                </div>
              </div>

              {/* Channel 3: Video Telemetry */}
              <div className="p-4 rounded-xl bg-canvas-subtle border border-canvas-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink flex items-center space-x-1">
                      <Activity className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>{t('chan_telemetry_title')}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      telemetryChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                    }`}>
                      {telemetryChan.normalised_score?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-3">
                    {telemetryChan.notes || 'Capture stream driver inspection.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-canvas-border/60">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    telemetryChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                  }`}>
                    {telemetryChan.features_json?.is_file_upload
                      ? '⚠️ Pre-recorded File Injection'
                      : (telemetryChan.normalised_score > 50 ? '⚠️ Software Injection' : 'Capture Path Genuine')}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ============================================================== */}
          {/* FORENSIC EXPLAINABILITY ARTIFACTS (VIDEO + GRADCAM + EAR)      */}
          {/* ============================================================== */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-emerald-bank" />
                <span>{t('forensic_artifacts_title')}</span>
              </h3>
              <span className="text-[10px] font-mono text-ink-faint flex items-center space-x-1">
                <Lock className="w-3 h-3 text-emerald-bank" />
                <span>Click Any Card to Zoom / Inspect</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              {/* Artifact 1: Recorded 5s Applicant Video */}
              <div className="p-3 rounded-xl bg-canvas-subtle border border-canvas-border space-y-2 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-ink flex items-center space-x-1">
                      <VideoIcon className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>Applicant Video</span>
                    </span>
                    <button
                      onClick={() => setActiveModalArtifact({
                        type: 'VIDEO',
                        title: 'Original Applicant 5-Second Video Stream',
                        url: applicantVideoUrl,
                        desc: 'Unedited 5-second video recording submitted by applicant during screening session.'
                      })}
                      className="p-1 rounded bg-canvas-card hover:bg-canvas-border text-ink-muted hover:text-ink transition-colors"
                      title="Zoom / Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div 
                    onClick={() => setActiveModalArtifact({
                      type: 'VIDEO',
                      title: 'Original Applicant 5-Second Video Stream',
                      url: applicantVideoUrl,
                      desc: 'Unedited 5-second video recording submitted by applicant during screening session.'
                    })}
                    className="relative w-full aspect-square rounded-lg bg-black border border-canvas-border overflow-hidden flex items-center justify-center cursor-pointer group-hover:border-emerald-bank transition-colors"
                  >
                    <video
                      src={applicantVideoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-ink-muted leading-tight mt-1">
                  5-second video stream captured from applicant device. Click to expand.
                </p>
              </div>

              {/* Artifact 2: Grad-CAM Saliency Heatmap */}
              <div className="p-3 rounded-xl bg-canvas-subtle border border-canvas-border space-y-2 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-ink flex items-center space-x-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>Grad-CAM Spatial</span>
                    </span>
                    {gradcamArtifact && (
                      <button
                        onClick={() => setActiveModalArtifact({
                          type: 'IMAGE',
                          title: 'DeepShield Grad-CAM Convolutional Saliency Heatmap',
                          url: resolveMediaUrl(gradcamArtifact.storage_path),
                          desc: spatialChan.normalised_score < 35 
                            ? 'Subdued cool emerald overlay confirming genuine facial texture without synthetic anomalies.' 
                            : 'High-frequency activation highlighting synthetic blending boundaries or screen reflection artifacts.'
                        })}
                        className="p-1 rounded bg-canvas-card hover:bg-canvas-border text-ink-muted hover:text-ink transition-colors"
                        title="Zoom / Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div 
                    onClick={() => {
                      if (gradcamArtifact) {
                        setActiveModalArtifact({
                          type: 'IMAGE',
                          title: 'DeepShield Grad-CAM Convolutional Saliency Heatmap',
                          url: resolveMediaUrl(gradcamArtifact.storage_path),
                          desc: spatialChan.normalised_score < 35 
                            ? 'Subdued cool emerald overlay confirming genuine facial texture without synthetic anomalies.' 
                            : 'High-frequency activation highlighting synthetic blending boundaries or screen reflection artifacts.'
                        });
                      }
                    }}
                    className="relative w-full aspect-square rounded-lg bg-ink/5 border border-canvas-border overflow-hidden flex items-center justify-center cursor-pointer group-hover:border-emerald-bank transition-colors"
                  >
                    {gradcamArtifact ? (
                      <>
                        <img 
                          src={resolveMediaUrl(gradcamArtifact.storage_path)} 
                          alt="Grad-CAM Saliency" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center text-xs text-ink-muted">
                        <span>No Grad-CAM generated</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-ink-muted leading-tight mt-1">
                  {spatialChan.normalised_score < 35 
                    ? 'Cool overlay confirms genuine facial texture.' 
                    : 'Highlights synthetic anomalies or screen subpixels.'}
                </p>
              </div>

              {/* Artifact 3: EAR Temporal Blink Curve */}
              <div className="p-3 rounded-xl bg-canvas-subtle border border-canvas-border space-y-2 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-ink flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>EAR Blink Curve</span>
                    </span>
                    {earArtifact && (
                      <button
                        onClick={() => setActiveModalArtifact({
                          type: 'IMAGE',
                          title: 'Temporal Eye Aspect Ratio (EAR) Biological Dynamics',
                          url: resolveMediaUrl(earArtifact.storage_path),
                          desc: 'Plots eye openness dynamics over 5 seconds. Characteristic dips below threshold represent spontaneous human blinks.'
                        })}
                        className="p-1 rounded bg-canvas-card hover:bg-canvas-border text-ink-muted hover:text-ink transition-colors"
                        title="Zoom / Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div 
                    onClick={() => {
                      if (earArtifact) {
                        setActiveModalArtifact({
                          type: 'IMAGE',
                          title: 'Temporal Eye Aspect Ratio (EAR) Biological Dynamics',
                          url: resolveMediaUrl(earArtifact.storage_path),
                          desc: 'Plots eye openness dynamics over 5 seconds. Characteristic dips below threshold represent spontaneous human blinks.'
                        });
                      }
                    }}
                    className="relative w-full aspect-square rounded-lg bg-ink/5 border border-canvas-border overflow-hidden flex items-center justify-center cursor-pointer group-hover:border-emerald-bank transition-colors"
                  >
                    {earArtifact ? (
                      <>
                        <img 
                          src={resolveMediaUrl(earArtifact.storage_path)} 
                          alt="EAR Temporal Curve" 
                          className="w-full h-full object-contain bg-slate-900"
                        />
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center text-xs text-ink-muted">
                        <span>No EAR plot generated</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-ink-muted leading-tight mt-1">
                  Plots eye openness dynamics over 5-second session. Dips verify spontaneous blinks.
                </p>
              </div>

            </div>
          </div>

          {/* Tamper-Evident Audit Trail */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-3">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center space-x-1.5">
              <History className="w-4 h-4 text-emerald-bank" />
              <span>{t('immutable_audit_title')}</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-ink block">{log.action}</span>
                    <span className="text-[10px] text-ink-muted font-mono">{log.timestamp?.slice(0, 19).replace('T', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-muted block font-mono">Actor: {log.actor}</span>
                    <span className="text-[9px] text-ink-faint font-mono">{log.payload_hash?.slice(0, 16)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ============================================================== */}
      {/* FULLSCREEN LIGHTBOX / ZOOM POP-UP MODAL                       */}
      {/* ============================================================== */}
      {activeModalArtifact && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveModalArtifact(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {activeModalArtifact.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalArtifact(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex items-center justify-center bg-slate-950/50 overflow-auto">
              {activeModalArtifact.type === 'VIDEO' ? (
                <video
                  src={activeModalArtifact.url}
                  controls
                  autoPlay
                  loop
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl border border-slate-800"
                />
              ) : (
                <img
                  src={activeModalArtifact.url}
                  alt={activeModalArtifact.title}
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-slate-800"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{activeModalArtifact.desc}</span>
              <span className="text-[11px] font-mono text-slate-500">Press ESC or click backdrop to close</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REGULATORY FORENSIC AUDIT CERTIFICATE MODAL (PDF)             */}
      {/* ============================================================== */}
      {showReportModal && (
        <ForensicReportModal
          session={session}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
}