import test from 'node:test';
import assert from 'node:assert/strict';

// Helper validating Gemini schema parser logic
function parseGeminiResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty Gemini response payload');
  }

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Malformed JSON: no JSON object found in response');
  }

  const parsed = JSON.parse(match[0]);

  // Normalize classification
  if (!parsed.garbageDetected || !['Yes', 'No', 'Uncertain'].includes(parsed.garbageDetected)) {
    parsed.garbageDetected = 'Uncertain';
  }

  if (!parsed.wasteCategory) {
    parsed.wasteCategory = parsed.garbageDetected === 'Yes' ? 'Mixed Waste' : 'None';
  }

  const validSeverities = ['Minor', 'Moderate', 'Severe', 'Critical'];
  if (!validSeverities.includes(parsed.estimatedSeverity)) {
    parsed.estimatedSeverity = 'Minor';
  }

  const validWasteTypes = ['Household Waste', 'Construction Debris', 'Mixed Waste', 'E-Waste', 'Biomedical'];
  if (!validWasteTypes.includes(parsed.mappedWasteType)) {
    parsed.mappedWasteType = 'Mixed Waste';
  }

  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.85;
  }

  return parsed;
}

test('Gemini: should correctly parse GARBAGE_DETECTED (Yes) with waste categories', () => {
  const mockResponse = JSON.stringify({
    garbageDetected: 'Yes',
    wasteCategory: 'Plastic and Food Waste',
    mappedWasteType: 'Household Waste',
    estimatedSeverity: 'Moderate',
    quantity: 'Medium',
    condition: 'Accumulated',
    environmentalConcerns: 'Risk of drain clogging and vector breeding.',
    isRelevant: true,
    observation: 'Substantial plastic wrappers and organic waste accumulated near storm drain.',
    confidence: 0.94,
  });

  const result = parseGeminiResponse(mockResponse);
  assert.equal(result.garbageDetected, 'Yes');
  assert.equal(result.wasteCategory, 'Plastic and Food Waste');
  assert.equal(result.mappedWasteType, 'Household Waste');
  assert.equal(result.estimatedSeverity, 'Moderate');
  assert.equal(result.isRelevant, true);
  assert.equal(result.confidence, 0.94);
});

test('Gemini: should correctly parse NO_GARBAGE_DETECTED (No)', () => {
  const mockResponse = JSON.stringify({
    garbageDetected: 'No',
    wasteCategory: 'None',
    mappedWasteType: 'Mixed Waste',
    estimatedSeverity: 'Minor',
    quantity: 'Low',
    condition: 'Scattered',
    environmentalConcerns: 'No municipal garbage detected.',
    isRelevant: false,
    observation: 'Clean asphalt street with no visible waste or debris.',
    confidence: 0.98,
  });

  const result = parseGeminiResponse(mockResponse);
  assert.equal(result.garbageDetected, 'No');
  assert.equal(result.isRelevant, false);
  assert.equal(result.wasteCategory, 'None');
});

test('Gemini: should correctly parse UNCERTAIN classification for blurry/dark images', () => {
  const mockResponse = JSON.stringify({
    garbageDetected: 'Uncertain',
    wasteCategory: 'Uncertain',
    mappedWasteType: 'Mixed Waste',
    estimatedSeverity: 'Minor',
    quantity: 'Low',
    condition: 'Scattered',
    environmentalConcerns: 'Visibility insufficient for reliable classification.',
    isRelevant: false,
    observation: 'The photograph is too blurry and underexposed to identify waste.',
    confidence: 0.35,
  });

  const result = parseGeminiResponse(mockResponse);
  assert.equal(result.garbageDetected, 'Uncertain');
  assert.equal(result.isRelevant, false);
  assert.ok(result.confidence < 0.5);
});

test('Gemini: should sanitize and apply fallbacks on malformed or partial output', () => {
  const malformed = `Here is the analysis:\n{"garbageDetected": "Maybe", "estimatedSeverity": "Unknown"}`;
  const result = parseGeminiResponse(malformed);
  assert.equal(result.garbageDetected, 'Uncertain');
  assert.equal(result.estimatedSeverity, 'Minor');
  assert.equal(result.mappedWasteType, 'Mixed Waste');
  assert.equal(result.confidence, 0.85);
});

test('Gemini: should reject invalid image payload (< 50 characters base64)', () => {
  function validateImagePayload(payload) {
    if (!payload || typeof payload !== 'string' || payload.length < 50) {
      throw new Error('Invalid or empty image payload.');
    }
    return true;
  }

  assert.throws(() => validateImagePayload(''), /Invalid or empty image payload/);
  assert.throws(() => validateImagePayload('data:image/jpeg;base64,abc'), /Invalid or empty image payload/);
  assert.doesNotThrow(() => validateImagePayload('data:image/jpeg;base64,' + 'A'.repeat(100)));
});
