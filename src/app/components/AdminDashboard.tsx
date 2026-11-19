import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ShieldCheck, ArrowLeft, Search, Filter, CheckCircle2, AlertTriangle,
  Clock, MapPin, ExternalLink, LogOut, Lock, RefreshCw, BarChart3,
  Layers, ChevronRight, FileText, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { useComplaints } from './ComplaintsContext';
import { Complaint, Status, Severity, WasteType, gccZones, getWardData, severityConfig } from './data';
import { ImageWithFallback } from './ui/image-with-fallback';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { complaints, refresh, updateStatus, loading } = useComplaints();

  // Authentication state stored in sessionStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('civicsetu_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Login form state
  const [officerId, setOfficerId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | Severity>('All');
  const [selectedWard, setSelectedWard] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'complaints' | 'wards'>('complaints');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    // Secure login gate for GCC Municipal Officers & Admin
    if ((officerId.trim().toLowerCase() === 'admin' || officerId.includes('@')) && passkey === 'gcc2026') {
      try {
        sessionStorage.setItem('civicsetu_admin_auth', 'true');
        sessionStorage.setItem('civicsetu_officer_id', officerId.trim());
      } catch {
        // Fallback for memory
      }
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid Officer ID or Passkey. For municipal evaluation, use Passkey: gcc2026');
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('civicsetu_admin_auth');
      sessionStorage.removeItem('civicsetu_officer_id');
    } catch {}
    setIsAuthenticated(false);
  };

  const handleStatusToggle = async (complaint: Complaint) => {
    const nextStatus: Status = complaint.status === 'Resolved' ? 'Unresolved' : 'Resolved';
    setUpdatingId(complaint.id);
    try {
      await updateStatus(complaint.id, nextStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = complaints.length;
    const unresolved = complaints.filter(c => c.status === 'Unresolved').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const aiVerified = complaints.filter(c => c.aiVerified).length;
    const critical = complaints.filter(c => c.severity === 'Critical' && c.status === 'Unresolved').length;

    // Ward counts
    const wardMap = new Map<number, { wardNo: number; wardName: string; unresolved: number; total: number }>();
    complaints.forEach(c => {
      const existing = wardMap.get(c.wardNo) || { wardNo: c.wardNo, wardName: c.wardName, unresolved: 0, total: 0 };
      existing.total += 1;
      if (c.status === 'Unresolved') existing.unresolved += 1;
      wardMap.set(c.wardNo, existing);
    });

    const wardStats = Array.from(wardMap.values()).sort((a, b) => b.unresolved - a.unresolved);

    return { total, unresolved, resolved, aiVerified, critical, wardStats };
  }, [complaints]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (severityFilter !== 'All' && c.severity !== severityFilter) return false;
      if (selectedWard !== 'All' && c.wardNo.toString() !== selectedWard) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = c.id.toLowerCase().includes(q);
        const matchArea = c.area.toLowerCase().includes(q);
        const matchWard = c.wardName.toLowerCase().includes(q) || c.wardNo.toString().includes(q);
        const matchCategory = c.wasteType.toLowerCase().includes(q);
        if (!matchId && !matchArea && !matchWard && !matchCategory) return false;
      }
      return true;
    });
  }, [complaints, statusFilter, severityFilter, selectedWard, searchQuery]);

  // If not logged in, render the secure authentication gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-950 p-6 text-white flex flex-col items-center border-b border-slate-800">
            <img src="/logo.png" alt="CivicSetu" className="h-8 object-contain mb-3" />
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> GCC Municipal Officer Portal
            </div>
            <h2 className="text-xl font-bold mt-3">Administrative Access</h2>
            <p className="text-xs text-slate-400 text-center mt-1">
              Authorized Greater Chennai Corporation ward sanitation officers and civic administrators
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Officer ID / Email
              </label>
              <input
                type="text"
                value={officerId}
                onChange={e => setOfficerId(e.target.value)}
                placeholder="e.g. ward006@gcc.gov.in"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Security Passkey
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkey}
                  onChange={e => setPasskey(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Evaluation Passkey: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">gcc2026</code>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
            >
              Authenticate & Access Console
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center justify-center gap-1 mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Public Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Return to Public Map"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="CivicSetu" className="h-7 object-contain bg-white/95 rounded px-1.5 py-0.5" />
              <div className="hidden sm:block border-l border-slate-700 pl-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> GCC Sanitation Admin
                </div>
                <div className="text-[11px] text-slate-400">Greater Chennai Corporation Grievance Console</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Sync complaints"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden md:inline">Refresh Data</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Filed</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across all GCC wards</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Unresolved
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{metrics.unresolved}</div>
            <div className="text-[11px] text-amber-700/80 mt-0.5">Action required</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{metrics.resolved}</div>
            <div className="text-[11px] text-emerald-700/80 mt-0.5">Sanitation completed</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-sm">
            <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI-Verified
            </div>
            <div className="text-2xl font-bold text-indigo-900 mt-1">{metrics.aiVerified}</div>
            <div className="text-[11px] text-indigo-700/80 mt-0.5">Gemini Vision pass</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm col-span-2 md:col-span-1">
            <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Critical Priority
            </div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{metrics.critical}</div>
            <div className="text-[11px] text-rose-700/80 mt-0.5">Heavy accumulation</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 mb-6 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('complaints')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'complaints'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Grievance Queue ({filteredComplaints.length})
            </button>
            <button
              onClick={() => setActiveTab('wards')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'wards'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Ward Intelligence & Allocation
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Live GCC Database Connection
          </div>
        </div>

        {activeTab === 'complaints' ? (
          <>
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, Street/Area, Ward name, or Category..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-700"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Unresolved">Unresolved Only</option>
                    <option value="Resolved">Resolved Only</option>
                  </select>

                  <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-700"
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="Severe">Severe</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Minor">Minor</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Complaint List */}
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No complaints matching filter</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {complaints.length === 0
                    ? 'No citizen complaints have been logged yet. Live submissions will appear immediately.'
                    : 'Try clearing your search query or selecting "All Statuses" to view historical records.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.map(c => {
                  const sConf = severityConfig[c.severity];
                  const ward = getWardData(c.wardNo);
                  const isUpdating = updatingId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                          <ImageWithFallback
                            src={c.image}
                            alt="Grievance evidence"
                            className="w-full h-full object-cover"
                          />
                          {c.aiVerified && (
                            <span
                              className="absolute bottom-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow"
                              title="Verified by Gemini AI"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{c.id.slice(0, 8)}
                            </span>
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                              style={{
                                color: sConf.color,
                                backgroundColor: sConf.bg,
                                borderColor: sConf.color + '33',
                              }}
                            >
                              {c.severity}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {c.wasteType}
                            </span>
                            <span className="text-xs text-slate-400">· {c.timeAgo || c.time}</span>
                          </div>

                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {c.area || 'Reported Location'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            Ward {c.wardNo} — {c.wardName} ({ward?.zoneName || 'GCC Zone'})
                          </p>

                          {c.aiObservation && (
                            <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100 italic">
                              "{c.aiObservation}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                        <button
                          onClick={() => handleStatusToggle(c)}
                          disabled={isUpdating}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                            c.status === 'Resolved'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : c.status === 'Resolved' ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{c.status === 'Resolved' ? 'Re-open' : 'Mark Resolved'}</span>
                        </button>

                        <button
                          onClick={() => navigate(`/complaint/${c.id}`)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                          title="Open full complaint screen"
                        >
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Ward Intelligence Tab */
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">GCC Ward Sanitation Allocation</h3>
            <p className="text-xs text-slate-500 mb-6">
              Complaints aggregated across Greater Chennai Corporation 200 Wards for sanitary inspector dispatch.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ward #</th>
                    <th className="py-3 px-4">Ward Name</th>
                    <th className="py-3 px-4">Administrative Zone</th>
                    <th className="py-3 px-4">Elected Councillor</th>
                    <th className="py-3 px-4 text-center">Unresolved</th>
                    <th className="py-3 px-4 text-center">Total Filed</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.wardStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No ward reports logged in current database.
                      </td>
                    </tr>
                  ) : (
                    metrics.wardStats.map(w => {
                      const wardInfo = getWardData(w.wardNo);
                      return (
                        <tr key={w.wardNo} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold text-slate-900">Ward {w.wardNo}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{w.wardName}</td>
                          <td className="py-3 px-4 text-slate-600">{wardInfo?.zoneName || 'GCC Zone'}</td>
                          <td className="py-3 px-4 text-slate-600">{wardInfo?.councillorName || 'Ward Councillor'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                              {w.unresolved}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-700">{w.total}</td>
                          <td className="py-3 px-4 text-right">
                            {w.unresolved === 0 ? (
                              <span className="text-emerald-700 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold flex items-center justify-end gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Action Req
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
