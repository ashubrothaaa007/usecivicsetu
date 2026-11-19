import { useNavigate, useParams } from 'react-router';
import gccLogo from '../../assets/gcc-logo.png';
import {
  X, Share2, ThumbsUp, Camera, Loader, CheckCircle2, XCircle,
  RefreshCw, ShieldCheck, MapPin, Navigation, AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import {
  getWardData, buildWhatsAppMessage, severityConfig,
  GCC_WHATSAPP, gccZones, Complaint,
} from './data';
import { useComplaints } from './ComplaintsContext';
import { apiFetchComplaint } from './api';
import { ImageWithFallback } from './ui/image-with-fallback';
import { useState, useEffect, useRef } from 'react';

// ── Haversine distance (metres) ───────────────────────────────────────────────
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DISTANCE_M = 150; // metres — must be within this radius to resolve

// ── Canvas-based image analysis ───────────────────────────────────────────────
type FailReason = 'inappropriate_content' | 'area_appears_unclean' | 'image_too_dark' | 'invalid_image';
interface AnalysisResult { passed: boolean; isNSFW: boolean; reason: FailReason | 'ok'; }

async function analyzeCleanupPhoto(objectUrl: string): Promise<AnalysisResult> {
  return new Promise(resolve => {
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
      const { data: px } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const n = px.length / 4;
      let sumLum = 0, skin = 0, dark = 0, sat = 0;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sumLum += lum;
        const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
        if (r > 95 && g > 40 && b > 20 && hi - lo > 15 && Math.abs(r - g) > 15 && r > g && r > b) skin++;
        if (lum < 55) dark++;
        const s = hi === 0 ? 0 : (hi - lo) / hi;
        if (s > 0.55 && lum > 40 && lum < 200) sat++;
      }
      const avg = sumLum / n;
      if (skin / n > 0.42) { resolve({ passed: false, isNSFW: true, reason: 'inappropriate_content' }); return; }
      if (avg < 18)        { resolve({ passed: false, isNSFW: false, reason: 'image_too_dark' }); return; }
      if (dark / n > 0.58 && sat / n > 0.22 && avg < 85) { resolve({ passed: false, isNSFW: false, reason: 'area_appears_unclean' }); return; }
      resolve({ passed: true, isNSFW: false, reason: 'ok' });
    };
    img.onerror = () => resolve({ passed: false, isNSFW: false, reason: 'invalid_image' });
    img.src = objectUrl;
  });
}

const FAIL_COPY: Record<FailReason, { title: string; body: string; emoji: string }> = {
  inappropriate_content: { emoji: '🚫', title: 'Inappropriate content detected', body: 'This photo contains nudity or explicit material and has been rejected. Please upload a clean area photo.' },
  area_appears_unclean:  { emoji: '⚠️', title: 'Area still appears unclean',     body: 'The photo suggests garbage is still present. Ensure the cleanup is complete, then retake the photo.' },
  image_too_dark:        { emoji: '🔦', title: 'Photo too dark to verify',         body: 'We cannot analyse this image. Take a well-lit photo of the cleaned area.' },
  invalid_image:         { emoji: '❌', title: 'Invalid image',                    body: 'Could not process this file. Please try again with a valid photo.' },
};

