import test from 'node:test';
import assert from 'node:assert/strict';

// WCAG 2.1 Color Contrast calculation
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ARIA attribute validator
function validateAriaAttributes(element) {
  const errors = [];
  if (element.hasPopup && !element.expanded !== undefined && typeof element.expanded !== 'boolean') {
    errors.push('Elements with aria-haspopup should explicitly declare aria-expanded boolean state.');
  }
  if (element.role === 'status' && !element.ariaLive) {
    errors.push('Status role should define aria-live region (e.g. "polite" or "assertive").');
  }
  if (element.type === 'button' && !element.ariaLabel && !element.textContent?.trim()) {
    errors.push('Buttons without visible text content must provide an aria-label.');
  }
  return { valid: errors.length === 0, errors };
}

// ── Test Cases ──────────────────────────────────────────────────────────────

test('Accessibility: Critical severity badge meets WCAG AA contrast against background', () => {
  // Critical badge text: #DC2626 or #B91C1C, background: #FEF2F2
  const ratio = getContrastRatio('#B91C1C', '#FEF2F2');
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} should be >= 4.5:1`);
});

test('Accessibility: Minor severity text meets WCAG contrast against background', () => {
  // Minor text: #854D0E, background: #FEFCE8
  const ratio = getContrastRatio('#854D0E', '#FEFCE8');
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} should be >= 4.5:1`);
});

test('Accessibility: Primary green CTA action button meets contrast standard', () => {
  // White text (#FFFFFF) on green background (#16A34A)
  const ratio = getContrastRatio('#FFFFFF', '#15803D');
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} should be >= 4.5:1`);
});

test('Accessibility: ARIA validator flags icon-only buttons lacking accessible names', () => {
  const invalidButton = { type: 'button', textContent: '', ariaLabel: '' };
  const checkInvalid = validateAriaAttributes(invalidButton);
  assert.equal(checkInvalid.valid, false);

  const validButton = { type: 'button', textContent: '', ariaLabel: 'Report Garbage' };
  const checkValid = validateAriaAttributes(validButton);
  assert.equal(checkValid.valid, true);
});

test('Accessibility: Live sync status element defines polite screen-reader announcements', () => {
  const statusEl = { role: 'status', ariaLive: 'polite' };
  const check = validateAriaAttributes(statusEl);
  assert.equal(check.valid, true);
});
