import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  fetchHods, createHod, deleteHod,
  fetchAllFaculty, fetchAllStudents, fetchAllSections,
} from '../../services/collegeAdminService';
import LoadingSpinner from '../common/LoadingSpinner';

const TABS = ['HODs', 'Sections', 'Faculty', 'Students'];

// UPDATED: HODs is the one tab on this page that's actually CRUD-enabled —
// College Admin creates/removes HODs directly (matches the role hierarchy:
// College Admin manages the layer directly below them). The other three
// tabs stay read-only, college-wide — adding sections/faculty/students
// stays each department's HOD's job, not College Admin's, same as before.
export default function CollegeAdminPeople() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('HODs');
  const [department, setDepartment] = useState('');
  const [hods, setHods] = useState([]);
  const [sections, setSections] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addHodOpen, setAddHodOpen] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([fetchHods(), fetchAllSections(), fetchAllFaculty(), fetchAllStudents()])
      .then(([h, secs, fac, studs]) => { setHods(h); setSections(secs); setFaculty(fac); setStudents(studs); })
      .catch((err) => showToast(err.message || 'Could not load this data.', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemoveHod = async (id) => {
    if (!window.confirm('Remove this HOD? This cannot be undone.')) return;
    try {
      await deleteHod(id);
      showToast('HOD removed.', 'success');
      loadAll();
    } catch (err) {
      showToast(err.message || 'Could not remove this HOD.', 'error');
    }
  };

  const departments = [...new Set([...hods, ...sections, ...faculty, ...students].map((r) => r.department).filter(Boolean))].sort();
  const filteredHods = department ? hods.filter((h) => h.department === department) : hods;
  const filteredSections = department ? sections.filter((s) => s.department === department) : sections;
  const filteredFaculty = department ? faculty.filter((f) => f.department === department) : faculty;
  const filteredStudents = department ? students.filter((s) => s.department === department) : students;
  const sectionName = (id) => sections.find((s) => s.id === id)?.name || id;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">People</h1>
          <p className="text-sm text-ink-light">
            {tab === 'HODs' ? 'You manage HODs directly.' : "Read-only college-wide oversight — adding sections, faculty, and students stays with each department's HOD."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {departments.length > 0 && (
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm">
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {tab === 'HODs' && (
            <button type="button" onClick={() => setAddHodOpen(true)} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              + Add HOD
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-semibold ${tab === t ? 'border-b-2 border-teal text-teal' : 'text-ink-light'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading…" />
      ) : tab === 'HODs' ? (
        filteredHods.length === 0 ? <p className="text-sm text-ink-light">No HODs added yet.</p> : (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs uppercase text-ink-light">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Department</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {filteredHods.map((h) => (
                  <tr key={h.username} className="border-t border-line bg-paper-card">
                    <td className="px-4 py-3">{h.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{h.username}</td>
                    <td className="px-4 py-3 text-ink-light">{h.department}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => handleRemoveHod(h.id)} className="text-xs font-semibold text-crimson hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : tab === 'Sections' ? (
        filteredSections.length === 0 ? <p className="text-sm text-ink-light">No sections found.</p> : (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs uppercase text-ink-light">
                <tr><th className="px-4 py-3">Section</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">In-charge</th></tr>
              </thead>
              <tbody>
                {filteredSections.map((s) => (
                  <tr key={s.id} className="border-t border-line bg-paper-card">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3 text-ink-light">{s.department}</td>
                    <td className="px-4 py-3 text-ink-light">{s.year || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.faculty_username || 'unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : tab === 'Faculty' ? (
        filteredFaculty.length === 0 ? <p className="text-sm text-ink-light">No faculty found.</p> : (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs uppercase text-ink-light">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Sections</th></tr>
              </thead>
              <tbody>
                {filteredFaculty.map((f) => (
                  <tr key={f.username} className="border-t border-line bg-paper-card">
                    <td className="px-4 py-3">{f.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.username}</td>
                    <td className="px-4 py-3 text-ink-light">{f.department}</td>
                    <td className="px-4 py-3 text-ink-light">{(f.section_ids || []).map(sectionName).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredStudents.length === 0 ? <p className="text-sm text-ink-light">No students found.</p> : (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs uppercase text-ink-light">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Roll No.</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Section</th></tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.username} className="border-t border-line bg-paper-card">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                    <td className="px-4 py-3 text-ink-light">{s.department}</td>
                    <td className="px-4 py-3 text-ink-light">{sectionName(s.section_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <AddHodModal open={addHodOpen} onClose={() => setAddHodOpen(false)} onCreated={loadAll} />
    </div>
  );
}

function AddHodModal({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password || !department.trim()) { setError('All fields are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createHod({ name, username, password, department });
      showToast('HOD added.', 'success');
      onCreated();
      onClose();
      setName(''); setUsername(''); setPassword(''); setDepartment('');
    } catch (err) {
      setError(err.message || 'Could not add this HOD.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-paper-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-ink">Add HOD</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Department" value={department} onChange={setDepartment} placeholder="e.g. Computer Science" />
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

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
    </div>
  );
}
