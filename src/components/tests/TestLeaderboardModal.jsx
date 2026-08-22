import { useEffect, useState } from 'react';
import { fetchTestLeaderboard } from '../../services/testService';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const STATUS_LABEL = { graded: 'Submitted', submitted: 'Submitted' };

function formatDuration(ms) {
  if (ms == null) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Per-test leaderboard — ranked by points (2 for attempting + 10 per
 * correct MCQ/code answer, 0 for wrong), with time taken as the tiebreak
 * for students who land on the same points. Refreshed every time the modal
 * opens, so it reflects the latest state — including a submission that
 * just happened — automatically (GET /api/tests/:id/leaderboard).
 *
 * @param {{ testId: string|null, testTitle?: string, onClose: () => void }} props
 */
export default function TestLeaderboardModal({ testId, testTitle, onClose }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId) { setData(null); return; }
    setLoading(true);
    fetchTestLeaderboard(testId)
      .then(setData)
      .catch((err) => showToast(err.message || 'Could not load the leaderboard.', 'error'))
      .finally(() => setLoading(false));
  }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!testId) return null;

  return (
    <Modal open onClose={onClose} title={testTitle ? `🏆 Leaderboard — ${testTitle}` : '🏆 Leaderboard'}>
      {loading || !data ? (
        <LoadingSpinner label="Loading leaderboard…" />
      ) : data.leaderboard.length === 0 ? (
        <p className="text-sm text-ink-light">No submissions yet — be the first to attempt this test.</p>
      ) : (
        <div className="space-y-2">
          <p className="mb-1 text-xs text-ink-light">
            Ranked by points (2 for attempting + 10 per correct answer). Ties are broken by time taken — faster finishes rank higher.
            {' '}{data.total_students} submission{data.total_students === 1 ? '' : 's'} recorded.
          </p>
          {data.leaderboard.map((entry) => (
            <div key={entry.username} className="rounded-xl border border-line bg-paper-card p-3">
              <div className="flex items-center gap-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple/10 text-sm font-bold text-purple">
                  {MEDAL[entry.rank] || `#${entry.rank}`}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{entry.name}</p>
                  <p className="truncate text-[11px] text-ink-light">
                    Submitted {new Date(entry.submitted_at).toLocaleString()} · {STATUS_LABEL[entry.status] || 'Submitted'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-teal">{entry.points} pts</p>
                  <p className="text-[11px] text-ink-light">{entry.score}/{entry.total_marks} marks</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 pl-13 text-[11px] text-ink-light">
                <span className="font-semibold text-teal">✓ {entry.correct_count} correct</span>
                <span className="font-semibold text-crimson">✕ {entry.wrong_count} wrong</span>
                <span>⏱ {formatDuration(entry.time_taken_ms)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
