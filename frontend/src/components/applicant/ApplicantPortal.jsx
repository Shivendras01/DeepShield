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

export default function ApplicantPortal({ onScreeningComplete }) {
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

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const frameTimestampsRef = useRef([]);

  // Initialize or teardown camera only on the RECORDING step when in webcam mode
  useEffect(() => {
    if (currentStep === 'RECORDING' && mode === 'webcam') {
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
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Camera access required. Please enable webcam permissions in your browser or switch to File Upload mode.');
    }
  };

  const stopCamera = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
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
      setRecordedBlob(blob);
      setRecordedVideoUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      setRecordSecondsLeft(0);

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
        : (webcamStream?.getVideoTracks()[0]?.label || 'Integrated Webcam');

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
  };

  const handleStartFresh = () => {
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
          <span>DeepShield Video e-KYC Verification</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Digital Identity Screening
          </h1>
          <div className="flex items-center space-x-2 text-xs font-mono bg-canvas-card px-3 py-1.5 rounded-xl border border-canvas-border shadow-soft-sm text-ink-muted">
            <span className="text-[10px] uppercase font-bold text-ink-faint">Application Ref:</span>
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
                Step 1 of 3: Applicant Details
              </span>
              <h2 className="text-lg font-bold text-ink flex items-center space-x-2">
                <User className="w-5 h-5 text-emerald-bank" />
                <span>Identity Verification Form</span>
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Enter your official identity details as they appear on your government document. A unique reference code has been assigned to your verification session.
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Legal Name */}
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Full Legal Name (as per Govt ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    required
                    placeholder="e.g. Shivendra Singh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-sm text-ink font-medium focus:outline-none focus:border-emerald-bank transition-colors"
                  />
                </div>
              </div>

              {/* Govt ID Type & ID Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                    Government ID Document
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-xs text-ink font-medium focus:outline-none focus:border-emerald-bank transition-colors"
                  >
                    <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                    <option value="PAN Card">PAN Card (Income Tax)</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID (Election Commission)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                    Document Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      placeholder="e.g. 4829-8472-9041"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas-subtle border border-canvas-border text-xs font-mono text-ink focus:outline-none focus:border-emerald-bank transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number / Contact */}
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    placeholder="+91 98765 43210"
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
                    I consent to video biometric liveness screening and facial presentation attack analysis under ISO/IEC 30107 standards for banking identity verification.
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
                <span>Proceed to Instructions</span>
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
                  Step 2 of 3: Biometric Instructions & Preparation
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                  Important Guidelines Before Recording
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
                  Please read the 4 guidelines below to ensure your 5-second video verification passes without issues.
                </p>
              </div>
              
              <button
                onClick={() => setCurrentStep('DETAILS')}
                className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
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
                  1. Clean & Even Lighting
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Sit facing natural daylight or good indoor light. Avoid strong backlights, harsh shadows, or dark rooms that obscure your facial contours.
                </p>
              </div>

              {/* Card 2: Eye Contact & Natural Blinking */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-soft border border-emerald-border flex items-center justify-center text-emerald-bank">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  2. Look Directly & Blink Normally
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Look directly at the webcam lens. Blink naturally 1-2 times during the 5 seconds. Do not hold your breath or freeze your eyes unnaturally.
                </p>
              </div>

              {/* Card 3: No Accessories or External Screens */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-wine-soft border border-wine-border flex items-center justify-center text-wine-bank">
                  <Ban className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  3. No Sunglasses, Masks, or Screens
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Remove sunglasses, tinted spectacles, or face masks. Holding an external phone, tablet, or photo in front of the lens will cause immediate rejection.
                </p>
              </div>

              {/* Card 4: 5-Second Passive Duration */}
              <div className="p-5 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-soft border border-blue-border flex items-center justify-center text-blue-bank">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">
                  4. Automated 5-Second Session
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  No awkward head turns or speech prompts. The session records for 5 seconds and automatically submits without requiring extra clicks.
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
                    I have read and understood all the verification instructions
                  </span>
                  <span className="text-[11px] text-ink-muted block leading-relaxed">
                    I confirm that I am sitting in good lighting, directly facing the camera, and ready to record my 5-second video.
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
                <span>Back to Details</span>
              </button>

              <button
                onClick={() => setCurrentStep('RECORDING')}
                disabled={!instructionsAcknowledged}
                className="px-6 py-3 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Proceed to Video Recording</span>
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
              <span>Back to Instructions</span>
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
                <span>Live Camera</span>
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
                <span>Upload Test Video</span>
              </button>
            </div>
          </div>

          {/* BIG FONT INSTRUCTION BANNER */}
          <div className="p-6 sm:p-7 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-sm text-center space-y-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-soft text-emerald-bank text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 3 of 3: Active Video Recording</span>
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink tracking-tight">
              Please look naturally into the camera and blink normally
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
              Center your face inside the oval guide and sit naturally. The recording lasts 5 seconds and will automatically submit.
            </p>
          </div>

          {/* MAIN CAMERA / UPLOAD VIEWPORT */}
          <div className="p-6 sm:p-8 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-6">
            
            <div className="relative w-full aspect-video rounded-2xl bg-slate-950 border border-canvas-border overflow-hidden flex items-center justify-center shadow-inner">
              
              {mode === 'webcam' ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  
                  {/* Biometric Oval Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className={`w-52 h-68 rounded-[50%] border-2 transition-all duration-300 ${
                      isRecording 
                        ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.55)] scale-105' 
                        : 'border-white/50 border-dashed'
                    }`} />
                  </div>

                  {/* 3-2-1 Countdown Overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                      <span className="text-8xl font-black text-white animate-pulse">
                        {countdown}
                      </span>
                      <span className="text-sm font-bold text-emerald-soft tracking-wider uppercase">
                        Get Ready & Look Straight Ahead
                      </span>
                    </div>
                  )}

                  {/* Recording In-Progress Banner */}
                  {isRecording && (
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-red-600/95 text-white text-xs font-bold shadow-lg animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span>RECORDING: {recordSecondsLeft}s remaining</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-emerald-400 text-xs font-mono font-bold border border-slate-700">
                        Auto-submits at 0s
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
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Screening
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-xs text-wine-bank hover:underline font-semibold"
                      >
                        Choose another video file
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer group flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-soft flex items-center justify-center text-emerald-bank group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">Select Video Clip to Screen</p>
                        <p className="text-xs text-ink-muted mt-0.5">MP4 or WebM video file (max 30MB)</p>
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
                  <span>Recording will automatically submit upon 5-second completion</span>
                ) : (
                  <span>Select a prerecorded video clip for screening testing</span>
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
                    <span>{isRecording ? `Recording... (${recordSecondsLeft}s)` : 'Start 5-Second Recording'}</span>
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
                        <span>Processing Video...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit for Verification</span>
                        <ArrowRight className="w-4 h-4 text-emerald-soft" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* SLEEK, CLEAN PROGRESS BAR (NO TECHNICAL INTERNAL STEPS) */}
          {isSubmitting && (
            <div className="p-6 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-3.5 text-center animate-in fade-in duration-300">
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-ink">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-bank" />
                <span>Screening in progress... Please wait</span>
              </div>

              {/* Clean animated progress bar */}
              <div className="w-full bg-canvas-subtle rounded-full h-2.5 overflow-hidden border border-canvas-border">
                <div className="bg-emerald-bank h-full w-full animate-pulse rounded-full" />
              </div>

              <p className="text-[11px] text-ink-muted">
                Verifying facial video stream and biometric liveness. This takes only a few seconds.
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
                  Verification Failed
                </h2>
                <p className="text-sm font-semibold text-ink leading-relaxed max-w-md mx-auto">
                  {applicantResult.message || applicantResult.user_message || 'Physical presence could not be confirmed. A presentation attack or screen replay was detected.'}
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto pt-1">
                  Please ensure you are physically present in front of the camera, do not hold phone screens or photographs, and sit in a well-lit area.
                </p>
              </div>

              {/* Reference ID Pill */}
              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>Application ID:</span>
                <span className="font-bold text-ink">{applicationId}</span>
              </div>

              {/* Retry Call to Action */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full py-3.5 px-6 rounded-2xl bg-wine-bank hover:bg-rose-700 text-white text-xs font-bold shadow-soft-md transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-rose-200" />
                  <span>Retry Verification</span>
                </button>

                <button
                  onClick={handleStartFresh}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
                >
                  Start New Application
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
                  Application Under Manual Review
                </h2>
                <p className="text-sm font-semibold text-ink-muted leading-relaxed max-w-md mx-auto">
                  {applicantResult.message || applicantResult.user_message || 'Your biometric session has been forwarded to a compliance officer for manual verification.'}
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto pt-1">
                  Our verification officer is reviewing the forensic frames. You will receive an update shortly.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>Application ID:</span>
                <span className="font-bold text-ink">{applicationId}</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartFresh}
                  className="w-full py-3.5 px-6 rounded-2xl bg-canvas-subtle hover:bg-canvas-border text-ink text-xs font-bold transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-bank" />
                  <span>Screen Another Applicant</span>
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
                  Verification Successful
                </h2>
                <p className="text-sm font-semibold text-ink leading-relaxed max-w-md mx-auto">
                  {applicantResult.message || applicantResult.user_message || 'Your identity and biological liveness have been verified. Your KYC application has been approved.'}
                </p>
                <p className="text-xs text-ink-muted max-w-sm mx-auto pt-1">
                  Biometric liveness confirmed. Your banking profile has been updated.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>Application Ref:</span>
                <span className="font-bold text-emerald-bank">{applicationId}</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartFresh}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-bold shadow-soft-md transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-soft" />
                  <span>Verify Another Customer</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}