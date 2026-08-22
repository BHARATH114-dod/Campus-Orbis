import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchCompetitionQuizzes,
  createCompetitionQuiz,
  deleteCompetitionQuiz,
  joinCompetitionQuiz,
  startCompetitionQuiz,
  fetchCompetitionQuizSession,
  submitCompetitionQuizAnswer,
  fetchCompetitionQuizParticipants,
} from '../services/competitionService';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CAN_CREATE_QUIZ_ROLES = ['college_admin', 'hod', 'faculty'];

// Spec item 3: Competition is now its own main section, entirely separate
// from Clubs — everything quiz-related (create, join, live play, live
// leaderboard, final results) lives here.
export default function Competition() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [liveQuizId, setLiveQuizId] = useState(null);

  const canCreate = CAN_CREATE_QUIZ_ROLES.includes(role);

  const load = () => {
    setLoading(true);
    fetchCompetitionQuizzes()
      .then(setQuizzes)
      .catch((err) => showToast(err.message || 'Could not load quizzes.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Arriving here from Clubs → "Have a code?" → Join a Quiz, already joined.
  useEffect(() => {
    if (location.state?.autoJoinQuizId) setLiveQuizId(location.state.autoJoinQuizId);
  }, [location.state]);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await joinCompetitionQuiz(joinCode.trim());
      showToast(`Joined "${res.title}" on behalf of ${res.club_name}.`, 'success');
      setJoinCode('');
      setLiveQuizId(res.quiz_id);
    } catch (err) {
      showToast(err.message || 'That quiz code did not work.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Remove this quiz? This cannot be undone.')) return;
    try {
      await deleteCompetitionQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      showToast('Quiz removed.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not remove this quiz.', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Competition</h1>
          <p className="text-sm text-ink-light">Live, club-vs-club quizzes — Kahoot-style.</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-full bg-gradient-to-r from-purple to-hero-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
          >
            + New quiz
          </button>
        )}
      </div>

      <form onSubmit={handleJoinByCode} className="mb-6 flex gap-2 rounded-2xl border border-dashed border-gold bg-gold/5 p-4">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Have a quiz code? Enter it here…"
          className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm uppercase tracking-wider"
        />
        <button
          type="submit"
          disabled={joining || !joinCode.trim()}
          className="rounded-lg bg-gold px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {joining ? 'Joining…' : 'Join quiz'}
        </button>
      </form>

      {loading ? (
        <LoadingSpinner label="Loading quizzes…" />
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">
          No competition quizzes yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <div key={q.id} className="rounded-2xl border border-line bg-paper-card p-5 shadow-sm">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  q.status === 'lobby'
                    ? 'bg-gold/10 text-gold'
                    : q.status === 'finished'
                    ? 'bg-ink-light/10 text-ink-light'
                    : 'bg-teal/10 text-teal'
                }`}
              >
                {q.status === 'lobby' ? 'Waiting to start' : q.status === 'finished' ? 'Finished' : 'Live'}
              </span>
              <h3 className="mt-2 text-base font-semibold text-ink">{q.title}</h3>
              <p className="mt-1 text-xs text-ink-light">
                {q.question_count} question{q.question_count === 1 ? '' : 's'} · by {q.created_by_name}
              </p>
              {q.can_manage && q.quiz_code && (
                <p className="mt-1 font-mono text-xs font-bold tracking-widest text-hero-primary">Code: {q.quiz_code}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {q.can_manage && (
                  <button
                    type="button"
                    onClick={() => setLiveQuizId(q.id)}
                    className="rounded-full bg-hero-primary px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Host
                  </button>
                )}
                {q.can_manage && (
                  <button type="button" onClick={() => handleDeleteQuiz(q.id)} className="ml-auto text-xs font-semibold text-crimson hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCompetitionQuizModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(quiz) => setQuizzes((prev) => [{ ...quiz, can_manage: true }, ...prev])}
      />

      <LiveQuizView quizId={liveQuizId} onClose={() => setLiveQuizId(null)} />
    </div>
  );
}

const TIME_LIMIT_OPTIONS = [10, 20, 30, 45, 60];
const EMPTY_QUESTION = () => ({ text: '', options: ['', '', '', ''], correct_index: 0, time_limit_seconds: 30, max_points: 10 });

function CreateCompetitionQuizModal({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([EMPTY_QUESTION()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateQuestion = (i, patch) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };
  const updateOption = (i, optIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, options: q.options.map((o, oi) => (oi === optIdx ? value : o)) } : q))
    );
  };
  const addQuestion = () => setQuestions((prev) => [...prev, EMPTY_QUESTION()]);
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Quiz name is required.');
      return;
    }
    for (const q of questions) {
      if (!q.text.trim() || q.options.some((o) => !o.trim())) {
        setError('Every question needs text and all options filled in.');
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const quiz = await createCompetitionQuiz({ title, description, questions });
      onCreated(quiz);
      showToast('Quiz created. Its code is on the quiz card — share it once you start.', 'success');
      setTitle('');
      setDescription('');
      setQuestions([EMPTY_QUESTION()]);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create this quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New competition quiz">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="text-xs text-ink-light">
          Any eligible student who's already a member of a club can join with the quiz code — only one
          representative per club will be allowed into any single quiz.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Quiz name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-ink">Question {i + 1}</p>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(i)} className="text-[11px] font-semibold text-crimson hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <input
                value={q.text}
                onChange={(e) => updateQuestion(i, { text: e.target.value })}
                placeholder="Question text"
                className="mb-2 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
              />
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correct_index === oi}
                      onChange={() => updateQuestion(i, { correct_index: oi })}
                      title="Correct answer"
                    />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, oi, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      className="flex-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink">Time limit</label>
                  <select
                    value={q.time_limit_seconds}
                    onChange={(e) => updateQuestion(i, { time_limit_seconds: Number(e.target.value) })}
                    className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs"
                  >
                    {TIME_LIMIT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}s</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink">Max points</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.max_points}
                    onChange={(e) => updateQuestion(i, { max_points: Number(e.target.value) })}
                    className="w-20 rounded-lg border border-line bg-paper px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addQuestion} className="text-xs font-semibold text-hero-primary hover:underline">
          + Add another question
        </button>

        {error && <p className="text-xs text-crimson">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create quiz'}
        </button>
      </form>
    </Modal>
  );
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

// Kahoot-style live quiz — polls the session endpoint roughly every second
// so timers, question transitions, the live leaderboard, and final results
// all stay in sync with the server clock without needing a socket
// connection. Host and every joined club's representative share this one
// component and branch on session.is_host / session.status. Ranked by
// Club Name throughout (spec items 13, 15–17), colourful/energetic styling
// per spec item 14.
function LiveQuizView({ quizId, onClose }) {
  const { showToast } = useToast();
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [answering, setAnswering] = useState(false);
  const [lastAnswer, setLastAnswer] = useState(null);
  const [starting, setStarting] = useState(false);
  const [countdownMs, setCountdownMs] = useState(0);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!quizId) {
      setSession(null);
      setLastAnswer(null);
      setParticipants([]);
      return;
    }
    let cancelled = false;
    const poll = () => {
      fetchCompetitionQuizSession(quizId)
        .then((s) => {
          if (cancelled) return;
          setSession(s);
          setCountdownMs(s.status === 'live' ? s.time_remaining_ms : s.status === 'between' ? s.between_remaining_ms : 0);
          if (s.status !== 'live') setLastAnswer((prev) => (s.status === 'between' ? prev : null));
          if (s.status === 'lobby') {
            fetchCompetitionQuizParticipants(quizId).then((p) => !cancelled && setParticipants(p)).catch(() => {});
          }
        })
        .catch((err) => {
          if (!cancelled) showToast(err.message || 'Lost connection to the quiz.', 'error');
        });
    };
    poll();
    pollRef.current = setInterval(poll, 1200);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [quizId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearInterval(tickRef.current);
    if (!session || (session.status !== 'live' && session.status !== 'between')) return;
    tickRef.current = setInterval(() => setCountdownMs((ms) => Math.max(0, ms - 250)), 250);
    return () => clearInterval(tickRef.current);
  }, [session?.status, session?.current_index]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!quizId) return null;

  const handleAnswer = async (optionIndex) => {
    if (answering || !session?.question) return;
    setAnswering(true);
    try {
      const res = await submitCompetitionQuizAnswer(quizId, optionIndex);
      setLastAnswer({ optionIndex, ...res });
      setSession((s) => (s ? { ...s, answered: true, my_score: res.total_score } : s));
    } catch (err) {
      showToast(err.message || 'Could not submit your answer.', 'error');
    } finally {
      setAnswering(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await startCompetitionQuiz(quizId);
    } catch (err) {
      showToast(err.message || 'Could not start the quiz.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const seconds = Math.ceil(countdownMs / 1000);
  const OPTION_COLORS = ['bg-hero-primary', 'bg-teal', 'bg-gold', 'bg-crimson', 'bg-purple', 'bg-hero-accent'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-purple/90 via-hero-primary/90 to-teal/90 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-paper-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">🏆 {session?.title || 'Competition Quiz'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-light hover:bg-paper">
            Close
          </button>
        </div>

        {!session ? (
          <LoadingSpinner label="Connecting…" />
        ) : session.status === 'lobby' ? (
          <div className="text-center">
            <p className="text-sm text-ink-light">
              Waiting to start · {session.total_questions} question{session.total_questions === 1 ? '' : 's'}
            </p>
            {session.joined && session.my_club_name && (
              <p className="mt-1 text-xs font-semibold text-teal">Playing on behalf of {session.my_club_name}</p>
            )}
            {participants.length > 0 && (
              <div className="mx-auto mt-4 max-w-sm text-left">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-light">Clubs joined</p>
                <ul className="space-y-1">
                  {participants.map((p) => (
                    <li key={p.club_name} className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
                      <span className="font-semibold text-ink">{p.club_name}</span>
                      {session.is_host && <span className="text-xs text-ink-light">{p.name}{p.roll_number ? ` · ${p.roll_number}` : ''}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {session.is_host ? (
              <>
                {session.participant_count !== undefined && (
                  <p className="mt-2 text-xs text-ink-light">{session.participant_count} club{session.participant_count === 1 ? '' : 's'} joined so far</p>
                )}
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={starting}
                  className="mt-4 rounded-full bg-gradient-to-r from-purple to-hero-primary px-8 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
                >
                  {starting ? 'Starting…' : '▶ Start quiz'}
                </button>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-light">The host will start the quiz shortly — everyone starts together. Stay on this screen.</p>
            )}
          </div>
        ) : session.status === 'live' && session.question ? (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-light">
              <span>Question {session.current_index + 1} of {session.total_questions}</span>
              <span
                className={`rounded-full px-3 py-1 font-mono text-sm font-bold transition-colors ${
                  seconds <= 5 ? 'animate-pulse bg-crimson text-white' : 'bg-hero-primary/10 text-hero-primary'
                }`}
              >
                {Math.max(0, seconds)}s
              </span>
            </div>
            <p className="mb-4 text-lg font-bold text-ink">{session.question.text}</p>
            {session.is_host ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {session.question.options.map((opt, i) => (
                  <div key={i} className={`rounded-xl px-4 py-3 text-sm font-semibold text-white ${OPTION_COLORS[i % OPTION_COLORS.length]}`}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {session.question.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={session.answered || answering || seconds <= 0}
                    onClick={() => handleAnswer(i)}
                    className={`rounded-xl px-4 py-4 text-left text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                      lastAnswer?.optionIndex === i
                        ? lastAnswer.correct
                          ? 'bg-teal ring-4 ring-teal/40'
                          : 'bg-crimson ring-4 ring-crimson/40'
                        : OPTION_COLORS[i % OPTION_COLORS.length]
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                ))}
              </div>
            )}
            {session.answered && !session.is_host && (
              <p className="mt-3 text-sm font-semibold text-ink-light">
                {lastAnswer ? (lastAnswer.correct ? `Correct! +${lastAnswer.points} points for ${session.my_club_name}.` : 'Answer submitted.') : 'Answer locked in — waiting for the timer…'}
              </p>
            )}
          </div>
        ) : session.status === 'between' && session.question_result ? (
          <div>
            <p className="mb-1 text-sm font-semibold text-ink">{session.question_result.text}</p>
            <p className="mb-4 text-xs text-teal">
              Correct answer: {String.fromCharCode(65 + session.question_result.correct_index)}. {session.question_result.options[session.question_result.correct_index]}
            </p>
            <p className="mb-2 text-sm font-bold text-ink">🏆 Live Leaderboard</p>
            <ol className="space-y-1.5">
              {session.leaderboard.top.map((r) => (
                <li key={r.club_id} className="flex justify-between rounded-xl border border-line bg-paper px-3 py-2 text-sm">
                  <span className="font-semibold">{r.rank}. {r.club_name}</span>
                  <span className="font-bold text-hero-primary">{r.points} pts</span>
                </li>
              ))}
            </ol>
            {session.leaderboard.mine && (
              <p className="mt-2 text-xs font-semibold text-ink-light">
                #{session.leaderboard.mine.rank} {session.leaderboard.mine.club_name} — {session.leaderboard.mine.points} points
              </p>
            )}
            <p className="mt-3 text-center text-xs text-ink-light">Next question in {Math.max(0, Math.ceil(countdownMs / 1000))}s…</p>
          </div>
        ) : session.status === 'finished' ? (
          <div>
            <p className="mb-3 text-center text-base font-bold text-ink">🏆 Final Top 10 Clubs</p>
            <ol className="space-y-2">
              {session.final_leaderboard.top.map((r, idx) => (
                <li
                  key={r.club_id}
                  className={`flex items-center justify-between rounded-xl border px-4 ${
                    idx < 3
                      ? 'border-gold bg-gradient-to-r from-gold/10 to-transparent py-3 text-base shadow-sm'
                      : 'border-line py-2 text-sm'
                  }`}
                >
                  <span className="font-bold">
                    {idx < 3 ? RANK_MEDALS[idx] : `${r.rank}.`} {r.club_name}
                  </span>
                  <span className="font-bold text-hero-primary">{r.points} points</span>
                </li>
              ))}
            </ol>
            {session.final_leaderboard.mine && (
              <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-2 text-center text-sm font-semibold text-ink-light">
                Your Club — #{session.final_leaderboard.mine.rank} {session.final_leaderboard.mine.club_name} — {session.final_leaderboard.mine.points} points
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <LoadingSpinner label="Loading…" />
        )}
      </div>
    </div>
  );
}
