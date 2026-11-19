import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useComplaints } from './ComplaintsContext';

export function WorstWards() {
  const navigate = useNavigate();
  const { complaints, worstWards } = useComplaints();

  const totalComplaints = complaints.length;
  const activeComplaints = complaints.filter(c => c.status === 'Unresolved').length;
  const maxCount = worstWards[0]?.count || 1;

  return (
    <div className="flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex-shrink-0" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-gray-50">
            <ArrowLeft size={18} color="#374151" />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Worst Wards</h1>
            <p style={{ fontSize: 11, color: '#6B7280' }}>Chennai · Ranked by citizen reports</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Reports', value: totalComplaints, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
            { label: 'Active', value: activeComplaints, color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
            { label: 'Wards', value: '200', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 9, color: item.color, fontWeight: 500, opacity: 0.8 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {worstWards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span style={{ fontSize: 48, marginBottom: 16 }}>📊</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No data yet</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5, maxWidth: 240 }}>
              Rankings will appear once citizens start reporting. Be the first!
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
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, paddingLeft: 4, letterSpacing: '0.08em' }}>
              RANKED BY UNRESOLVED COMPLAINTS
            </div>

            <div className="flex flex-col gap-2">
              {worstWards.map(ward => {
                const isTop3 = ward.rank <= 3;
                const pct = Math.round((ward.count / maxCount) * 100);
                const barColor =
                  ward.rank === 1 ? '#EF4444' :
                  ward.rank === 2 ? '#F97316' :
                  ward.rank === 3 ? '#EAB308' : '#9CA3AF';
                const rankBg =
                  ward.rank === 1 ? 'linear-gradient(135deg, #EF4444, #DC2626)' :
                  ward.rank === 2 ? 'linear-gradient(135deg, #F97316, #EA580C)' :
                  ward.rank === 3 ? 'linear-gradient(135deg, #EAB308, #CA8A04)' :
                  '#F5F5F7';

                return (
                  <div
                    key={ward.rank}
                    className="bg-white rounded-2xl p-3.5"
                    style={{
                      boxShadow: isTop3 ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.05)',
                      border: `1px solid ${isTop3 ? `${barColor}20` : 'rgba(0,0,0,0.04)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: rankBg }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: isTop3 ? 'white' : '#6B7280' }}>
                          {ward.rank}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{ward.wardName}</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: barColor }}>{ward.count}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>Ward #{ward.wardNo} · {ward.zoneName}</span>
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>{ward.pending} pending</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: '#F5F5F7' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: isTop3 ? `linear-gradient(90deg, ${barColor}AA, ${barColor})` : '#D1D5DB',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 mx-1 p-3 rounded-xl flex items-start gap-2" style={{ background: '#FFF7ED', border: '1px solid #FDE68A' }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
                Rankings based on unresolved citizen complaints submitted via Civicsetu Chennai. Updated in real-time.
              </p>
            </div>
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}