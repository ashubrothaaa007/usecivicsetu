import test from 'node:test';
import assert from 'node:assert/strict';

// Chennai bounding box for GCC jurisdiction check
const CHENNAI_BOUNDS = {
  minLat: 12.80,
  maxLat: 13.25,
  minLng: 80.10,
  maxLng: 80.35,
};

function isInsideChennai(lat, lng) {
  return (
    lat >= CHENNAI_BOUNDS.minLat &&
    lat <= CHENNAI_BOUNDS.maxLat &&
    lng >= CHENNAI_BOUNDS.minLng &&
    lng <= CHENNAI_BOUNDS.maxLng
  );
}

// Sample wards from data.ts
const sampleWards = [
  { wardNo: 6, wardName: 'Kasimedu', lat: 13.1212, lng: 80.2988 },
  { wardNo: 12, wardName: 'Tondiarpet', lat: 13.1148, lng: 80.2871 },
  { wardNo: 181, wardName: 'Velachery', lat: 12.9815, lng: 80.2180 },
  { wardNo: 195, wardName: 'Sholinganallur', lat: 12.9010, lng: 80.2279 },
];

function findNearestWard(coords, wards) {
  if (!wards || wards.length === 0) return null;
  return wards.reduce((prev, curr) => {
    const dPrev = Math.hypot(prev.lat - coords.lat, prev.lng - coords.lng);
    const dCurr = Math.hypot(curr.lat - coords.lat, curr.lng - coords.lng);
    return dCurr < dPrev ? curr : prev;
  });
}

test('Location: should correctly identify coordinates inside Greater Chennai Corporation limits', () => {
  // Central Chennai (Ripon Building area)
  assert.equal(isInsideChennai(13.0827, 80.2707), true);
  // Kasimedu (North Chennai)
  assert.equal(isInsideChennai(13.1212, 80.2988), true);
  // Velachery (South Chennai)
  assert.equal(isInsideChennai(12.9815, 80.2180), true);
});

test('Location: should reject coordinates outside Chennai', () => {
  // Bengaluru
  assert.equal(isInsideChennai(12.9716, 77.5946), false);
  // Mumbai
  assert.equal(isInsideChennai(19.0760, 72.8777), false);
  // New Delhi
  assert.equal(isInsideChennai(28.6139, 77.2090), false);
});

test('Location: should accurately calculate nearest ward from citizen GPS', () => {
  // Near Kasimedu harbor
  const coordsNearKasimedu = { lat: 13.1210, lng: 80.2980 };
  const nearest1 = findNearestWard(coordsNearKasimedu, sampleWards);
  assert.equal(nearest1.wardName, 'Kasimedu');

  // Near Velachery MRTS
  const coordsNearVelachery = { lat: 12.9820, lng: 80.2175 };
  const nearest2 = findNearestWard(coordsNearVelachery, sampleWards);
  assert.equal(nearest2.wardName, 'Velachery');
});
