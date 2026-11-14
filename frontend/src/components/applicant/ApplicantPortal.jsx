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
  Info
} from 'lucide-react';
import { api } from '../../services/api';

export default function ApplicantPortal({ onScreeningComplete }) {
  // Candidate form state
  const [applicantName, setApplicantName] = useState('Shivendra Singh');
  const [applicationId, setApplicationId] = useState('KYC-2026-9041');
  const [mode, setMode] = useState('webcam'); // 'webcam' | 'upload'
  
  // Webcam recording state
  const [webcamStream, setWebcamStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordedMimeType, setRecordedMimeType] = useState('video/webm');
  const [cameraError, setCameraError] = useState(null);

  // Upload file state
  const [selectedFile, setSelectedFile] = useState(null);

  // Submission & Pipeline progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screeningStage, setScreeningStage] = useState(0); // 0 to 4
  const [applicantResult, setApplicantResult] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Telemetry timestamps collection
  const frameTimestampsRef = useRef([]);

  // Initialize / Stop webcam
  useEffect(() => {
    if (mode === 'webcam' && !applicantResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, applicantResult]);

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
      setCameraError('Camera access required. Please enable webcam permissions or switch to File Upload mode.');
    }
  };

  const stopCamera = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  // Start 5-second recording
  const handleStartRecording = () => {
    if (!webcamStream) return;
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
    
    // Choose best supported codec (prefer MP4 on Chromium/Windows for seamless OpenCV compatibility)
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
    };

    recorder.start(100); // 100ms slices to capture jitter timestamps

    // Automatically stop after 5 seconds
    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, 5200);
  };

  const handleRetake = () => {
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setSelectedFile(null);
    startCamera();
  };

  // Submit screening session
  const handleSubmit = async () => {
    const isMp4 = recordedMimeType.includes('mp4');
    const filename = isMp4 ? 'webcam_kyc.mp4' : 'webcam_kyc.webm';
    const videoFile = mode === 'webcam' 
      ? new File([recordedBlob], filename, { type: recordedMimeType })
      : selectedFile;

    if (!videoFile) return;

    setIsSubmitting(true);
    setSubmissionError(null);
    setScreeningStage(1);

    // Visual stepper progression
    const stageTimer1 = setTimeout(() => setScreeningStage(2), 600);
    const stageTimer2 = setTimeout(() => setScreeningStage(3), 1300);
    const stageTimer3 = setTimeout(() => setScreeningStage(4), 2100);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('client_identity', JSON.stringify({
        applicant_name: applicantName,
        application_id: applicationId,
        client_timestamp: new Date().toISOString(),
      }));

      // Gather browser telemetry
      const telemetry = {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        camera_label: webcamStream ? webcamStream.getVideoTracks()[0]?.label || 'Standard WebCam' : 'File Upload Source',
        frame_timestamps: frameTimestampsRef.current.length > 5 ? frameTimestampsRef.current : undefined,
      };
      formData.append('telemetry_payload', JSON.stringify(telemetry));

      const response = await api.submitScreening(formData);
      
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setScreeningStage(4);

      // Save applicant-safe view
      setApplicantResult(response.applicant_view);

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

  const handleReset = () => {
    setApplicantResult(null);
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setSelectedFile(null);
    setScreeningStage(0);
    setSubmissionError(null);
    setApplicationId(`KYC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Top Banner & Context */}
      <div className="mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-soft border border-emerald-border text-emerald-bank text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Automated e-KYC Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Applicant Identity Screening
        </h1>
        <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">
          This portal simulates the customer-facing video verification step in a digital banking application. Complete the 5-second biometric recording below.
        </p>
      </div>

      {/* Main Content Area */}
      {!applicantResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form Details & Instructions */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm space-y-4">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider text-[11px]">
                Application Details
              </h2>
              
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Applicant Full Name
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas-subtle border border-canvas-border text-sm text-ink font-medium focus:outline-none focus:border-emerald-bank transition-colors"
                  placeholder="e.g. Shivendra Singh"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Application Reference ID
                </label>
                <input
                  type="text"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-canvas-subtle border border-canvas-border text-xs font-mono text-ink-muted focus:outline-none focus:border-emerald-bank transition-colors"
                />
              </div>

              {/* Mode Selector Tabs */}
              <div className="pt-2 border-t border-canvas-border">
                <label className="block text-xs font-semibold text-ink-muted mb-2">
                  Capture Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setMode('webcam'); handleRetake(); }}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      mode === 'webcam'
                        ? 'bg-emerald-soft text-emerald-bank border-emerald-border'
                        : 'bg-canvas-subtle text-ink-muted border-canvas-border hover:text-ink'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Webcam</span>
                  </button>

                  <button
                    onClick={() => { setMode('upload'); handleRetake(); }}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      mode === 'upload'
                        ? 'bg-emerald-soft text-emerald-bank border-emerald-border'
                        : 'bg-canvas-subtle text-ink-muted border-canvas-border hover:text-ink'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Sample File</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Tips */}
            <div className="p-4 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-2.5 text-xs text-ink-muted">
              <div className="flex items-center space-x-2 text-ink font-semibold">
                <Info className="w-4 h-4 text-emerald-bank" />
                <span>Verification Guidelines</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-[11px] leading-relaxed">
                <li>Position face clearly within the biometric oval guide.</li>
                <li>Ensure well-lit conditions with no glare or harsh shadows.</li>
                <li>Blink naturally and avoid wearing sunglasses or face masks.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Capture Studio & Video Interface */}
          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-sm flex flex-col justify-between min-h-[420px]">
              
              {/* Studio Canvas */}
              <div className="relative w-full aspect-video rounded-xl bg-ink/5 border border-canvas-border overflow-hidden flex items-center justify-center">
                
                {mode === 'webcam' ? (
                  <>
                    {!recordedVideoUrl ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        
                        {/* Oval Biometric Facial Guide Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-300 ${
                            isRecording 
                              ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] animate-pulse' 
                              : 'border-canvas-card/80 border-dashed'
                          }`} />
                        </div>

                        {/* 3-2-1 Countdown Overlay */}
                        {countdown !== null && (
                          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-7xl font-extrabold text-white animate-ping">
                              {countdown}
                            </span>
                          </div>
                        )}

                        {/* Recording Progress Badge */}
                        {isRecording && (
                          <div className="absolute top-4 left-4 flex items-center space-x-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold shadow-md animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-white" />
                            <span>Recording (5s)...</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <video
                        src={recordedVideoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                      />
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 p-6 bg-canvas-card/95 flex flex-col items-center justify-center text-center">
                        <AlertCircle className="w-8 h-8 text-amber-bank mb-2" />
                        <p className="text-xs text-ink-muted max-w-sm mb-3">{cameraError}</p>
                        <button
                          onClick={startCamera}
                          className="px-3 py-1.5 rounded-lg bg-emerald-soft text-emerald-bank text-xs font-semibold border border-emerald-border"
                        >
                          Retry Camera
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* File Upload Studio */
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    {selectedFile ? (
                      <div className="space-y-3">
                        <FileVideo className="w-12 h-12 text-emerald-bank mx-auto animate-bounce" />
                        <div>
                          <p className="text-xs font-bold text-ink">{selectedFile.name}</p>
                          <p className="text-[11px] text-ink-muted">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for screening
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-xs text-ink-muted hover:text-wine-bank underline"
                        >
                          Choose a different file
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer group flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-soft flex items-center justify-center text-emerald-bank group-hover:scale-105 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ink">Upload e-KYC Test Clip</p>
                          <p className="text-[11px] text-ink-muted">MP4 or WebM video file (max 25MB)</p>
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

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-canvas-border flex items-center justify-between">
                <div>
                  {mode === 'webcam' && recordedVideoUrl && (
                    <button
                      onClick={handleRetake}
                      disabled={isSubmitting}
                      className="flex items-center space-x-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Clip</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {mode === 'webcam' && !recordedBlob && (
                    <button
                      onClick={handleStartRecording}
                      disabled={isRecording || countdown !== null || !webcamStream}
                      className="px-4 py-2 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-semibold shadow-soft-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Video className="w-3.5 h-3.5 text-emerald-soft" />
                      <span>{isRecording ? 'Capturing Video...' : 'Start 5s Recording'}</span>
                    </button>
                  )}

                  {(recordedBlob || selectedFile) && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-bank hover:bg-emerald-hover text-white text-xs font-semibold shadow-soft-md transition-all flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-soft" />
                          <span>Screening Video...</span>
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
          </div>

        </div>
      ) : null}

      {/* Real-Time Screening Progress Stepper */}
      {isSubmitting && (
        <div className="mt-6 p-6 rounded-2xl bg-canvas-card border border-canvas-border shadow-soft-md space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>Automated Forensic Pipeline Ingestion</span>
            <span className="text-emerald-bank">Step {screeningStage} of 4</span>
          </div>

          <div className="w-full bg-canvas-subtle rounded-full h-2 overflow-hidden border border-canvas-border">
            <div 
              className="bg-emerald-bank h-full transition-all duration-500 rounded-full"
              style={{ width: `${(screeningStage / 4) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-ink-muted">
            <div className={`p-2 rounded-lg ${screeningStage >= 1 ? 'text-emerald-bank font-semibold bg-emerald-soft' : ''}`}>
              1. OpenCV Face Striding
            </div>
            <div className={`p-2 rounded-lg ${screeningStage >= 2 ? 'text-emerald-bank font-semibold bg-emerald-soft' : ''}`}>
              2. Passive Liveness (EAR)
            </div>
            <div className={`p-2 rounded-lg ${screeningStage >= 3 ? 'text-emerald-bank font-semibold bg-emerald-soft' : ''}`}>
              3. EfficientNet-B0 Saliency
            </div>
            <div className={`p-2 rounded-lg ${screeningStage >= 4 ? 'text-emerald-bank font-semibold bg-emerald-soft' : ''}`}>
              4. Multi-Channel Fusion
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {submissionError && (
        <div className="mt-6 p-4 rounded-xl bg-wine-soft border border-wine-border text-wine-bank text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* OUTCOME CARD: STRICTLY DUAL-PERSPECTIVE (NO LEAKED SCORES)      */}
      {/* ============================================================== */}
      {applicantResult && (
        <div className="mt-8 max-w-xl mx-auto p-8 rounded-3xl bg-canvas-card border border-canvas-border shadow-soft-lg text-center space-y-6">
          
          {/* Status Icon */}
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-soft-sm">
            {applicantResult.status === 'APPROVED' && (
              <div className="w-full h-full rounded-full bg-emerald-soft border border-emerald-border flex items-center justify-center text-emerald-bank">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}
            {applicantResult.status === 'UNDER_REVIEW' && (
              <div className="w-full h-full rounded-full bg-amber-soft border border-amber-border flex items-center justify-center text-amber-bank">
                <Clock className="w-8 h-8" />
              </div>
            )}
            {applicantResult.status === 'RETRY' && (
              <div className="w-full h-full rounded-full bg-wine-soft border border-wine-border flex items-center justify-center text-wine-bank">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-ink tracking-tight">
              {applicantResult.status === 'APPROVED' && 'Identity Verification Successful'}
              {applicantResult.status === 'UNDER_REVIEW' && 'Verification Under Manual Review'}
              {applicantResult.status === 'RETRY' && 'Verification Inconclusive'}
            </h2>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              {applicantResult.message}
            </p>
          </div>

          {/* Reference Meta */}
          <div className="p-3 rounded-xl bg-canvas-subtle border border-canvas-border flex items-center justify-between text-xs text-ink-muted font-mono">
            <span>Session ID:</span>
            <span className="text-ink font-semibold">{applicantResult.session_id.slice(0, 13)}...</span>
          </div>

          {/* Security Assurance Notice */}
          <p className="text-[11px] text-ink-faint">
            Dual-Perspective Invariant: Internal fraud risk gauges and Grad-CAM saliency artifacts are withheld from applicant endpoints to prevent adversarial oracle probing.
          </p>

          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl bg-canvas-subtle hover:bg-canvas-border text-ink text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verify Another Applicant</span>
          </button>
        </div>
      )}

    </div>
  );
}
