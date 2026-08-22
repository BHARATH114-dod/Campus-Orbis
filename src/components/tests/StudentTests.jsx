import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAvailableTests, fetchTestToAttempt, fetchTestLeaderboard } from '../../services/testService';
import { requestMonitoringStream, mediaErrorMessage } from '../../utils/testMonitoringMedia';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import TestAttempt from './TestAttempt';
import TestLeaderboardModal from './TestLeaderboardModal';
import Modal from '../common/Modal';

function formatDuration(ms) {
  if (ms == null) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

const STATUS_STYLE = { open: 'bg-teal/10 text-teal', upcoming: 'bg-gold/10 text-gold', closed: 'bg-line/50 text-ink-light' };

// Points at whichever test the student is currently mid-attempt on, if
// any — set the moment a join succeeds, cleared the moment it ends
// (submitted, or the resume attempt turns out to be no longer valid).
// This is what lets a page refresh return the student straight to their
// active test instead of showing "Start test" again and running the
// whole permission/join flow a second time — the actual join itself was
// already idempotent server-side (getOrCreateJoinAnchor reuses the
// existing anchor), but the frontend previously had no memory of it at
// all, so a refresh always looked like square one.
const ACTIVE_TEST_KEY = 'campus-orbis-active-test-id';

export default function StudentTests() {
  const { showToast } = useToast();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attemptTest, setAttemptTest] = useState(null); // full question set once loaded, without answers
  const [attemptSecondsLeft, setAttemptSecondsLeft] = useState(null);
  const [resuming, setResuming] = useState(false); // true only while auto-resuming after a refresh
  const [reviewTestId, setReviewTestId] = useState(null);
  const [resultData, setResultData] = useState(null); // { testId, testTitle, submission, total_marks } or null
  const [leaderboardTest, setLeaderboardTest] = useState(null); // { id, title } or null
  const [starting, setStartingId] = useState(null);
  const monitorStreamRef = useRef(null); // camera+mic MediaStream for the in-progress attempt, or null
  const resumeAttemptedRef = useRef(false); // guards the resume bootstrap against StrictMode's dev double-invoke
  const startInFlightRef = useRef(false); // guards handleStart against a second call landing before `starting` re-renders the disabled button
  // True whenever this component instance is mounted; the resume effect
  // below uses it (not a per-effect-run local) to know whether it's safe
  // to setState once its async work resolves. A per-run local variable
  // gets permanently poisoned by React 18 StrictMode's dev-only
  // mount→cleanup→mount double-invoke — the cleanup for run 1 fires
  // synchronously as part of that cycle, which would mark run 1
  // "cancelled" forever even though run 1 is the one whose promise
  // actually goes on to resolve (resumeAttemptedRef above ensures only
  // one resume routine is ever started in the first place). Setting this
  // ref to true again at the top of every effect run — not just once —
  // is what makes it settle back to "mounted" once the double-invoke
  // cycle finishes, while a real unmount still flips it to false.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = () => {
    setLoading(true);
    fetchAvailableTests().then(setTests).catch((err) => showToast(err.message || 'Could not load tests.', 'error')).finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stops and releases the camera/mic stream, if one is currently held.
  // This is the ONLY place a stream is ever stopped — the recorder in
  // TestAttempt.jsx only uses the stream, it never ends it (see the block
  // comment there for why that used to crash the page).
  const releaseMonitorStream = () => {
    monitorStreamRef.current?.getTracks().forEach((t) => t.stop());
    monitorStreamRef.current = null;
  };

  // Safety net: if the student navigates away from Tests entirely while
  // still mid-attempt (rather than submitting), make sure the camera
  // doesn't keep running in the background.
  useEffect(() => () => releaseMonitorStream(), []);

  // Test Monitoring: camera + microphone permission is requested — and
  // must be granted — BEFORE the student is allowed to open the test at
  // all. A student who declines (or whose device has no camera/mic)
  // never joins; nothing is recorded without this consent step.
  const handleStart = async (id) => {
    // The Start button disables itself via `starting === t.id`, but that
    // only takes effect once React re-renders — a very fast double-click
    // (or a duplicate call from anywhere else) can still land before
    // then. This ref closes that window synchronously, so the permission
    // prompt is only ever requested once and only one error can ever be
    // shown for one click.
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    setStartingId(id);
    try {
      const result = await requestMonitoringStream();
      if (!result.ok) {
        // Precise, single message: browser-unsupported, permission
        // denied, device busy, or camera/mic missing are all reported
        // distinctly — see testMonitoringMedia.js — never a blanket
        // "unsupported" for something that was actually just denied or
        // still pending.
        showToast(mediaErrorMessage(result.reason), 'error');
        return;
      }
      const stream = result.stream;
      try {
        const { test, submission, seconds_left } = await fetchTestToAttempt(id);
        if (submission) { stream.getTracks().forEach((t) => t.stop()); setReviewTestId(id); return; }
        monitorStreamRef.current = stream;
        try { localStorage.setItem(ACTIVE_TEST_KEY, id); } catch { /* storage unavailable — refresh-resume just won't work this session */ }
        setAttemptTest(test);
        setAttemptSecondsLeft(seconds_left);
      } catch (err) {
        stream.getTracks().forEach((t) => t.stop());
        showToast(err.message || 'Could not start this test.', 'error');
      }
    } finally {
      startInFlightRef.current = false;
      setStartingId(null);
    }
  };

  // Refresh-resume: on mount, if a previous session left an active test
  // pointer behind, silently pick the attempt back up instead of showing
  // the tests list / "Start test" button. getUserMedia here does NOT
  // re-prompt the student — the browser already remembers this origin was
  // granted camera/mic access, so it resolves immediately. The test join
  // itself is safe to repeat: the server reuses the same join anchor
  // (getOrCreateJoinAnchor), so this never creates a duplicate join or
  // grants extra time.
  useEffect(() => {
    if (resumeAttemptedRef.current) return; // StrictMode dev double-invoke guard — only ever try once
    let storedId;
    try { storedId = localStorage.getItem(ACTIVE_TEST_KEY); } catch { storedId = null; }
    if (!storedId) return;
    resumeAttemptedRef.current = true;
    setResuming(true);
    (async () => {
      const result = await requestMonitoringStream();
      if (!result.ok) {
        // Permission is no longer available (revoked, different device,
        // browser genuinely unsupported, etc.) — can't silently resume
        // monitoring, so fall back to the normal list rather than
        // getting stuck. One message, matching whichever of the
        // distinct reasons actually applies.
        try { localStorage.removeItem(ACTIVE_TEST_KEY); } catch { /* ignore */ }
        if (mountedRef.current) {
          showToast(`Could not resume your test — ${mediaErrorMessage(result.reason)}`, 'error');
          setResuming(false);
        }
        return;
      }
      const stream = result.stream;
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      try {
        const { test, submission, seconds_left } = await fetchTestToAttempt(storedId);
        if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (submission) {
          // Already finished (submitted from another tab, or a tab-switch
          // auto-submit landed after the refresh) — nothing to resume.
          stream.getTracks().forEach((t) => t.stop());
          try { localStorage.removeItem(ACTIVE_TEST_KEY); } catch { /* ignore */ }
          setResuming(false);
          return;
        }
        monitorStreamRef.current = stream;
        setAttemptTest(test);
        setAttemptSecondsLeft(seconds_left);
        setResuming(false);
      } catch (err) {
        stream.getTracks().forEach((t) => t.stop());
        try { localStorage.removeItem(ACTIVE_TEST_KEY); } catch { /* ignore */ }
        if (mountedRef.current) {
          showToast(err.message || 'Could not resume your test — the window may have closed.', 'error');
          setResuming(false);
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // RESULT PAGE — shown right after a confirmed Submit Exam, not just a
  // toast: Score, Correct, Wrong, Attempted, Time Taken, Submitted At, and
  // rank if available (see ResultModal below).
  const handleDone = (result) => {
    const submittedTestId = attemptTest?.id;
    const submittedTestTitle = attemptTest?.title;
    setAttemptTest(null);
    releaseMonitorStream();
    try { localStorage.removeItem(ACTIVE_TEST_KEY); } catch { /* ignore */ }
    if (result?.submission) {
      setResultData({ testId: submittedTestId, testTitle: submittedTestTitle, submission: result.submission, total_marks: result.total_marks });
    }
    load();
  };

  // If TestAttempt somehow still throws despite the guards in its
  // recorder code, this stops the camera and drops back to the tests
  // list instead of leaving the student on a blank page.
  const handleAttemptCrash = () => {
    setAttemptTest(null);
    releaseMonitorStream();
    try { localStorage.removeItem(ACTIVE_TEST_KEY); } catch { /* ignore */ }
    load();
  };

  if (resuming) {
    return <LoadingSpinner label="Resuming your test…" />;
  }

  if (attemptTest) {
    return (
      <ErrorBoundary message="Something went wrong loading your test. Your answers up to this point were auto-saved." onReset={handleAttemptCrash}>
        <TestAttempt test={attemptTest} initialSecondsLeft={attemptSecondsLeft} onDone={handleDone} monitorStream={monitorStreamRef.current} />
      </ErrorBoundary>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Tests</h1>
      <p className="mb-6 text-sm text-ink-light">Tests assigned to your section.</p>

      {loading ? (
        <LoadingSpinner label="Loading tests…" />
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">No tests assigned yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tests.map((t) => (
            <div key={t.id} className="rounded-2xl border border-line bg-paper-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-ink">{t.title}</h3>
                  <p className="text-sm text-ink-light">{t.subject} · {t.created_by_name}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-light">
                <span>{t.question_count} question{t.question_count === 1 ? '' : 's'}</span>
                <span>{t.duration_minutes} min</span>
                <span>{t.total_marks} marks</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {t.submitted ? (
                  <>
                    <button type="button" onClick={() => setReviewTestId(t.id)} className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-paper">
                      {t.fully_graded ? `Review — ${t.score}/${t.total_marks}` : 'View submission (pending grading)'}
                    </button>
                    {t.submission_reason === 'tab_switch' && (
                      <span className="rounded-full bg-crimson/10 px-3 py-1 text-[11px] font-bold text-crimson" title="This test was automatically submitted after you switched away from the test tab.">
                        Submitted — Tab Switch
                      </span>
                    )}
                  </>
                ) : t.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => handleStart(t.id)}
                    disabled={starting === t.id}
                    className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {starting === t.id ? 'Loading…' : 'Start test'}
                  </button>
                ) : (
                  <span className="rounded-full bg-line/50 px-3 py-1 text-xs font-semibold text-ink-light">
                    {t.status === 'upcoming' ? 'Not open yet' : 'Window closed'}
                  </span>
                )}
                {t.status !== 'upcoming' && (
                  <button
                    type="button"
                    onClick={() => setLeaderboardTest({ id: t.id, title: t.title })}
                    className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-paper"
                  >
                    🏆 Leaderboard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReviewModal testId={reviewTestId} onClose={() => setReviewTestId(null)} />
      <ResultModal data={resultData} onClose={() => setResultData(null)} onViewLeaderboard={() => { setLeaderboardTest({ id: resultData.testId, title: resultData.testTitle }); setResultData(null); }} />
      <TestLeaderboardModal testId={leaderboardTest?.id || null} testTitle={leaderboardTest?.title} onClose={() => setLeaderboardTest(null)} />
    </div>
  );
}

// RESULT PAGE — shown immediately after a confirmed Submit Exam. Score,
// correct/wrong/attempted counts and time taken come straight from the
// submit response (all server-computed); rank is fetched separately from
// the per-test leaderboard once it's had a moment to include this
// submission.
function ResultModal({ data, onClose, onViewLeaderboard }) {
  const { user } = useAuth();
  const [rank, setRank] = useState(null); // number | null | 'loading'

  useEffect(() => {
    if (!data) { setRank(null); return; }
    setRank('loading');
    fetchTestLeaderboard(data.testId)
      .then((lb) => {
        const mine = lb.leaderboard.find((e) => e.username === user?.username);
        setRank(mine ? mine.rank : null);
      })
      .catch(() => setRank(null));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;
  const { submission, total_marks } = data;
  const totalQuestions = submission.answers.length;
  const attempted = submission.answers.filter((a) => {
    if (a.type === 'mcq') return a.selected_index !== -1 && a.selected_index != null;
    if (a.type === 'code') return !!(a.code && a.code.trim());
    return !!(a.answer_text && a.answer_text.trim());
  }).length;

  return (
    <Modal open onClose={onClose} title="Exam Submitted Successfully">
      <div className="space-y-4">
        {submission.submission_reason === 'tab_switch' && (
          <p className="rounded-lg bg-crimson/10 px-3 py-2 text-xs font-semibold text-crimson">
            ⚠️ Your test was automatically submitted because you switched away from the test tab.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Score" value={`${submission.score} / ${total_marks}`} />
          <Stat label="Points" value={submission.points} accent="text-teal" />
          <Stat label="Correct Answers" value={submission.correct_count} accent="text-teal" />
          <Stat label="Wrong Answers" value={submission.wrong_count} accent="text-crimson" />
          <Stat label="Attempted" value={`${attempted}/${totalQuestions}`} />
          <Stat label="Time Taken" value={formatDuration(submission.time_taken_ms)} />
        </div>
        <p className="text-xs text-ink-light">Submitted At: {new Date(submission.submitted_at).toLocaleString()}</p>
        {!submission.fully_graded && (
          <p className="rounded-lg bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">Theory answers are pending your faculty's review — your final score may change.</p>
        )}
        <p className="text-sm font-semibold text-ink">
          {rank === 'loading' ? 'Checking your rank…' : rank ? `🏆 Rank #${rank} on the leaderboard` : 'Rank not available yet.'}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper">Close</button>
          <button type="button" onClick={onViewLeaderboard} className="flex-1 rounded-lg bg-hero-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">🏆 View Leaderboard</button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, accent = 'text-ink' }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-light">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function ReviewModal({ testId, onClose }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId) { setData(null); return; }
    setLoading(true);
    fetchTestToAttempt(testId).then(setData).catch((err) => showToast(err.message || 'Could not load your submission.', 'error')).finally(() => setLoading(false));
  }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!testId) return null;

  return (
    <Modal open onClose={onClose} title={data?.test?.title ? `Review — ${data.test.title}` : 'Review'}>
      {loading || !data ? (
        <LoadingSpinner label="Loading…" />
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink">
            Score: {data.submission.score} / {data.test.total_marks}
            {!data.submission.fully_graded && <span className="ml-2 text-xs font-normal text-gold">(theory answers pending grading)</span>}
            {data.submission.submission_reason === 'tab_switch' && <span className="ml-2 text-xs font-normal text-crimson">(auto-submitted — tab switch)</span>}
          </p>
          {data.test.questions.map((q, i) => {
            const ans = data.submission.answers.find((a) => a.question_id === q.id);
            return (
              <div key={q.id} className="rounded-lg border border-line p-3">
                <p className="text-sm font-semibold text-ink">{i + 1}. {q.text}</p>
                {q.type === 'mcq' ? (
                  <div className="mt-2 space-y-1 text-sm">
                    {q.options.map((opt, oi) => (
                      <p key={oi} className={
                        oi === q.correct_index ? 'font-semibold text-teal' :
                        oi === ans?.selected_index ? 'font-semibold text-crimson' : 'text-ink-light'
                      }>
                        {oi === q.correct_index ? '✓ ' : oi === ans?.selected_index ? '✕ ' : '· '}{opt}
                      </p>
                    ))}
                  </div>
                ) : q.type === 'code' ? (
                  <>
                    <p className="mt-1 text-xs text-ink-light">Language: <span className="font-semibold capitalize">{q.language}</span></p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-paper p-2 font-mono text-xs text-ink">{ans?.code || '(no code submitted)'}</pre>
                    <p className="mt-1 text-xs text-ink-light">
                      {(ans?.results || []).filter((r) => r.passed).length}/{(ans?.results || []).length} test cases passed · {ans?.score ?? 0} / {q.marks} marks
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-2 text-sm text-ink">{ans?.answer_text || '(no answer)'}</p>
                    <p className="mt-1 text-xs text-ink-light">{ans?.score ?? '—'} / {q.marks} marks</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
