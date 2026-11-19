import {
  chennaiWards,
  GCC_WHATSAPP,
  severityConfig,
  generateComplaintId,
  compressImage,
  timeAgoLabel,
  formatReportTime,
} from './data';
import { useComplaints } from './ComplaintsContext';
import { useLocation } from './LocationContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  MapPin,
  CheckCircle2,
  Loader,
  Search,
  AlertTriangle,
  Eye,
  Lock,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Check,
} from 'lucide-react';
import { apiAnalyzeGarbage, GarbageAnalysisResult } from './api';

type SeverityType = 'Minor' | 'Moderate' | 'Severe' | 'Critical';
type WasteType = 'Household Waste' | 'Construction Debris' | 'Mixed Waste' | 'E-Waste' | 'Biomedical';

const severities: { id: SeverityType; desc: string; icon: string }[] = [
  { id: 'Minor', desc: 'Small litter', icon: '🟡' },
  { id: 'Moderate', desc: 'Auto-size pile', icon: '🟠' },
  { id: 'Severe', desc: 'Road blocked', icon: '🔴' },
  { id: 'Critical', desc: 'Large dump yard', icon: '💢' },
];

const wasteTypes: { id: WasteType; icon: string }[] = [
  { id: 'Household Waste', icon: '🏠' },
  { id: 'Construction Debris', icon: '🧱' },
  { id: 'Mixed Waste', icon: '♻️' },
  { id: 'E-Waste', icon: '💻' },
  { id: 'Biomedical', icon: '🏥' },
];

