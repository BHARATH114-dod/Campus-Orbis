import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { fetchMySections } from '../../services/facultyService';
import {
  createTest, fetchMyTests, fetchTestResults, deleteTest, gradeSubmission, testResultsCsvUrl,
  fetchSavedTests, saveTestTemplate, updateSavedTest, deleteSavedTest,
} from '../../services/testService';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import TestLeaderboardModal from './TestLeaderboardModal';

let qIdCounter = 0;
const blankMcq = () => ({ _key: ++qIdCounter, type: 'mcq', text: '', marks: 1, options: ['', ''], correct_index: 0 });
const blankTheory = () => ({ _key: ++qIdCounter, type: 'theory', text: '', marks: 1 });
const blankCode = () => ({ _key: ++qIdCounter, type: 'code', text: '', marks: 5, language: 'python', starter_code: '', test_cases: [{ input: '', expected_output: '' }] });
// Saved Test / Use Again prefill: a stored question (plain, no _key) becomes
// an editable question row the same shape blank*() produce, so the same
// QuestionsEditor works whether the questions came from scratch or from a
// template.
const questionFromStored = (q) => ({ ...q, _key: ++qIdCounter });

export default function FacultyTests() {
  const { showToast } = useToast();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState(null); // saved test to "Use Again" from, or null for a blank test
  const [resultsTestId, setResultsTestId] = useState(null);
  const [leaderboardTest, setLeaderboardTest] = useState(null); // { id, title } or null
  const [savedTestsOpen, setSavedTestsOpen] = useState(false);
  const [savingTemplateId, setSavingTemplateId] = useState(null); // conducted-test id currently being "Saved as template" (guards duplicate clicks)

  const load = () => {
    setLoading(true);
    fetchMyTests().then(setTests).catch((err) => showToast(err.message || 'Could not load your tests.', 'error')).finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test and all submissions? This cannot be undone.')) return;
    try {
      await deleteTest(id);
      setTests((prev) => prev.filter((t) => t.id !== id));
      showToast('Test removed.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not remove this test.', 'error');
    }
  };

  // "Save Test" on an already-conducted test — snapshots its current
  // question paper into a brand new, independent Saved Test template.
  // Deleting/editing this conducted test afterwards never touches the
  // template, and vice versa.
  const handleSaveAsTemplate = async (test) => {
    if (savingTemplateId) return; // guards a duplicate/double click
    setSavingTemplateId(test.id);
    try {
      await saveTestTemplate({ source_test_id: test.id, client_token: `snapshot_${test.id}` });
      showToast('Saved to Saved Tests.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save this test as a template.', 'error');
    } finally {
      setSavingTemplateId(null);
    }
  };

  const openUseAgain = (savedTest) => {
    setCreatePrefill(savedTest);
    setSavedTestsOpen(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreatePrefill(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink">Tests</h1>
          <p className="text-sm text-ink-light">Write, assign, and grade online tests for your sections.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setSavedTestsOpen(true)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">
            Saved Tests
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} className="rounded-full bg-hero-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            + New test
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading your tests…" />
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">No tests created yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tests.map((t) => (
            <div key={t.id} className="rounded-2xl border border-line bg-paper-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-ink">{t.title}</h3>
                  <p className="text-sm text-ink-light">{t.subject}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${t.status === 'open' ? 'bg-teal/10 text-teal' : t.status === 'upcoming' ? 'bg-gold/10 text-gold' : 'bg-line/50 text-ink-light'}`}>
                  {t.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-light">
                <span>{t.question_count} question{t.question_count === 1 ? '' : 's'}</span>
                <span>{t.total_marks} marks</span>
                <span>{t.submission_count} submitted</span>
                {t.pending_grading_count > 0 && <span className="font-semibold text-gold">{t.pending_grading_count} need grading</span>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setResultsTestId(t.id)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-paper">Results</button>
                <button type="button" onClick={() => setLeaderboardTest({ id: t.id, title: t.title })} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-paper">🏆 Leaderboard</button>
                <a href={testResultsCsvUrl(t.id)} download className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-paper">⬇ CSV</a>
                <button
                  type="button"
                  onClick={() => handleSaveAsTemplate(t)}
                  disabled={savingTemplateId === t.id}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-paper disabled:opacity-60"
                  title="Save this question paper as a reusable template in Saved Tests"
                >
                  {savingTemplateId === t.id ? 'Saving…' : '💾 Save Test'}
                </button>
                <button type="button" onClick={() => handleDelete(t.id)} className="ml-auto text-xs font-semibold text-crimson hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTestModal
        open={createOpen}
        prefill={createPrefill}
        onClose={closeCreate}
        onCreated={(t) => { setTests((prev) => [{ ...t, question_count: t.questions.length, submission_count: 0, pending_grading_count: 0 }, ...prev]); setCreatePrefill(null); }}
      />
      <ResultsModal testId={resultsTestId} onClose={() => setResultsTestId(null)} onGraded={load} />
      <TestLeaderboardModal testId={leaderboardTest?.id || null} testTitle={leaderboardTest?.title} onClose={() => setLeaderboardTest(null)} />
      <SavedTestsModal open={savedTestsOpen} onClose={() => setSavedTestsOpen(false)} onUseAgain={openUseAgain} />
    </div>
  );
}

// Shared question-editing UI — used both by the create/Use-Again test form
// and by the Saved Test editor, so editing a template and editing a
// from-scratch test work identically.
function QuestionsEditor({ questions, updateQuestion, updateOption, addOption, removeOption, removeQuestion, updateTestCase, addTestCase, removeTestCase, setQuestions }) {
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={q._key} className="rounded-lg border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-ink-light">Question {i + 1}</span>
            <div className="flex items-center gap-2">
              <select value={q.type} onChange={(e) => updateQuestion(q._key, { type: e.target.value })} className="rounded-lg border border-line bg-paper px-2 py-1 text-xs">
                <option value="mcq">Multiple choice</option>
                <option value="theory">Theory / long answer</option>
                <option value="code">Code test</option>
              </select>
              <input type="number" min={1} value={q.marks} onChange={(e) => updateQuestion(q._key, { marks: Number(e.target.value) })} className="w-14 rounded-lg border border-line bg-paper px-2 py-1 text-xs" />
              <button type="button" onClick={() => removeQuestion(q._key)} className="text-xs font-semibold text-crimson hover:underline">Remove</button>
            </div>
          </div>
          <textarea rows={2} value={q.text} onChange={(e) => updateQuestion(q._key, { text: e.target.value })} placeholder="Question text" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          {q.type === 'mcq' && (
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" checked={q.correct_index === oi} onChange={() => updateQuestion(q._key, { correct_index: oi })} />
                  <input value={opt} onChange={(e) => updateOption(q._key, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm" />
                  {q.options.length > 2 && <button type="button" onClick={() => removeOption(q._key, oi)} className="text-xs text-crimson">✕</button>}
                </div>
              ))}
              <button type="button" onClick={() => addOption(q._key)} className="text-xs font-semibold text-teal hover:underline">+ Add option</button>
            </div>
          )}
          {q.type === 'code' && (
            <div className="mt-2 space-y-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Language (fixed for this question)</label>
                <select value={q.language} onChange={(e) => updateQuestion(q._key, { language: e.target.value })} className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm">
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Starter code (optional)</label>
                <textarea
                  rows={3}
                  value={q.starter_code}
                  onChange={(e) => updateQuestion(q._key, { starter_code: e.target.value })}
                  placeholder="Code shown to the student when they open the question…"
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Test cases (input → expected output)</label>
                <p className="mb-2 text-[11px] text-ink-light">A student's solution must match every expected output exactly (after trimming whitespace) to be accepted.</p>
                <div className="space-y-2">
                  {q.test_cases.map((tc, ti) => (
                    <div key={ti} className="flex items-start gap-2 rounded-lg border border-line p-2">
                      <div className="flex-1 space-y-1">
                        <textarea
                          rows={2}
                          value={tc.input}
                          onChange={(e) => updateTestCase(q._key, ti, { input: e.target.value })}
                          placeholder="Input (stdin) — leave blank if none"
                          className="w-full rounded-lg border border-line bg-paper px-2 py-1 font-mono text-xs"
                        />
                        <textarea
                          rows={2}
                          value={tc.expected_output}
                          onChange={(e) => updateTestCase(q._key, ti, { expected_output: e.target.value })}
                          placeholder="Expected output"
                          className="w-full rounded-lg border border-line bg-paper px-2 py-1 font-mono text-xs"
                        />
                      </div>
                      {q.test_cases.length > 1 && (
                        <button type="button" onClick={() => removeTestCase(q._key, ti)} className="text-xs text-crimson">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addTestCase(q._key)} className="mt-2 text-xs font-semibold text-teal hover:underline">+ Add test case</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-3">
        <button type="button" onClick={() => setQuestions((prev) => [...prev, blankMcq()])} className="text-xs font-semibold text-teal hover:underline">+ Add MCQ</button>
        <button type="button" onClick={() => setQuestions((prev) => [...prev, blankTheory()])} className="text-xs font-semibold text-teal hover:underline">+ Add theory question</button>
        <button type="button" onClick={() => setQuestions((prev) => [...prev, blankCode()])} className="text-xs font-semibold text-teal hover:underline">+ Add code test</button>
      </div>
    </div>
  );
}

// Reusable question-array handlers — same shape used by CreateTestModal and
// SavedTestEditModal, factored out so both stay in sync.
function useQuestionHandlers(setQuestions) {
  const updateQuestion = (key, patch) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  const updateOption = (key, i, value) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, options: q.options.map((o, oi) => (oi === i ? value : o)) } : q)));
  const addOption = (key) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, options: [...q.options, ''] } : q)));
  const removeOption = (key, i) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, options: q.options.filter((_, oi) => oi !== i), correct_index: q.correct_index === i ? 0 : q.correct_index } : q)));
  const removeQuestion = (key) => setQuestions((prev) => prev.filter((q) => q._key !== key));
  const updateTestCase = (key, i, patch) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, test_cases: q.test_cases.map((tc, ti) => (ti === i ? { ...tc, ...patch } : tc)) } : q)));
  const addTestCase = (key) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, test_cases: [...q.test_cases, { input: '', expected_output: '' }] } : q)));
  const removeTestCase = (key, i) => setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, test_cases: q.test_cases.filter((_, ti) => ti !== i) } : q)));
  return { updateQuestion, updateOption, addOption, removeOption, removeQuestion, updateTestCase, addTestCase, removeTestCase };
}

// "Saved Tests" — reusable question-paper templates. Fully independent of
// Conducted Tests: deleting/editing a template here never touches a
// Conducted Test (or its submissions/results), and vice versa (see
// server.js SavedTests routes).
function SavedTestsModal({ open, onClose, onUseAgain }) {
  const { showToast } = useToast();
  const [savedTests, setSavedTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingTest, setEditingTest] = useState(null); // saved test row, or null

  const load = () => {
    setLoading(true);
    fetchSavedTests().then(setSavedTests).catch((err) => showToast(err.message || 'Could not load saved tests.', 'error')).finally(() => setLoading(false));
  };
  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (deletingId) return;
    if (!window.confirm('Are you sure you want to delete this saved test? This will remove the reusable question paper from Saved Tests. Existing conducted tests and their results will not be affected.')) return;
    setDeletingId(id);
    try {
      await deleteSavedTest(id);
      setSavedTests((prev) => prev.filter((t) => t.id !== id));
      showToast('Saved test deleted.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not delete this saved test.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Saved Tests">
        {loading ? (
          <LoadingSpinner label="Loading saved tests…" />
        ) : savedTests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center text-sm text-ink-light">
            <p className="font-semibold text-ink">No saved tests yet.</p>
            <p className="mt-1">Save a test to quickly reuse the same question paper later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {savedTests.map((t) => (
              <div key={t.id} className="rounded-2xl border border-line bg-paper-card p-4 shadow-sm">
                <h3 className="text-base font-semibold text-ink">{t.title}</h3>
                <p className="text-sm text-ink-light">{t.subject}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-light">
                  <span>{t.question_count} question{t.question_count === 1 ? '' : 's'}</span>
                  <span>{t.total_marks} marks</span>
                  <span>{t.duration_minutes} min</span>
                </div>
                <div className="mt-2 text-[11px] text-ink-light">
                  <div>Created {new Date(t.created_at).toLocaleDateString()}</div>
                  <div>Last modified {new Date(t.updated_at).toLocaleDateString()}</div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => onUseAgain(t)} className="rounded-full bg-hero-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                    Use Again
                  </button>
                  <button type="button" onClick={() => setEditingTest(t)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-paper">Edit</button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="ml-auto text-xs font-semibold text-crimson hover:underline disabled:opacity-60"
                  >
                    {deletingId === t.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <SavedTestEditModal
        savedTest={editingTest}
        onClose={() => setEditingTest(null)}
        onSaved={(updated) => { setSavedTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t))); setEditingTest(null); }}
      />
    </>
  );
}

// Editing a Saved Test only ever rewrites the template row itself — any
// Conducted Test previously created from it (via Use Again) already has its
// own independent copy of the question paper and is completely unaffected.
function SavedTestEditModal({ savedTest, onClose, onSaved }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [questions, setQuestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const handlers = useQuestionHandlers(setQuestions);

  useEffect(() => {
    if (!savedTest) return;
    setTitle(savedTest.title);
    setSubject(savedTest.subject);
    setDescription(savedTest.description || '');
    setDurationMinutes(savedTest.duration_minutes);
    setQuestions(savedTest.questions.map(questionFromStored));
    setError('');
  }, [savedTest]);

  if (!savedTest) return null;

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (questions.length === 0) { setError('Add at least one question.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const updated = await updateSavedTest(savedTest.id, {
        title, subject: subject || 'General', description, duration_minutes: durationMinutes,
        questions: questions.map(({ _key, ...q }) => q),
      });
      showToast('Saved test updated.', 'success');
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Could not update this saved test.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit saved test">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Subject" value={subject} onChange={setSubject} placeholder="General" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Description (optional)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this test covers…" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <Field label="Duration (minutes)" type="number" value={durationMinutes} onChange={(v) => setDurationMinutes(Number(v))} />
        <QuestionsEditor questions={questions} setQuestions={setQuestions} {...handlers} />
        {error && <p className="text-xs text-crimson">{error}</p>}
        <button type="button" onClick={handleSave} disabled={submitting} className="w-full rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}

// Datetime-local inputs give "YYYY-MM-DDTHH:MM" in the browser's local time
// with no timezone suffix — new Date() on that string parses it as local
// time too, so this stays consistent end to end without any manual offset math.
function computeDurationMinutes(startLocal, endLocal) {
  if (!startLocal || !endLocal) return null;
  const start = new Date(startLocal).getTime();
  const end = new Date(endLocal).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
}
function formatDurationLabel(minutes) {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

// Option B — Fixed Date + Test Duration. Faculty picks one start moment and
// a duration preset; the end time is derived automatically (e.g. a 3:00 PM
// start + "1 hour" duration ends at 4:00 PM). Values are minutes.
const DURATION_PRESETS = [
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1 hour 30 minutes', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
];
// "YYYY-MM-DDTHH:MM" (local, no timezone suffix) + minutes -> the same
// shaped local datetime string, so it composes with computeDurationMinutes
// and the rest of the form exactly like a hand-picked end time would.
function addMinutesToLocal(startLocal, minutes) {
  if (!startLocal || !minutes) return '';
  const d = new Date(startLocal);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CreateTestModal({ open, prefill, onClose, onCreated }) {
  const { showToast } = useToast();
  const [sections, setSections] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  // Advanced Test Scheduling — 'window' keeps the original start+end date/
  // time fields exactly as they always worked (Option A); 'duration' is
  // Option B (fixed date + duration preset, end time computed for you);
  // 'range' is Option C — Fixed Date Range + Individual Test Duration: a
  // start date/time, an end DATE (availability window), and a duration that
  // every student gets individually, counted from their own actual start.
  const [scheduleMode, setScheduleMode] = useState('window');
  const [startDate, setStartDate] = useState('');
  const [startClock, setStartClock] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endClock, setEndClock] = useState('');
  const [durationDate, setDurationDate] = useState('');
  const [durationClock, setDurationClock] = useState('');
  const [durationPreset, setDurationPreset] = useState(60);
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeStartClock, setRangeStartClock] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [rangeDurationPreset, setRangeDurationPreset] = useState(60);
  const [questions, setQuestions] = useState([blankMcq()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('edit'); // 'edit' | 'preview'

  // Faculty sets starting date, starting time, ending date, and ending time
  // as four separate fields (Option A); these two combined
  // "YYYY-MM-DDTHH:MM" strings are what the rest of this form (duration
  // calc, preview, submit) works with, same as the single datetime-local
  // field did before.
  const windowStartTime = startDate && startClock ? `${startDate}T${startClock}` : '';
  const windowEndTime = endDate && endClock ? `${endDate}T${endClock}` : '';

  // Option B: a single start moment (date + time) plus a duration preset —
  // the end time is always derived, never entered directly.
  const durationStartTime = durationDate && durationClock ? `${durationDate}T${durationClock}` : '';
  const durationEndTime = addMinutesToLocal(durationStartTime, durationPreset);

  // Option C — Fixed Date Range + Individual Test Duration: the ending date
  // marks the END of the availability window (11:59 PM that day), completely
  // independent of the duration — every student who starts gets the full
  // duration individually, capped only by this window's end.
  const rangeStartTime = rangeStartDate && rangeStartClock ? `${rangeStartDate}T${rangeStartClock}` : '';
  const rangeEndTime = rangeEndDate ? `${rangeEndDate}T23:59` : '';

  // Whichever scheduling method is active resolves to the same
  // start/end/duration trio the rest of the form (preview, validation,
  // submit) already knows how to work with.
  const startTime = scheduleMode === 'duration' ? durationStartTime : scheduleMode === 'range' ? rangeStartTime : windowStartTime;
  const endTime = scheduleMode === 'duration' ? durationEndTime : scheduleMode === 'range' ? rangeEndTime : windowEndTime;
  const durationMinutes = scheduleMode === 'duration'
    ? (durationStartTime ? durationPreset : null)
    : scheduleMode === 'range'
    ? (rangeStartTime && rangeEndTime ? rangeDurationPreset : null)
    : computeDurationMinutes(windowStartTime, windowEndTime);

  useEffect(() => {
    if (!open) return;
    setStep('edit');
    fetchMySections().then((secs) => { setSections(secs); if (secs[0]) setSectionId(secs[0].id); }).catch(() => {});
    // "Use Again" from a Saved Test: prefill the same questions/title/
    // subject/duration. Section, date/time, and other scheduling are left
    // for the faculty to choose fresh — nothing is auto-assigned or
    // auto-scheduled from the template.
    if (prefill) {
      setTitle(prefill.title);
      setSubject(prefill.subject);
      setDescription(prefill.description || '');
      setQuestions(prefill.questions.map(questionFromStored));
      const preset = DURATION_PRESETS.find((p) => p.minutes === prefill.duration_minutes);
      if (preset) setDurationPreset(preset.minutes);
    } else {
      setTitle(''); setSubject(''); setDescription(''); setQuestions([blankMcq()]);
    }
  }, [open, prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const { updateQuestion, updateOption, addOption, removeOption, removeQuestion, updateTestCase, addTestCase, removeTestCase } = useQuestionHandlers(setQuestions);

  const validate = () => {
    if (!title.trim() || !sectionId) return 'Title and section are required.';
    if (questions.length === 0) return 'Add at least one question.';
    if (scheduleMode === 'duration') {
      if (!durationDate || !durationClock) return 'Test date and start time are required.';
      if (!durationPreset) return 'Choose a test duration.';
    } else if (scheduleMode === 'range') {
      if (!rangeStartDate || !rangeStartClock || !rangeEndDate) return 'Starting date, starting time, and ending date are all required.';
      if (!rangeDurationPreset) return 'Choose a test duration.';
      if (new Date(rangeEndTime).getTime() <= new Date(rangeStartTime).getTime()) return 'Ending date must be on or after the starting date.';
    } else {
      if (!startDate || !startClock || !endDate || !endClock) return 'Starting date, starting time, ending date, and ending time are all required.';
      if (!durationMinutes) return 'Ending date/time must be after starting date/time.';
    }
    return '';
  };

  // "Save Test" — available whether the test is still a draft or already
  // published (see handleSubmit below): snapshots the current question
  // paper into Saved Tests as its own independent template. This never
  // publishes/creates a Conducted Test and never touches one that already
  // exists. `templateToken` makes an accidental double-click safe: it's
  // reused for the life of this open modal, so a second click for the same
  // draft returns the same saved row instead of inserting a duplicate.
  const [templateToken] = useState(() => `tpl_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const handleSaveTemplate = async () => {
    if (!title.trim() || questions.length === 0) { setError('Add a title and at least one question before saving.'); return; }
    if (savingTemplate) return;
    setSavingTemplate(true);
    try {
      await saveTestTemplate({
        title, subject: subject || 'General', description,
        duration_minutes: durationMinutes || 20,
        questions: questions.map(({ _key, ...q }) => q),
        client_token: templateToken,
      });
      showToast('Saved to Saved Tests.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save this test as a template.', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleContinueToPreview = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep('preview');
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); setStep('edit'); return; }
    setSubmitting(true);
    setError('');
    try {
      const test = await createTest({
        title, subject: subject || 'General', section_id: sectionId,
        duration_minutes: durationMinutes, schedule_mode: scheduleMode,
        start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString(),
        questions: questions.map(({ _key, ...q }) => q),
      });
      onCreated(test);
      showToast('Test created.', 'success');
      setTitle(''); setDescription(''); setSubject(''); setStartDate(''); setStartClock(''); setEndDate(''); setEndClock('');
      setDurationDate(''); setDurationClock(''); setDurationPreset(60);
      setRangeStartDate(''); setRangeStartClock(''); setRangeEndDate(''); setRangeDurationPreset(60);
      setScheduleMode('window'); setQuestions([blankMcq()]);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create this test.');
      setStep('edit');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'preview') {
    const selectedSection = sections.find((s) => s.id === sectionId);
    return (
      <Modal open={open} onClose={onClose} title="Preview test">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper p-4">
            <h3 className="text-base font-bold text-ink">{title || 'Untitled test'}</h3>
            {description && <p className="mt-1 text-sm text-ink-light">{description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-light">
              <span><span className="font-semibold text-ink">Subject:</span> {subject || 'General'}</span>
              <span><span className="font-semibold text-ink">Section:</span> {selectedSection?.name || '—'}</span>
              <span><span className="font-semibold text-ink">Questions:</span> {questions.length}</span>
              <span><span className="font-semibold text-ink">Total marks:</span> {questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-light">
              <span><span className="font-semibold text-ink">Scheduling:</span> {scheduleMode === 'duration' ? 'Fixed date + duration' : scheduleMode === 'range' ? 'Fixed date range + individual duration' : 'Fixed start & end time'}</span>
              <span><span className="font-semibold text-ink">{scheduleMode === 'range' ? 'Window opens:' : 'Start:'}</span> {startTime ? new Date(startTime).toLocaleString() : '—'}</span>
              <span><span className="font-semibold text-ink">{scheduleMode === 'range' ? 'Window closes:' : 'End:'}</span> {endTime ? new Date(endTime).toLocaleString() : '—'}</span>
              <span><span className="font-semibold text-ink">{scheduleMode === 'range' ? 'Duration per student:' : 'Duration:'}</span> {formatDurationLabel(durationMinutes)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q._key} className="rounded-lg border border-line p-3">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-ink-light">
                  <span>Question {i + 1} · {q.type === 'mcq' ? 'Multiple choice' : q.type === 'code' ? 'Coding' : 'Theory'}</span>
                  <span>{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                </div>
                <p className="text-sm text-ink">{q.text || <span className="italic text-ink-light">No question text</span>}</p>
                {q.type === 'mcq' && (
                  <ul className="mt-2 space-y-1 text-xs text-ink-light">
                    {q.options.map((opt, oi) => (
                      <li key={oi} className={oi === q.correct_index ? 'font-semibold text-teal' : ''}>
                        {oi === q.correct_index ? '✓ ' : '· '}{opt || `Option ${oi + 1}`}
                      </li>
                    ))}
                  </ul>
                )}
                {q.type === 'code' && (
                  <p className="mt-1 text-xs text-ink-light">
                    Language: <span className="font-semibold capitalize">{q.language}</span> · {q.test_cases.length} test case{q.test_cases.length === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-crimson">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('edit')} className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">
              ← Back to edit
            </button>
            <button
              type="button" onClick={handleSaveTemplate} disabled={savingTemplate}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
              title="Save this question paper to Saved Tests so you can reuse it later"
            >
              {savingTemplate ? 'Saving…' : '💾 Save Test'}
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? 'Publishing…' : 'Publish test'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="New test">
      <form onSubmit={handleContinueToPreview} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Subject" value={subject} onChange={setSubject} placeholder="General" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Description (optional)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this test covers…" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Section</label>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm">
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Test scheduling</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScheduleMode('window')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                scheduleMode === 'window' ? 'border-hero-primary bg-hero-primary/10 text-hero-primary' : 'border-line text-ink-light hover:bg-paper'
              }`}
            >
              Fixed start &amp; end time
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('duration')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                scheduleMode === 'duration' ? 'border-hero-primary bg-hero-primary/10 text-hero-primary' : 'border-line text-ink-light hover:bg-paper'
              }`}
            >
              Fixed date + duration
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('range')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                scheduleMode === 'range' ? 'border-hero-primary bg-hero-primary/10 text-hero-primary' : 'border-line text-ink-light hover:bg-paper'
              }`}
            >
              Date range + individual duration
            </button>
          </div>
        </div>

        {scheduleMode === 'range' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starting date" type="date" value={rangeStartDate} onChange={setRangeStartDate} />
              <Field label="Starting time" type="time" value={rangeStartClock} onChange={setRangeStartClock} />
            </div>
            <Field label="Ending date" type="date" value={rangeEndDate} onChange={setRangeEndDate} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Duration (given to every student individually)</label>
              <select
                value={rangeDurationPreset}
                onChange={(e) => setRangeDurationPreset(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              >
                {DURATION_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-ink-light">
              The test stays open to students from the starting date/time through 11:59 PM on the ending date. Each
              student who starts gets the full duration above, timed individually from the moment <em>they</em> begin
              — not from when the window opened. A student who starts late still can't run past the window's ending
              date/time.
            </p>
          </>
        ) : scheduleMode === 'window' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starting date" type="date" value={startDate} onChange={setStartDate} />
              <Field label="Starting time" type="time" value={startClock} onChange={setStartClock} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ending date" type="date" value={endDate} onChange={setEndDate} />
              <Field label="Ending time" type="time" value={endClock} onChange={setEndClock} />
            </div>
            <p className="text-xs text-ink-light">
              Duration is calculated automatically from the window above: <span className="font-semibold text-ink">{formatDurationLabel(durationMinutes)}</span>.
              The test is only accessible to students between these times.
            </p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Test date" type="date" value={durationDate} onChange={setDurationDate} />
              <Field label="Start time" type="time" value={durationClock} onChange={setDurationClock} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Duration</label>
              <select
                value={durationPreset}
                onChange={(e) => setDurationPreset(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              >
                {DURATION_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-ink-light">
              Ending time is calculated automatically:{' '}
              <span className="font-semibold text-ink">{endTime ? new Date(endTime).toLocaleString() : '—'}</span>.
              The test is only accessible to students between these times.
            </p>
          </>
        )}

        <QuestionsEditor
          questions={questions} setQuestions={setQuestions}
          updateQuestion={updateQuestion} updateOption={updateOption} addOption={addOption} removeOption={removeOption}
          removeQuestion={removeQuestion} updateTestCase={updateTestCase} addTestCase={addTestCase} removeTestCase={removeTestCase}
        />

        {error && <p className="text-xs text-crimson">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button" onClick={handleSaveTemplate} disabled={savingTemplate}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
            title="Save this question paper to Saved Tests so you can reuse it later"
          >
            {savingTemplate ? 'Saving…' : '💾 Save Test'}
          </button>
          <button type="submit" className="flex-1 rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white">
            Preview test →
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResultsModal({ testId, onClose, onGraded }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gradingSubId, setGradingSubId] = useState(null);

  const load = () => {
    if (!testId) return;
    setLoading(true);
    fetchTestResults(testId).then(setData).catch((err) => showToast(err.message || 'Could not load results.', 'error')).finally(() => setLoading(false));
  };
  useEffect(load, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!testId) return null;

  return (
    <Modal open onClose={onClose} title={data?.test?.title ? `Results — ${data.test.title}` : 'Results'}>
      {loading || !data ? (
        <LoadingSpinner label="Loading…" />
      ) : (
        <div className="space-y-5">
          {data.submissions.length === 0 ? (
            <p className="text-sm text-ink-light">No accepted submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {data.submissions.map((s) => (
                <div key={s.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{s.student_name}</span>
                    <span className="text-sm font-bold text-teal">{s.score} / {data.test.total_marks}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-light">
                    {!s.fully_graded && <span className="font-semibold text-gold">Needs grading</span>}
                    {s.submission_reason === 'tab_switch' && (
                      <span className="font-semibold text-crimson" title="Automatically submitted after the student switched away from the test tab.">
                        ⚠️ Submitted — Tab Switch
                      </span>
                    )}
                    <span>Submitted {new Date(s.submitted_at).toLocaleString()}</span>
                  </div>
                  {!s.fully_graded && (
                    <button type="button" onClick={() => setGradingSubId(gradingSubId === s.id ? null : s.id)} className="mt-2 text-xs font-semibold text-teal hover:underline">
                      {gradingSubId === s.id ? 'Close' : 'Grade theory answers'}
                    </button>
                  )}
                  {gradingSubId === s.id && (
                    <GradeForm test={data.test} submission={s} onGraded={() => { load(); onGraded(); }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {data.test.has_code && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-light">Code test attempts</h3>
              <p className="mb-2 text-[11px] text-ink-light">Every run is logged with its time, including solutions that didn't pass and were never accepted.</p>
              {(!data.code_attempts || data.code_attempts.length === 0) ? (
                <p className="text-sm text-ink-light">No code attempts yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.code_attempts.map((a) => {
                    const q = data.test.questions.find((qq) => qq.id === a.question_id);
                    return (
                      <div key={a.id} className="rounded-lg border border-line p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink">{a.student_name} · {q?.text || 'Code question'}</span>
                          <span className={`font-bold ${a.passed ? 'text-teal' : 'text-crimson'}`}>{a.passed ? 'Passed' : 'Rejected'}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-light">
                          <span className="capitalize">{a.language}</span>
                          <span>{new Date(a.attempted_at).toLocaleString()}</span>
                          <span>{a.final ? 'Submit attempt' : 'Test run'}</span>
                          <span>{(a.results || []).filter((r) => r.passed).length}/{(a.results || []).length} test cases passed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab/page-switch monitoring log — never affects a student's
              submission (see TestAttempt.jsx); this is purely a record of
              when a student left the test page, for the faculty responsible
              for this test/section to review. */}
          <div className="border-t border-line pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-light">⚠️ Tab / page-switch activity</h3>
            {(!data.activity_log || data.activity_log.length === 0) ? (
              <p className="text-sm text-ink-light">No tab-switching or page-switching detected during this test.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.activity_counts || {}).map(([username, count]) => {
                    const name = data.activity_log.find((a) => a.student_username === username)?.student_name || username;
                    return (
                      <span key={username} className="rounded-full bg-crimson/10 px-2.5 py-1 text-[11px] font-bold text-crimson">
                        {name} · {count} occurrence{count === 1 ? '' : 's'}
                      </span>
                    );
                  })}
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {data.activity_log.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-crimson/20 bg-crimson/5 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-ink">{a.student_name}</span>
                      <span className="text-ink-light">
                        {a.event_type === 'tab_switch_auto_submit' ? 'switched away — test auto-submitted' : 'switched away from the test page'}
                      </span>
                      <span className="font-mono text-[11px] text-ink-light">{new Date(a.occurred_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function GradeForm({ test, submission, onGraded }) {
  const { showToast } = useToast();
  const theoryAnswers = submission.answers.filter((a) => a.type === 'theory');
  const [scores, setScores] = useState(Object.fromEntries(theoryAnswers.map((a) => [a.question_id, a.score ?? 0])));
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await gradeSubmission(test.id, submission.id, scores);
      showToast('Grades saved.', 'success');
      onGraded();
    } catch (err) {
      showToast(err.message || 'Could not save grades.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      {theoryAnswers.map((a) => {
        const q = test.questions.find((qq) => qq.id === a.question_id);
        return (
          <div key={a.question_id}>
            <p className="text-xs font-semibold text-ink-light">{q?.text}</p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-paper p-2 text-sm text-ink">{a.answer_text || '(no answer)'}</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number" min={0} max={q?.marks || 0}
                value={scores[a.question_id]}
                onChange={(e) => setScores((s) => ({ ...s, [a.question_id]: Number(e.target.value) }))}
                className="w-20 rounded-lg border border-line bg-paper px-2 py-1 text-sm"
              />
              <span className="text-xs text-ink-light">/ {q?.marks} marks</span>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={handleSave} disabled={submitting} className="rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
        {submitting ? 'Saving…' : 'Save grades'}
      </button>
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
