import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MapPin, Loader, AlertTriangle, Lock, Eye } from 'lucide-react';

// Chennai GCC geographic bounds
const CHENNAI_BOUNDS = {
  minLat: 12.78,
  maxLat: 13.35,
  minLng: 79.98,
  maxLng: 80.42,
};

export function isWithinChennai(lat: number, lng: number): boolean {
  return (
    lat >= CHENNAI_BOUNDS.minLat &&
    lat <= CHENNAI_BOUNDS.maxLat &&
    lng >= CHENNAI_BOUNDS.minLng &&
    lng <= CHENNAI_BOUNDS.maxLng
  );
}

export type LocationStatus = 'idle' | 'checking' | 'inside' | 'outside' | 'denied';

interface LocationContextValue {
  locationStatus: LocationStatus;
  coords: { lat: number; lng: number } | null;
  canReport: boolean;
}

const LocationContext = createContext<LocationContextValue>({
  locationStatus: 'idle',
  coords: null,
  canReport: false,
});

export function useLocation() {
  return useContext(LocationContext);
}

function requestGPS(
  onResult: (status: LocationStatus, coords?: { lat: number; lng: number }) => void
) {
  if (!navigator.geolocation) {
    onResult('denied');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (isWithinChennai(latitude, longitude)) {
        onResult('inside', { lat: latitude, lng: longitude });
      } else {
        onResult('outside');
      }
    },
    () => onResult('denied'),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// Shared header used across all gate screens
function GateHeader() {
  return (
    <div
      className="bg-white px-4 py-3 flex items-center gap-2 flex-shrink-0"
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}
    >
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>
          Civic<span style={{ color: '#16A34A' }}>setu</span>
        </div>
        <div style={{ fontSize: 10, color: '#9CA3AF' }}>Chennai Civic Reporting</div>
      </div>
    </div>
  );
}

// ── idle: permission gate (shown before browser prompt fires) ─────────────────
function LocationPermissionGate({ onAllow }: { onAllow: () => void }) {
  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-50"
      style={{ fontFamily: 'Inter, sans-serif', zIndex: 9999 }}
    >
      <GateHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center"
          style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: '#F0FDF4', border: '2px solid #BBF7D0' }}
          >
            <MapPin size={32} color="#16A34A" strokeWidth={2} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            Allow Location Access
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 20 }}>
            Civicsetu is a <strong style={{ color: '#111827' }}>Chennai-only</strong> civic platform.
            We verify your location to ensure only Chennai residents can file garbage reports.
          </p>

          <div
            className="w-full rounded-2xl p-4 mb-5 text-left"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            {[
              { icon: '📍', text: 'Confirm you\'re within Greater Chennai Corporation limits' },
              { icon: '🚫', text: 'Prevent fake reports from outside Chennai' },
              { icon: '🔒', text: 'Your location is never stored or shared' },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-3 mb-2 last:mb-0">
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onAllow}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #16A34A, #15803D)',
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
            }}
          >
            <MapPin size={17} color="white" />
            Allow Location & Continue
          </button>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 10 }}>
            You can still browse existing reports even if outside Chennai
          </p>
        </div>
      </div>
    </div>
  );
}

// ── checking: spinner while GPS resolves ──────────────────────────────────────
function LocationCheckingScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-50"
      style={{ fontFamily: 'Inter, sans-serif', zIndex: 9999 }}
    >
      <GateHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center"
          style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}
          >
            <Loader size={32} color="#3B82F6" className="animate-spin" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            Verifying Your Location
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 6 }}>
            Civicsetu is confirming you're within{' '}
            <strong style={{ color: '#111827' }}>Greater Chennai Corporation</strong> limits.
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
            Please <strong>allow location access</strong> when your browser asks.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── outside: confirmed outside Chennai ────────────────────────────────────────
