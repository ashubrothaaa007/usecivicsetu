import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Navigation, Loader, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { severityConfig, Severity } from './data';
import { useComplaints } from './ComplaintsContext';

declare global {
  interface Window { L: any; }
}

function loadLeaflet(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.L) { resolve(); return; }

    // Inject CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Script already injected — wait for it
    const existing = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (existing) {
      if (window.L) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Leaflet load failed')));
      return;
    }

    // Fresh inject
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  severityFilter: Severity | 'All';
  statusFilter: 'All' | 'Unresolved' | 'Resolved';
  selectedComplaintId?: string | null;
}

export function MapView({ severityFilter, statusFilter, selectedComplaintId }: MapViewProps) {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const { complaints, refresh } = useComplaints();

  // Stable refresh wrapper — won't change between renders
  const refreshComplaints = useCallback(() => { refresh(); }, [refresh]);

  // ── Initialize map ONCE ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    loadLeaflet()
      .then(() => {
        if (!mounted || !mapRef.current || mapInstanceRef.current) return;
        const L = window.L;

        // Fix default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const map = L.map(mapRef.current, {
          center: [13.0827, 80.2707],
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        L.control.attribution({ prefix: '© OpenStreetMap', position: 'bottomleft' }).addTo(map);

        mapInstanceRef.current = map;
        setLoading(false);
      })
      .catch(() => {
        if (mounted) {
          setMapError('Map failed to load. Check your internet connection.');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      // Destroy map on unmount so re-mount starts fresh
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // ← empty: run exactly once

  // ── Draw / redraw markers when complaints or filters change ──────────────
  useEffect(() => {
    if (!mapInstanceRef.current || loading) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const filtered = complaints.filter(c => {
      if (severityFilter !== 'All' && c.severity !== severityFilter) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      return true;
    });

    filtered.forEach(complaint => {
      const cfg = severityConfig[complaint.severity];

      // Glow ring
      const glow = L.circleMarker([complaint.lat, complaint.lng], {
        radius: cfg.radius + 10,
        fillColor: cfg.dot,
        fillOpacity: 0.15,
        color: cfg.dot,
        weight: 0,
        interactive: false,
      }).addTo(map);

      // Main dot
      const marker = L.circleMarker([complaint.lat, complaint.lng], {
        radius: cfg.radius,
        fillColor: cfg.dot,
        fillOpacity: 0.9,
        color: 'white',
        weight: 2.5,
      }).addTo(map);

      const popupHtml = `
        <div style="font-family:Inter,sans-serif;min-width:170px;padding:4px 0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-size:10px;font-weight:700;background:${cfg.bg};color:${cfg.color};padding:2px 10px;border-radius:20px">
              ${complaint.severity}
            </span>
            <span style="font-size:10px;color:#9CA3AF">${complaint.timeAgo}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px">${complaint.area}</div>
          <div style="font-size:11px;color:#6B7280;margin-bottom:6px">${complaint.shortAddress}</div>
          <div style="font-size:10px;color:#6B7280;margin-bottom:8px">Ward #${complaint.wardNo} · ${complaint.wasteType}</div>
          <button
            onclick="window._openComplaint('${complaint.id}')"
            style="width:100%;background:#16A34A;color:white;border:none;border-radius:8px;padding:7px 0;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif"
          >
            View Details →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-popup',
        maxWidth: 210,
      });

      markersRef.current.push(glow, marker);
    });

    (window as any)._openComplaint = (id: string) => navigate(`/complaint/${id}`);
  }, [loading, complaints, severityFilter, statusFilter, navigate]);

  // Fly to selected complaint when requested from sidebar
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedComplaintId) return;
    const complaint = complaints.find(c => c.id === selectedComplaintId);
    if (complaint) {
      mapInstanceRef.current.flyTo([complaint.lat, complaint.lng], 15, { animate: true, duration: 1.2 });
    }
  }, [selectedComplaintId, complaints]);

  // ── GPS — only on user tap, no auto-prompt ───────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported in this browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map || !window.L) return;
        const L = window.L;

        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current.dot);
          map.removeLayer(userMarkerRef.current.ring);
        }

        const ring = L.circleMarker([lat, lng], {
          radius: 22, fillColor: '#3B82F6', fillOpacity: 0.18,
          color: '#3B82F6', weight: 1.5, interactive: false,
        }).addTo(map);

        const dot = L.circleMarker([lat, lng], {
          radius: 9, fillColor: '#3B82F6', fillOpacity: 1,
          color: 'white', weight: 3, interactive: false,
        }).addTo(map);

        userMarkerRef.current = { dot, ring };
        const zoom = accuracy < 100 ? 15 : 13;
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
        setGpsLoading(false);
        setGpsEnabled(true);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Location access denied. Enable in browser settings and try again.');
        } else if (err.code === 2) {
          setGpsError('Location unavailable. Check your GPS signal.');
        } else {
          setGpsError('Location request timed out. Try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const totalVisible = complaints.filter(c => {
    if (severityFilter !== 'All' && c.severity !== severityFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    return true;
  }).length;

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: '#EDE9E3', zIndex: 500 }}
        >
          <Loader size={26} color="#F97316" className="animate-spin mb-3" />
          <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
            Loading OpenStreetMap…
          </span>
        </div>
      )}

      {/* Map error */}
      {mapError && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100" style={{ zIndex: 500 }}>
          <span style={{ fontSize: 32 }}>🗺️</span>
          <p style={{ fontSize: 13, color: '#EF4444', marginTop: 12, textAlign: 'center', padding: '0 24px' }}>{mapError}</p>
          <button
            onClick={() => { setMapError(null); setLoading(true); loadLeaflet().then(() => setLoading(false)).catch(() => {}); }}
            style={{ marginTop: 16, padding: '8px 20px', borderRadius: 12, background: '#F97316', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !mapError && totalVisible === 0 && (
        <div
          className="absolute z-[450] flex flex-col items-center justify-center px-6 py-5 rounded-2xl"
          style={{
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            border: '1px solid rgba(0,0,0,0.06)',
            width: 240,
          }}
        >
          <span style={{ fontSize: 36, marginBottom: 8 }}>🗺️</span>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: 4 }}>
            No reports yet
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 1.5 }}>
            Be the first to report garbage in your area. Tap "Report" below.
          </p>
        </div>
      )}

      {/* Live count pill */}
      {!loading && totalVisible > 0 && (
        <div
          className="absolute z-[450] flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
            {totalVisible} citizen report{totalVisible !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>live</span>
        </div>
      )}

      {/* GPS error toast */}
      {gpsError && !loading && (
        <div
          className="absolute z-[500] px-4 py-2.5 rounded-2xl"
          style={{
            bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#1F2937', color: 'white',
            fontSize: 11, fontWeight: 500,
            whiteSpace: 'nowrap', maxWidth: 300,
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
          onClick={() => setGpsError(null)}
        >
          {gpsError}
        </div>
      )}

      {/* Zoom controls */}
      {!loading && (
        <div
          className="absolute flex flex-col gap-1.5"
          style={{ right: 12, bottom: 80, zIndex: 400 }}
          role="group"
          aria-label="Map zoom controls"
        >
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in on map"
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <ZoomIn size={17} color="#374151" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out on map"
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <ZoomOut size={17} color="#374151" />
          </button>
        </div>
      )}

      {/* Refresh button */}
      {!loading && (
        <button
          type="button"
          onClick={refreshComplaints}
          aria-label="Refresh live complaints from server"
          className="absolute flex items-center justify-center rounded-full bg-white transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          style={{
            bottom: 16, left: 12,
            width: 42, height: 42,
            boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
            border: '1px solid rgba(0,0,0,0.08)',
            zIndex: 400,
          }}
          title="Refresh reports"
        >
          <RefreshCw size={16} color="#374151" />
        </button>
      )}

      {/* GPS button */}
      {!loading && (
        <button
          type="button"
          onClick={handleGPS}
          aria-label="Find and center my GPS location"
          className="absolute flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          style={{
            bottom: 16, right: 12,
            width: 46, height: 46,
            background: gpsEnabled ? '#F0FDF4' : 'white',
            border: `1.5px solid ${gpsEnabled ? '#BBF7D0' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
            zIndex: 400,
          }}
          title="Find my location"
        >
          {gpsLoading ? (
            <Loader size={18} color="#3B82F6" className="animate-spin" />
          ) : (
            <Navigation size={18} color={gpsEnabled ? '#16A34A' : '#374151'} />
          )}
        </button>
      )}
    </div>
  );
}
