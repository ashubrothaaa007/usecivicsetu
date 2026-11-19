import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, MapPin, ChevronRight, RefreshCw, Map, List } from 'lucide-react';
import { severityConfig } from './data';
import { useComplaints } from './ComplaintsContext';

export function ListView() {
  const navigate = useNavigate();
  const { complaints, loading, refresh } = useComplaints();
  const [query, setQuery] = useState('');

  const filtered = complaints.filter(c =>
    query.trim() === '' ||
    c.area.toLowerCase().includes(query.toLowerCase()) ||
    c.shortAddress.toLowerCase().includes(query.toLowerCase()) ||
    String(c.wardNo).includes(query)
  );

  const todayComplaints = filtered.filter(c => c.time.startsWith('Today'));
  const earlierComplaints = filtered.filter(c => !c.time.startsWith('Today'));

  return (
    <div className="flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex-shrink-0" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-gray-50 border border-gray-200">
              <ArrowLeft size={18} color="#374151" />
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>All Reports</h1>
              <p style={{ fontSize: 11, color: '#6B7280' }}>
                {complaints.length} {complaints.length === 1 ? 'complaint' : 'complaints'} · Greater Chennai
              </p>
            </div>
          </div>

          {/* Segmented [ Map | List ] switch */}
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
            <button
              type="button"
              onClick={() => navigate('/')}
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
              <Map size={13} color="#6B7280" />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Map</span>
            </button>
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
              <List size={13} color="#16A34A" />
              <span style={{ fontSize: 11, fontWeight: 700 }}>List</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#F5F5F7', border: '1px solid #E5E7EB' }}>
          <Search size={14} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search by area, ward, address…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: '#111827' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span style={{ fontSize: 48, marginBottom: 16 }}>🗑️</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No reports yet</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5, maxWidth: 240 }}>
              Be the first to report a garbage issue in your area.
            </p>
            <button
              onClick={() => navigate('/report')}
              className="mt-6 px-6 py-3 rounded-2xl"
              style={{ background: '#F97316', color: 'white', fontSize: 14, fontWeight: 700 }}
            >
              Report Now
            </button>
          </div>
        ) : (
          <>
            {filtered.length === 0 && query && (
              <div className="text-center py-10">
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>No results for "{query}"</p>
              </div>
            )}

            {/* Today */}
            {todayComplaints.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, paddingLeft: 4, letterSpacing: '0.08em' }}>
                  TODAY — {todayComplaints.length} REPORT{todayComplaints.length !== 1 ? 'S' : ''}
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {todayComplaints.map((c, i) => {
                    const cfg = severityConfig[c.severity];
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/complaint/${c.id}`)}
                        className="w-full bg-white rounded-2xl p-3.5 text-left"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{c.area}</span>
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                                  {c.severity}
                                </span>
                                <ChevronRight size={13} color="#D1D5DB" />
                              </div>
                            </div>
                            <div className="flex items-start gap-1 mb-1.5">
                              <MapPin size={10} color="#9CA3AF" className="flex-shrink-0 mt-0.5" />
                              <span style={{ fontSize: 11, color: '#6B7280' }} className="truncate">{c.shortAddress}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{c.timeAgo}</span>
                              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>Ward #{c.wardNo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                              <span style={{ fontSize: 9, fontWeight: 600, color: '#15803D' }}>🏛️ {c.wardName}</span>
                              <span style={{ fontSize: 9, color: '#86EFAC' }}>·</span>
                              <span style={{ fontSize: 9, color: '#86EFAC', marginLeft: 'auto' }}>{c.wasteType}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Earlier */}
            {earlierComplaints.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, paddingLeft: 4, letterSpacing: '0.08em' }}>
                  EARLIER — {earlierComplaints.length} REPORT{earlierComplaints.length !== 1 ? 'S' : ''}
                </div>
                <div className="flex flex-col gap-2">
                  {earlierComplaints.map((c, i) => {
                    const cfg = severityConfig[c.severity];
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/complaint/${c.id}`)}
                        className="w-full bg-white rounded-2xl p-3.5 text-left"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F5F7' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
                              {String(todayComplaints.length + i + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{c.area}</span>
                              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                                {c.severity}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }} className="truncate">{c.shortAddress}</div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{c.timeAgo}</span>
                              <span style={{ fontSize: 10, color: '#6B7280' }}>Ward #{c.wardNo}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}