function OutsideChennaiScreen({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-50"
      style={{ fontFamily: 'Inter, sans-serif', zIndex: 9999 }}
    >
      <GateHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center"
          style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}
          >
            <AlertTriangle size={32} color="#D97706" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            Outside Chennai
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 16 }}>
            Your location is{' '}
            <strong style={{ color: '#111827' }}>outside Greater Chennai Corporation</strong>{' '}
            limits. Only Chennai residents can submit garbage reports.
          </p>
          <div
            className="w-full rounded-2xl p-3 mb-5"
            style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}
          >
            <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
              You can still <strong>browse all existing reports</strong> on the map and
              leaderboard — you just can't submit new ones.
            </p>
          </div>
          <button
            onClick={onBrowse}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
            style={{ background: '#F5F5F7', color: '#374151', fontSize: 14, fontWeight: 700 }}
          >
            <Eye size={16} color="#374151" />
            Browse Reports (View Only)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── denied: GPS denied or unavailable ─────────────────────────────────────────
function LocationDeniedScreen({
  onRetry,
  onBrowse,
  retrying,
}: {
  onRetry: () => void;
  onBrowse: () => void;
  retrying: boolean;
}) {
  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-50"
      style={{ fontFamily: 'Inter, sans-serif', zIndex: 9999 }}
    >
      <GateHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center"
          style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}
          >
            <Lock size={32} color="#3B82F6" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            Location Access Required
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 16 }}>
            To prevent fake reports, Civicsetu{' '}
            <strong style={{ color: '#111827' }}>requires location access</strong> to confirm
            you are physically within Chennai before allowing a report submission.
          </p>

          <div
            className="w-full rounded-2xl p-3 mb-4"
            style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} color="#EF4444" className="flex-shrink-0 mt-0.5" />
              <p style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.6, textAlign: 'left' }}>
                Location was denied or unavailable. Without it, we cannot verify you're in
                Chennai — reporting is disabled.
              </p>
            </div>
          </div>

          <div
            className="w-full rounded-2xl p-3 mb-5 text-left"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <p style={{ fontSize: 11, color: '#166534', lineHeight: 1.7 }}>
              <strong>How to enable:</strong>
              <br />
              📱 <strong>Android:</strong> Settings → Apps → Browser → Permissions → Location
              <br />
              🍎 <strong>iPhone:</strong> Settings → Privacy → Location Services → Safari
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={onRetry}
              disabled={retrying}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
              style={{
                background: '#3B82F6',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                opacity: retrying ? 0.7 : 1,
              }}
            >
              {retrying ? (
                <Loader size={16} color="white" className="animate-spin" />
              ) : (
                <MapPin size={16} color="white" />
              )}
              {retrying ? 'Requesting location…' : 'Try Again'}
            </button>
            <button
              onClick={onBrowse}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
              style={{ background: '#F5F5F7', color: '#374151', fontSize: 14, fontWeight: 600 }}
            >
              <Eye size={16} color="#374151" />
              Browse Reports Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function LocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [browsing, setBrowsing] = useState(false);

  const doRequest = () => {
    setStatus('checking');
    setRetrying(true);
    requestGPS((result, c) => {
      setRetrying(false);
      setStatus(result);
      if (c) setCoords(c);
    });
  };

  const showApp = status === 'inside' || browsing;

  return (
    <LocationContext.Provider value={{ locationStatus: status, coords, canReport: status === 'inside' }}>
      {showApp && children}

      {status === 'idle' && <LocationPermissionGate onAllow={doRequest} />}
      {status === 'checking' && <LocationCheckingScreen />}
      {status === 'outside' && !browsing && <OutsideChennaiScreen onBrowse={() => setBrowsing(true)} />}
      {status === 'denied' && !browsing && (
        <LocationDeniedScreen
          retrying={retrying}
          onRetry={doRequest}
          onBrowse={() => setBrowsing(true)}
        />
      )}
    </LocationContext.Provider>
  );
}