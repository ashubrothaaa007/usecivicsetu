import test from 'node:test';
import assert from 'node:assert/strict';

function mapCameraError(err) {
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Please allow camera access in your browser settings to capture live photographs.';
  }
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return 'No camera found on this device. Live camera is required to report garbage.';
  }
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    return 'Camera is currently in use by another application. Please close other apps and try again.';
  }
  return err.message || 'Unable to open camera. Please grant camera permission.';
}

function simulateCameraStream() {
  let stopped = false;
  const mockTrack = {
    stop() {
      stopped = true;
    },
    readyState: 'live',
  };

  return {
    getTracks() {
      return [mockTrack];
    },
    isStopped() {
      return stopped;
    },
  };
}

test('Camera: accurately maps NotAllowedError to user-friendly permission guidance', () => {
  const err = new Error('Permission denied');
  err.name = 'NotAllowedError';
  const msg = mapCameraError(err);
  assert.ok(msg.includes('permission was denied'));
});

test('Camera: accurately maps NotFoundError when no camera is present', () => {
  const err = new Error('Device not found');
  err.name = 'NotFoundError';
  const msg = mapCameraError(err);
  assert.ok(msg.includes('No camera found'));
});

test('Camera: cleanly releases video tracks and stops media stream', () => {
  const stream = simulateCameraStream();
  assert.equal(stream.isStopped(), false);

  // Stop camera tracks
  stream.getTracks().forEach(t => t.stop());
  assert.equal(stream.isStopped(), true);
});

test('Camera: retake action resets preview, AI analysis state and error flags', () => {
  let state = {
    photo: 'fake-photo',
    preview: 'data:image/jpeg;base64,...',
    aiAnalysis: { garbageDetected: 'No' },
    aiError: null,
    manualReviewRequested: true,
  };

  function retake() {
    state = {
      photo: null,
      preview: null,
      aiAnalysis: null,
      aiError: null,
      manualReviewRequested: false,
    };
  }

  retake();
  assert.equal(state.photo, null);
  assert.equal(state.preview, null);
  assert.equal(state.aiAnalysis, null);
  assert.equal(state.manualReviewRequested, false);
});
