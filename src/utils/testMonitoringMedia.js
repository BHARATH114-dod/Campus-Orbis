// Test Monitoring — camera/mic capability + permission detection.
//
// This is the single place that decides WHY a getUserMedia() request
// failed, so the rest of the app never has to guess. Getting this wrong
// is what previously caused "Your browser does not support camera/
// microphone access" to show up even on browsers that support it fine:
// that message must only ever mean the API itself is missing (old
// browser, insecure/non-HTTPS origin, etc.) — never permission denial,
// never a busy/missing device, and never the normal in-flight time while
// the browser's permission prompt is still open.

// Distinct failure reasons — kept separate (rather than one generic
// "camera error") so the UI can show one precise, correctly-worded
// message instead of repeating a catch-all string for every case.
export const MEDIA_ERROR = {
  UNSUPPORTED: 'unsupported', // navigator.mediaDevices / getUserMedia isn't available at all
  DENIED: 'denied', // the student (or a browser/OS policy) refused the permission prompt
  IN_USE: 'in_use', // device exists but is locked by another app/tab
  CAMERA_UNAVAILABLE: 'camera_unavailable',
  MIC_UNAVAILABLE: 'mic_unavailable',
  BOTH_UNAVAILABLE: 'both_unavailable',
  UNKNOWN: 'unknown',
};

// True only when the browser actually exposes the API this test needs.
// This is a synchronous capability check — it never depends on whether
// permission has been granted yet, so it can't be confused with a
// permission-denied or still-pending state.
export function isMediaApiSupported() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

function classifyKnownError(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return MEDIA_ERROR.DENIED;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return MEDIA_ERROR.IN_USE;
  }
  // NotFoundError / DevicesNotFoundError / OverconstrainedError mean "a
  // requested device doesn't exist" but don't say which one (camera or
  // mic) when both were requested together — the caller probes further.
  return null;
}

// Requests camera+mic together (what the test actually needs) and
// resolves to a single, unambiguous result:
//   { ok: true, stream }
//   { ok: false, reason: MEDIA_ERROR.* }
// Never throws — every branch, including genuinely unexpected errors, is
// converted into a reason so callers always have exactly one thing to
// show, never a raw exception to catch differently at every call site.
export async function requestMonitoringStream() {
  if (!isMediaApiSupported()) {
    return { ok: false, reason: MEDIA_ERROR.UNSUPPORTED };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (!stream) return { ok: false, reason: MEDIA_ERROR.UNKNOWN };
    return { ok: true, stream };
  } catch (err) {
    const known = classifyKnownError(err);
    if (known) return { ok: false, reason: known };

    // Ambiguous "device not found"-style error — check camera and mic
    // separately so the student gets told exactly which one is missing
    // instead of a generic failure.
    let camOk = true;
    let micOk = true;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStream.getTracks().forEach((t) => t.stop());
    } catch {
      camOk = false;
    }
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((t) => t.stop());
    } catch {
      micOk = false;
    }
    if (!camOk && !micOk) return { ok: false, reason: MEDIA_ERROR.BOTH_UNAVAILABLE };
    if (!camOk) return { ok: false, reason: MEDIA_ERROR.CAMERA_UNAVAILABLE };
    if (!micOk) return { ok: false, reason: MEDIA_ERROR.MIC_UNAVAILABLE };
    return { ok: false, reason: MEDIA_ERROR.UNKNOWN };
  }
}

// One canonical message per reason — this is what keeps the student from
// ever seeing more than one (correct) message for a given failure.
export function mediaErrorMessage(reason) {
  switch (reason) {
    case MEDIA_ERROR.UNSUPPORTED:
      return 'Your browser does not support camera/microphone access, which this test requires. Please use an up-to-date Chrome, Edge, Firefox, or Safari.';
    case MEDIA_ERROR.DENIED:
      return 'Camera and microphone access was denied. Please allow access for this site in your browser settings and try again.';
    case MEDIA_ERROR.IN_USE:
      return 'Your camera or microphone is already in use by another app or browser tab. Close it and try again.';
    case MEDIA_ERROR.CAMERA_UNAVAILABLE:
      return 'No camera was detected on this device. This test requires a working camera.';
    case MEDIA_ERROR.MIC_UNAVAILABLE:
      return 'No microphone was detected on this device. This test requires a working microphone.';
    case MEDIA_ERROR.BOTH_UNAVAILABLE:
      return 'No camera or microphone was detected on this device. This test requires both.';
    default:
      return 'This test requires camera and microphone access for live monitoring. Please allow access and try again.';
  }
}
