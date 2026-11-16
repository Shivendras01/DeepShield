import React from 'react';
import { Shield, User, ShieldCheck, Activity, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ activePortal, setActivePortal, backendStatus }) {
  const isOnline = backendStatus?.status === 'online';
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-canvas-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-bank flex items-center justify-center text-white shadow-soft-sm">
            <Shield className="w-5 h-5 text-emerald-soft" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-ink">DeepShield</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-canvas-subtle text-ink-muted border border-canvas-border">
                API v1.0
              </span>
            </div>
            <p className="text-[11px] text-ink-muted hidden sm:block">
              {t('brand_subtitle')}
            </p>
          </div>
        </div>

        {/* Center / Right: Status + Language + Perspective Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          
          {/* Language Switcher Pill */}
          <div className="p-0.5 rounded-xl bg-canvas-subtle border border-canvas-border flex items-center shadow-soft-sm">
            <div className="pl-2 pr-1 text-ink-faint hidden sm:flex items-center">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                lang === 'en'
                  ? 'bg-canvas-card text-emerald-bank shadow-soft-sm border border-canvas-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
              title="Switch to English"
            >
              EN
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                lang === 'hi'
                  ? 'bg-canvas-card text-emerald-bank shadow-soft-sm border border-canvas-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
              title="हिंदी में बदलें"
            >
              हिंदी
            </button>
          </div>

          {/* Backend Status indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-canvas-subtle border border-canvas-border text-xs text-ink-muted">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[11px] font-medium">
              {isOnline ? t('api_connected') : t('api_checking')}
            </span>
          </div>

          {/* Perspective Toggle (Role Switcher) */}
          <div className="p-1 rounded-xl bg-canvas-subtle border border-canvas-border flex items-center shadow-soft-sm">
            <button
              onClick={() => setActivePortal('applicant')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activePortal === 'applicant'
                  ? 'bg-canvas-card text-emerald-bank shadow-soft-sm border border-canvas-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('applicant_portal')}</span>
            </button>

            <button
              onClick={() => setActivePortal('officer')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activePortal === 'officer'
                  ? 'bg-canvas-card text-emerald-bank shadow-soft-sm border border-canvas-border'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('officer_dossier')}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
