import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchDeptSections, createSection, assignSectionFaculty, deleteSection,
  fetchDeptFaculty, createFaculty, deleteFaculty,
  fetchDeptStudents, createStudent, deleteStudent, importStudents,
} from '../../services/hodService';
import LoadingSpinner from '../common/LoadingSpinner';

const TABS = ['Sections', 'Faculty', 'Students'];

export default function HodPeople() {
  const [tab, setTab] = useState('Sections');
  const [sections, setSections] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadAll = () => {
    setLoading(true);
    Promise.all([fetchDeptSections(), fetchDeptFaculty(), fetchDeptStudents()])
      .then(([secs, fac, studs]) => { setSections(secs); setFaculty(fac); setStudents(studs); })
      .catch((err) => showToast(err.message || 'Could not load your department.', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-semibold ${tab === t ? 'border-b-2 border-teal text-teal' : 'text-ink-light'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading your department…" />
      ) : tab === 'Sections' ? (
        <SectionsTab sections={sections} faculty={faculty} onChange={loadAll} />
      ) : tab === 'Faculty' ? (
        <FacultyTab faculty={faculty} onChange={loadAll} />
      ) : (
        <StudentsTab students={students} sections={sections} onChange={loadAll} />
      )}
    </div>
  );
}

function SectionsTab({ sections, faculty, onChange }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createSection({ name, year });
      showToast('Section created.', 'success');
      setName(''); setYear('');
      onChange();
    } catch (err) {
      showToast(err.message || 'Could not create this section.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (sectionId, facultyUsername) => {
    try {
      await assignSectionFaculty(sectionId, facultyUsername);
      onChange();
    } catch (err) {
      showToast(err.message || 'Could not assign faculty.', 'error');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this section? It must have no students in it first.')) return;
    try {
      await deleteSection(id);
      showToast('Section removed.', 'success');
      onChange();
    } catch (err) {
      showToast(err.message || 'Could not remove this section.', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Sections</h1>
          <p className="text-sm text-ink-light">{user.department} — create sections and assign a faculty in-charge</p>
        </div>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Section name" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year (optional)" className="w-32 rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <button type="submit" disabled={submitting} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            + Add section
          </button>
        </form>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-ink-light">No sections yet.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper-card p-4 shadow-sm">
              <span className="text-sm font-semibold text-ink">
                {s.name}{s.year ? ` (${s.year})` : ''} <span className="font-normal text-ink-light">— in-charge: {s.faculty_username || 'unassigned'}</span>
              </span>
              <div className="flex items-center gap-3">
                <select
                  value={s.faculty_username || ''}
                  onChange={(e) => handleAssign(s.id, e.target.value)}
                  className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {faculty.map((f) => <option key={f.username} value={f.username}>{f.name}</option>)}
                </select>
                <button type="button" onClick={() => handleRemove(s.id)} className="text-xs font-semibold text-crimson hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FacultyTab({ faculty, onChange }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this faculty member? This cannot be undone.')) return;
    try {
      await deleteFaculty(id);
      showToast('Faculty removed.', 'success');
      onChange();
    } catch (err) {
      showToast(err.message || 'Could not remove this faculty member.', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Faculty</h1>
          <p className="text-sm text-ink-light">{user.department}</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-white hover:opacity-90">
          + Add faculty
        </button>
      </div>

      {faculty.length === 0 ? (
        <p className="text-sm text-ink-light">No faculty added yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase text-ink-light">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Sections</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {faculty.map((f) => (
                <tr key={f.username} className="border-t border-line bg-paper-card">
                  <td className="px-4 py-3">{f.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{f.username}</td>
                  <td className="px-4 py-3 text-ink-light">{f.section_ids?.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleRemove(f.id)} className="text-xs font-semibold text-crimson hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddFacultyModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={onChange} />
    </div>
  );
}

function AddFacultyModal({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password) { setError('All fields are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createFaculty({ name, username, password });
      showToast('Faculty added.', 'success');
      onCreated();
      onClose();
      setName(''); setUsername(''); setPassword('');
    } catch (err) {
      setError(err.message || 'Could not add this faculty member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-paper-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-ink">Add faculty</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          {error && <p className="text-xs text-crimson">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold text-ink">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-hero-primary py-2 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentsTab({ students, sections, onChange }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this student? This cannot be undone.')) return;
    try {
      await deleteStudent(id);
      showToast('Student removed.', 'success');
      onChange();
    } catch (err) {
      showToast(err.message || 'Could not remove this student.', 'error');
    }
  };

  const sectionName = (id) => sections.find((s) => s.id === id)?.name || id;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Students</h1>
          <p className="text-sm text-ink-light">{user.department}</p>
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
          <button type="button" onClick={() => setModalOpen(true)} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-white hover:opacity-90">
            + Add student
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-ink-light">No students added yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase text-ink-light">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Roll No.</th><th className="px-4 py-3">Section</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.username} className="border-t border-line bg-paper-card">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                  <td className="px-4 py-3 text-ink-light">{sectionName(s.section_id)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleRemove(s.id)} className="text-xs font-semibold text-crimson hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddStudentModal open={modalOpen} onClose={() => setModalOpen(false)} sections={sections} onCreated={onChange} createFn={createStudent} />
      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} sections={sections} onImported={onChange} importFn={importStudents} />
    </div>
  );
}

// Shared by HOD's Students tab and the Faculty Dashboard's "Add student"
// card — same form, different createFn (createStudent vs createMyStudent)
// and a different, narrower section list depending on who's using it.
export function AddStudentModal({ open, onClose, sections, onCreated, createFn }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) setSectionId(sections[0]?.id || ''); }, [open, sections]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password || !sectionId) { setError('All fields except roll number are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createFn({ name, username, password, rollNumber, sectionId });
      showToast('Student added.', 'success');
      onCreated();
      onClose();
      setName(''); setUsername(''); setPassword(''); setRollNumber('');
    } catch (err) {
      setError(err.message || 'Could not add this student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-paper-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-ink">Add student</h2>
        {sections.length === 0 ? (
          <p className="text-sm text-ink-light">You need a section to add a student to first.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Username" value={username} onChange={setUsername} />
            <Field label="Password" type="password" value={password} onChange={setPassword} />
            <Field label="Roll number (optional)" value={rollNumber} onChange={setRollNumber} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Section</label>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm">
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-crimson">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold text-ink">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-hero-primary py-2 text-sm font-bold text-white disabled:opacity-60">
                {submitting ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Shared by HOD's Students tab and the faculty Students page — same
// upload flow, different importFn (importStudents vs importMyStudents)
// depending on who's using it, mirroring AddStudentModal above.
// "Section" cells must match the *name* of a section already in scope for
// whoever is importing — the server does the actual matching/enforcement,
// this just uploads the file and renders whatever it reports back.
export function ImportStudentsModal({ open, onClose, sections, onImported, importFn }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const reset = () => { setFile(null); setResult(null); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Choose an Excel (.xlsx/.xls) or CSV file first.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await importFn(file);
      setResult(res);
      if (res.created.length) {
        showToast(`${res.created.length} student${res.created.length === 1 ? '' : 's'} added.`, 'success');
        onImported();
      }
      if (!res.created.length && res.errors.length) {
        showToast('No students were added — see the errors below.', 'error');
      }
    } catch (err) {
      setError(err.message || 'Could not import that file.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-5" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full max-w-md rounded-2xl bg-paper-card p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-ink">Import students from Excel</h2>
        <p className="mb-4 text-xs text-ink-light">
          Columns: <span className="font-mono">Name, Username, Password, Roll Number, Section</span>.
          Section must match one of: {sections.map((s) => s.name).join(', ') || '—'}.
        </p>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
            {error && <p className="text-xs text-crimson">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold text-ink">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-hero-primary py-2 text-sm font-bold text-white disabled:opacity-60">
                {submitting ? 'Importing…' : 'Import'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              <span className="font-semibold text-teal">{result.created.length} added</span>
              {result.errors.length > 0 && <span className="text-ink-light"> · {result.errors.length} skipped</span>}
            </p>
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-line">
                <table className="w-full text-xs">
                  <thead className="bg-paper text-left uppercase text-ink-light">
                    <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Issue</th></tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-1.5 font-mono">{e.row}</td>
                        <td className="px-3 py-1.5 text-crimson">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={reset} className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold text-ink">Import another file</button>
              <button type="button" onClick={handleClose} className="flex-1 rounded-lg bg-hero-primary py-2 text-sm font-bold text-white">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
    </div>
  );
}
