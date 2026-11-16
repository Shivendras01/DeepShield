import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  Video, 
  FileVideo,
  Sparkles,
  Info,
  XCircle,
  User,
  CreditCard,
  Phone,
  ChevronRight,
  ShieldAlert,
  Lock,
  ArrowLeft,
  Sun,
  Eye,
  Ban,
  CheckSquare,
  Square
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function ApplicantPortal({ onScreeningComplete }) {
  const { t, lang } = useLanguage();
  // Navigation Flow: 'DETAILS' | 'INSTRUCTIONS' | 'RECORDING' | 'RESULT'
  const [currentStep, setCurrentStep] = useState('DETAILS');

  // Candidate KYC Form Details
  const [applicantName, setApplicantName] = useState('Shivendra Singh');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('XXXX-XXXX-9041');
  const [mobileNumber, setMobileNumber] = useState('+91 98765 43210');
  const [applicationId, setApplicationId] = useState(() => `DS-KYC-${Math.floor(100000 + Math.random() * 900000)}`);
  const [consentGiven, setConsentGiven] = useState(true);

  // Instructions Page State (Mandatory checkbox before proceeding to video)
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);

  // Capture mode: 'webcam' | 'upload'
  const [mode, setMode] = useState('webcam');
  
  // Webcam recording state
  const [webcamStream, setWebcamStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(5);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordedMimeType, setRecordedMimeType] = useState('video/webm');
  const [cameraError, setCameraError] = useState(null);

  // Upload file state
  const [selectedFile, setSelectedFile] = useState(null);

  // Submission & Pipeline progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicantResult, setApplicantResult] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [testScenario, setTestScenario] = useState('AUTO'); // 'AUTO' | 'GENUINE' | 'GATE1_INJECTION' | 'GATE2_REPLAY' | 'GATE3_DEEPFAKE' | 'GREY_AREA'

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const frameTimestampsRef = useRef([]);
  const cameraLabelRef = useRef('Integrated Camera');
  const activeStreamRef = useRef(null);

  // Initialize or teardown camera only on the RECORDING step when in webcam mode
  useEffect(() => {
    if (currentStep === 'RECORDING' && mode === 'webcam' && !isSubmitting && !applicantResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [currentStep, mode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false
      });
      activeStreamRef.current = stream;
      setWebcamStream(stream);
      const label = stream.getVideoTracks()[0]?.label || 'Integrated Camera';
      cameraLabelRef.current = label;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Camera access required. Please enable webcam permissions in your browser or switch to File Upload mode.');
    }
  };

  const stopCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      activeStreamRef.current = null;
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      setWebcamStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start 5-second recording with 3-2-1 countdown
  const handleStartRecording = () => {
    if (!webcamStream || isRecording) return;
    recordedChunksRef.current = [];
    frameTimestampsRef.current = [];

    let count = 3;
    setCountdown(count);

    const countdownTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownTimer);
        setCountdown(null);
        startMediaRecorder();
      }
    }, 1000);
  };

  const startMediaRecorder = () => {
    setIsRecording(true);
    setRecordSecondsLeft(5);

    // Choose best supported codec
    let mimeType = 'video/webm';
    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) {
        mimeType = c;
        break;
      }
    }
    setRecordedMimeType(mimeType);

    const recorder = new MediaRecorder(webcamStream, { mimeType });
    mediaRecorderRef.current = recorder;

    const startTime = Date.now();
    frameTimestampsRef.current.push(startTime);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
        frameTimestampsRef.current.push(Date.now());
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedVideoUrl(videoUrl);
      setIsRecording(false);
      setRecordSecondsLeft(0);

      // IMMEDIATELY SHUT OFF CAMERA HARDWARE SENSOR
      stopCamera();

      // AUTO-SUBMIT IMMEDIATELY ON 5-SECOND COMPLETION!
      submitVerificationVideo(blob, mimeType);
    };

    recorder.start(100);

    // Precise 5-second countdown timer that automatically stops the recorder
    let secondsLeft = 5;
    const recordingInterval = setInterval(() => {
      secondsLeft -= 1;
      setRecordSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(recordingInterval);
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }
    }, 1000);
  };

  // Submit video to screening pipeline
  const submitVerificationVideo = async (blobOverride = null, mimeOverride = null) => {
    const blobToUse = blobOverride || recordedBlob;
    const mimeToUse = mimeOverride || recordedMimeType;

    const isMp4 = mimeToUse.includes('mp4');
    const filename = isMp4 ? 'webcam_kyc.mp4' : 'webcam_kyc.webm';
    const videoFile = mode === 'webcam' 
      ? new File([blobToUse], filename, { type: mimeToUse })
      : selectedFile;

    if (!videoFile) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('client_identity', JSON.stringify({
        applicant_name: applicantName,
        application_id: applicationId,
        id_type: idType,
        id_number: idNumber,
        mobile: mobileNumber,
        client_timestamp: new Date().toISOString(),
      }));

      // Gather browser telemetry
      const isFileUpload = mode === 'upload';
      const deviceLabel = isFileUpload
        ? 'File Upload Source'
        : (cameraLabelRef.current || webcamStream?.getVideoTracks()[0]?.label || 'Integrated Camera');

      const telemetry = {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        camera_label: deviceLabel,
        device_label: deviceLabel,
        is_file_upload: isFileUpload,
        timestamps_ms: isFileUpload ? [] : (frameTimestampsRef.current.length > 5 ? frameTimestampsRef.current : []),
        frame_timestamps: isFileUpload ? [] : (frameTimestampsRef.current.length > 5 ? frameTimestampsRef.current : []),
      };
      const telemetryStr = JSON.stringify(telemetry);
      formData.append('telemetry', telemetryStr);
      formData.append('telemetry_payload', telemetryStr);
      formData.append('is_file_upload', isFileUpload ? 'true' : 'false');
      formData.append('test_scenario', testScenario);

      const response = await api.submitScreening(formData);
      
      // Save applicant-safe view and transition to RESULT screen
      setApplicantResult(response.applicant_view);
      setCurrentStep('RESULT');

      // Notify parent to refresh officer list in background
      if (onScreeningComplete) {
        onScreeningComplete(response);
      }
    } catch (err) {
      setSubmissionError(err.message || 'Verification service temporarily unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setApplicantResult(null);
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setSelectedFile(null);
    setSubmissionError(null);
    setCurrentStep('RECORDING');
    if (mode === 'webcam') {
      startCamera();
    }
  };

  const handleStartFresh = () => {
    stopCamera();
    setApplicantResult(null);
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setSelectedFile(null);
    setSubmissionError(null);
    setInstructionsAcknowledged(false);
    setApplicationId(`DS-KYC-${Math.floor(100000 + Math.random() * 900000)}`);
    setCurrentStep('DETAILS');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Top Header Badge */}
      <div className="mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-soft border border-emerald-border text-emerald-bank text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('brand_name')} Video e-KYC Verification</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            {t('brand_subtitle')}
          </h1>
          <div className="flex items-center space-x-2 text-xs font-mono bg-canvas-card px-3 py-1.5 rounded-xl border border-canvas-border shadow-soft-sm text-ink-muted">
            <span className="text-[10px] uppercase font-bold text-ink-faint">{t('app_id_label')}</span>
            <span className="font-bold text-emerald-bank">{applicationId}</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP 1: APPLICANT ONBOARDING DETAILS FORM                      */}
      {/* ============================================================== */}
      {currentStep === 'DETAILS' && (
        <div className="max-w-2xl mx-auto">
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-6">
            <div className="border-b border-canvas-border pb-4">
              <span className="text-[11px] font-bold text-emerald-bank uppercase tracking-wider block mb-1">
                {t('step1_tag')}
              </span>
              <h2 className="text-lg font-bold text-ink flex items-center space-x-2">
                <User className="w-5 h-5 text-emerald-bank" />
                <span>{t('step1_title')}</span>
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                {t('step1_desc')}
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Legal Name */}
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  {t('full_name_label')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    required
                    placeholder={t('full_name_placeholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-sm text-ink font-medium focus:outline-none focus:border-emerald-bank transition-colors"
                  />
                </div>
              </div>

              {/* Govt ID Type & ID Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                    {t('id_type_label')}
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-xs text-ink font-medium focus:outline-none focus:border-emerald-bank transition-colors"
                  >
                    <option value="Aadhaar Card">{t('id_type_aadhaar')}</option>
                    <option value="PAN Card">{t('id_type_pan')}</option>
                    <option value="Passport">{t('id_type_passport')}</option>
                    <option value="Voter ID">{t('id_type_voter')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                    {t('id_number_label')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      placeholder={t('id_number_placeholder')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-xs font-mono text-ink focus:outline-none focus:border-emerald-bank transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number / Contact */}
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  {t('mobile_label')}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    placeholder={t('mobile_placeholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-xs font-mono text-ink focus:outline-none focus:border-emerald-bank transition-colors"
                  />
                </div>
              </div>

              {/* Consent Toggle */}
              <div className="pt-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-emerald-bank border-canvas-border focus:ring-emerald-bank"
                  />
                  <span className="text-xs text-ink-muted leading-relaxed">
                    {lang === 'hi'
                      ? 'मैं बैंकिंग पहचान सत्यापन के लिए ISO/IEC 30107 मानकों के तहत वीडियो बायोमेट्रिक जीवंतता जांच और चेहरे के विश्लेषण के लिए सहमति देता हूँ।'
                      : 'I consent to video biometric liveness screening and facial presentation attack analysis under ISO/IEC 30107 standards for banking identity verification.'}
                  </span>
                </label>
              </div>
            </div>

            {/* Proceed to Instructions CTA */}
            <div className="pt-4 border-t border-canvas-border flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-ink-faint">
                <Lock className="w-3.5 h-3.5 text-emerald-bank" />
                <span>256-Bit Encrypted Session</span>
              </div>

              <button
                onClick={() => setCurrentStep('INSTRUCTIONS')}
                disabled={!applicantName.trim() || !consentGiven}
                className="px-6 py-3 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <span>{t('proceed_to_instructions')}</span>
                <ChevronRight className="w-4 h-4 text-emerald-soft" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: INSTRUCTIONS & GUIDELINES (SEPARATE DEDICATED PAGE)    */}
      {/* ============================================================== */}
      {currentStep === 'INSTRUCTIONS' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-6">
            
            {/* Header */}
            <div className="border-b border-canvas-border pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-bank uppercase tracking-wider block mb-1">
                  {t('step2_tag')}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                  {t('step2_title')}
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
                  {t('step2_desc')}
                </p>
              </div>
              
              <button
                onClick={() => setCurrentStep('DETAILS')}
                className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('back_to_details')}</span>
              </button>
            </div>

            {/* 4 Spacious Instruction Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Lighting */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-soft border border-amber-border flex items-center justify-center text-amber-bank">
                  <Sun className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  {t('guide1_title')}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {t('guide1_desc')}
                </p>
              </div>

              {/* Card 2: Eye Contact & Natural Blinking */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-soft border border-emerald-border flex items-center justify-center text-emerald-bank">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  {t('guide2_title')}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {t('guide2_desc')}
                </p>
              </div>

              {/* Card 3: No Accessories or External Screens */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-wine-soft border border-wine-border flex items-center justify-center text-wine-bank">
                  <Ban className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  {t('guide3_title')}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {t('guide3_desc')}
                </p>
              </div>

              {/* Card 4: 5-Second Passive Duration */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-soft border border-blue-border flex items-center justify-center text-blue-bank">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  {t('guide4_title')}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {t('guide4_desc')}
                </p>
              </div>

            </div>

            {/* MANDATORY CHECKMARK */}
            <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
              instructionsAcknowledged 
                ? 'bg-emerald-soft/50 border-emerald-bank' 
                : 'bg-canvas-subtle border-canvas-border hover:border-canvas-border/80'
            }`}>
              <label className="flex items-start space-x-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instructionsAcknowledged}
                  onChange={(e) => setInstructionsAcknowledged(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded text-emerald-bank border-canvas-border focus:ring-emerald-bank cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs sm:text-sm font-bold text-ink block">
                    {t('ack_checkbox_title')}
                  </span>
                  <span className="text-[11px] text-ink-muted block leading-relaxed">
                    {t('ack_checkbox_desc')}
                  </span>
                </div>
              </label>
            </div>

            {/* Navigation Footer */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep('DETAILS')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('back_to_details')}</span>
              </button>

              <button
                onClick={() => setCurrentStep('RECORDING')}
                disabled={!instructionsAcknowledged}
                className="px-6 py-3 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{t('start_verification')}</span>
                <ChevronRight className="w-4 h-4 text-emerald-soft" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: UNCLUTTERED VIDEO RECORDING & PROCESSING PAGE          */}
      {/* ============================================================== */}
      {currentStep === 'RECORDING' && (
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Top Back & Mode Switcher Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { stopCamera(); setCurrentStep('INSTRUCTIONS'); }}
              disabled={isRecording || isSubmitting}
              className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('review_instructions')}</span>
            </button>

            {/* Input Mode Pills */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-canvas-card border border-canvas-border shadow-soft-sm">
              <button
                onClick={() => { setMode('webcam'); setSelectedFile(null); setRecordedBlob(null); setRecordedVideoUrl(null); }}
                disabled={isRecording || isSubmitting}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  mode === 'webcam'
                    ? 'bg-emerald-soft text-emerald-bank shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{t('live_camera')}</span>
              </button>

              <button
                onClick={() => { setMode('upload'); stopCamera(); setRecordedBlob(null); setRecordedVideoUrl(null); }}
                disabled={isRecording || isSubmitting}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  mode === 'upload'
                    ? 'bg-emerald-soft text-emerald-bank shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('upload_clip')}</span>
              </button>
            </div>
          </div>

          {/* BIG FONT INSTRUCTION BANNER */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-sm text-center space-y-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-soft text-emerald-bank text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('step3_tag')}</span>
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink tracking-tight">
              {t('step3_prompt')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
              {t('step3_subprompt')}
            </p>
          </div>

          {/* TEACHER VIVA TEST CASE SCENARIO PRESET */}
          <div className="p-4 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${testScenario === 'AUTO' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <span className="text-xs font-bold text-ink block">
                  {lang === 'hi' ? 'परीक्षण केस चयन (शिक्षक डेमो मोड):' : 'Demo Test Case Preset (Teacher Evaluation Mode):'}
                </span>
                <span className="text-[11px] text-ink-muted block">
                  {lang === 'hi' ? 'चुनें कि यह रिकॉर्डिंग किस सुरक्षा गेट के तहत जांची जाए' : 'Choose which security gate or decision tier this video should test'}
                </span>
              </div>
            </div>

            <select
              value={testScenario}
              onChange={(e) => setTestScenario(e.target.value)}
              disabled={isRecording || isSubmitting}
              className="px-3.5 py-2 rounded-xl bg-canvas-subtle border border-canvas-border font-bold text-ink text-xs focus:ring-2 focus:ring-emerald-bank focus:outline-none transition-all cursor-pointer shadow-soft-xs"
            >
              <option value="AUTO">{lang === 'hi' ? '🎯 लाइव ऑटो-डिटेक्ट (वास्तविक AI मॉडल)' : '🎯 Live Auto-Detect (Real-Time AI Models)'}</option>
              <option value="GENUINE">{lang === 'hi' ? '🟢 टेस्ट केस 1: वास्तविक आवेदक (पास < 25)' : '🟢 Test Case 1: Genuine Biometrics (Pass < 25)'}</option>
              <option value="GATE1_INJECTION">{lang === 'hi' ? '🔴 टेस्ट केस 2: गेट 1 वीडियो इंजेक्शन (हार्ड ब्लॉक 100)' : '🔴 Test Case 2: Gate 1 Stream Injection (Hard Block 100)'}</option>
              <option value="GATE2_REPLAY">{lang === 'hi' ? '🟠 टेस्ट केस 3: गेट 2 स्क्रीन रिप्ले (हार्ड ब्लॉक 100)' : '🟠 Test Case 3: Gate 2 Screen Replay (Hard Block 100)'}</option>
              <option value="GATE3_DEEPFAKE">{lang === 'hi' ? '🟣 टेस्ट केस 4: गेट 3 AI डीपफेक (अस्वीकृत 82.5)' : '🟣 Test Case 4: Gate 3 AI Face-Swap Deepfake (Alert 82.5)'}</option>
              <option value="GREY_AREA">{lang === 'hi' ? '🟡 टेस्ट केस 5: बॉर्डरलाइन अधिकारी समीक्षा (25–60)' : '🟡 Test Case 5: Grey-Area Manual Review (25–60)'}</option>
            </select>
          </div>

          {/* MAIN CAMERA / UPLOAD VIEWPORT */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-6">
            
            <div className="relative w-full aspect-video rounded-2xl bg-slate-950 border border-canvas-border overflow-hidden flex items-center justify-center shadow-inner">
              
              {mode === 'webcam' ? (
                <>
                  {recordedVideoUrl ? (
                    <video
                      src={recordedVideoUrl}
                      autoPlay
                      loop
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  )}
                  
                  {/* Processing Overlay when 5s recording finished and camera is stopped */}
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-10 animate-in fade-in duration-200">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-spin">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-white tracking-wide block">
                          {lang === 'hi' ? 'कैमरा बंद • बायोमेट्रिक विश्लेषण जारी है...' : 'Camera Stopped • Analyzing Biometrics...'}
                        </span>
                        <span className="text-xs text-slate-300 mt-0.5 block">
                          {lang === 'hi' ? 'कृपया प्रतीक्षा करें (3–5 सेकंड)...' : 'Uploading and screening 5-second video stream'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Biometric Oval Guide Overlay */}
                  {!isSubmitting && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className={`w-52 h-68 rounded-[50%] border-2 transition-all duration-300 ${
                        isRecording 
                          ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.55)] scale-105' 
                          : 'border-white/50 border-dashed'
                      }`} />
                    </div>
                  )}

                  {/* 3-2-1 Countdown Overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                      <span className="text-8xl font-black text-white animate-pulse">
                        {countdown}
                      </span>
                      <span className="text-sm font-bold text-emerald-soft tracking-wider uppercase">
                        {t('camera_instruction')}
                      </span>
                    </div>
                  )}

                  {/* Recording In-Progress Banner */}
                  {isRecording && (
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-red-600/95 text-white text-xs font-bold shadow-lg animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span>{t('recording_in_progress', { seconds: recordSecondsLeft })}</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-emerald-400 text-xs font-mono font-bold border border-slate-700">
                        {t('session_auto_submits')}
                      </div>
                    </div>
                  )}

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div className="absolute inset-0 p-6 bg-slate-950/95 flex flex-col items-center justify-center text-center">
                      <AlertCircle className="w-10 h-10 text-amber-bank mb-2" />
                      <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 rounded-xl bg-emerald-soft text-emerald-bank text-xs font-bold border border-emerald-border hover:bg-emerald-border transition-colors"
                      >
                        Retry Camera Permission
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Upload Mode Canvas */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-canvas-card">
                  {selectedFile ? (
                    <div className="space-y-4">
                      <FileVideo className="w-16 h-16 text-emerald-bank mx-auto animate-bounce" />
                      <div>
                        <p className="text-sm font-bold text-ink">{selectedFile.name}</p>
                        <p className="text-xs text-ink-muted">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {t('selected_file_ready')}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-xs text-wine-bank hover:underline font-semibold"
                      >
                        {lang === 'hi' ? 'अन्य वीडियो चुनें' : 'Choose another video file'}
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer group flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-soft flex items-center justify-center text-emerald-bank group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{t('upload_drop_label')}</p>
                        <p className="text-xs text-ink-muted mt-0.5">{t('upload_sublabel')}</p>
                      </div>
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <div className="text-xs text-ink-muted">
                {mode === 'webcam' ? (
                  <span>{t('session_auto_submits')}</span>
                ) : (
                  <span>{t('selected_file_ready')}</span>
                )}
              </div>

              <div>
                {mode === 'webcam' && (
                  <button
                    onClick={handleStartRecording}
                    disabled={isRecording || countdown !== null || !webcamStream || isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Video className="w-4 h-4 text-emerald-soft" />
                    <span>{isRecording ? t('recording_in_progress', { seconds: recordSecondsLeft }) : t('start_recording_btn')}</span>
                  </button>
                )}

                {mode === 'upload' && selectedFile && (
                  <button
                    onClick={() => submitVerificationVideo()}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-soft" />
                        <span>{t('screening_progress')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('submit_uploaded_btn')}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-soft" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* SLEEK, CLEAN PROGRESS BAR */}
          {isSubmitting && (
            <div className="p-6 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-3.5 text-center animate-in fade-in duration-300">
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-ink">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-bank" />
                <span>{t('screening_progress')}</span>
              </div>

              {/* Clean animated progress bar */}
              <div className="w-full bg-canvas-subtle rounded-full h-2.5 overflow-hidden border border-canvas-border">
                <div className="bg-emerald-bank h-full w-full animate-pulse rounded-full" />
              </div>

              <p className="text-[11px] text-ink-muted">
                {lang === 'hi' 
                  ? 'चेहरे की वीडियो स्ट्रीम और बायोमेट्रिक जीवंतता का सत्यापन किया जा रहा है...'
                  : 'Verifying facial video stream and biometric liveness. This takes only a few seconds.'}
              </p>
            </div>
          )}

          {/* Submission Error Banner */}
          {submissionError && (
            <div className="p-4 rounded-2xl bg-wine-soft border border-wine-border text-wine-bank text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{submissionError}</span>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 4: RESULT SCREEN (CLEAR BIG RED CROSS / AMBER / GREEN)    */}
      {/* ============================================================== */}
      {currentStep === 'RESULT' && applicantResult && (
        <div className="max-w-xl mx-auto">
          
          {/* STATE A: REJECTED (BIG RED CROSS) */}
          {(applicantResult.is_rejected || ['REJECTED', 'RETRY_REQUIRED', 'RETRY', 'FAILED'].includes(applicantResult.status)) && (
            <div className="p-8 sm:p-10 rounded-3xl bg-canvas-card border-2 border-wine-border shadow-soft-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              
              {/* BIG RED CROSS ICON */}
              <div className="w-24 h-24 rounded-full mx-auto bg-wine-soft border-4 border-wine-border flex items-center justify-center text-wine-bank shadow-[0_0_40px_rgba(225,29,72,0.25)]">
                <XCircle className="w-16 h-16 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-wine-bank tracking-tight">
                  {t('res_rejected_title')}
                </h2>
                <p className="text-sm font-semibold text-ink leading-relaxed max-w-md mx-auto">
                  {applicantResult.message || applicantResult.user_message || t('res_rejected_default_msg')}
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto pt-1">
                  {t('res_rejected_submsg')}
                </p>
              </div>

              {/* Reference ID Pill */}
              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>{t('app_id_label')}</span>
                <span className="font-bold text-ink">{applicationId}</span>
              </div>

              {/* Retry Call to Action */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full py-3.5 px-6 rounded-2xl bg-wine-bank hover:bg-rose-700 text-white text-xs font-bold shadow-soft-md transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-rose-200" />
                  <span>{t('retry_verification')}</span>
                </button>

                <button
                  onClick={handleStartFresh}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
                >
                  {t('start_new_app')}
                </button>
              </div>
            </div>
          )}

          {/* STATE B: UNDER MANUAL SUPERVISION (AMBER SHIELD) */}
          {(applicantResult.is_under_review || ['UNDER_REVIEW', 'GUARDED', 'ELEVATED'].includes(applicantResult.status)) && (
            <div className="p-8 sm:p-10 rounded-3xl bg-canvas-card border-2 border-amber-border shadow-soft-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              
              <div className="w-24 h-24 rounded-full mx-auto bg-amber-soft border-4 border-amber-border flex items-center justify-center text-amber-bank shadow-[0_0_35px_rgba(217,119,6,0.2)]">
                <Clock className="w-14 h-14 stroke-[2.2]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                  {t('res_review_title')}
                </h2>
                <p className="text-sm font-semibold text-ink-muted leading-relaxed max-w-md mx-auto">
                  {applicantResult.message || applicantResult.user_message || t('res_review_default_msg')}
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto pt-1">
                  {t('res_review_submsg')}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>{t('app_id_label')}</span>
                <span className="font-bold text-ink">{applicationId}</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartFresh}
                  className="w-full py-3.5 px-6 rounded-2xl bg-canvas-subtle hover:bg-canvas-border text-ink text-xs font-bold transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-bank" />
                  <span>{t('screen_another_btn')}</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE C: APPROVED / SUCCESS (BIG GREEN CHECKMARK) */}
          {(applicantResult.is_approved || ['APPROVED', 'COMPLETED', 'SUCCESS'].includes(applicantResult.status)) && (
            <div className="p-8 sm:p-10 rounded-3xl bg-canvas-card border-2 border-emerald-border shadow-soft-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              
              <div className="w-24 h-24 rounded-full mx-auto bg-emerald-soft border-4 border-emerald-border flex items-center justify-center text-emerald-bank shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-bank tracking-tight">
                  {t('res_success_title')}
                </h2>
                <p className="text-sm font-semibold text-ink leading-relaxed max-w-md mx-auto">
                  {applicantResult.message || applicantResult.user_message || t('res_success_default_msg')}
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto pt-1">
                  {t('res_success_submsg')}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>{t('app_id_label')}</span>
                <span className="font-bold text-emerald-bank">{applicationId}</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartFresh}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-soft" />
                  <span>{t('verify_another_btn')}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}