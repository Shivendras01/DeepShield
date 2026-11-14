import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import RiskGauge from './RiskGauge';
import { resolveMediaUrl, api } from '../../services/api';

export default function ForensicDossier({ session, onBack, onReviewSubmitted }) {
  const [officerNotes, setOfficerNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (!session) return null;

  const fusion = session.fusion_result || {};
  const channels = session.channel_results || [];
  const artifacts = session.evidence_artifacts || [];
  const auditLogs = session.audit_logs || [];

  const spatialChan = channels.find(c => c.channel === 'SPATIAL') || {};
  const livenessChan = channels.find(c => c.channel === 'LIVENESS') || {};
  const telemetryChan = channels.find(c => c.channel === 'TELEMETRY') || {};

  const gradcamArtifact = artifacts.find(a => a.artifact_type === 'GRADCAM');
  const earArtifact = artifacts.find(a => a.artifact_type === 'EAR_PLOT');

  const handleReviewAction = async (action) => {
    setSubmittingAction(action);
    setActionError(null);
    try {
      await api.submitReview(session.session_id, {
        action,
        notes: officerNotes || `Officer action: ${action} via Forensic Portal.`
      });
      setActionSuccess(`Application successfully marked as ${action}D.`);
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
      
      {/* Top Bar with Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors flex items-center space-x-1.5"
        >
          <span>← Back to Review Queue</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-ink-muted">
          <span className="font-mono text-[11px]">ID: {session.session_id}</span>
          <span className="px-2 py-0.5 rounded-full bg-canvas-subtle border border-canvas-border text-[10px] font-bold uppercase">
            {session.status}
          </span>
        </div>
      </div>

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
              score={fusion.composite_score} 
              band={fusion.risk_band} 
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

          {/* Human-in-the-Loop Decision Box */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-ink uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-bank" />
              <span>Compliance Officer Decision</span>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Sessions within the 25–74 risk boundary require human verification. Your final action logs directly to the immutable audit trail.
            </p>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                Officer Findings & Audit Notes
              </label>
              <textarea
                rows={3}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Document verification findings, observed artifacts, or applicant explanation..."
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
                <span>{submittingAction === 'REJECT' ? 'Recording...' : 'Reject Session'}</span>
              </button>

              <button
                onClick={() => handleReviewAction('APPROVE')}
                disabled={submittingAction !== null}
                className="py-2.5 px-4 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-emerald-soft" />
                <span>{submittingAction === 'APPROVE' ? 'Recording...' : 'Approve KYC'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column (7 cols): 3-Channel Breakdown & Visual Evidence Artifacts */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 3 Channels Diagnostic Matrix */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-4">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              Channel Multi-Signal Diagnostics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Channel 1: Spatial Deepfake */}
              <div className="p-4 rounded-xl bg-canvas-subtle border border-canvas-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink flex items-center space-x-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>1. Spatial CNN</span>
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
                  <span className="text-[9px] font-semibold text-emerald-bank bg-emerald-soft px-1.5 py-0.5 rounded">
                    Trained Checkpoint Active
                  </span>
                </div>
              </div>

              {/* Channel 2: Passive Liveness */}
              <div className="p-4 rounded-xl bg-canvas-subtle border border-canvas-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>2. Liveness EAR</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      livenessChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                    }`}>
                      {livenessChan.normalised_score?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-3">
                    {livenessChan.notes || 'MediaPipe 468 mesh blink detection.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-canvas-border/60">
                  <span className="text-[9px] font-semibold text-ink-muted">
                    Geometric Eye Ratio
                  </span>
                </div>
              </div>

              {/* Channel 3: Video Telemetry */}
              <div className="p-4 rounded-xl bg-canvas-subtle border border-canvas-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink flex items-center space-x-1">
                      <Activity className="w-3.5 h-3.5 text-emerald-bank" />
                      <span>3. Telemetry</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      telemetryChan.normalised_score > 50 ? 'bg-wine-soft text-wine-bank' : 'bg-emerald-soft text-emerald-bank'
                    }`}>
                      {telemetryChan.normalised_score?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-3">
                    {telemetryChan.notes || 'Camera stream jitter & driver signatures.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-canvas-border/60">
                  <span className="text-[9px] font-semibold text-ink-muted">
                    Injection Analysis
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Visual Evidence Studio (Grad-CAM & EAR Plot) */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-emerald-bank" />
                <span>Forensic Explainability Artifacts</span>
              </h3>
              <span className="text-[10px] font-mono text-ink-faint flex items-center space-x-1">
                <Lock className="w-3 h-3 text-emerald-bank" />
                <span>SHA-256 Verified</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Grad-CAM Saliency Viewer */}
              <div className="p-3 rounded-xl bg-canvas-subtle border border-canvas-border space-y-2">
                <span className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Grad-CAM Spatial Heatmap</span>
                  <span className="text-[9px] font-mono text-ink-muted">Channel 1</span>
                </span>
                
                <div className="w-full aspect-square rounded-lg bg-ink/5 border border-canvas-border overflow-hidden flex items-center justify-center">
                  {gradcamArtifact ? (
                    <img 
                      src={resolveMediaUrl(gradcamArtifact.storage_path)} 
                      alt="Grad-CAM Saliency" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-center text-xs text-ink-muted">
                      <span>No Grad-CAM generated (Authentic face)</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-ink-muted leading-tight">
                  Highlights high-frequency convolutional anomalies and synthetic blending seams.
                </p>
              </div>

              {/* EAR Temporal Curve Viewer */}
              <div className="p-3 rounded-xl bg-canvas-subtle border border-canvas-border space-y-2">
                <span className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>EAR Temporal Blink Curve</span>
                  <span className="text-[9px] font-mono text-ink-muted">Channel 2</span>
                </span>
                
                <div className="w-full aspect-square rounded-lg bg-ink/5 border border-canvas-border overflow-hidden flex items-center justify-center">
                  {earArtifact ? (
                    <img 
                      src={resolveMediaUrl(earArtifact.storage_path)} 
                      alt="EAR Temporal Curve" 
                      className="w-full h-full object-contain bg-slate-900"
                    />
                  ) : (
                    <div className="p-4 text-center text-xs text-ink-muted">
                      <span>No EAR plot generated</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-ink-muted leading-tight">
                  Plots eye openness dynamics over 5-second session. Dips verify spontaneous blinks.
                </p>
              </div>

            </div>
          </div>

          {/* Tamper-Evident Audit Trail */}
          <div className="p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-3">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center space-x-1.5">
              <History className="w-4 h-4 text-emerald-bank" />
              <span>Immutable Audit Trail</span>
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

    </div>
  );
}
