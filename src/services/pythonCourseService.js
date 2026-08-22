import api from './api';

/**
 * Python Full Course — talks to the /api/student/python-course/* routes
 * added in server.js. Coding execution (practice runs, test-question runs)
 * goes through the exact same Judge0-backed engine the Exam Module uses —
 * this file just points requests at the course's own routes instead of
 * /api/student/tests/:id/..., so course coding attempts never touch or
 * affect a real exam's data.
 */

/** GET /api/student/python-course — dashboard: modules, overall %, continue-learning pointer, stats. */
export function fetchPythonCourse() {
  return api.get('/student/python-course').then((res) => res.data);
}

/** GET /api/student/python-course/lessons/:lessonId — learn content + practice starter code. 403 if locked. */
export function fetchPythonLesson(lessonId) {
  return api.get(`/student/python-course/lessons/${lessonId}`).then((res) => res.data);
}

/** POST .../lessons/:lessonId/practice/run-code — Body: { code, input? } → { output, error }. Ungraded free-form run. */
export function runPythonPractice(lessonId, code, input = '') {
  return api.post(`/student/python-course/lessons/${lessonId}/practice/run-code`, { code, input }).then((res) => res.data);
}

/** GET .../lessons/:lessonId/test — questions with answer keys stripped, plus any previous score. */
export function fetchPythonLessonTest(lessonId) {
  return api.get(`/student/python-course/lessons/${lessonId}/test`).then((res) => res.data);
}

/** POST .../test/questions/:qId/run-code — try a coding question against its test cases before submitting. */
export function runPythonTestQuestionCode(lessonId, questionId, code) {
  return api.post(`/student/python-course/lessons/${lessonId}/test/questions/${questionId}/run-code`, { code }).then((res) => res.data);
}

/**
 * POST .../test/submit — Body: { answers: [{ selected_index? } | { code? }] }, one per question in order.
 * Response: { score, review, next_lesson_id, overall_percentage }. Idempotent — the lesson only ever
 * contributes once to the completed-lesson count, no matter how many times its test is retaken.
 */
export function submitPythonLessonTest(lessonId, answers) {
  return api.post(`/student/python-course/lessons/${lessonId}/test/submit`, { answers }).then((res) => res.data);
}

/** GET /api/student/python-course/certificate — 403 until the course is 100% complete. */
export function fetchPythonCertificate() {
  return api.get('/student/python-course/certificate').then((res) => res.data);
}
