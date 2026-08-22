/**
 * @param {{
 *   entry: { rank, username, name, department, section_id, score,
 *            badges: [{ label, icon }] },
 *   highlight?: boolean, // true when this row is the signed-in user
 * }} props
 */
export default function LeaderboardCard({ entry, highlight = false }) {
  const medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[entry.rank];

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 ${
        highlight ? 'border-gold bg-gold/10' : 'border-line bg-paper-card'
      }`}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple/10 text-sm font-bold text-purple">
        {medal || `#${entry.rank}`}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{entry.name}</p>
        <p className="truncate text-xs text-ink-light">{entry.department}</p>
      </div>

      {/* UPDATED: badges from the real API are { label, icon } objects, not
          bare strings — this used to render a static 🏅 for every badge
          regardless of what it actually was. */}
      {!!entry.badges?.length && (
        <div className="hidden gap-1 sm:flex">
          {entry.badges.slice(0, 3).map((b) => (
            <span key={b.label} title={b.label} className="text-base">{b.icon}</span>
          ))}
        </div>
      )}

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-teal">{entry.score}</p>
        <p className="text-[11px] text-ink-light">points</p>
      </div>
    </div>
  );
}
