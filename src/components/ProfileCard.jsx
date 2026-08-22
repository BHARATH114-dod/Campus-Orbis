import { useState } from 'react';
import { roleLabel } from '../utils/roleLabels';

/**
 * @param {{
 *   user: { name, username, role, department?, section_id?, roll_number? },
 *   editable?: boolean,
 *   onSave?: (name: string) => Promise<void> | void,
 * }} props
 */
export default function ProfileCard({ user, editable = false, onSave }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  const initials = (user.name || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave?.(name.trim());
      setEditing(false);
    } catch {
      // Stay in edit mode so the user can retry — the caller (e.g. the
      // Profile page) is responsible for surfacing *why* it failed (toast).
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-purple text-xl font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-base font-semibold text-ink"
            />
          ) : (
            <p className="truncate text-lg font-semibold text-ink">{user.name}</p>
          )}
          <p className="text-sm text-ink-light">{roleLabel(user.role)}</p>
        </div>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper"
          >
            Edit
          </button>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Row label="Username" value={user.username} />
        {user.department && <Row label="Department" value={user.department} />}
        {user.section_id && <Row label="Section" value={user.section_id} />}
        {user.roll_number && <Row label="Roll number" value={user.roll_number} />}
      </dl>

      {editing && (
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setName(user.name); }}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-line py-1.5 sm:flex-col sm:border-0 sm:py-0">
      <dt className="text-ink-light">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  );
}
