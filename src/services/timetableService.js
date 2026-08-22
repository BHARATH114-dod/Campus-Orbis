import api from './api';

/* ---------- Semesters (HOD) ---------- */
export function fetchSemesters() {
  return api.get('/hod/semesters').then((res) => res.data.semesters);
}
export function createSemester({ name, startDate, endDate }) {
  return api
    .post('/hod/semesters', { name, start_date: startDate, end_date: endDate })
    .then((res) => res.data.semester);
}
export function deleteSemester(id) {
  return api.delete(`/hod/semesters/${id}`).then((res) => res.data);
}

/* ---------- Subjects (HOD) ---------- */
export function fetchSubjects() {
  return api.get('/hod/subjects').then((res) => res.data.subjects);
}
export function createSubject({ name, code }) {
  return api.post('/hod/subjects', { name, code }).then((res) => res.data.subject);
}
export function deleteSubject(id) {
  return api.delete(`/hod/subjects/${id}`).then((res) => res.data);
}

/* ---------- Timetable (HOD manages, faculty reads their own) ---------- */
/** GET /api/hod/timetable/:sectionId → { timetable: [{ id, section_id, day_of_week, hour, subject_id, faculty_username }] } */
export function fetchSectionTimetable(sectionId) {
  return api.get(`/hod/timetable/${sectionId}`).then((res) => res.data.timetable);
}

/** POST /api/hod/timetable — upserts a single (section, day, hour) cell */
export function upsertTimetableSlot({ sectionId, dayOfWeek, hour, subjectId, facultyUsername }) {
  return api
    .post('/hod/timetable', {
      section_id: sectionId, day_of_week: dayOfWeek, hour, subject_id: subjectId, faculty_username: facultyUsername,
    })
    .then((res) => res.data.slot);
}

export function deleteTimetableSlot(id) {
  return api.delete(`/hod/timetable/${id}`).then((res) => res.data);
}

/**
 * GET /api/faculty/timetable?date=YYYY-MM-DD (defaults to today)
 * Response: { date, day_of_week, slots: [{ id, section_id, section_name, hour,
 *   subject_id, subject_name, faculty_username, already_taken }] }
 * This is what drives the "only your scheduled hour, per the timetable" rule
 * on the faculty Attendance page.
 */
export function fetchMyTimetableForDate(date) {
  return api.get('/faculty/timetable', { params: date ? { date } : {} }).then((res) => res.data);
}

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
