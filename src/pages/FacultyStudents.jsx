import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchMySections, fetchMyStudents, createMyStudent, deleteMyStudent, importMyStudents, adjustStudentPoints } from '../services/facultyService';
import { AddStudentModal, ImportStudentsModal } from '../components/people/HodPeople';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';

// NEW: dedicated "Students" screen for faculty, linked from the sidebar.
// Same data and endpoints already used on the Faculty Dashboard's
// "Add student" card (fetchMySections/fetchMyStudents/createMyStudent/
// deleteMyStudent) — this just gives faculty a full, standalone place to
// add students into the sections the HOD has created for them, and to
// remove students, without touching the dashboard widget itself.
export default function FacultyStudents() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pointsStudent, setPointsStudent] = useState(null); // student row or null

  const loadAll = () => {
    setLoading(true);
    Promise.all([fetchMySections(), fetchMyStudents()])
      .then(([secs, studs]) => { setSections(secs); setStudents(studs); })
      .catch((err) => showToast(err.message || 'Could not load your students.', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this student? This cannot be undone.')) return;
    try {
      await deleteMyStudent(id);
      showToast('Student removed.', 'success');
      loadAll();
    } catch (err) {
      showToast(err.message || 'Could not remove this student.', 'error');
    }
  };

  const sectionName = (id) => sections.find((s) => s.id === id)?.name || id;

  if (loading) return <LoadingSpinner fullPage label="Loading your students…" />;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Students</h1>
          <p className="text-sm text-ink-light">
            {user.department ? `${user.department} — ` : ''}add students into your assigned sections, or remove them
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            disabled={sections.length === 0}
            className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-paper disabled:opacity-50"
          >
            Import from Excel
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={sections.length === 0}
            className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            + Add student
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">
          No section assigned yet. Ask your HOD to assign you to one before adding students.
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">
          No students in your sections yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase text-ink-light">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Roll No.</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Leaderboard points</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.username} className="border-t border-line bg-paper-card">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                  <td className="px-4 py-3 text-ink-light">{sectionName(s.section_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs font-semibold ${s.leaderboard_adjustment > 0 ? 'text-teal' : s.leaderboard_adjustment < 0 ? 'text-crimson' : 'text-ink-light'}`}>
                      {s.leaderboard_adjustment > 0 ? '+' : ''}{s.leaderboard_adjustment || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setPointsStudent(s)} className="mr-3 text-xs font-semibold text-teal hover:underline">
                      Adjust points
                    </button>
                    <button type="button" onClick={() => handleRemove(s.id)} className="text-xs font-semibold text-crimson hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddStudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sections={sections}
        onCreated={loadAll}
        createFn={createMyStudent}
      />
      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        sections={sections}
        onImported={loadAll}
        importFn={importMyStudents}
      />
      <AdjustPointsModal student={pointsStudent} onClose={() => setPointsStudent(null)} onSaved={loadAll} />
    </div>
  );
}

// Faculty-controlled leaderboard points (item 6): faculty enters a +/-
// amount, which is added to the student's running adjustment and reflected
// on the leaderboard immediately. Only ever opened for a student already
// scoped to this faculty member's own section (the server double-checks).
function AdjustPointsModal({ student, onClose, onSaved }) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('increase'); // 'increase' | 'decrease'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount('');
    setDirection('increase');
  }, [student]);

  if (!student) return null;

  const handleSave = async () => {
    const n = Number(amount);
    if (!n || n <= 0) { showToast('Enter a positive number of points.', 'error'); return; }
    const delta = direction === 'increase' ? n : -n;
    setSubmitting(true);
    try {
      await adjustStudentPoints(student.id, delta);
      showToast('Leaderboard points updated.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.message || 'Could not update points.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Adjust points — ${student.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-light">
          Current adjustment: <span className="font-mono font-semibold text-ink">{student.leaderboard_adjustment > 0 ? '+' : ''}{student.leaderboard_adjustment || 0}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirection('increase')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${direction === 'increase' ? 'border-teal bg-teal/10 text-teal' : 'border-line text-ink-light hover:bg-paper'}`}
          >
            + Increase
          </button>
          <button
            type="button"
            onClick={() => setDirection('decrease')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${direction === 'decrease' ? 'border-crimson bg-crimson/10 text-crimson' : 'border-line text-ink-light hover:bg-paper'}`}
          >
            − Decrease
          </button>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Points</label>
          <input
            type="number" min={1} value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>
        <button type="button" onClick={handleSave} disabled={submitting} className="w-full rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
