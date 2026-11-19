import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Camera, CheckCircle2, Star, Loader, AlertTriangle, XCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { severityConfig, Complaint } from './data';
import { useComplaints } from './ComplaintsContext';
import { apiFetchComplaint } from './api';
import { useState, useEffect, useRef } from 'react';

// ── Image analysis (client-side, canvas-based) ───────────────────────────────

interface AnalysisResult {
  passed: boolean;
  isNSFW: boolean;
  reason: 'ok' | 'inappropriate_content' | 'area_appears_unclean' | 'image_too_dark' | 'invalid_image';
}

async function analyzeCleanupPhoto(objectUrl: string): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 240;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ passed: true, isNSFW: false, reason: 'ok' }); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const { data: pixels } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelCount = pixels.length / 4;

      let sumLum = 0;
      let skinCount = 0;
      let darkCount = 0;
      let highSatCount = 0; // vivid/saturated pixels (garbage clutter)

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sumLum += lum;

        // Skin-tone detection (broad HSV-like heuristic in RGB space)
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const isSkin =
          r > 95 && g > 40 && b > 20 &&
          maxC - minC > 15 &&
          Math.abs(r - g) > 15 &&
          r > g && r > b;
        if (isSkin) skinCount++;

        // Dark pixels
        if (lum < 55) darkCount++;

        // High-saturation pixels (vivid trash colours: orange, purple, teal)
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        if (sat > 0.55 && lum > 40 && lum < 200) highSatCount++;
      }

      const avgBrightness = sumLum / pixelCount;
      const skinRatio = skinCount / pixelCount;
      const darkRatio = darkCount / pixelCount;
      const satRatio = highSatCount / pixelCount;

      // ── NSFW: excessive skin-tone pixels ──────────────────────────────────
      if (skinRatio > 0.42) {
        resolve({ passed: false, isNSFW: true, reason: 'inappropriate_content' });
        return;
      }

      // ── Blank / pure black photo ──────────────────────────────────────────
      if (avgBrightness < 18) {
        resolve({ passed: false, isNSFW: false, reason: 'image_too_dark' });
        return;
      }

      // ── Unclean heuristic ─────────────────────────────────────────────────
      // Garbage: high dark-pixel ratio AND high colour saturation (litter variety)
      // Clean ground/road: moderate brightness, low saturation variance
      const looksUnclean = darkRatio > 0.58 && satRatio > 0.22 && avgBrightness < 85;
      if (looksUnclean) {
        resolve({ passed: false, isNSFW: false, reason: 'area_appears_unclean' });
        return;
      }

      resolve({ passed: true, isNSFW: false, reason: 'ok' });
    };
    img.onerror = () => resolve({ passed: false, isNSFW: false, reason: 'invalid_image' });
    img.src = objectUrl;
  });
}

