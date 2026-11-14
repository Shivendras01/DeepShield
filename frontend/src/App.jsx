import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ApplicantPage from './pages/ApplicantPage';
import OfficerPage from './pages/OfficerPage';
import { api } from './services/api';

export default function App() {
  const [activePortal, setActivePortal] = useState('applicant'); // 'applicant' | 'officer'
  const [backendStatus, setBackendStatus] = useState(null);
  const [lastScreenedSessionId, setLastScreenedSessionId] = useState(null);

  // Check health on mount and periodically
  useEffect(() => {
    const check = async () => {
      const status = await api.checkHealth();
      setBackendStatus(status);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleScreeningComplete = (screeningResponse) => {
    if (screeningResponse?.applicant_view?.session_id) {
      setLastScreenedSessionId(screeningResponse.applicant_view.session_id);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-emerald-soft selection:text-emerald-bank">
      <div>
        {/* Navigation Bar & Role Switcher */}
        <Navbar
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          backendStatus={backendStatus}
        />

        {/* Main Perspective Body */}
        <main className="transition-all duration-300">
          {activePortal === 'applicant' ? (
            <ApplicantPage onScreeningComplete={handleScreeningComplete} />
          ) : (
            <OfficerPage initialSessionId={lastScreenedSessionId} />
          )}
        </main>
      </div>

      {/* Institutional Academic Footer */}
      <footer className="border-t border-canvas-border py-6 bg-canvas-subtle/40 text-xs text-ink-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-ink">DeepShield</span>
            <span>• B.Tech Minor Research Project</span>
            <span className="hidden md:inline">• ITM University Gwalior</span>
          </div>

          <div className="text-[11px] text-ink-faint flex items-center space-x-4">
            <span>Spatial CNN (EfficientNet-B0)</span>
            <span>•</span>
            <span>Passive Liveness (MediaPipe 468)</span>
            <span>•</span>
            <span>Video Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
