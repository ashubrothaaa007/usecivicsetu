import test from 'node:test';
import assert from 'node:assert/strict';

// Sanitization and payload security functions
function sanitizeBase64Payload(rawInput, maxSizeChars = 10000000) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Invalid or empty image payload.');
  }

  if (rawInput.length > maxSizeChars) {
    throw new Error('Image payload exceeds maximum size limit (10MB).');
  }

  // Extract raw base64 regardless of data URL formatting
  const clean = rawInput.includes(',')
    ? rawInput.split(',')[1].trim()
    : rawInput.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();

  if (!clean || clean.length < 50) {
    throw new Error('Invalid or empty image payload.');
  }

  return clean;
}

function validateImageMimeType(mimeType) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!mimeType || typeof mimeType !== 'string') return 'image/jpeg';
  const normalized = mimeType.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : 'image/jpeg';
}

// Client rate-limiting guard to prevent accidental spam / duplicate reports
class RateLimiter {
  constructor(cooldownMs = 5000) {
    this.cooldownMs = cooldownMs;
    this.lastSubmission = 0;
  }

  canSubmit(now = Date.now()) {
    if (now - this.lastSubmission < this.cooldownMs) {
      const waitSec = Math.ceil((this.cooldownMs - (now - this.lastSubmission)) / 1000);
      return { allowed: false, waitSec };
    }
    return { allowed: true, waitSec: 0 };
  }

  recordSubmission(now = Date.now()) {
    this.lastSubmission = now;
  }
}

// ── Test Cases ──────────────────────────────────────────────────────────────

test('API Resilience: cleanses base64 with data URL prefixes correctly', () => {
  const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const withPrefix = `data:image/png;base64,${sampleBase64}`;

  const cleaned = sanitizeBase64Payload(withPrefix);
  assert.equal(cleaned, sampleBase64);
  assert.ok(!cleaned.startsWith('data:'));
});

test('API Resilience: rejects oversized payloads to protect server memory', () => {
  const oversized = 'A'.repeat(10000001);
  assert.throws(
    () => sanitizeBase64Payload(oversized),
    /Image payload exceeds maximum size limit/
  );
});

test('API Resilience: validates and normalizes image MIME types', () => {
  assert.equal(validateImageMimeType('image/png'), 'image/png');
  assert.equal(validateImageMimeType('image/jpeg'), 'image/jpeg');
  assert.equal(validateImageMimeType('IMAGE/WEBP'), 'image/webp');
  // Disallowed or executable MIME types fallback safely to image/jpeg
  assert.equal(validateImageMimeType('application/pdf'), 'image/jpeg');
  assert.equal(validateImageMimeType('image/svg+xml'), 'image/jpeg');
  assert.equal(validateImageMimeType(null), 'image/jpeg');
});

test('API Resilience: prevents rapid-fire duplicate submissions with rate limiter', () => {
  const limiter = new RateLimiter(5000);
  const t0 = 1000000;

  // First submission allowed
  const check1 = limiter.canSubmit(t0);
  assert.equal(check1.allowed, true);
  limiter.recordSubmission(t0);

  // Rapid attempt 1s later rejected
  const check2 = limiter.canSubmit(t0 + 1000);
  assert.equal(check2.allowed, false);
  assert.equal(check2.waitSec, 4);

  // Attempt after 5s cooldown allowed
  const check3 = limiter.canSubmit(t0 + 5100);
  assert.equal(check3.allowed, true);
});