// ── Result message map ────────────────────────────────────────────────────────
const REASON_COPY: Record<AnalysisResult['reason'], { title: string; body: string; icon: string }> = {
  ok: {
    title: 'Area looks clean ✓',
    body: 'Photo verified. The cleanup appears to be complete.',
    icon: '✅',
  },
  inappropriate_content: {
    title: 'Inappropriate content detected',
    body: 'This image contains nudity or explicit content and has been rejected. Please upload a valid cleanup photo.',
    icon: '🚫',
  },
  area_appears_unclean: {
    title: 'Area still appears unclean',
    body: 'The photo suggests garbage is still present. Please ensure the cleanup is complete before verifying.',
    icon: '⚠️',
  },
  image_too_dark: {
    title: 'Photo is too dark',
    body: 'We cannot analyse this image. Please take a well-lit photo of the cleaned area.',
    icon: '🔦',
  },
  invalid_image: {
    title: 'Invalid image',
    body: 'Could not process this file. Please try again with a valid photo.',
    icon: '❌',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function VerifyCleanup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [photoRequired, setPhotoRequired] = useState(false);
  const { complaints, updateStatus } = useComplaints();

  useEffect(() => {
    const found = complaints.find(c => c.id === id) || null;
    setComplaint(found);
    if (id) {
      apiFetchComplaint(id)
        .then(full => { if (full) setComplaint(full); })
        .catch(e => console.error('VerifyCleanup: failed to fetch complaint:', e));
    }
  }, [id, complaints]);

  const handleAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoRequired(false);
    setAnalysisDone(false);
    setResult(null);
    setVerifying(true);

    // Build object URL for preview
    const url = URL.createObjectURL(file);
    setAfterPhotoUrl(url);

    // Simulate brief "scanning" UX then analyse
    await new Promise(r => setTimeout(r, 600));

    const analysis = await analyzeCleanupPhoto(url);
    setResult(analysis);
    setVerifying(false);
    setAnalysisDone(true);

    // Reset file input so the same file can be re-selected after retake
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRetake = () => {
    setAfterPhotoUrl(null);
    setResult(null);
    setAnalysisDone(false);
    setVerifying(false);
    fileRef.current?.click();
  };

  const handleConfirm = () => {
    if (!afterPhotoUrl) { setPhotoRequired(true); return; }
    if (!result?.passed) return;
    if (id) updateStatus(id, 'Resolved');
    setConfirmed(true);
    setTimeout(() => navigate('/'), 2600);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50" style={{ minHeight: '100dvh', fontFamily: 'Inter, sans-serif' }}>
        <Loader size={28} color="#16A34A" className="animate-spin mb-4" />
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>Loading report…</p>
      </div>
    );
  }

  const cfg = severityConfig[complaint.severity];

  // ── Success screen ────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center bg-white px-6"
        style={{ minHeight: '100dvh', fontFamily: 'Inter, sans-serif' }}>
        {/* Animated ring */}
        <div className="w-28 h-28 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 8px 36px rgba(22,163,74,0.42)' }}>
          <CheckCircle2 size={52} color="white" strokeWidth={2} />
        </div>
        <h2 style={{ fontSize: 23, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
          Cleanup Verified!
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.65, marginBottom: 22 }}>
          Ward #{complaint.wardNo} cleanup is confirmed. The report has been marked as&nbsp;
          <strong style={{ color: '#16A34A' }}>Resolved</strong>.
        </p>

        {/* Before / After side-by-side */}
        <div className="w-full grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-2xl overflow-hidden relative" style={{ height: 110 }}>
            {complaint.image
              ? <img src={complaint.image} alt="Before" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><span style={{ fontSize: 26 }}>📷</span></div>}
            <div className="absolute inset-0" style={{ background: 'rgba(239,68,68,0.18)' }} />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg" style={{ background: '#EF4444' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>BEFORE</span>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden relative" style={{ height: 110 }}>
            {afterPhotoUrl && <img src={afterPhotoUrl} alt="After" className="w-full h-full object-cover" />}
            <div className="absolute inset-0" style={{ background: 'rgba(22,163,74,0.12)' }} />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg" style={{ background: '#16A34A' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>AFTER ✓</span>
            </div>
          </div>
        </div>

        <div className="w-full p-4 rounded-2xl mb-5" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} color="#16A34A" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>
                Ward #{complaint.wardNo} — {complaint.wardName}
              </div>
              <div style={{ fontSize: 11, color: '#86EFAC' }}>Marked as Resolved · Photo verified</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#9CA3AF' }}>Returning to map…</div>
      </div>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const canConfirm = !!afterPhotoUrl && analysisDone && result?.passed === true;
  const resultCopy = result ? REASON_COPY[result.reason] : null;

  // ── Main verify screen ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-gray-50">
          <ArrowLeft size={20} color="#374151" />
        </button>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Verify Cleanup</h1>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>
            Civic<span style={{ color: '#16A34A' }}>setu</span> · Photo proof required
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <ShieldCheck size={11} color="#3B82F6" />
          <span style={{ fontSize: 9, color: '#2563EB', fontWeight: 600 }}>AI-Verified</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* Original complaint card */}
          <div className="bg-white rounded-2xl p-4"
            style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', marginBottom: 6 }}>
              ORIGINAL COMPLAINT
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
              {complaint.area} — Ward #{complaint.wardNo}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4, marginBottom: 8 }}>
              {complaint.shortAddress}
            </div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded-full"
                style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                {complaint.severity}
              </span>
              <span className="px-2.5 py-1 rounded-full"
                style={{ fontSize: 10, fontWeight: 600, background: '#F5F5F7', color: '#6B7280' }}>
                {complaint.wasteType}
              </span>
            </div>
          </div>

          {/* Before & After */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                📸 Before &amp; After
              </label>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#EF4444', borderRadius: 4, padding: '1px 6px' }}>
                PHOTO REQUIRED
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5, marginBottom: 10 }}>
              Upload a clear photo of the cleaned area. The system will verify it before resolving the complaint.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {/* Before */}
              <div className="rounded-2xl overflow-hidden relative" style={{ height: 130 }}>
                {complaint.image
                  ? <img src={complaint.image} alt="Before" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span style={{ fontSize: 28 }}>📷</span>
                  </div>}
                <div className="absolute inset-0" style={{ background: 'rgba(239,68,68,0.18)' }} />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg" style={{ background: '#EF4444' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>BEFORE</span>
                </div>
              </div>

              {/* After upload zone */}
              <div
                className="rounded-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all"
                style={{
                  height: 130,
                  border: photoRequired
                    ? '2px dashed #EF4444'
                    : afterPhotoUrl
                      ? '2px solid #BBF7D0'
                      : '2px dashed #BBF7D0',
                  background: photoRequired ? '#FEF2F2' : afterPhotoUrl ? 'transparent' : '#F0FDF4',
                }}
                onClick={() => !verifying && (afterPhotoUrl ? handleRetake() : fileRef.current?.click())}
              >
                {verifying ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader size={22} color="#16A34A" className="animate-spin" />
                    <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>Analysing…</span>
                  </div>
                ) : afterPhotoUrl ? (
                  <>
                    <img src={afterPhotoUrl} alt="After" className="w-full h-full object-cover absolute inset-0" />
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.22)' }} />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg"
                      style={{ background: result?.passed ? '#16A34A' : '#EF4444' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>AFTER</span>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1"
                      style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <RefreshCw size={9} color="white" />
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'white' }}>Retake</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={22} color={photoRequired ? '#EF4444' : '#16A34A'} />
                    <span style={{ fontSize: 10, color: photoRequired ? '#EF4444' : '#16A34A', marginTop: 6, fontWeight: 600 }}>
                      {photoRequired ? 'Required!' : 'Add After Photo'}
                    </span>
                    <span style={{ fontSize: 9, color: photoRequired ? '#FCA5A5' : '#86EFAC' }}>
                      {photoRequired ? 'Upload to proceed' : 'Tap to capture'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={handleAfterPhoto} className="hidden" />
          </div>

          {/* Analysis result banner */}
          {analysisDone && result && resultCopy && (
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: result.passed ? '#F0FDF4' : result.isNSFW ? '#FEF2F2' : '#FFFBEB',
                border: `1.5px solid ${result.passed ? '#BBF7D0' : result.isNSFW ? '#FECACA' : '#FDE68A'}`,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{resultCopy.icon}</span>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: result.passed ? '#15803D' : result.isNSFW ? '#B91C1C' : '#92400E',
                  marginBottom: 3,
                }}>
                  {resultCopy.title}
                </div>
                <div style={{
                  fontSize: 11,
                  color: result.passed ? '#166534' : result.isNSFW ? '#991B1B' : '#78350F',
                  lineHeight: 1.55,
                }}>
                  {resultCopy.body}
                </div>
                {!result.passed && (
                  <button
                    onClick={handleRetake}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                    style={{
                      background: result.isNSFW ? '#FEE2E2' : '#FEF3C7',
                      border: `1px solid ${result.isNSFW ? '#FECACA' : '#FDE68A'}`,
                      fontSize: 11, fontWeight: 600,
                      color: result.isNSFW ? '#B91C1C' : '#92400E',
                    }}
                  >
                    <RefreshCw size={11} />
                    Upload a different photo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="bg-white rounded-2xl p-4"
            style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10, textAlign: 'center' }}>
              Rate the Cleanup Quality <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star size={30} color={star <= rating ? '#EAB308' : '#E5E7EB'}
                    fill={star <= rating ? '#EAB308' : 'none'} strokeWidth={1.5} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
                {['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent!'][rating]} cleanup quality
              </div>
            )}
          </div>

          {/* How verification works */}
          <div className="rounded-2xl p-4"
            style={{ background: '#F8FAFF', border: '1px solid #DBEAFE' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', marginBottom: 8 }}>
              🛡️ How photo verification works
            </div>
            <div className="flex flex-col gap-2">
              {[
                { icon: '📸', text: 'A cleanup photo is mandatory to resolve a complaint' },
                { icon: '🔍', text: 'The system analyses brightness, colour and visual clues to confirm cleanliness' },
                { icon: '🚫', text: 'Inappropriate or NSFW images are automatically rejected' },
                { icon: '✅', text: 'Only verified photos unlock the resolve button' },
              ].map(item => (
                <div key={item.icon} className="flex items-start gap-2">
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
                  <span style={{ fontSize: 11, color: '#3B82F6', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleConfirm}
            disabled={verifying}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              background: canConfirm
                ? 'linear-gradient(135deg, #16A34A, #15803D)'
                : '#E5E7EB',
              color: canConfirm ? 'white' : '#9CA3AF',
              fontSize: 15, fontWeight: 700,
              boxShadow: canConfirm ? '0 4px 16px rgba(22,163,74,0.35)' : 'none',
              cursor: verifying ? 'not-allowed' : 'pointer',
            }}
          >
            {verifying ? (
              <>
                <Loader size={18} color="#9CA3AF" className="animate-spin" />
                Verifying photo…
              </>
            ) : canConfirm ? (
              <>
                <CheckCircle2 size={18} color="white" />
                Confirm — It's Cleaned!
              </>
            ) : !afterPhotoUrl ? (
              <>
                <Camera size={18} color="#9CA3AF" />
                Upload After Photo to Proceed
              </>
            ) : analysisDone && !result?.passed ? (
              <>
                <XCircle size={18} color="#9CA3AF" />
                Verification Failed — Retake Photo
              </>
            ) : (
              <>
                <Loader size={18} color="#9CA3AF" className="animate-spin" />
                Verifying…
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 pb-4">
            <span style={{ fontSize: 11 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              Verification helps track GCC accountability
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}