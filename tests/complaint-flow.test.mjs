import test from 'node:test';
import assert from 'node:assert/strict';

function generateComplaintId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function timeAgoLabel(timestamp, current = Date.now()) {
  const diff = current - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildWhatsAppMessage({ wardNo, wardName, address, severity, wasteType, aiVerified, aiCategory, aiObservation }) {
  return (
    `🚨 *Garbage Complaint — Ward #${wardNo}, ${wardName}*\n\n` +
    `📍 *Location:* ${address}\n` +
    `🏛️ *Ward:* #${wardNo} — ${wardName}\n` +
    `⚠️ *Severity:* ${severity}\n` +
    `🗂️ *Waste Type:* ${wasteType}\n` +
    (aiVerified ? `🤖 *AI Verification:* Verified by Gemini AI (${aiCategory || wasteType})\n` : '') +
    (aiObservation ? `🔍 *AI Notes:* ${aiObservation}\n` : '') +
    `📸 *Photo:* [Live Camera Attached]\n\n` +
    `_Reported via Civicsetu Chennai_`
  );
}

function computeWorstWards(complaints) {
  const map = {};
  complaints.forEach(c => {
    if (!map[c.wardNo]) {
      map[c.wardNo] = { wardNo: c.wardNo, wardName: c.wardName, count: 0, pending: 0 };
    }
    map[c.wardNo].count++;
    if (c.status === 'Unresolved') map[c.wardNo].pending++;
  });

  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .map((w, i) => ({ ...w, rank: i + 1 }));
}

test('Complaint: ID generation produces unique strings', () => {
  const id1 = generateComplaintId();
  const id2 = generateComplaintId();
  assert.notEqual(id1, id2);
  assert.ok(id1.length >= 6);
});

test('Complaint: relative time formatting returns accurate labels', () => {
  const now = 1700000000000;
  assert.equal(timeAgoLabel(now - 10000, now), 'just now');
  assert.equal(timeAgoLabel(now - 5 * 60000, now), '5m ago');
  assert.equal(timeAgoLabel(now - 2 * 3600000, now), '2h ago');
  assert.equal(timeAgoLabel(now - 3 * 86400000, now), '3d ago');
});

test('Complaint: WhatsApp alert message formats correctly with Gemini AI tags', () => {
  const msg = buildWhatsAppMessage({
    wardNo: 181,
    wardName: 'Velachery',
    address: 'Near 100ft bypass road',
    severity: 'Severe',
    wasteType: 'Plastic Waste',
    aiVerified: true,
    aiCategory: 'Plastic and Mixed Waste',
    aiObservation: 'Overflowing plastic accumulation blocking road curb.',
  });

  assert.ok(msg.includes('Ward #181, Velachery'));
  assert.ok(msg.includes('⚠️ *Severity:* Severe'));
  assert.ok(msg.includes('🤖 *AI Verification:* Verified by Gemini AI (Plastic and Mixed Waste)'));
  assert.ok(msg.includes('Reported via Civicsetu Chennai'));
});

test('Complaint: computes worst wards ranking correctly from complaints list', () => {
  const complaints = [
    { wardNo: 181, wardName: 'Velachery', status: 'Unresolved' },
    { wardNo: 181, wardName: 'Velachery', status: 'Resolved' },
    { wardNo: 181, wardName: 'Velachery', status: 'Unresolved' },
    { wardNo: 6, wardName: 'Kasimedu', status: 'Unresolved' },
  ];

  const worst = computeWorstWards(complaints);
  assert.equal(worst[0].wardNo, 181);
  assert.equal(worst[0].count, 3);
  assert.equal(worst[0].pending, 2);
  assert.equal(worst[0].rank, 1);
  assert.equal(worst[1].wardNo, 6);
  assert.equal(worst[1].count, 1);
});
