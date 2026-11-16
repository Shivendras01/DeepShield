import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import ForensicDossier from './ForensicDossier';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function OfficerPortal({ initialSessionId }) {
  const { t, lang } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'REQUIRES_REVIEW' | 'HIGH_RISK' | 'APPROVED'
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId || null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch session list
  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      const list = Array.isArray(data) ? data : (data?.results || data?.sessions || []);
      setSessions(list);
    } catch (err) {
      setError(err.message || 'Failed to load session queue.');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch full detail when selectedSessionId changes
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetail(selectedSessionId);
    } else {
      setSessionDetail(null);
    }
  }, [selectedSessionId]);

  const loadSessionDetail = async (id) => {
    setDetailLoading(true);
    try {
      const detail = await api.getSessionDetail(id);
      setSessionDetail(detail);
    } catch (err) {
      setError('Could not fetch forensic dossier for this session.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter logic: Three-tier policy routing (<25 auto-approved, 25-60 review, >60 auto-rejected)
  const sessionList = Array.isArray(sessions) ? sessions : [];
  const filteredSessions = sessionList.filter((s) => {
    const score = s.fused_score ?? s.fusion_score ?? s.composite_score ?? 0;
    if (filter === 'REQUIRES_REVIEW') return score >= 25.0 && score <= 60.0;
    if (filter === 'AUTO_APPROVED') return score < 25.0;
    if (filter === 'AUTO_REJECTED') return score > 60.0;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* If a session is selected for detailed inspection, show Forensic Dossier */}
      {selectedSessionId && sessionDetail ? (
        <ForensicDossier
          session={sessionDetail}
          onBack={() => { setSelectedSessionId(null); fetchSessions(); }}
          onReviewSubmitted={() => { loadSessionDetail(selectedSessionId); fetchSessions(); }}
        />
      ) : (
        /* Otherwise, show Session Review Queue */
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-canvas-subtle border border-canvas-border text-ink-muted text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-bank" />
                <span>Forensic Screening Console</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                Bank Compliance Review Queue
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                Internal human-in-the-loop audit station. Screen incoming video KYC sessions, review Grad-CAM heatmaps, and log compliance decisions.
              </p>
            </div>

            <button
              onClick={fetchSessions}
              disabled={isLoading}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-canvas-card hover:bg-canvas-subtle text-ink text-xs font-semibold border border-canvas-border shadow-soft-sm transition-all flex items-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-bank ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Three-Tier Policy Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-emerald-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              {t('tab_all')} ({sessions.length})
            </button>

            <button
              onClick={() => setFilter('REQUIRES_REVIEW')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'REQUIRES_REVIEW'
                  ? 'bg-amber-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              {t('tab_pending')}
            </button>

            <button
              onClick={() => setFilter('AUTO_APPROVED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'AUTO_APPROVED'
                  ? 'bg-emerald-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              {t('tab_approved')}
            </button>

            <button
              onClick={() => setFilter('AUTO_REJECTED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'AUTO_REJECTED'
                  ? 'bg-wine-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              {t('tab_rejected')}
            </button>
          </div>

          {/* Queue Table */}
          <div className="rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm overflow-hidden">
            {isLoading && sessions.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-muted flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-5 h-5 text-emerald-bank animate-spin" />
                <span>Loading screening records...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-muted flex flex-col items-center justify-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-ink-faint mb-1" />
                <span className="font-semibold text-ink">No screening sessions found in this view.</span>
                <span className="text-[11px]">Submit a video through the Applicant Portal to see it appear in this queue.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-canvas-border bg-canvas-subtle/50 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      <th className="py-3 px-4">Session ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Fraud Risk Score</th>
                      <th className="py-3 px-4">Risk Band</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-border text-xs">
                    {filteredSessions.map((s) => {
                      const score = s.fused_score ?? s.fusion_score ?? s.composite_score ?? 0;
                      const isAutoApproved = score < 25.0;
                      const isAutoRejected = score > 60.0;
                      const isPendingReview = score >= 25.0 && score <= 60.0 && s.status === 'PENDING';

                      return (
                        <tr 
                          key={s.session_id} 
                          className="hover:bg-canvas-subtle/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedSessionId(s.session_id)}
                        >
                          <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-ink">
                            {s.session_id.slice(0, 14)}...
                          </td>
                          <td className="py-3.5 px-4 text-ink-muted text-[11px]">
                            {s.created_at ? s.created_at.slice(0, 19).replace('T', ' ') : 'Just now'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isAutoApproved ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-soft border border-emerald-border text-[10px] font-bold text-emerald-bank uppercase">
                                AUTO-APPROVED
                              </span>
                            ) : isAutoRejected ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-wine-soft border border-wine-border text-[10px] font-bold text-wine-bank uppercase">
                                AUTO-REJECTED
                              </span>
                            ) : isPendingReview ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-soft border border-amber-border text-[10px] font-bold text-amber-bank uppercase animate-pulse">
                                PENDING REVIEW
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-canvas-subtle border border-canvas-border text-[10px] font-bold text-ink uppercase">
                                {s.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-ink">
                            {score.toFixed(1)} / 100
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              isAutoRejected ? 'bg-wine-soft text-wine-bank border-wine-border' :
                              isPendingReview ? 'bg-amber-soft text-amber-bank border-amber-border' :
                              'bg-emerald-soft text-emerald-bank border-emerald-border'
                            }`}>
                              {isAutoRejected ? 'HIGH RISK' : isPendingReview ? 'GUARDED' : 'LOW RISK'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSessionId(s.session_id);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all inline-flex items-center space-x-1 ${
                                isPendingReview
                                  ? 'bg-amber-50 hover:bg-amber-bank hover:text-white text-amber-bank border-amber-border font-bold'
                                  : 'bg-canvas-subtle group-hover:bg-canvas-border text-ink border-canvas-border'
                              }`}
                            >
                              <span>{isPendingReview ? 'Review & Decide' : 'Inspect Dossier'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