// ── Party badge ────────────────────────────────────────────────────────────────
function partyBadge(party: string) {
  const p = (party || '').toUpperCase();
  if (p === 'DMK')    return { bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' };
  if (p === 'AIADMK') return { bg: '#F0FDF4', color: '#15803D', dot: '#16A34A' };
  if (p === 'BJP')    return { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' };
  if (p === 'INC')    return { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' };
  if (p === 'DMDK')   return { bg: '#FEFCE8', color: '#854D0E', dot: '#EAB308' };
  if (p === 'PMK')    return { bg: '#F0FDF4', color: '#166534', dot: '#22C55E' };
  return { bg: '#F5F5F7', color: '#4B5563', dot: '#9CA3AF' };
}

// ── Compact chain node badge ───────────────────────────────────────────────────
function SmallChainNode({ abbr, name, sub, color, textColor }: {
  abbr: string; name: string; sub: string; color: string; textColor: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: textColor, letterSpacing: '0.02em' }}>{abbr}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

// ── Accountability chain — org-chart tree style ───────────────────────────────
function AccountabilityChain({ wardNo, onWhatsApp }: { wardNo: number; onWhatsApp: () => void }) {
  const ward = getWardData(wardNo);
  const zone = gccZones.find(z => z.zoneNo === ward?.zoneNo);

  const cPB  = ward?.councillorParty ? partyBadge(ward.councillorParty) : null;
  const mlaPB = ward?.mlaParty       ? partyBadge(ward.mlaParty)        : null;
  const mpPB  = ward?.mpParty        ? partyBadge(ward.mpParty)         : null;

  // SVG fork/merge control points
  const W = 260, CX = 130, LX = 52, RX = 208, forkY = 32, nodeY = 38;

  return (
    <div style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* Section label */}
      <div style={{ padding: '12px 16px 0' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#B0B8C4', letterSpacing: '0.1em' }}>ACCOUNTABILITY</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 12px 16px' }}>

        {/* Ward pill */}
        <div style={{
          background: '#FFF7ED', border: '2px solid #FDBA74', borderRadius: 16,
          padding: '5px 28px', textAlign: 'center',
          boxShadow: '0 1px 6px rgba(251,146,60,0.18)',
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#C2410C', letterSpacing: '0.08em' }}>Your Ward</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#EA580C', lineHeight: 1.2 }}>Ward #{wardNo}</div>
        </div>

        {/* SVG fork — ward → GCC + Councillor */}
        <svg width="100%" viewBox={`0 0 ${W} ${forkY + nodeY}`} style={{ display: 'block', overflow: 'visible', marginBottom: -6 }}>
          <line x1={CX} y1={0} x2={CX} y2={forkY} stroke="#C9D4E0" strokeWidth="1.5" />
          <path d={`M${CX},${forkY} C${CX},${forkY + 18} ${LX},${forkY + 18} ${LX},${forkY + nodeY}`} fill="none" stroke="#C9D4E0" strokeWidth="1.5" />
          <path d={`M${CX},${forkY} C${CX},${forkY + 18} ${RX},${forkY + 18} ${RX},${forkY + nodeY}`} fill="none" stroke="#C9D4E0" strokeWidth="1.5" />
        </svg>

        {/* Branch row */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'flex-start' }}>

          {/* GCC */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '44%' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '2px solid #93C5FD',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
              <img src={gccLogo} alt="GCC Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1D4ED8', textAlign: 'center' }}>GCC</div>
            <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginBottom: 6 }}>Garbage Authority</div>
            <button onClick={onWhatsApp} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#16A34A,#15803D)',
              boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
            }}>
              <MessageCircle size={9} color="white" />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>WhatsApp</span>
            </button>
          </div>

          {/* Councillor */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '44%' }}>
            {ward?.councillorName ? (
              <>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: cPB ? cPB.bg : '#F5F5F7',
                  border: `2px solid ${cPB ? cPB.dot + '60' : '#E5E7EB'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                }}>
                  <span style={{ fontSize: 20 }}>👤</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.3 }}>
                  {ward.councillorName.split(' ').slice(-2).join(' ')}
                </div>
                {cPB && ward.councillorParty && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, background: cPB.bg, marginTop: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: cPB.dot, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 8, fontWeight: 700, color: cPB.color }}>{ward.councillorParty}</span>
                  </div>
                )}
                <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>Corporator</div>
              </>
            ) : (
              <>
                <AlertTriangle size={38} color="#F59E0B" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textAlign: 'center' }}>Corporator</div>
                <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 600 }}>Vacant</div>
              </>
            )}
          </div>
        </div>

        {/* SVG merge — GCC + Councillor → ZO */}
        <svg width="100%" viewBox={`0 0 ${W} ${forkY + nodeY}`} style={{ display: 'block', overflow: 'visible', marginTop: -6 }}>
          <path d={`M${LX},0 C${LX},${nodeY} ${CX},${nodeY} ${CX},${forkY + nodeY}`} fill="none" stroke="#C9D4E0" strokeWidth="1.5" />
          <path d={`M${RX},0 C${RX},${nodeY} ${CX},${nodeY} ${CX},${forkY + nodeY}`} fill="none" stroke="#C9D4E0" strokeWidth="1.5" />
        </svg>

        {/* ZO */}
        <SmallChainNode
          abbr="ZO"
          name={zone?.zonalOfficer || 'Zonal Officer'}
          sub={`${zone?.designation || 'IAS Officer'} · ${ward?.zoneName || ''}`}
          color="#93C5FD" textColor="#1D4ED8"
        />
        <div style={{ width: 1.5, height: 18, background: '#C9D4E0' }} />

        {/* JHI */}
        <SmallChainNode
          abbr="JHI"
          name={ward?.jhiName || 'Ward Inspector'}
          sub="Ward SWM staff · Monitors collection"
          color="#93C5FD" textColor="#1D4ED8"
        />

        {/* Elected Reps */}
        <div style={{ width: '100%', borderTop: '1px dashed #E5E7EB', marginTop: 14, paddingTop: 12 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#B0B8C4', letterSpacing: '0.09em', textAlign: 'center', marginBottom: 12 }}>
            ELECTED REPRESENTATIVES FOR THIS WARD
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>

            {/* MLA */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '46%' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                background: mlaPB ? mlaPB.bg : '#F5F5F7',
                border: `2.5px solid ${mlaPB ? mlaPB.dot + '70' : '#E5E7EB'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 5,
              }}>
                <span style={{ fontSize: 24 }}>👤</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.3 }}>
                {ward?.mlaName || 'MLA'}
              </div>
              {mlaPB && ward?.mlaParty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: mlaPB.color }}>{ward.mlaParty}</span>
                  <span style={{ fontSize: 9, color: '#9CA3AF' }}>· MLA</span>
                </div>
              )}
            </div>

            {/* MP */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '46%' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                background: mpPB ? mpPB.bg : '#F5F5F7',
                border: `2.5px solid ${mpPB ? mpPB.dot + '70' : '#E5E7EB'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 5,
              }}>
                <span style={{ fontSize: 24 }}>🎖️</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.3 }}>
                {ward?.mpName || 'MP'}
              </div>
              {mpPB && ward?.mpParty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: mpPB.color }}>{ward.mpParty}</span>
                  <span style={{ fontSize: 9, color: '#9CA3AF' }}>· MP</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// ── Pulsing location dot ──────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: color }} />
    </span>
  );
}

// ── Distance badge ─────────────────────────────────────────────────────────────
function fmt(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// ── Main component ─────────────────────────────────────────────────────────────
type VerifyPhase =
  | 'idle'
  | 'locating'          // GPS lookup in progress
  | 'location_ok'       // GPS confirmed near site — camera about to open
  | 'location_far'      // user is too far away
  | 'location_denied'   // GPS denied / unavailable
  | 'analysing'         // photo canvas analysis running
  | 'pass'              // photo verified → resolved
  | 'fail';             // photo analysis failed

export function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { complaints, updateStatus } = useComplaints();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [seenCount, setSeenCount] = useState(0);
  const [hasSeenThis, setHasSeenThis] = useState(false);

  // Verify flow state
  const fileRef = useRef<HTMLInputElement>(null);
  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase>('idle');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [userDistanceM, setUserDistanceM] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const found = complaints.find(c => c.id === id) || null;
    setComplaint(found);
    if (id) {
      apiFetchComplaint(id)
        .then(full => { if (full) setComplaint(full); })
        .catch(e => console.error('Failed to fetch full complaint:', e));
    }
  }, [id, complaints]);

  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100dvh', fontFamily: 'Inter, sans-serif' }}>
        <span style={{ fontSize: 40, marginBottom: 12 }}>🔍</span>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Report not found</p>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>It may have been removed or the link is invalid.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 rounded-2xl" style={{ background: '#16A34A', color: 'white', fontSize: 14, fontWeight: 700 }}>Back to Map</button>
      </div>
    );
  }

  const cfg = severityConfig[complaint.severity];
  const ward = getWardData(complaint.wardNo);

  // ── Location + verify handlers ──────────────────────────────────────────────
  const handleMarkCleanedClick = () => {
    setVerifyPhase('locating');
    setUserDistanceM(null);
    setCapturedUrl(null);
    setAnalysisResult(null);

    if (!navigator.geolocation) {
      setVerifyPhase('location_denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        const dist = haversineM(latitude, longitude, complaint.lat, complaint.lng);
        setUserDistanceM(dist);

        if (dist <= MAX_DISTANCE_M) {
          // Location confirmed — open camera after a brief "confirmed" flash
          setVerifyPhase('location_ok');
          setTimeout(() => {
            setVerifyPhase('idle');           // hide sheet while camera is open
            fileRef.current?.click();
          }, 1200);
        } else {
          setVerifyPhase('location_far');
        }
      },
      () => setVerifyPhase('location_denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    const url = URL.createObjectURL(file);
    setCapturedUrl(url);
    setVerifyPhase('analysing');

    await new Promise(r => setTimeout(r, 700));
    const result = await analyzeCleanupPhoto(url);
    setAnalysisResult(result);

    if (result.passed) {
      updateStatus(complaint.id, 'Resolved');
      setVerifyPhase('pass');
    } else {
      setVerifyPhase('fail');
    }
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    setAnalysisResult(null);
    setVerifyPhase('idle');
    fileRef.current?.click();
  };

  const handleDismiss = () => {
    setCapturedUrl(null);
    setAnalysisResult(null);
    setVerifyPhase('idle');
    setUserDistanceM(null);
  };

  // Misc
  const handleSeenThis = () => { if (!hasSeenThis) { setSeenCount(s => s + 1); setHasSeenThis(true); } };
  const handleFileGCC = () => { window.open(`https://wa.me/${GCC_WHATSAPP}?text=${encodeURIComponent(buildWhatsAppMessage(complaint))}`, '_blank'); };
  const handleShare = () => {
    if (navigator.share) navigator.share({ title: `Garbage at ${complaint.area}`, text: `Unresolved garbage at Ward #${complaint.wardNo}, ${complaint.area}.`, url: window.location.href }).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href);
  };

  const failCopy = analysisResult && analysisResult.reason !== 'ok' ? FAIL_COPY[analysisResult.reason as FailReason] : null;
  const sheetOpen = verifyPhase !== 'idle';

  return (
    <div className="flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* Hidden camera input */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelected} className="hidden" />

      {/* Top bar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{complaint.severity}</span>
          <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: complaint.status === 'Resolved' ? '#F0FDF4' : '#FEF2F2', color: complaint.status === 'Resolved' ? '#16A34A' : '#EF4444' }}>
            {complaint.status}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="p-1.5 rounded-xl bg-gray-50"><Share2 size={16} color="#374151" /></button>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-gray-50"><X size={16} color="#374151" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Location header */}
        <div className="bg-white px-4 pb-3">
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 2 }}>{complaint.area}</h2>
          <div className="flex items-start gap-1.5">
            <span style={{ fontSize: 12 }}>📍</span>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{complaint.shortAddress}</p>
          </div>
        </div>

        {/* Photo */}
        <div className="relative" style={{ height: 220 }}>
          {complaint.image
            ? <img src={complaint.image} alt="Garbage report" className="w-full h-full object-cover" />
            : <ImageWithFallback src="" alt="No photo" className="w-full h-full object-cover" style={{ background: '#F5F5F7' }} />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)' }} />
          {!complaint.image && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{ fontSize: 40 }}>📷</span>
              <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>No photo submitted</span>
            </div>
          )}
          <button onClick={handleSeenThis} className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: hasSeenThis ? '#16A34A' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <ThumbsUp size={14} color={hasSeenThis ? 'white' : '#374151'} />
            <span style={{ fontSize: 12, fontWeight: 600, color: hasSeenThis ? 'white' : '#374151' }}>{hasSeenThis ? 'Seen!' : "I've seen this"}</span>
          </button>
        </div>

        {/* Gemini AI Verification Card */}
        {complaint.aiVerified && (
          <div className="mx-4 mt-3 p-3 rounded-2xl flex items-start gap-2.5" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
            <ShieldCheck size={18} color="#16A34A" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>
                Verified by Google Gemini AI ✓
              </div>
              {complaint.aiObservation && (
                <div style={{ fontSize: 10, color: '#166534', marginTop: 2, lineHeight: 1.4 }}>
                  "{complaint.aiObservation}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info row */}
        <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
          {[
            { value: complaint.reportCount + seenCount, label: 'Reports', color: '#F97316' },
            { value: complaint.daysPending, label: 'Days', color: '#EF4444' },
            { value: complaint.wasteType, label: 'Waste Type', color: '#3B82F6', small: true },
          ].map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-3 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <span style={{ fontSize: item.small ? 11 : 22, fontWeight: 800, color: item.color, textAlign: 'center', lineHeight: 1.3 }}>{item.value}</span>
              <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500, marginTop: 2 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Accountability Chain */}
        <div className="px-4 py-3"><AccountabilityChain wardNo={complaint.wardNo} onWhatsApp={handleFileGCC} /></div>

        {/* Timestamp */}
        <div className="px-4 pb-2 text-center">
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Reported {complaint.time} · Ward #{complaint.wardNo} · {ward?.zoneName}</span>
        </div>

        {/* CTAs */}
        <div className="px-4 pb-6 flex flex-col gap-2.5">
          <button onClick={handleFileGCC} className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 4px 16px rgba(22,163,74,0.40)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.559 4.14 1.535 5.875L0 24l6.292-1.514A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.97 0-3.813-.534-5.39-1.462l-.385-.228-4.003.963.98-3.892-.248-.4A9.793 9.793 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>File GCC Complaint via WhatsApp</span>
          </button>

          {complaint.status === 'Unresolved' && verifyPhase === 'idle' && (
            <button onClick={handleMarkCleanedClick} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white"
              style={{ border: '1.5px solid #E5E7EB' }}>
              <Camera size={17} color="#374151" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>It is Cleaned Up — Mark Resolved</span>
            </button>
          )}

          {complaint.status === 'Resolved' && (
            <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
              style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
              <CheckCircle2 size={17} color="#16A34A" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#15803D' }}>Marked as Resolved ✓</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 py-1">
            <span style={{ fontSize: 12 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 500 }}>All reports are anonymous</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Verification bottom-sheet overlay
      ════════════════════════════════════════════════════════════════════════ */}
      {sheetOpen && (
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{ zIndex: 50, background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
        >
          <div className="bg-white rounded-t-3xl overflow-hidden" style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.22)' }}>

            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* ── PHASE: locating ─────────────────────────────────────────────── */}
            {verifyPhase === 'locating' && (
              <div className="flex flex-col items-center px-6 py-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 relative"
                  style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '2px solid #BFDBFE' }}>
                  <Navigation size={32} color="#3B82F6" />
                  <span className="absolute -bottom-1 -right-1"><PulsingDot color="#3B82F6" /></span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
                  Verifying Your Location
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.65, marginBottom: 16 }}>
                  You must be physically present at <strong style={{ color: '#111827' }}>{complaint.area}</strong> to mark this as resolved.
                </p>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <Loader size={14} color="#3B82F6" className="animate-spin" />
                  <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>Getting GPS coordinates…</span>
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>
                  Allow location access if your browser asks
                </p>
              </div>
            )}

            {/* ── PHASE: location_ok ──────────────────────────────────────────── */}
            {verifyPhase === 'location_ok' && (
              <div className="flex flex-col items-center px-6 py-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '2px solid #BBF7D0' }}>
                  <MapPin size={32} color="#16A34A" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={20} color="#16A34A" />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>Location Confirmed!</h3>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 4 }}>
                  You are within <strong style={{ color: '#111827' }}>{userDistanceM !== null ? fmt(userDistanceM) : '—'}</strong> of the reported site.
                </p>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mt-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <Camera size={14} color="#16A34A" />
                  <span style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>Opening camera to capture proof…</span>
                </div>
              </div>
            )}

            {/* ── PHASE: location_far ─────────────────────────────────────────── */}
            {verifyPhase === 'location_far' && userDistanceM !== null && (
              <div className="flex flex-col items-center px-6 py-8">

                {/* Distance visual */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', border: '2px solid #FECACA' }}>
                    <Navigation size={36} color="#EF4444" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ background: '#EF4444', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{fmt(userDistanceM)} away</span>
                  </div>
                </div>

                <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                  You're Too Far Away
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.65, marginBottom: 16 }}>
                  You need to be within <strong style={{ color: '#111827' }}>{MAX_DISTANCE_M} m</strong> of the site to verify the cleanup. You are currently <strong style={{ color: '#EF4444' }}>{fmt(userDistanceM)}</strong> away.
                </p>

                {/* Distance bar */}
                <div className="w-full rounded-2xl p-4 mb-5" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#991B1B' }}>Your location</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#991B1B' }}>Report site</span>
                  </div>
                  <div className="relative h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                    <div className="absolute left-0 top-0 h-full rounded-full" style={{
                      width: `${Math.min(100, (MAX_DISTANCE_M / userDistanceM) * 100)}%`,
                      background: 'linear-gradient(90deg, #EF4444, #FCA5A5)',
                    }} />
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white"
                      style={{ left: `${Math.min(96, (MAX_DISTANCE_M / userDistanceM) * 100)}%`, background: '#EF4444' }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span style={{ fontSize: 10, color: '#6B7280' }}>0 m</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444' }}>{fmt(userDistanceM)}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <AlertTriangle size={13} color="#DC2626" className="flex-shrink-0 mt-0.5" />
                    <span style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.5 }}>
                      Go to <strong>{complaint.area}</strong> in person and try again when you're at the site.
                    </span>
                  </div>
                </div>

                {/* Where is the site? mini map hint */}
                <div className="w-full rounded-2xl p-3 mb-5 flex items-center gap-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                    <MapPin size={18} color="#3B82F6" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Report Site</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{complaint.shortAddress}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>Ward #{complaint.wardNo} · {complaint.area}</div>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
                  style={{ background: '#F5F5F7', border: '1px solid #E5E7EB' }}
                >
                  <XCircle size={16} color="#374151" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Go Back</span>
                </button>
              </div>
            )}

            {/* ── PHASE: location_denied ──────────────────────────────────────── */}
            {verifyPhase === 'location_denied' && (
              <div className="flex flex-col items-center px-6 py-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '2px solid #FDE68A' }}>
                  <MapPin size={32} color="#D97706" />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                  Location Access Required
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.65, marginBottom: 16 }}>
                  GPS is needed to confirm you're physically at the site before marking it as resolved. Without location, verification cannot proceed.
                </p>
                <div className="w-full rounded-2xl p-4 mb-5" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
                  <p style={{ fontSize: 11, color: '#78350F', lineHeight: 1.7 }}>
                    <strong>How to enable location:</strong><br />
                    📱 <strong>Android:</strong> Settings → Apps → Browser → Permissions → Location<br />
                    🍎 <strong>iPhone:</strong> Settings → Privacy → Location Services → Safari
                  </p>
                </div>
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={handleMarkCleanedClick}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
                  >
                    <Navigation size={16} color="white" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Try Again</span>
                  </button>
                  <button onClick={handleDismiss} className="w-full py-3 rounded-2xl flex items-center justify-center"
                    style={{ background: '#F5F5F7', border: '1px solid #E5E7EB' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── PHASE: analysing ────────────────────────────────────────────── */}
            {verifyPhase === 'analysing' && (
              <div className="flex flex-col items-center px-6 py-10">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-5 relative"
                  style={{ border: '3px solid #BFDBFE' }}>
                  {capturedUrl
                    ? <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: '#EFF6FF' }}><Camera size={32} color="#3B82F6" /></div>}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.25)' }}>
                    <Loader size={28} color="white" className="animate-spin" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Verifying photo…</span>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {[
                    { icon: <MapPin size={12} color="#16A34A" />, label: 'Location verified ✓', done: true },
                    { icon: <ShieldCheck size={12} color="#3B82F6" />, label: 'Checking content safety…', done: false },
                    { icon: <Camera size={12} color="#9CA3AF" />,    label: 'Analysing cleanliness…', done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                      style={{ background: step.done ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${step.done ? '#BBF7D0' : '#E5E7EB'}` }}>
                      {step.icon}
                      <span style={{ fontSize: 12, fontWeight: 600, color: step.done ? '#15803D' : '#6B7280' }}>{step.label}</span>
                      {!step.done && <Loader size={10} color="#9CA3AF" className="animate-spin ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PHASE: pass ─────────────────────────────────────────────────── */}
            {verifyPhase === 'pass' && (
              <div className="flex flex-col items-center px-6 py-8">
                <div className="w-full grid grid-cols-2 gap-2 mb-6">
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
                    {capturedUrl && <img src={capturedUrl} alt="After" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0" style={{ background: 'rgba(22,163,74,0.12)' }} />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg" style={{ background: '#16A34A' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>AFTER ✓</span>
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 6px 24px rgba(22,163,74,0.4)' }}>
                  <CheckCircle2 size={34} color="white" strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 6 }}>
                  Cleanup Verified! 🎉
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 4 }}>
                  Location ✓ &nbsp;·&nbsp; Photo ✓ &nbsp;·&nbsp; Content safe ✓
                </p>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                  Ward #{complaint.wardNo} has been marked as <strong style={{ color: '#16A34A' }}>Resolved</strong>.
                </p>
                <button onClick={() => navigate('/')} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 4px 16px rgba(22,163,74,0.35)' }}>
                  <CheckCircle2 size={16} color="white" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Done — Back to Map</span>
                </button>
              </div>
            )}

            {/* ── PHASE: fail ─────────────────────────────────────────────────── */}
            {verifyPhase === 'fail' && failCopy && (
              <div className="flex flex-col items-center px-6 py-8">
                {capturedUrl && (
                  <div className="w-full rounded-2xl overflow-hidden relative mb-5" style={{ height: 140 }}>
                    <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: analysisResult?.isNSFW ? 'rgba(239,68,68,0.45)' : 'rgba(245,158,11,0.3)' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="px-3 py-1.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <XCircle size={14} color="white" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Verification Failed</span>
                      </div>
                    </div>
                  </div>
                )}
                <span style={{ fontSize: 36, lineHeight: 1, marginBottom: 10 }}>{failCopy.emoji}</span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 6 }}>{failCopy.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.65, marginBottom: 4 }}>{failCopy.body}</p>
                <div className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl mb-5"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <XCircle size={13} color="#EF4444" />
                  <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>Report remains <strong>Unresolved</strong> — no changes saved</span>
                </div>
                <div className="w-full flex flex-col gap-2">
                  <button onClick={handleRetake} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}>
                    <Camera size={17} color="white" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Retake Photo</span>
                  </button>
                  <button onClick={handleDismiss} className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                    style={{ background: '#F5F5F7', border: '1px solid #E5E7EB' }}>
                    <RefreshCw size={15} color="#374151" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Cancel</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}