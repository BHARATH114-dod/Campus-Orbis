import api from './api';

/** GET /api/hod/sections → { sections: [{ id, name, year, department, faculty_username, ... }] } */
export function fetchDeptSections() {
  return api.get('/hod/sections').then((res) => res.data.sections);
}

/** POST /api/hod/sections — { name, year? } → { section } */
export function createSection({ name, year }) {
  return api.post('/hod/sections', { name, year }).then((res) => res.data.section);
}

/** PATCH /api/hod/sections/:id/assign-faculty — { faculty_username } (null to unassign) */
export function assignSectionFaculty(sectionId, facultyUsername) {
  return api.patch(`/hod/sections/${sectionId}/assign-faculty`, { faculty_username: facultyUsername || null }).then((res) => res.data);
}

/** DELETE /api/hod/sections/:id — 400s if the section still has students in it */
export function deleteSection(id) {
  return api.delete(`/hod/sections/${id}`).then((res) => res.data);
}

/** GET /api/hod/faculty → { faculty: [{ username, name, department, section_ids, ... }] } */
export function fetchDeptFaculty() {
  return api.get('/hod/faculty').then((res) => res.data.faculty);
}

/** POST /api/hod/faculty — { name, username, password } → { faculty } */
export function createFaculty({ name, username, password }) {
  return api.post('/hod/faculty', { name, username, password }).then((res) => res.data.faculty);
}

/** DELETE /api/hod/faculty/:id */
export function deleteFaculty(id) {
  return api.delete(`/hod/faculty/${id}`).then((res) => res.data);
}

/** GET /api/hod/students → { students: [...] } */
export function fetchDeptStudents() {
  return api.get('/hod/students').then((res) => res.data.students);
}

/** POST /api/hod/students — { name, username, password, roll_number?, section_id } → { student } */
export function createStudent({ name, username, password, rollNumber, sectionId }) {
  return api.post('/hod/students', { name, username, password, roll_number: rollNumber, section_id: sectionId }).then((res) => res.data.student);
}

/** DELETE /api/hod/students/:id */
export function deleteStudent(id) {
  return api.delete(`/hod/students/${id}`).then((res) => res.data);
}

/**
 * POST /api/hod/students/import — multipart upload, field name "file".
 * Excel (.xlsx/.xls) or CSV with columns Name / Username / Password /
 * Roll Number / Section (Section must match an existing section's name in
 * this HOD's department). Returns { created: [...], errors: [{ row, error }] }.
 */
export function importStudents(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/hod/students/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data);
}

/**
 * GET /api/hod/analytics
 * Response: { students_by_section, attendance_by_section, marks_by_section:
 *   [{ label, count }], totals: { students, sections } }
 */
export function fetchHodAnalytics() {
  return api.get('/hod/analytics').then((res) => res.data);
}
