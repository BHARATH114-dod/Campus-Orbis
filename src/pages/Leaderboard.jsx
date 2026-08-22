import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchLeaderboard } from '../services/leaderboardService';
import LeaderboardCard from '../components/LeaderboardCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SCOPES = [
  { value: 'college', label: 'Campus' },
  { value: 'department', label: 'Department' },
  { value: 'section', label: 'Section' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [scope, setScope] = useState('college');
  const [department, setDepartment] = useState(user?.department || '');
  const [sectionId, setSectionId] = useState(user?.section_id || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard({
      scope,
      department: scope === 'department' ? department : undefined,
      sectionId: scope === 'section' ? sectionId : undefined,
    })
      .then(setData)
      .catch((err) => showToast(err.message || 'Could not load the leaderboard.', 'error'))
      .finally(() => setLoading(false));
  }, [scope, department, sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionsForDept = data?.sections?.filter((s) => !department || s.department === department) || [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-ink">Leaderboard</h1>
      <p className="mb-5 text-sm text-ink-light">
        Points from event participation, attendance, marks, club membership, and test results.
      </p>

      {/* Hall of Fame — always college-wide top 5, regardless of the scope selected below */}
      {data?.hall_of_fame?.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-light">🌟 Hall of Fame</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {data.hall_of_fame.map((entry) => (
              <div key={entry.username} className="w-40 shrink-0 rounded-xl border border-gold/40 bg-gold/5 p-3 text-center">
                <p className="text-lg">{{ 1: '🥇', 2: '🥈', 3: '🥉' }[entry.rank] || `#${entry.rank}`}</p>
                <p className="mt-1 truncate text-sm font-semibold text-ink">{entry.name}</p>
                <p className="truncate text-xs text-ink-light">{entry.department}</p>
                <p className="mt-1 text-sm font-bold text-teal">{entry.score} pts</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setScope(s.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              scope === s.value ? 'border-teal bg-teal text-white' : 'border-line text-ink hover:bg-paper'
            }`}
          >
            {s.label}
          </button>
        ))}

        {scope === 'department' && data?.departments?.length > 0 && (
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs">
            {data.departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {scope === 'section' && sectionsForDept.length > 0 && (
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs">
            {sectionsForDept.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading leaderboard…" />
      ) : !data || data.leaderboard.length === 0 ? (
        <p className="text-sm text-ink-light">No students to rank in this scope yet.</p>
      ) : (
        <div className="space-y-2">
          {data.leaderboard.map((entry) => (
            <LeaderboardCard key={entry.username} entry={entry} highlight={entry.username === user?.username} />
          ))}
        </div>
      )}
    </div>
  );
}
