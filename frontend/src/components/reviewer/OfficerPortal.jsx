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

export default function OfficerPortal({ initialSessionId }) {
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
      setSessions(data.sessions || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load session queue.');
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

  // Filter logic
  const filteredSessions = sessions.filter((s) => {
    const score = s.fusion_score ?? s.composite_score ?? 0;
    const band = s.risk_band || 'LOW';
    if (filter === 'REQUIRES_REVIEW') return band === 'GUARDED' || band === 'ELEVATED' || (score >= 25 && score < 75);
    if (filter === 'HIGH_RISK') return band === 'HIGH' || score >= 75;
    if (filter === 'APPROVED') return s.status === 'APPROVED' || band === 'LOW';
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

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-emerald-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              All Sessions ({sessions.length})
            </button>

            <button
              onClick={() => setFilter('REQUIRES_REVIEW')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'REQUIRES_REVIEW'
                  ? 'bg-amber-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              Manual Review Queue (25–74)
            </button>

            <button
              onClick={() => setFilter('HIGH_RISK')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'HIGH_RISK'
                  ? 'bg-wine-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              High Risk / Injections (75+)
            </button>

            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'APPROVED'
                  ? 'bg-emerald-bank text-white shadow-soft-sm'
                  : 'bg-canvas-card text-ink-muted hover:text-ink border border-canvas-border'
              }`}
            >
              Approved (Low Risk)
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
                      const score = s.fusion_score ?? s.composite_score ?? 0;
                      const band = s.risk_band || 'LOW';

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
                            <span className="px-2 py-0.5 rounded-full bg-canvas-subtle border border-canvas-border text-[10px] font-bold text-ink-muted uppercase">
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-ink">
                            {score.toFixed(1)} / 100
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              band === 'HIGH' ? 'bg-wine-soft text-wine-bank border-wine-border' :
                              band === 'ELEVATED' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                              band === 'GUARDED' ? 'bg-amber-soft text-amber-bank border-amber-border' :
                              'bg-emerald-soft text-emerald-bank border-emerald-border'
                            }`}>
                              {band}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSessionId(s.session_id);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-canvas-subtle group-hover:bg-emerald-bank group-hover:text-white text-ink text-xs font-semibold border border-canvas-border transition-all inline-flex items-center space-x-1"
                            >
                              <span>Inspect Dossier</span>
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