export function ReportScreen() {
  const navigate = useNavigate();
  const { addComplaint } = useComplaints();
  const { locationStatus, coords: gpsCoords, canReport } = useLocation();

  // Photo & Camera State (Live Camera ONLY - no gallery file picker)
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Gemini AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<GarbageAnalysisResult | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [manualReviewRequested, setManualReviewRequested] = useState(false);

  // Form Fields
  const [selectedWard, setSelectedWard] = useState<(typeof chennaiWards)[0] | null>(null);
  const [address, setAddress] = useState('');
  const [severity, setSeverity] = useState<SeverityType | null>(null);
  const [wasteType, setWasteType] = useState<WasteType | null>(null);
  const [showWardDD, setShowWardDD] = useState(false);
  const [wardSearch, setWardSearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ── Camera Methods ────────────────────────────────────────────────────────
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    setCameraLoading(true);
    setIsCameraActive(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera is not supported in this browser. Please use a modern browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play caught:', e));
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraLoading(false);
      setIsCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings to capture live photographs.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Live camera is required to report garbage.');
      } else {
        setCameraError(err.message || 'Unable to open camera. Please grant camera permission.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Convert dataUrl to File
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file = new File([u8arr], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Stop camera hardware
    stopCamera();

    // Set preview & photo state
    setPhoto(file);
    setPhotoPreview(dataUrl);
    setPhotoError(null);

    // Trigger automatic Gemini AI analysis immediately
    analyzePhotoWithAI(dataUrl);
  };

  const retakePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setAiAnalysis(null);
    setAiAnalyzing(false);
    setAiError(null);
    setManualReviewRequested(false);
    startCamera();
  };

  // ── Automatic Gemini AI Analysis ──────────────────────────────────────────
  const analyzePhotoWithAI = async (imageDataUrl: string) => {
    setAiAnalyzing(true);
    setAiError(null);
    setAiAnalysis(null);

    try {
      const result = await apiAnalyzeGarbage(imageDataUrl, 'image/jpeg');
      setAiAnalysis(result);

      // If garbage detected, auto-populate recommended severity & waste category
      if (result.garbageDetected === 'Yes') {
        if (result.mappedWasteType && !wasteType) {
          setWasteType(result.mappedWasteType);
        }
        if (result.estimatedSeverity && !severity) {
          setSeverity(result.estimatedSeverity);
        }
      }
    } catch (err: any) {
      console.error('Gemini AI analysis failed:', err);
      setAiError(err.message || 'Unable to connect to Gemini AI for image verification.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Ward GPS
  const handleGPSWard = () => {
    if (gpsCoords) {
      const nearest = chennaiWards.reduce((prev, curr) => {
        const dPrev = Math.hypot(prev.lat - gpsCoords.lat, prev.lng - gpsCoords.lng);
        const dCurr = Math.hypot(curr.lat - gpsCoords.lat, curr.lng - gpsCoords.lng);
        return dCurr < dPrev ? curr : prev;
      });
      setSelectedWard(nearest);
      setAddress(`Near ${nearest.wardName}, Chennai`);
      setShowWardDD(false);
      return;
    }
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const nearest = chennaiWards.reduce((prev, curr) => {
          const dPrev = Math.hypot(prev.lat - latitude, prev.lng - longitude);
          const dCurr = Math.hypot(curr.lat - latitude, curr.lng - longitude);
          return dCurr < dPrev ? curr : prev;
        });
        setSelectedWard(nearest);
        setAddress(`Near ${nearest.wardName}, Chennai`);
        setGpsLoading(false);
        setShowWardDD(false);
      },
      err => {
        setGpsLoading(false);
        setGpsError(
          err.code === 1
            ? 'Location denied. Select your ward manually.'
            : 'GPS unavailable. Select your ward manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const isGarbageVerified = aiAnalysis?.garbageDetected === 'Yes' || manualReviewRequested;
  const canSubmit = !!(
    photo &&
    isGarbageVerified &&
    severity &&
    wasteType &&
    selectedWard &&
    canReport &&
    !aiAnalyzing
  );

  const filteredWards = chennaiWards.filter(
    w =>
      wardSearch.trim() === '' ||
      w.wardName.toLowerCase().includes(wardSearch.toLowerCase()) ||
      String(w.wardNo).includes(wardSearch)
  );

  const buildMessage = () => {
    const lat = gpsCoords?.lat ?? selectedWard?.lat ?? 13.0827;
    const lng = gpsCoords?.lng ?? selectedWard?.lng ?? 80.2707;
    return (
      `🚨 *Garbage Complaint — Ward #${selectedWard?.wardNo}, ${selectedWard?.wardName}*\n\n` +
      `📍 *Location:* ${address || selectedWard?.wardName + ', Chennai'}\n` +
      `🏛️ *Ward:* #${selectedWard?.wardNo} — ${selectedWard?.wardName}\n` +
      `⚠️ *Severity:* ${severity}\n` +
      `🗂️ *Waste Type:* ${wasteType}\n` +
      (aiAnalysis?.garbageDetected === 'Yes'
        ? `🤖 *AI Verification:* Verified by Gemini AI (${aiAnalysis.wasteCategory})\n` +
          `🔍 *AI Observation:* ${aiAnalysis.observation}\n`
        : '') +
      (note.trim() ? `📝 *Note:* ${note.trim()}\n` : '') +
      `🌐 *GPS:* https://maps.google.com/?q=${lat},${lng}\n` +
      `📸 *Photo:* [Live Camera Attached]\n\n` +
      `Please arrange for cleanup at the earliest.\n\n` +
      `_Reported via Civicsetu Chennai_`
    );
  };

  const handleSubmitAttempt = () => {
    if (!photo) {
      setPhotoError('A live photograph of the garbage location is required to submit.');
      document.getElementById('photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (aiAnalyzing) {
      document.getElementById('photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (aiAnalysis?.garbageDetected === 'No') {
      setPhotoError('No visible garbage detected. You must capture a photograph of actual garbage before submitting.');
      document.getElementById('photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (aiAnalysis?.garbageDetected === 'Uncertain' && !manualReviewRequested) {
      setPhotoError('The photograph is unclear or insufficient. Please retake or request manual review.');
      document.getElementById('photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);

    const now = Date.now();
    const lat = gpsCoords?.lat ?? selectedWard!.lat;
    const lng = gpsCoords?.lng ?? selectedWard!.lng;

    let imageData = '';
    try {
      imageData = await compressImage(photo!, 600, 0.72);
    } catch {
      imageData = '';
    }

    addComplaint({
      id: generateComplaintId(),
      area: selectedWard!.wardName,
      shortAddress: address || `${selectedWard!.wardName}, Chennai`,
      fullAddress: address || `${selectedWard!.wardName}, ${selectedWard!.zoneName}, Chennai`,
      time: formatReportTime(now),
      timeAgo: timeAgoLabel(now),
      severity: severity!,
      status: 'Unresolved',
      wardNo: selectedWard!.wardNo,
      wardName: selectedWard!.wardName,
      wasteType: wasteType!,
      reportCount: 1,
      daysPending: 0,
      image: imageData,
      lat,
      lng,
      submittedAt: now,
      aiVerified: isGarbageVerified,
      aiObservation: aiAnalysis?.observation || '',
      aiWasteCategory: aiAnalysis?.wasteCategory || '',
      aiSeverity: aiAnalysis?.estimatedSeverity || severity!,
      aiConfidence: aiAnalysis?.confidence || 0.95,
    });

    const message = buildMessage();
    const encoded = encodeURIComponent(message);

    if (photo && navigator.canShare?.({ files: [photo] })) {
      try {
        await navigator.share({ files: [photo], text: message, title: 'GCC Garbage Complaint' });
        setSending(false);
        setSubmitted(true);
        return;
      } catch {
        /* fall through to WhatsApp */
      }
    }

    window.open(`https://wa.me/${GCC_WHATSAPP}?text=${encoded}`, '_blank');
    setSending(false);
    setSubmitted(true);
  };

  // ── Non-Chennai users ─────────────────────────────────────────────────────
  if (!canReport) {
    return (
      <div className="flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif', height: '100%' }}>
        <div className="bg-white px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-gray-50">
            <ArrowLeft size={20} color="#374151" />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Report Garbage</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <img src="/logo.png" alt="Civicsetu" style={{ height: 11, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>· Chennai residents only</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center"
            style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: locationStatus === 'outside' ? '#FEF3C7' : '#EFF6FF',
                border: `2px solid ${locationStatus === 'outside' ? '#FDE68A' : '#BFDBFE'}`,
              }}
            >
              {locationStatus === 'outside' ? <AlertTriangle size={32} color="#D97706" /> : <Lock size={32} color="#3B82F6" />}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              {locationStatus === 'outside' ? 'Outside Chennai' : 'Location Required'}
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 20 }}>
              {locationStatus === 'outside'
                ? 'Your GPS location is outside Greater Chennai Corporation limits. Only Chennai residents can submit garbage reports.'
                : "Location access was denied. We cannot verify you're in Chennai — reporting is disabled."}
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
                style={{ background: '#16A34A', color: 'white', fontSize: 14, fontWeight: 700 }}
              >
                <Eye size={16} color="white" /> View Reports on Map
              </button>
              <button
                onClick={() => navigate('/list')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
                style={{ background: '#F5F5F7', color: '#374151', fontSize: 14, fontWeight: 600 }}
              >
                Browse All Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white px-6" style={{ fontFamily: 'Inter, sans-serif', minHeight: '100dvh' }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 8px 30px rgba(22,163,74,0.35)' }}
        >
          <CheckCircle2 size={36} color="white" strokeWidth={2} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
          Report Submitted!
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
          Your complaint is now live on CivicSetu and verified with Gemini AI.
        </p>

        {aiAnalysis?.garbageDetected === 'Yes' && (
          <div className="w-full p-3.5 rounded-2xl mb-4 flex items-center gap-3" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
            <ShieldCheck size={24} color="#16A34A" className="flex-shrink-0" />
            <div className="text-left">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>Gemini AI Verified ✓</div>
              <div style={{ fontSize: 11, color: '#166534' }}>{aiAnalysis.wasteCategory} · {aiAnalysis.estimatedSeverity} Severity</div>
            </div>
          </div>
        )}

        <div className="w-full p-4 rounded-2xl mb-6" style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Officials Notified:</div>
          <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.8 }}>
            🏛️ Councillor: {selectedWard?.councillorName}<br />
            👤 MLA: {selectedWard?.mlaName} ({selectedWard?.mlaParty})<br />
            🎖️ MP: {selectedWard?.mpName} ({selectedWard?.mpConstituency})
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 rounded-2xl w-full"
          style={{ background: '#16A34A', color: 'white', fontSize: 14, fontWeight: 700 }}
        >
          View on Map
        </button>
      </div>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-gray-50">
          <ArrowLeft size={20} color="#374151" />
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Report Garbage</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <img src="/logo.png" alt="Civicsetu" style={{ height: 11, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>· All reports are anonymous</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#16A34A' }} />
          <span style={{ fontSize: 9, color: '#15803D', fontWeight: 600 }}>Chennai ✓</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* ── Photo (LIVE CAMERA ONLY) ── */}
          <div id="photo-section">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              📸 Photo{' '}
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#EF4444', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>
                REQUIRED
              </span>
            </label>
            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 10, lineHeight: 1.4 }}>
              Capture a live photograph of the garbage location. Gallery uploads are not supported.
            </p>

            {/* State A: Live Camera Active (Viewfinder) */}
            {isCameraActive && (
              <div
                className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center"
                style={{ height: 320, border: '2px solid #16A34A' }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Top Overlay Badge */}
                <div
                  className="absolute top-3 left-3 px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>LIVE CAMERA</span>
                </div>

                {/* Close camera button */}
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>

                {/* Framing guides */}
                <div
                  className="absolute inset-8 pointer-events-none rounded-xl"
                  style={{ border: '1.5px dashed rgba(255,255,255,0.4)' }}
                />

                {/* Bottom Camera Controls */}
                <div
                  className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-6"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', paddingBottom: 6, paddingTop: 20 }}
                >
                  {/* Flip camera */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="Switch Camera"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={18} />
                  </button>

                  {/* Shutter Button */}
                  <button
                    type="button"
                    onClick={capturePhoto}
                    title="Capture Photo"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'white',
                      border: '4px solid #16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={24} color="white" />
                    </div>
                  </button>

                  <div style={{ width: 40, height: 40 }} />
                </div>
              </div>
            )}

            {/* State B: Photo Captured & Preview Displayed */}
            {!isCameraActive && photoPreview && (
              <div className="flex flex-col gap-3">
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    height: 200,
                    border: isGarbageVerified
                      ? '2px solid #BBF7D0'
                      : aiAnalysis?.garbageDetected === 'No'
                      ? '2px solid #FECACA'
                      : '2px solid #E5E7EB',
                  }}
                >
                  <img src={photoPreview} alt="Live Capture Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 40%)' }} />

                  {/* Top-left tag */}
                  <div
                    className="absolute top-2 left-2 px-2.5 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: 'rgba(17, 24, 39, 0.75)', backdropFilter: 'blur(4px)' }}
                  >
                    <Camera size={11} color="white" />
                    <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>Live Photo Captured</span>
                  </div>

                  {/* Retake button on image */}
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      border: 'none',
                      color: '#111827',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <RefreshCw size={12} color="#111827" />
                    <span>Retake</span>
                  </button>
                </div>

                {/* ── AUTOMATIC GEMINI AI ANALYSIS CARD ── */}
                {aiAnalyzing && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} color="#16A34A" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D', letterSpacing: '0.04em' }}>
                        AI IMAGE VERIFICATION
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Loader size={20} color="#16A34A" className="animate-spin flex-shrink-0" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                          AI is analysing your photograph...
                        </div>
                        <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>
                          Verifying waste category, severity, and municipal relevance via Google Gemini
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Case A: Garbage Detected */}
                {!aiAnalyzing && aiAnalysis?.garbageDetected === 'Yes' && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', boxShadow: '0 2px 10px rgba(22,163,74,0.08)' }}
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-green-100">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} color="#16A34A" />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#15803D', letterSpacing: '0.04em' }}>
                          AI IMAGE VERIFICATION
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#166534',
                          background: '#DCFCE7',
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        Status: AI Analysis Completed
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={20} color="#16A34A" />
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#15803D' }}>
                        ✓ Garbage Detected
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2.5 rounded-xl bg-white/80 border border-green-100">
                        <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Waste Category</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 1 }}>
                          {aiAnalysis.wasteCategory}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/80 border border-green-100">
                        <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Estimated Severity</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 1 }}>
                          {aiAnalysis.estimatedSeverity}
                        </div>
                      </div>
                    </div>

                    {aiAnalysis.observation && (
                      <div className="p-2.5 rounded-xl bg-white/80 border border-green-100 mb-3">
                        <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, marginBottom: 2 }}>Observation:</div>
                        <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, margin: 0 }}>
                          "{aiAnalysis.observation}"
                        </p>
                      </div>
                    )}

                    {aiAnalysis.environmentalConcerns && (
                      <div className="flex items-start gap-1.5 text-[11px] text-green-900 mb-3">
                        <AlertCircle size={13} color="#16A34A" className="flex-shrink-0 mt-0.5" />
                        <span><strong>Risk:</strong> {aiAnalysis.environmentalConcerns}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span style={{ fontSize: 11, color: '#15803D', fontWeight: 600 }}>
                        ✓ Verified for complaint submission
                      </span>
                      <button
                        type="button"
                        onClick={retakePhoto}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6B7280',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Retake photo
                      </button>
                    </div>
                  </div>
                )}

                {/* Case B: No Garbage Detected */}
                {!aiAnalyzing && aiAnalysis?.garbageDetected === 'No' && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', boxShadow: '0 2px 10px rgba(220,38,38,0.08)' }}
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-red-100">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} color="#DC2626" />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#991B1B', letterSpacing: '0.04em' }}>
                          AI IMAGE VERIFICATION
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#991B1B',
                          background: '#FEE2E2',
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        Verification Failed
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#EF4444',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        ✕
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#DC2626' }}>
                        No Visible Garbage Detected
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5, marginBottom: 10 }}>
                      We couldn't identify visible garbage in this photograph. Please capture another photograph of the affected location.
                    </p>

                    {aiAnalysis.observation && (
                      <div className="p-2.5 rounded-xl bg-white/90 border border-red-100 mb-3 text-[11px] text-gray-700">
                        <strong>AI Observation:</strong> "{aiAnalysis.observation}"
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs"
                      style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      <Camera size={15} />
                      <span>Retake Photograph</span>
                    </button>
                  </div>
                )}

                {/* Case C: Uncertain Analysis */}
                {!aiAnalyzing && aiAnalysis?.garbageDetected === 'Uncertain' && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', boxShadow: '0 2px 10px rgba(217,119,6,0.08)' }}
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-100">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} color="#D97706" />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E', letterSpacing: '0.04em' }}>
                          AI IMAGE VERIFICATION
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#92400E',
                          background: '#FEF3C7',
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        Unclear Photo
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={20} color="#D97706" />
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#D97706' }}>
                        ⚠ Unable to Verify
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5, marginBottom: 10 }}>
                      The photograph is unclear or insufficient for accurate analysis. Please capture another photograph with better visibility.
                    </p>

                    {aiAnalysis.observation && (
                      <div className="p-2.5 rounded-xl bg-white/90 border border-amber-100 mb-3 text-[11px] text-gray-700">
                        <strong>AI Observation:</strong> "{aiAnalysis.observation}"
                      </div>
                    )}

                    {manualReviewRequested ? (
                      <div className="p-3 rounded-xl bg-white border border-amber-200 mb-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                          <Check size={14} color="#D97706" />
                          <span>Escalated for Manual Ward Review</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#78350F', margin: 0, lineHeight: 1.4 }}>
                          A municipal ward inspector will verify this site on inspection. You may now complete and submit your complaint.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={retakePhoto}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs"
                          style={{ background: '#D97706', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                          <Camera size={15} />
                          <span>Retake with Better Visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManualReviewRequested(true);
                            if (!wasteType) setWasteType('Mixed Waste');
                            if (!severity) setSeverity('Moderate');
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs"
                          style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', cursor: 'pointer' }}
                        >
                          <span>Request Manual Ward Review (Escalate)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Case D: API Error */}
                {!aiAnalyzing && aiError && (
                  <div className="p-4 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
                      <AlertCircle size={16} />
                      <span>AI Verification Error</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#991B1B', marginBottom: 10 }}>
                      {aiError}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => photoPreview && analyzePhotoWithAI(photoPreview)}
                        className="flex-1 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs"
                      >
                        Retry Analysis
                      </button>
                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="flex-1 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold text-xs"
                      >
                        Retake Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* State C: Initial State (No photo captured & Camera not active) */}
            {!isCameraActive && !photoPreview && (
              <>
                <div
                  className="flex flex-col items-center justify-center py-7 px-4 rounded-2xl transition-all"
                  style={{
                    border: `2px dashed ${photoError ? '#EF4444' : '#D1D5DB'}`,
                    background: photoError ? '#FEF2F2' : 'white',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{
                      background: photoError ? '#FEE2E2' : '#F0FDF4',
                      border: `1px solid ${photoError ? '#FECACA' : '#BBF7D0'}`,
                    }}
                  >
                    <Camera size={26} color={photoError ? '#EF4444' : '#16A34A'} />
                  </div>

                  <span style={{ fontSize: 15, fontWeight: 700, color: photoError ? '#B91C1C' : '#111827', marginBottom: 4 }}>
                    Take a Photo
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      color: photoError ? '#EF4444' : '#6B7280',
                      textAlign: 'center',
                      maxWidth: 260,
                      lineHeight: 1.5,
                      marginBottom: 16,
                    }}
                  >
                    Capture a live photograph of the garbage location. Gallery uploads are not supported.
                  </span>

                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={cameraLoading}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold"
                    style={{
                      background: '#16A34A',
                      color: 'white',
                      fontSize: 14,
                      boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                      border: 'none',
                      cursor: cameraLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {cameraLoading ? (
                      <Loader size={18} className="animate-spin text-white" />
                    ) : (
                      <>
                        <Camera size={18} color="white" />
                        <span>📷 Open Camera</span>
                      </>
                    )}
                  </button>
                </div>

                {cameraError && (
                  <div className="mt-2.5 p-3 rounded-xl flex items-start gap-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <AlertTriangle size={16} color="#DC2626" className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>Camera Access Required</div>
                      <div style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.5, marginTop: 1 }}>{cameraError}</div>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="mt-2 px-3 py-1 rounded-lg bg-red-600 text-white font-semibold text-[11px]"
                      >
                        Retry Camera Permission
                      </button>
                    </div>
                  </div>
                )}

                {photoError && !cameraError && (
                  <div className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>{photoError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Note (Optional) ── */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              📝 Note <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
            </label>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, lineHeight: 1.4 }}>
              Add any extra details about the waste — helpful for GCC sanitation workers.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Waste has been accumulating for 3 days near the school gate, foul odor..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white outline-none resize-none"
              style={{
                border: '1.5px solid #E5E7EB',
                fontSize: 13,
                color: '#111827',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                lineHeight: 1.55,
              }}
            />
            {note.length > 0 && (
              <div className="flex justify-end mt-1">
                <span style={{ fontSize: 10, color: note.length > 200 ? '#EF4444' : '#9CA3AF' }}>
                  {note.length}/200
                </span>
              </div>
            )}
          </div>

          {/* ── Ward Selection ── */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              🏛️ Ward <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(where is the garbage?)</span>
            </label>
            {gpsError && (
              <div className="mb-2 px-3 py-2 rounded-xl flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span style={{ fontSize: 13 }}>⚠️</span>
                <span style={{ fontSize: 11, color: '#B91C1C', lineHeight: 1.5 }}>{gpsError}</span>
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWardDD(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white"
                style={{ border: `1.5px solid ${selectedWard ? '#BBF7D0' : '#E5E7EB'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <span style={{ fontSize: 13, color: selectedWard ? '#111827' : '#9CA3AF', fontWeight: selectedWard ? 500 : 400 }}>
                  {selectedWard ? `Ward #${selectedWard.wardNo} — ${selectedWard.wardName}` : 'Select Ward (required)'}
                </span>
                <ChevronDown size={16} color="#9CA3AF" />
              </button>

              {showWardDD && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                  style={{ border: '1px solid #E5E7EB', maxHeight: 280 }}
                >
                  <button
                    type="button"
                    onClick={handleGPSWard}
                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 flex-shrink-0"
                    style={{ borderBottom: '1.5px solid #F3F4F6' }}
                  >
                    {gpsLoading ? <Loader size={15} color="#3B82F6" className="animate-spin" /> : <MapPin size={15} color="#16A34A" />}
                    <div className="text-left">
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
                        {gpsLoading ? 'Detecting location…' : '📡 Use my current location'}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>Auto-detect your ward via GPS</div>
                    </div>
                  </button>
                  <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: '#F5F5F7' }}>
                      <Search size={12} color="#9CA3AF" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search ward name or number…"
                        value={wardSearch}
                        onChange={e => setWardSearch(e.target.value)}
                        className="flex-1 bg-transparent outline-none"
                        style={{ fontSize: 12, color: '#111827' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredWards.length === 0 && (
                      <div className="px-4 py-6 text-center">
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>No matching wards</span>
                      </div>
                    )}
                    {filteredWards.map(ward => (
                      <button
                        key={ward.wardNo}
                        type="button"
                        onClick={() => {
                          setSelectedWard(ward);
                          setShowWardDD(false);
                          setWardSearch('');
                          setGpsError(null);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <div className="text-left">
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                            Ward #{ward.wardNo} — {ward.wardName}
                          </div>
                          <div style={{ fontSize: 10, color: '#9CA3AF' }}>{ward.zoneName}</div>
                        </div>
                        {selectedWard?.wardNo === ward.wardNo && <CheckCircle2 size={14} color="#16A34A" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedWard && (
              <div className="mt-2 p-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.7 }}>
                  <span style={{ fontWeight: 600, color: '#15803D' }}>Councillor:</span> {selectedWard.councillorName} ({selectedWard.councillorParty}) &nbsp;·&nbsp;
                  <span style={{ fontWeight: 600, color: '#15803D' }}>MLA:</span> {selectedWard.mlaName} &nbsp;·&nbsp;
                  <span style={{ fontWeight: 600, color: '#15803D' }}>MP:</span> {selectedWard.mpName}
                </div>
              </div>
            )}
          </div>

          {/* ── Landmark ── */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              📍 Landmark / Street Address <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Near Bus Stand, Poonamallee High Road"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white outline-none"
              style={{ border: '1.5px solid #E5E7EB', fontSize: 13, color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            />
          </div>

          {/* ── Severity ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>⚠️ Severity Level</label>
              {aiAnalysis?.estimatedSeverity && (
                <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>
                  🤖 Suggested by AI: {aiAnalysis.estimatedSeverity}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {severities.map(s => {
                const cfg = severityConfig[s.id];
                const sel = severity === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id)}
                    className="flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all"
                    style={{
                      background: sel ? cfg.bg : 'white',
                      border: `2px solid ${sel ? cfg.dot : '#E5E7EB'}`,
                      boxShadow: sel ? `0 0 0 3px ${cfg.bg}` : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: sel ? cfg.color : '#374151' }}>{s.id}</div>
                      <div style={{ fontSize: 9, color: sel ? cfg.color : '#9CA3AF' }}>{s.desc}</div>
                    </div>
                    {sel && <CheckCircle2 size={14} color={cfg.dot} className="ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Waste Type ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>🗂️ Waste Type</label>
              {aiAnalysis?.wasteCategory && (
                <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>
                  🤖 AI: {aiAnalysis.wasteCategory}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {wasteTypes.map(w => {
                const sel = wasteType === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWasteType(w.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                    style={{
                      background: sel ? '#16A34A' : 'white',
                      border: `1.5px solid ${sel ? '#16A34A' : '#E5E7EB'}`,
                      fontSize: 11,
                      fontWeight: sel ? 600 : 400,
                      color: sel ? 'white' : '#374151',
                    }}
                  >
                    <span>{w.icon}</span>
                    {w.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Submission Checklist ── */}
          <div className="p-3.5 rounded-2xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              Verification & Submission Checklist
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Live camera photograph captured', done: !!photo },
                {
                  label: isGarbageVerified
                    ? 'Gemini AI Verified: Garbage Detected ✓'
                    : aiAnalysis?.garbageDetected === 'No'
                    ? 'Gemini AI: No Garbage Detected (Retake required)'
                    : aiAnalysis?.garbageDetected === 'Uncertain'
                    ? 'Gemini AI: Unable to verify (Retake required)'
                    : aiAnalyzing
                    ? 'Gemini AI: Analysing photograph...'
                    : 'Gemini AI Verification',
                  done: isGarbageVerified,
                  pending: aiAnalyzing,
                  error: aiAnalysis?.garbageDetected === 'No' || aiAnalysis?.garbageDetected === 'Uncertain',
                },
                { label: 'Ward selected', done: !!selectedWard },
                { label: 'Severity level selected', done: !!severity },
                { label: 'Waste type selected', done: !!wasteType },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: item.done
                        ? '#16A34A'
                        : item.error
                        ? '#EF4444'
                        : item.pending
                        ? '#F59E0B'
                        : '#E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.done ? (
                      <Check size={10} color="white" strokeWidth={3} />
                    ) : item.pending ? (
                      <Loader size={10} color="white" className="animate-spin" />
                    ) : (
                      item.error && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✕</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: item.done
                        ? '#15803D'
                        : item.error
                        ? '#B91C1C'
                        : item.pending
                        ? '#D97706'
                        : '#9CA3AF',
                      fontWeight: item.done ? 600 : 400,
                    }}
                  >
                    {item.label}
                    {!item.done && !item.pending && !item.error && <span style={{ color: '#EF4444' }}> *</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Submit Button ── */}
          <button
            type="button"
            onClick={handleSubmitAttempt}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl"
            style={{
              background: canSubmit ? 'linear-gradient(135deg, #16A34A, #15803D)' : '#E5E7EB',
              color: canSubmit ? 'white' : '#9CA3AF',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: canSubmit ? '0 4px 16px rgba(22,163,74,0.35)' : 'none',
              cursor: sending ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {sending ? (
              <Loader size={18} color="white" className="animate-spin" />
            ) : aiAnalyzing ? (
              <>
                <Loader size={18} color="#9CA3AF" className="animate-spin" />
                <span>AI is analysing photograph...</span>
              </>
            ) : !photo ? (
              <>
                <Camera size={18} />
                <span>Take a Photo to Continue</span>
              </>
            ) : aiAnalysis?.garbageDetected === 'No' ? (
              <>
                <RefreshCw size={16} />
                <span>No Garbage Detected — Retake Photo</span>
              </>
            ) : aiAnalysis?.garbageDetected === 'Uncertain' ? (
              <>
                <RefreshCw size={16} />
                <span>Photo Unclear — Retake Photo</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={canSubmit ? 'white' : '#9CA3AF'}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.559 4.14 1.535 5.875L0 24l6.292-1.514A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.97 0-3.813-.534-5.39-1.462l-.385-.228-4.003.963.98-3.892-.248-.4A9.793 9.793 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                </svg>
                <span>
                  {canSubmit
                    ? 'Submit & Send to GCC'
                    : `Complete ${[!photo, !isGarbageVerified, !selectedWard, !severity, !wasteType].filter(Boolean).length} required step${[!photo, !isGarbageVerified, !selectedWard, !severity, !wasteType].filter(Boolean).length !== 1 ? 's' : ''}`}
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 pb-4">
            <span style={{ fontSize: 11 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>All reports are anonymous — your identity is never shared</span>
          </div>
        </div>
      </div>
    </div>
  );
}
