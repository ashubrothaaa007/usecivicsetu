import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronDown,
  Plus,
  BarChart2,
  List,
  Map,
  Smartphone,
  MapPin,
  ChevronRight,
  X,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { MapView } from './MapView';
import { Severity } from './data';
import { useComplaints } from './ComplaintsContext';
import { useIsMobile } from './ui/use-mobile';
import { QRCodeSVG } from './QRCode';

const severityStyles: Record<Severity, { bg: string; color: string; border: string }> = {
  Critical: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  Severe: { bg: '#FFF1F2', color: '#E11D48', border: '#FFE4E6' },
  Moderate: { bg: '#FFF7ED', color: '#EA580C', border: '#FFEDD5' },
  Minor: { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' },
};

const severityDotColor: Record<Severity, string> = {
  Critical: '#DC2626',
  Severe: '#EF4444',
  Moderate: '#F97316',
  Minor: '#EAB308',
};

const translations = {
  en: {
    brandSubtitle: 'Chennai Civic Reporting Platform',
    liveSynced: 'LIVE · synced',
    allSeverity: 'All Severity',
    minor: 'Minor',
    moderate: 'Moderate',
    severe: 'Severe',
    critical: 'Critical',
    allStatus: 'All Status',
    all: 'All',
    unresolved: 'Unresolved',
    resolved: 'Resolved',
    noReports: 'No reports',
    active: 'Active',
    total: 'Total',
    list: 'List',
    map: 'Map',
    reports: 'REPORTS',
    noReportsMatch: 'No reports match filter',
    ward: 'Ward',
    legend: 'LEGEND',
    reportGarbage: 'Report Garbage',
    scanQrToReport: 'Scan QR to Report',
    scanQrModalTitle: 'Report from your phone',
    scanQrModalDesc: 'Scan this QR code to open Civicsetu on your phone and report garbage with a live photo.',
    leaderboardTitle: 'Ward Leaderboard',
    aboutTitle: 'Civicsetu',
    aboutDesc: 'Civicsetu is a Chennai-based platform to report garbage and public issues quickly and easily with Gemini AI verification.',
    community: 'Community',
    close: 'Close',
  },
  ta: {
    brandSubtitle: 'சென்னை குடிமைப் புகார் தளம்',
    liveSynced: 'நேரலை · ஒத்திசைக்கப்பட்டது',
    allSeverity: 'அனைத்து தீவிரம்',
    minor: 'குறைந்த',
    moderate: 'நடுத்தர',
    severe: 'தீவிர',
    critical: 'மிகத் தீவிர',
    allStatus: 'அனைத்து நிலை',
    all: 'அனைத்தும்',
    unresolved: 'தீர்க்கப்படாதவை',
    resolved: 'தீர்க்கப்பட்டவை',
    noReports: 'புகார்கள் இல்லை',
    active: 'செயலில்',
    total: 'மொத்தம்',
    list: 'பட்டியல்',
    map: 'வரைபடம்',
    reports: 'புகார்கள்',
    noReportsMatch: 'வடிகட்டலுக்கு ஏற்ற புகார்கள் இல்லை',
    ward: 'வார்டு',
    legend: 'குறியீடுகள்',
    reportGarbage: 'குப்பையைப் புகாரளிக்கவும்',
    scanQrToReport: 'QR குறியீட்டை ஸ்கேன் செய்யவும்',
    scanQrModalTitle: 'உங்கள் போனில் இருந்து புகாரளிக்கவும்',
    scanQrModalDesc: 'உங்கள் போனில் Civicsetu-வை திறந்து நேரடி புகைப்படத்துடன் குப்பையைப் புகாரளிக்க இந்த QR குறியீட்டை ஸ்கேன் செய்யவும்.',
    leaderboardTitle: 'வார்டு புள்ளிவிவரம்',
    aboutTitle: 'Civicsetu',
    aboutDesc: 'Civicsetu என்பது சென்னையில் குப்பை மற்றும் பொதுச் சுகாதாரப் பிரச்சினைகளை ஜெமினி AI சரிபார்ப்புடன் விரைவாகவும் எளிதாகவும் புகாரளிப்பதற்கான தளமாகும்.',
    community: 'சமூகம்',
    close: 'மூடு',
  },
};

const getSeverityLabel = (s: Severity | 'All', lang: 'en' | 'ta') => {
  if (s === 'All') return translations[lang].allSeverity;
  if (s === 'Minor') return translations[lang].minor;
  if (s === 'Moderate') return translations[lang].moderate;
  if (s === 'Severe') return translations[lang].severe;
  if (s === 'Critical') return translations[lang].critical;
  return s;
};

const getStatusLabel = (s: 'All' | 'Unresolved' | 'Resolved', lang: 'en' | 'ta') => {
  if (s === 'All') return translations[lang].allStatus;
  if (s === 'Unresolved') return translations[lang].unresolved;
  if (s === 'Resolved') return translations[lang].resolved;
  return s;
};

export function HomeScreen() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unresolved' | 'Resolved'>('All');
  const [showSevDD, setShowSevDD] = useState(false);
  const [showStsDD, setShowStsDD] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const [lang, setLang] = useState<'en' | 'ta'>(() => {
    try {
      return (localStorage.getItem('civicsetu_lang') as 'en' | 'ta') || 'en';
    } catch {
      return 'en';
    }
  });

  const handleLangChange = (newLang: 'en' | 'ta') => {
    setLang(newLang);
    try {
      localStorage.setItem('civicsetu_lang', newLang);
    } catch {
      // ignore
    }
  };

  const t = translations[lang];

  const sevRef = useRef<HTMLDivElement>(null);
  const stsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (sevRef.current && !sevRef.current.contains(target)) {
        setShowSevDD(false);
      }
      if (stsRef.current && !stsRef.current.contains(target)) {
        setShowStsDD(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const { complaints, lastSynced } = useComplaints();

  const stats = {
    total: complaints.length,
    active: complaints.filter(c => c.status === 'Unresolved').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  const syncLabel = lastSynced
    ? lastSynced.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : null;

  const severities: (Severity | 'All')[] = ['All', 'Minor', 'Moderate', 'Severe', 'Critical'];
  const statuses: ('All' | 'Unresolved' | 'Resolved')[] = ['All', 'Unresolved', 'Resolved'];

  const filteredComplaints = complaints.filter(c => {
    if (severityFilter !== 'All' && c.severity !== severityFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    return true;
  });

  const targetReportUrl = 'https://usecivicsetu.vercel.app/';

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        background: '#F5F5F7',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ——— About Bottom Sheet ——— */}
      {showAbout && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowAbout(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: 'white',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 32px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: '#D1D5DB',
                margin: '0 auto 20px',
              }}
            />

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <img
                src="/logo.png"
                alt="Civicsetu"
                style={{
                  height: 36,
                  width: 'auto',
                  margin: '0 auto 6px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {t.brandSubtitle}
              </div>
            </div>

            <div
              style={{
                background: '#F0FDF4',
                border: '1.5px solid #BBF7D0',
                borderRadius: 16,
                padding: '14px 16px',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  color: '#166534',
                  lineHeight: 1.7,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {t.aboutDesc}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 20,
              }}
            >
              <a
                href="https://chat.whatsapp.com/DKK4E5qF4zP5aQ0S5z3Q0q"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(37,211,102,0.35)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>{t.community}</span>
              </a>

              <a
                href="https://x.com/civicsetuch?s=21"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.213 5.571zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>@civicsetuch</span>
              </a>

              <a
                href="https://www.linkedin.com/company/civicsetu-ch/about/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: '#0A66C2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(10,102,194,0.35)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>LinkedIn</span>
              </a>
            </div>

            <button
              onClick={() => {
                setShowAbout(false);
                navigate('/admin');
              }}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 16,
                background: '#0F172A',
                color: '#34D399',
                fontSize: 13,
                fontWeight: 700,
                border: '1px solid #1E293B',
                cursor: 'pointer',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <ShieldCheck size={16} /> Official GCC Admin Console
            </button>

            <button
              onClick={() => setShowAbout(false)}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 16,
                background: '#111827',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* ——— Scan QR Modal (Desktop) ——— */}
      {showQRModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={() => setShowQRModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'white',
              borderRadius: 24,
              padding: '24px 24px 24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
              border: '1px solid #E5E7EB',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top-right close button */}
            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 16,
                background: '#F3F4F6',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
            >
              <X size={15} color="#6B7280" />
            </button>

            {/* Green Squircle Phone Badge */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Smartphone size={24} color="white" strokeWidth={2.2} />
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#111827',
                marginBottom: 8,
              }}
            >
              {t.scanQrModalTitle}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: 13,
                color: '#6B7280',
                lineHeight: 1.5,
                maxWidth: 320,
                margin: '0 auto 18px',
              }}
            >
              {t.scanQrModalDesc}
            </p>

            {/* QR Code Container */}
            <div
              style={{
                display: 'inline-block',
                background: 'white',
                padding: 12,
                borderRadius: 18,
                border: '1.5px solid #E5E7EB',
                boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                marginBottom: 10,
              }}
            >
              <QRCodeSVG value={targetReportUrl} size={190} />
            </div>

            {/* URL text underneath QR code */}
            <div
              style={{
                fontSize: 12,
                color: '#6B7280',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                marginBottom: 20,
                wordBreak: 'break-all',
              }}
            >
              {targetReportUrl}
            </div>

            {/* Full-width Close Button */}
            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 14,
                background: '#F3F4F6',
                color: '#111827',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* ——— Top Header ——— */}
      <div
        style={{
          background: 'white',
          padding: '10px 16px',
          flexShrink: 0,
          boxShadow: '0 1px 0 rgba(0,0,0,0.07)',
          zIndex: 1100,
          position: 'relative',
        }}
      >
        {isMobile ? (
          /* ——— Mobile 2-Row Responsive Header (Reference Image 2) ——— */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Row 1: Brand on left, Language toggle + Active/Total badge on right */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {/* Brand */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowAbout(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <img
                  src="/logo.png"
                  alt="Civicsetu"
                  style={{
                    height: 24,
                    width: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
                {syncLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#22C55E',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                    <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>
                      {t.liveSynced} {syncLabel}
                    </span>
                  </div>
                )}
              </button>

              {/* Right: Language toggle + Active / Total badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Language toggle: [ EN | த ] */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    background: '#F3F4F6',
                    padding: 2,
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleLangChange('en');
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      background: lang === 'en' ? '#16A34A' : 'transparent',
                      color: lang === 'en' ? 'white' : '#6B7280',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleLangChange('ta');
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      background: lang === 'ta' ? '#16A34A' : 'transparent',
                      color: lang === 'ta' ? 'white' : '#6B7280',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    த
                  </button>
                </div>

                {/* Active / Total counter pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: stats.total === 0 ? '#F9FAFB' : '#FFF1F2',
                    border: `1px solid ${stats.total === 0 ? '#E5E7EB' : '#FECACA'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#EF4444',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: stats.total === 0 ? '#9CA3AF' : '#DC2626',
                    }}
                  >
                    {stats.total === 0 ? t.noReports : `${stats.active} ${t.active}`}
                  </span>
                  {stats.total > 0 && (
                    <>
                      <span style={{ fontSize: 10, color: '#D1D5DB' }}>·</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#4B5563' }}>
                        {stats.total} {t.total}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: All Severity ∨, All Status ∨, and Segmented [ Map | List ] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              {/* Severity filter (Mobile) */}
              <div ref={sevRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowSevDD(v => !v);
                    setShowStsDD(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    padding: '7px 9px',
                    borderRadius: 12,
                    background: severityFilter !== 'All' ? '#DCFCE7' : '#FFFFFF',
                    border: `1px solid ${severityFilter !== 'All' ? '#86EFAC' : '#E5E7EB'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: severityFilter !== 'All' ? '#15803D' : '#374151',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getSeverityLabel(severityFilter, lang)}
                  </span>
                  <ChevronDown
                    size={13}
                    color={severityFilter !== 'All' ? '#15803D' : '#9CA3AF'}
                    style={{
                      transform: showSevDD ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {showSevDD && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      minWidth: 140,
                      background: 'white',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      zIndex: 3000,
                    }}
                  >
                    {severities.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSeverityFilter(s);
                          setShowSevDD(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: s === severityFilter ? 700 : 400,
                          color: s === severityFilter ? '#16A34A' : '#374151',
                          background: s === severityFilter ? '#F0FDF4' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid #F9FAFB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{getSeverityLabel(s, lang)}</span>
                        {s === severityFilter && <Check size={12} color="#16A34A" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status filter (Mobile) */}
              <div ref={stsRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowStsDD(v => !v);
                    setShowSevDD(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    padding: '7px 9px',
                    borderRadius: 12,
                    background: statusFilter !== 'All' ? '#DCFCE7' : '#FFFFFF',
                    border: `1px solid ${statusFilter !== 'All' ? '#86EFAC' : '#E5E7EB'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusFilter !== 'All' ? '#15803D' : '#374151',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getStatusLabel(statusFilter, lang)}
                  </span>
                  <ChevronDown
                    size={13}
                    color={statusFilter !== 'All' ? '#15803D' : '#9CA3AF'}
                    style={{
                      transform: showStsDD ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {showStsDD && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      minWidth: 140,
                      background: 'white',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      zIndex: 3000,
                    }}
                  >
                    {statuses.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setStatusFilter(s);
                          setShowStsDD(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: s === statusFilter ? 700 : 400,
                          color: s === statusFilter ? '#16A34A' : '#374151',
                          background: s === statusFilter ? '#F0FDF4' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid #F9FAFB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{getStatusLabel(s, lang)}</span>
                        {s === statusFilter && <Check size={12} color="#16A34A" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Segmented [ Map | List ] toggle (Mobile) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                {/* Map (Active) */}
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 9px',
                    borderRadius: 10,
                    background: 'white',
                    border: '1.5px solid #16A34A',
                    color: '#16A34A',
                    cursor: 'default',
                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.12)',
                  }}
                >
                  <Map size={13} color="#16A34A" />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{t.map}</span>
                </button>

                {/* List (Navigates to /list) */}
                <button
                  type="button"
                  onClick={() => navigate('/list')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 9px',
                    borderRadius: 10,
                    background: 'transparent',
                    border: '1.5px solid transparent',
                    color: '#6B7280',
                    cursor: 'pointer',
                  }}
                >
                  <List size={13} color="#6B7280" />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{t.list}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ——— Desktop Single-Row Header ——— */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            {/* Brand */}
            <button
              onClick={e => {
                e.stopPropagation();
                setShowAbout(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <img
                src="/logo.png"
                alt="Civicsetu"
                style={{
                  height: 28,
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              {syncLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#22C55E',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>
                    {t.liveSynced} {syncLabel}
                  </span>
                </div>
              )}
            </button>

            {/* Desktop Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Language toggle: [ EN | த ] */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  background: '#F3F4F6',
                  padding: 2,
                  border: '1px solid #E5E7EB',
                }}
              >
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleLangChange('en');
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    background: lang === 'en' ? '#16A34A' : 'transparent',
                    color: lang === 'en' ? 'white' : '#6B7280',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleLangChange('ta');
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    background: lang === 'ta' ? '#16A34A' : 'transparent',
                    color: lang === 'ta' ? 'white' : '#6B7280',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  த
                </button>
              </div>

              {/* Severity filter (Desktop) */}
              <div ref={sevRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowSevDD(v => !v);
                    setShowStsDD(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 12,
                    background: severityFilter !== 'All' ? '#DCFCE7' : '#FFFFFF',
                    border: `1px solid ${severityFilter !== 'All' ? '#86EFAC' : '#E5E7EB'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: severityFilter !== 'All' ? '#15803D' : '#374151',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getSeverityLabel(severityFilter, lang)}
                  </span>
                  <ChevronDown
                    size={12}
                    color={severityFilter !== 'All' ? '#15803D' : '#9CA3AF'}
                    style={{
                      transform: showSevDD ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </button>
                {showSevDD && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      minWidth: 140,
                      background: 'white',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      zIndex: 2000,
                    }}
                  >
                    {severities.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSeverityFilter(s);
                          setShowSevDD(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: s === severityFilter ? 700 : 400,
                          color: s === severityFilter ? '#16A34A' : '#374151',
                          background: s === severityFilter ? '#F0FDF4' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid #F9FAFB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{getSeverityLabel(s, lang)}</span>
                        {s === severityFilter && <Check size={12} color="#16A34A" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status filter (Desktop) */}
              <div ref={stsRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowStsDD(v => !v);
                    setShowSevDD(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 12,
                    background: statusFilter !== 'All' ? '#DCFCE7' : '#FFFFFF',
                    border: `1px solid ${statusFilter !== 'All' ? '#86EFAC' : '#E5E7EB'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusFilter !== 'All' ? '#15803D' : '#374151',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getStatusLabel(statusFilter, lang)}
                  </span>
                  <ChevronDown
                    size={12}
                    color={statusFilter !== 'All' ? '#15803D' : '#9CA3AF'}
                    style={{
                      transform: showStsDD ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </button>
                {showStsDD && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      minWidth: 140,
                      background: 'white',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      zIndex: 2000,
                    }}
                  >
                    {statuses.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setStatusFilter(s);
                          setShowStsDD(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: s === statusFilter ? 700 : 400,
                          color: s === statusFilter ? '#16A34A' : '#374151',
                          background: s === statusFilter ? '#F0FDF4' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid #F9FAFB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{getStatusLabel(s, lang)}</span>
                        {s === statusFilter && <Check size={12} color="#16A34A" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active / Total counter pill (Desktop) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: stats.total === 0 ? '#F5F5F7' : '#FEF2F2',
                  border: `1px solid ${stats.total === 0 ? '#E5E7EB' : '#FECACA'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#EF4444',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: stats.total === 0 ? '#9CA3AF' : '#B91C1C',
                  }}
                >
                  {stats.total === 0 ? t.noReports : `${stats.active} ${t.active}`}
                </span>
                {stats.total > 0 && (
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    {stats.total} {t.total}
                  </span>
                )}
              </div>

              {/* List View button (Desktop) */}
              <button
                type="button"
                onClick={() => navigate('/list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 12,
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                <List size={13} color="#374151" />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{t.list}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ——— Main Body: Split View on Desktop, Map on Mobile ——— */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left Sidebar on Desktop */}
        {!isMobile && (
          <div
            style={{
              width: 380,
              minWidth: 340,
              background: 'white',
              borderRight: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            {/* Header row */}
            <div style={{ padding: '14px 16px 8px' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                }}
              >
                {filteredComplaints.length} {t.reports}
              </div>

              {/* 3 Summary statistics cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div
                  style={{
                    background: '#FFF1F2',
                    border: '1px solid #FFE4E6',
                    borderRadius: 14,
                    padding: '8px 4px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#E11D48', lineHeight: 1.2 }}>
                    {stats.total}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#E11D48', opacity: 0.85, marginTop: 2 }}>
                    {t.total}
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    borderRadius: 14,
                    padding: '8px 4px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#EA580C', lineHeight: 1.2 }}>
                    {stats.active}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#EA580C', opacity: 0.85, marginTop: 2 }}>
                    {t.active}
                  </div>
                </div>

                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #DCFCE7',
                    borderRadius: 14,
                    padding: '8px 4px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', lineHeight: 1.2 }}>
                    {stats.resolved}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', opacity: 0.85, marginTop: 2 }}>
                    {t.resolved}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable list of complaint cards */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {filteredComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF' }}>
                  <span style={{ fontSize: 32 }}>🗑️</span>
                  <p style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{t.noReportsMatch}</p>
                </div>
              ) : (
                filteredComplaints.map(c => {
                  const isSelected = selectedComplaintId === c.id;
                  const cfg = severityStyles[c.severity];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComplaintId(c.id)}
                      onDoubleClick={() => navigate(`/complaint/${c.id}`)}
                      style={{
                        background: 'white',
                        border: isSelected ? '1.5px solid #16A34A' : '1px solid #F3F4F6',
                        borderRadius: 16,
                        padding: '12px 14px',
                        boxShadow: isSelected
                          ? '0 4px 14px rgba(22, 163, 74, 0.15)'
                          : '0 1px 4px rgba(0,0,0,0.04)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Row 1: Status dot + Area title + Severity pill */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background:
                                c.status === 'Resolved'
                                  ? '#16A34A'
                                  : severityDotColor[c.severity],
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.area}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            borderRadius: 999,
                            padding: '2px 8px',
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {getSeverityLabel(c.severity, lang)}
                        </span>
                      </div>

                      {/* Row 2: Location pin + Address */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          color: '#6B7280',
                          marginBottom: 6,
                          paddingLeft: 14,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <MapPin size={11} color="#9CA3AF" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.shortAddress || `${c.wardName || c.area}, Chennai`}
                        </span>
                      </div>

                      {/* Row 3: Date & time + Ward number */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          color: '#9CA3AF',
                          paddingLeft: 14,
                        }}
                      >
                        <span>{c.time || c.timeAgo}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/complaint/${c.id}`);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#6B7280',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            cursor: 'pointer',
                          }}
                        >
                          {t.ward} #{c.wardNo} <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Map View */}
        <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          <MapView
            severityFilter={severityFilter}
            statusFilter={statusFilter}
            selectedComplaintId={selectedComplaintId}
          />

          {/* Floating Legend on top-left of the map */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              zIndex: 500,
              background: 'white',
              borderRadius: 12,
              padding: '10px 14px',
              boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: '#9CA3AF',
                fontWeight: 700,
                letterSpacing: '0.06em',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              {t.legend}
            </div>
            {[
              { color: '#EAB308', label: t.minor },
              { color: '#F97316', label: t.moderate },
              { color: '#EF4444', label: t.severe },
              { color: '#DC2626', label: t.critical },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 10, color: '#374151', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ——— Bottom Action Bar ——— */}
      <div
        style={{
          background: 'white',
          padding: '10px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexShrink: 0,
          boxShadow: '0 -1px 0 rgba(0,0,0,0.06)',
          zIndex: 1100,
        }}
      >
        {!isMobile ? (
          /* Desktop CTA: Full-width green "Scan QR to Report" exactly like reference image */
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '14px 0',
              borderRadius: 16,
              background: '#16A34A',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#15803D')}
            onMouseLeave={e => (e.currentTarget.style.background = '#16A34A')}
          >
            <Smartphone size={19} color="white" strokeWidth={2.2} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
              {t.scanQrToReport}
            </span>
          </button>
        ) : (
          /* Mobile Action Button: Full-width "Report Garbage" */
          <button
            type="button"
            onClick={() => navigate('/report')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 0',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #16A34A, #15803D)',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.40)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} color="white" strokeWidth={2.5} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
              {t.reportGarbage}
            </span>
          </button>
        )}

        {/* Analytics / Worst Wards button */}
        <button
          type="button"
          onClick={() => navigate('/worst-wards')}
          title={t.leaderboardTitle}
          style={{
            width: 52,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            background: '#F9FAFB',
            border: '1.5px solid #E5E7EB',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={e => (e.currentTarget.style.background = '#F9FAFB')}
        >
          <BarChart2 size={20} color="#374151" />
        </button>
      </div>
    </div>
  );
}
