import api from './api';

/* ---------- Faculty ---------- */

/**
 * POST /api/faculty/tests
 * Body: { title, subject, section_id, duration_minutes, start_time?, end_time?,
 *   questions: [{ type:'mcq'|'theory'|'code', text, marks, options?, correct_index?,
 *     language?, starter_code?, test_cases?: [{ input, expected_output }] }] }
 * Response: { test }
 */
export function createTest(fields) {
  return api.post('/faculty/tests', fields).then((res) => res.data.test);
}

/** GET /api/faculty/tests → { tests: [{ ...test, status, question_count, submission_count, pending_grading_count }] } */
export function fetchMyTests() {
  return api.get('/faculty/tests').then((res) => res.data.tests);
}

/** GET /api/faculty/tests/:id → { test, submissions: [...], code_attempts: [...], activity_log: [...], activity_counts: { [username]: count } } */
export function fetchTestResults(id) {
  return api.get(`/faculty/tests/${id}`).then((res) => res.data);
}

/** DELETE /api/faculty/tests/:id */
export function deleteTest(id) {
  return api.delete(`/faculty/tests/${id}`).then((res) => res.data);
}

/** POST /api/faculty/tests/:id/submissions/:subId/grade — { scores: { [question_id]: number } } */
export function gradeSubmission(testId, submissionId, scores) {
  return api.post(`/faculty/tests/${testId}/submissions/${submissionId}/grade`, { scores }).then((res) => res.data);
}

export const testResultsCsvUrl = (id) => `/api/faculty/tests/${id}/results.csv`;

/* ---------- Faculty: Saved Tests (reusable question-paper templates) ----------
 * Independent of the Tests/TestSubmissions collections above — deleting or
 * editing a Saved Test never touches a Conducted Test and vice versa. */

/** GET /api/faculty/saved-tests → { saved_tests: [{ id, title, subject, description,
 *  duration_minutes, questions, question_count, total_marks, created_at, updated_at }] } */
export function fetchSavedTests() {
  return api.get('/faculty/saved-tests').then((res) => res.data.saved_tests);
}

/** GET /api/faculty/saved-tests/:id → { saved_test } — full detail, for Edit / Use Again prefill. */
export function fetchSavedTest(id) {
  return api.get(`/faculty/saved-tests/${id}`).then((res) => res.data.saved_test);
}

/**
 * POST /api/faculty/saved-tests
 * Either { source_test_id } to snapshot an already-conducted test as a new
 * template, or { title, subject, description, duration_minutes, questions }
 * to save straight from the create/edit test form.
 * `client_token` (optional) makes a duplicate click safe: the same token
 * sent twice returns the first-created row instead of a second one.
 */
export function saveTestTemplate(fields) {
  return api.post('/faculty/saved-tests', fields).then((res) => res.data.saved_test);
}

/** PUT /api/faculty/saved-tests/:id — edits the template only; already-conducted tests are unaffected. */
export function updateSavedTest(id, fields) {
  return api.put(`/faculty/saved-tests/${id}`, fields).then((res) => res.data.saved_test);
}

/** DELETE /api/faculty/saved-tests/:id — removes the template only; conducted tests/results are unaffected. */
export function deleteSavedTest(id) {
  return api.delete(`/faculty/saved-tests/${id}`).then((res) => res.data);
}

/* ---------- Student ---------- */

/**
 * GET /api/student/tests
 * Response: { tests: [{ id, title, subject, created_by_name, duration_minutes,
 *   start_time, end_time, question_count, total_marks, has_theory, has_code, status:
 *   'upcoming'|'open'|'closed', submitted, score, fully_graded }] }
 */
export function fetchAvailableTests() {
  return api.get('/student/tests').then((res) => res.data.tests);
}

/**
 * GET /api/student/tests/:id
 * Code questions include { language, starter_code, test_cases: [{ input, expected_output }] }.
 * If already submitted: { test: {...with correct_index}, submission }
 * If not yet attempted and open: { test: {...without correct_index}, submission: null, seconds_left }
 * `seconds_left` is anchored to actual join time (or the test's scheduled
 * start, whichever is later) and stays the same across reloads.
 * 403 if the window isn't open yet.
 */
export function fetchTestToAttempt(id) {
  return api.get(`/student/tests/${id}`).then((res) => res.data);
}

/**
 * POST /api/student/tests/:id/submit
 * Body: { answers: [{ selected_index?, text?, code? }], reason?: 'manual'|'tab_switch' }
 * One answer per question, in question order. Response: { submission, total_marks }.
 * A code question that fails some faculty-fixed test cases is simply
 * graded wrong (0 marks) — it never blocks or rejects the submission.
 *
 * This is the ONLY way a test is ever submitted. `reason` defaults to
 * 'manual' (the student's own Submit Exam → Confirm click). The one other
 * caller is the tab-switch auto-submit in TestAttempt.jsx, which passes
 * reason: 'tab_switch' the instant the Page Visibility API reports the
 * test tab is no longer visible — no other browser/window event (blur,
 * resize, fullscreen change, network drop, etc.) ever calls this.
 */
export function submitTest(id, { answers, reason }) {
  return api.post(`/student/tests/${id}/submit`, { answers, reason: reason || 'manual' }).then((res) => res.data);
}

/**
 * GET /api/tests/:id/leaderboard — Exam Module leaderboard: ranked by
 * submission time (earliest = rank 1), points = (Total - (Rank-1)) / Total * 100.
 */
export function fetchTestLeaderboard(id) {
  return api.get(`/tests/${id}/leaderboard`).then((res) => res.data);
}

/**
 * POST /api/student/tests/:id/questions/:qId/run-code
 * Body: { code }
 * Lets a student try their code against the test cases before final
 * submission. Every run is logged server-side with a timestamp, whether or
 * not it passes. Response: { results: [{ input, expected_output, actual_output, passed, error }], all_passed }
 */
export function runTestCode(testId, questionId, code) {
  return api.post(`/student/tests/${testId}/questions/${questionId}/run-code`, { code }).then((res) => res.data);
}

/**
 * POST /api/student/tests/:id/activity — Body: { event_type }
 * Reports that the student's browser left the test page (tab switch, page
 * hidden, window blur) while a test is in progress. This ONLY records an
 * observation for the faculty activity log and triggers a faculty
 * notification — it never submits, ends, or otherwise changes the test.
 * Failures are swallowed by the caller; a failed report should never
 * interrupt the student's test.
 */
export function reportTestActivity(testId, eventType = 'tab_switch') {
  return api.post(`/student/tests/${testId}/activity`, { event_type: eventType }).then((res) => res.data);
}
