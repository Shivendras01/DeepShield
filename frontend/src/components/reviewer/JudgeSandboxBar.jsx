import React, { useState } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function JudgeSandboxBar({ onScenarioSimulated }) {
  const { lang, t } = useLanguage();
  const [activeScenario, setActiveScenario] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const scenarios = [
    {
      id: 'GENUINE',
      badge: lang === 'hi' ? 'पास < 25' : 'PASS < 25',
      badgeColor: 'bg-emerald-soft text-emerald-bank border-emerald-border',
      btnColor: 'hover:border-emerald-500/60 hover:bg-emerald-soft/30',
      icon: ShieldCheck,
      iconColor: 'text-emerald-bank',
      title: lang === 'hi' ? 'वास्तविक आवेदक (लाइव कैमरा)' : 'Genuine Applicant (Live Stream)',
      desc: lang === 'hi' ? 'प्राकृतिक पलकें, सामान्य कमरे की रोशनी, हार्डवेयर सेंसर' : 'Hardware webcam, organic blinks, natural frame-rate jitter',
      expected: lang === 'hi' ? 'स्वतः स्वीकृत (जोखिम ~10.4)' : 'Auto-Approved (Risk Score ~10.4)'
    },
    {
      id: 'GATE1_INJECTION',
      badge: lang === 'hi' ? 'गेट 1 ब्लॉक' : 'GATE 1 BLOCK',
      badgeColor: 'bg-wine-soft text-wine-bank border-wine-border',
      btnColor: 'hover:border-wine-500/60 hover:bg-wine-soft/30',
      icon: ShieldAlert,
      iconColor: 'text-wine-bank',
      title: lang === 'hi' ? 'गेट 1: वीडियो इंजेक्शन (OBS / फ़ाइल)' : 'Gate 1: Stream Injection (OBS Bypass)',
      desc: lang === 'hi' ? 'वर्चुअल कैमरा ड्राइवर या पहले से रिकॉर्ड की गई फ़ाइल बाईपास' : 'Virtual driver / pre-recorded file bypasses hardware sensor',
      expected: lang === 'hi' ? 'स्वतः अस्वीकृत (हार्ड ब्लॉक 100.0)' : 'Auto-Rejected (Hard Block 100.0)'
    },
    {
      id: 'GATE2_REPLAY',
      badge: lang === 'hi' ? 'गेट 2 ब्लॉक' : 'GATE 2 BLOCK',
      badgeColor: 'bg-amber-soft text-amber-bank border-amber-border',
      btnColor: 'hover:border-amber-500/60 hover:bg-amber-soft/30',
      icon: Smartphone,
      iconColor: 'text-amber-bank',
      title: lang === 'hi' ? 'गेट 2: स्क्रीन रिप्ले (स्मार्टफोन)' : 'Gate 2: Screen Replay (Phone Display)',
      desc: lang === 'hi' ? 'मोबाइल OLED स्क्रीन म्वाएरे ग्रिड और क्रोमिनेंस विकृति' : 'Phone screen in front of lens, FFT Moiré subpixel grid & chroma spike',
      expected: lang === 'hi' ? 'स्वतः अस्वीकृत (हार्ड ब्लॉक 100.0)' : 'Auto-Rejected (Hard Block 100.0)'
    },
    {
      id: 'GATE3_DEEPFAKE',
      badge: lang === 'hi' ? 'गेट 3 अलर्ट' : 'GATE 3 ALERT',
      badgeColor: 'bg-rose-soft text-rose-bank border-rose-border',
      btnColor: 'hover:border-rose-500/60 hover:bg-rose-soft/30',
      icon: Sparkles,
      iconColor: 'text-rose-bank',
      title: lang === 'hi' ? 'गेट 3: एआई डीपफेक (GAN फेस-स्वैप)' : 'Gate 3: AI Deepfake (Face-Swap GAN)',
      desc: lang === 'hi' ? 'चेहरे पर कृत्रिम ब्लेंडिंग सीम और विकृति (EfficientNet-B0)' : 'Synthetic facial blending seam anomalies flagged via Grad-CAM',
      expected: lang === 'hi' ? 'स्वतः अस्वीकृत (जोखिम 82.5)' : 'Auto-Rejected (Risk Score 82.5)'
    },
    {
      id: 'GREY_AREA',
      badge: lang === 'hi' ? 'समीक्षा 25–60' : 'REVIEW 25–60',
      badgeColor: 'bg-amber-soft text-amber-bank border-amber-border',
      btnColor: 'hover:border-amber-500/60 hover:bg-amber-soft/30',
      icon: Clock,
      iconColor: 'text-amber-bank',
      title: lang === 'hi' ? 'बॉर्डरलाइन जोखिम (अधिकारी समीक्षा)' : 'Grey-Area Risk (Manual Officer Review)',
      desc: lang === 'hi' ? 'हल्की विसंगति, अनुपालन अधिकारी द्वारा मैन्युअल सत्यापन आवश्यक' : 'Borderline anomaly score requiring human compliance officer verification',
      expected: lang === 'hi' ? 'समीक्षा लंबित (जोखिम ~30.0)' : 'Requires Review (Risk Score ~30.0)'
    }
  ];

  const handleRunScenario = async (scenarioId) => {
    setActiveScenario(scenarioId);
    setIsSimulating(true);
    setFeedback(null);
    try {
      const res = await api.simulateScenario(scenarioId);
      setFeedback({
        type: 'success',
        text: lang === 'hi' 
          ? `सत्र सफलतापूर्वक तैयार हुआ: ${res.applicant_name} (${res.policy_decision})`
          : `Scenario generated: ${res.applicant_name} (${res.policy_decision} • Score ${res.fused_score})`
      });
      if (onScenarioSimulated) {
        onScenarioSimulated(res.session_id);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to simulate scenario'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="rounded-2xl bg-canvas-card border-2 border-emerald-bank/40 shadow-soft-md overflow-hidden transition-all duration-300">
      
      {/* Top Header Toggle Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-gradient-to-r from-emerald-soft/60 via-canvas-subtle to-emerald-soft/40 border-b border-canvas-border flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-bank text-white flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-emerald-soft fill-emerald-soft" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xs sm:text-sm text-ink tracking-tight">
                {lang === 'hi' ? '⚡ जज वाइवा डेमो सैंडबॉक्स (1-क्लिक अटैक सिमुलेटर)' : '⚡ Judge Viva Demo Sandbox: One-Click Attack Simulator'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-bank text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                Live Demo Mode
              </span>
            </div>
            <p className="text-[10px] text-ink-muted hidden sm:block">
              {lang === 'hi' 
                ? 'मूल्यांकनकर्ताओं और प्रोफेसरों के लिए: किसी भी गेट का वास्तविक परीक्षण 1-क्लिक में चलाएं।'
                : 'For viva evaluators & examiners: Trigger live KYC scenarios across all 3 detection gates in 1 click.'}
            </p>
          </div>
        </div>

        <button className="text-ink-muted hover:text-ink transition-colors p-1 rounded-lg">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Scenario Grid */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {scenarios.map((sc) => {
              const IconComp = sc.icon;
              const isCurrent = activeScenario === sc.id && isSimulating;

              return (
                <button
                  key={sc.id}
                  onClick={() => handleRunScenario(sc.id)}
                  disabled={isSimulating}
                  className={`p-3.5 rounded-xl bg-canvas-subtle/70 border border-canvas-border text-left transition-all duration-200 flex flex-col justify-between space-y-2.5 group relative disabled:opacity-60 disabled:cursor-not-allowed ${sc.btnColor}`}
                >
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-canvas-card border border-canvas-border flex items-center justify-center shadow-soft-xs">
                        <IconComp className={`w-4 h-4 ${sc.iconColor}`} />
                      </div>
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${sc.badgeColor}`}>
                        {sc.badge}
                      </span>
                    </div>

                    {isCurrent && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-bank" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-ink group-hover:text-emerald-bank transition-colors">
                      {sc.title}
                    </h4>
                    <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-2 mt-0.5">
                      {sc.desc}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-canvas-border/60 flex items-center justify-between text-[10px]">
                    <span className="text-ink-faint font-medium">Outcome:</span>
                    <span className="font-bold font-mono text-ink">
                      {sc.expected}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
              feedback.type === 'success' 
                ? 'bg-emerald-soft/70 border-emerald-border text-emerald-bank font-semibold' 
                : 'bg-wine-soft border-wine-border text-wine-bank font-semibold'
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
