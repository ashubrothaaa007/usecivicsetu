import test from 'node:test';
import assert from 'node:assert/strict';

// Core security gate logic for CivicSetu GCC Municipal Admin
function verifyAdminCredentials(officerId, passkey) {
  if (!officerId || typeof officerId !== 'string') return false;
  if (!passkey || typeof passkey !== 'string') return false;

  const cleanId = officerId.trim().toLowerCase();
  const isValidId = cleanId === 'admin' || cleanId.includes('@') || cleanId.startsWith('gcc-');
  const isValidPass = passkey === 'gcc2026';

  return isValidId && isValidPass;
}

// Status transition state machine
function transitionComplaintStatus(currentStatus) {
  if (currentStatus === 'Unresolved') return 'Resolved';
  if (currentStatus === 'Resolved') return 'Unresolved';
  throw new Error(`Invalid complaint status: ${currentStatus}`);
}

// Multi-criteria filter engine for GCC Ward Officers
function filterAdminComplaints(complaints, { status = 'All', severity = 'All', wardNo = 'All', search = '' }) {
  const query = search.trim().toLowerCase();

  return complaints.filter(c => {
    if (status !== 'All' && c.status !== status) return false;
    if (severity !== 'All' && c.severity !== severity) return false;
    if (wardNo !== 'All' && String(c.wardNo) !== String(wardNo)) return false;
    if (query) {
      const matchId = (c.id || '').toLowerCase().includes(query);
      const matchArea = (c.area || '').toLowerCase().includes(query);
      const matchWard = (c.wardName || '').toLowerCase().includes(query);
      const matchWaste = (c.wasteType || '').toLowerCase().includes(query);
      if (!matchId && !matchArea && !matchWard && !matchWaste) return false;
    }
    return true;
  });
}

// Admin metrics calculation
function calculateAdminMetrics(complaints) {
  const total = complaints.length;
  const unresolved = complaints.filter(c => c.status === 'Unresolved').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;
  const aiVerified = complaints.filter(c => c.aiVerified).length;
  const criticalPending = complaints.filter(c => c.severity === 'Critical' && c.status === 'Unresolved').length;

  return {
    total,
    unresolved,
    resolved,
    aiVerified,
    criticalPending,
    aiVerificationRate: total > 0 ? Math.round((aiVerified / total) * 100) : 0,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
}

// ── Test Cases ──────────────────────────────────────────────────────────────

test('Admin Auth: successfully verifies authorized officer credentials', () => {
  assert.equal(verifyAdminCredentials('admin', 'gcc2026'), true);
  assert.equal(verifyAdminCredentials('officer.zone10@chennaicorporation.gov.in', 'gcc2026'), true);
  assert.equal(verifyAdminCredentials('gcc-ward-181', 'gcc2026'), true);
});

test('Admin Auth: rejects invalid passwords and malformed officer IDs', () => {
  assert.equal(verifyAdminCredentials('admin', 'wrongpass'), false);
  assert.equal(verifyAdminCredentials('', 'gcc2026'), false);
  assert.equal(verifyAdminCredentials(null, 'gcc2026'), false);
  assert.equal(verifyAdminCredentials('unauthorized_user', 'gcc2026'), false);
  assert.equal(verifyAdminCredentials('admin', ''), false);
});

test('Admin Workflow: toggles complaint status reliably between Unresolved and Resolved', () => {
  assert.equal(transitionComplaintStatus('Unresolved'), 'Resolved');
  assert.equal(transitionComplaintStatus('Resolved'), 'Unresolved');
  assert.throws(() => transitionComplaintStatus('Unknown'), /Invalid complaint status/);
});

test('Admin Filter: accurately filters complaints by severity and status', () => {
  const mockComplaints = [
    { id: 'c1', wardNo: 181, wardName: 'Velachery', severity: 'Critical', status: 'Unresolved', area: '100ft Road' },
    { id: 'c2', wardNo: 181, wardName: 'Velachery', severity: 'Minor', status: 'Resolved', area: 'Gandhi Road' },
    { id: 'c3', wardNo: 12, wardName: 'Tondiarpet', severity: 'Critical', status: 'Unresolved', area: 'High Road' },
  ];

  const criticalOnly = filterAdminComplaints(mockComplaints, { severity: 'Critical' });
  assert.equal(criticalOnly.length, 2);

  const resolvedOnly = filterAdminComplaints(mockComplaints, { status: 'Resolved' });
  assert.equal(resolvedOnly.length, 1);
  assert.equal(resolvedOnly[0].id, 'c2');

  const ward181Critical = filterAdminComplaints(mockComplaints, { wardNo: '181', severity: 'Critical' });
  assert.equal(ward181Critical.length, 1);
  assert.equal(ward181Critical[0].id, 'c1');
});

test('Admin Search: finds complaints by area name or complaint ID query', () => {
  const mockComplaints = [
    { id: 'c-vel-99', wardNo: 181, wardName: 'Velachery', severity: 'Severe', status: 'Unresolved', area: 'Bypass Road', wasteType: 'Plastic' },
    { id: 'c-ton-12', wardNo: 12, wardName: 'Tondiarpet', severity: 'Minor', status: 'Resolved', area: 'Harbour Lane', wasteType: 'Mixed' },
  ];

  const resultsByArea = filterAdminComplaints(mockComplaints, { search: 'bypass' });
  assert.equal(resultsByArea.length, 1);
  assert.equal(resultsByArea[0].id, 'c-vel-99');

  const resultsById = filterAdminComplaints(mockComplaints, { search: 'ton-12' });
  assert.equal(resultsById.length, 1);
  assert.equal(resultsById[0].wardNo, 12);
});

test('Admin Metrics: calculates exact municipal operational KPIs', () => {
  const mockComplaints = [
    { id: '1', severity: 'Critical', status: 'Unresolved', aiVerified: true },
    { id: '2', severity: 'Severe', status: 'Unresolved', aiVerified: true },
    { id: '3', severity: 'Minor', status: 'Resolved', aiVerified: true },
    { id: '4', severity: 'Moderate', status: 'Resolved', aiVerified: false },
  ];

  const metrics = calculateAdminMetrics(mockComplaints);
  assert.equal(metrics.total, 4);
  assert.equal(metrics.unresolved, 2);
  assert.equal(metrics.resolved, 2);
  assert.equal(metrics.aiVerified, 3);
  assert.equal(metrics.criticalPending, 1);
  assert.equal(metrics.aiVerificationRate, 75);
  assert.equal(metrics.resolutionRate, 50);
});
