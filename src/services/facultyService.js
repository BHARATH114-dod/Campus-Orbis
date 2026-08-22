import api from './api';

/** GET /api/faculty/sections → { sections: [{ id, college_id, department, name, year, faculty_username, ... }] } */
export function fetchMySections() {
  return api.get('/faculty/sections').then((res) => res.data.sections);
}

/** GET /api/faculty/students → { students: [{ username, name, department, section_id, roll_number, ... }] } */
export function fetchMyStudents() {
  return api.get('/faculty/students').then((res) => res.data.students);
}

/**
 * POST /api/faculty/students — narrower than the HOD's own student-creation
 * route: sectionId must be one of this faculty member's own assigned
 * sections (server enforces this too, not just the UI).
 */
export function createMyStudent({ name, username, password, rollNumber, sectionId }) {
  return api.post('/faculty/students', { name, username, password, roll_number: rollNumber, section_id: sectionId }).then((res) => res.data.student);
}

/**
 * DELETE /api/faculty/students/:id — same scope restriction as creation:
 * only students in one of this faculty member's own sections (403 if not,
 * enforced server-side).
 */
export function deleteMyStudent(id) {
  return api.delete(`/faculty/students/${id}`).then((res) => res.data);
}

/**
 * POST /api/faculty/students/import — multipart upload, field name "file".
 * Same sheet format as the HOD import (Name / Username / Password / Roll
 * Number / Section), but "Section" must match one of this faculty member's
 * own assigned sections — server enforces this, same as createMyStudent.
 * Returns { created: [...], errors: [{ row, error }] }.
 */
export function importMyStudents(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/faculty/students/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data);
}

/**
 * POST /api/faculty/students/:id/points — Body: { delta } (positive to add,
 * negative to subtract). Only works for a student in one of this faculty
 * member's own assigned sections (403 otherwise, enforced server-side).
 * The adjustment is cumulative and immediately reflected in the leaderboard.
 * Response: { ok, points } — points is the new running total.
 */
export function adjustStudentPoints(id, delta) {
  return api.post(`/faculty/students/${id}/points`, { delta }).then((res) => res.data);
}
