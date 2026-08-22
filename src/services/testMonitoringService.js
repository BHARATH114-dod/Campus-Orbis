import api from './api';

/* ---------- Faculty ---------- */

/**
 * GET /api/faculty/tests/:id/monitoring
 * Response: { test: { id, title, status }, students: [{
 *   username, name, roll_number, section_id, section_name, department,
 *   joined_at, submitted, camera_active, recording_active, last_seen_at
 * }] }
 * Rows already come back section-wise, then roll-number-wise.
 * `camera_active` is the broad "is this student watchable right now"
 * signal used to enable/disable View Live (heartbeat OR chunk fresh).
 * `recording_active` is the narrower "is the rolling-chunk recorder
 * actually landing chunks right now" signal shown as a separate
 * Recording status badge in View Live / View All.
 */
export function fetchTestMonitoring(testId) {
  return api.get(`/faculty/tests/${testId}/monitoring`).then((res) => res.data);
}

/**
 * Faculty-only live view of one student's most recent camera+mic chunk.
 * Always served inline (never as a download) — point a <video> at this.
 */
export const monitoringStreamUrl = (testId, username) => `/api/faculty/tests/${testId}/monitoring/${username}/stream`;

/* ---------- Student ---------- */

/**
 * POST /api/student/tests/:id/monitoring/chunk (multipart/form-data)
 * Uploads one short camera+mic recording chunk, replacing whatever chunk
 * was there before. Called on a rolling interval while a test is open —
 * see useTestMonitoringRecorder in TestAttempt.jsx.
 */
export function uploadMonitoringChunk(testId, blob) {
  const formData = new FormData();
  formData.append('chunk', blob, 'chunk.webm');
  return api.post(`/student/tests/${testId}/monitoring/chunk`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
}

/**
 * POST /api/student/tests/:id/monitoring/heartbeat (plain JSON)
 * A fast, lightweight "is my camera/mic actually live right now" ping —
 * separate from uploadMonitoringChunk above. This is what makes the
 * faculty roster's Camera On/Off reflect reality within a few seconds of
 * permission being granted, instead of waiting on the much slower (~8s)
 * recording-chunk pipeline. Sent every few seconds while the test is
 * open — see useCameraStatusHeartbeat in TestAttempt.jsx.
 */
export function sendMonitoringHeartbeat(testId, { cameraLive, micLive }) {
  return api.post(`/student/tests/${testId}/monitoring/heartbeat`, {
    camera_live: !!cameraLive,
    mic_live: !!micLive,
  }).then((res) => res.data);
}
