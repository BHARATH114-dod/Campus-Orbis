import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchClubs,
  createClub,
  updateClub,
  deleteClub,
  fetchClub,
  joinClub,
  joinClubByCode,
  leaveClub,
  transferClubLeader,
  fetchLeaderCandidates,
  fetchEligibleStudents,
  addClubMembers,
  removeClubMember,
} from '../services/clubService';
import { joinCompetitionQuiz } from '../services/competitionService';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CAN_CREATE_ROLES = ['college_admin', 'hod', 'faculty'];

export default function Clubs() {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [haveCodeOpen, setHaveCodeOpen] = useState(false);
  const [activeClubId, setActiveClubId] = useState(null);

  const canCreate = CAN_CREATE_ROLES.includes(role);

  const load = () => {
    setLoading(true);
    fetchClubs()
      .then(setClubs)
      .catch((err) => showToast(err.message || 'Could not load clubs.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickJoin = async (club) => {
    // hod/faculty only — students must use the club join code (server-enforced).
    try {
      await joinClub(club.id);
      setClubs((prev) =>
        prev.map((c) => (c.id === club.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c))
      );
    } catch (err) {
      showToast(err.message || 'Could not join this club.', 'error');
    }
  };

  const handleLeave = async (club) => {
    try {
      await leaveClub(club.id);
      setClubs((prev) =>
        prev.map((c) => (c.id === club.id ? { ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) } : c))
      );
    } catch (err) {
      showToast(err.message || 'Could not update your membership.', 'error');
    }
  };

  const handleDeleteClub = async (id) => {
    if (!window.confirm('Remove this club? This cannot be undone.')) return;
    try {
      await deleteClub(id);
      setClubs((prev) => prev.filter((c) => c.id !== id));
      showToast('Club removed.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not remove this club.', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Clubs</h1>
          <p className="text-sm text-ink-light">Join a club and see its members. Head to Competition for quizzes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHaveCodeOpen(true)}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper"
          >
            Have a code?
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-full bg-hero-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              + New club
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading clubs…" />
      ) : clubs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">
          No clubs yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <div key={club.id} className="rounded-2xl border border-line bg-paper-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block rounded-full bg-purple/10 px-2.5 py-0.5 text-[11px] font-bold text-purple">
                  {club.category}
                </span>
                {club.is_full && (
                  <span className="rounded-full bg-crimson/10 px-2 py-0.5 text-[10px] font-bold text-crimson">Full</span>
                )}
              </div>
              <h3 className="mt-2 text-base font-semibold text-ink">{club.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-light">{club.description}</p>
              <p className="mt-2 text-xs text-ink-light">
                {club.member_count}/{club.max_members} member{club.max_members === 1 ? '' : 's'}
              </p>
              {club.leader_name && (
                <p className="mt-1 text-xs font-semibold text-teal">
                  Club Leader: {club.leader_name}
                  {!club.leader_confirmed && <span className="ml-1 font-normal text-ink-light">(not yet activated)</span>}
                </p>
              )}
              {club.can_see_code && club.join_code && (
                <p className="mt-1 font-mono text-xs font-bold tracking-widest text-hero-primary">Code: {club.join_code}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveClubId(club.id)}
                  className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold hover:bg-paper"
                >
                  View
                </button>
                {club.is_member ? (
                  <button
                    type="button"
                    onClick={() => handleLeave(club)}
                    className="rounded-full border border-teal px-4 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10"
                  >
                    Leave
                  </button>
                ) : (
                  // Spec item 4: the faculty member who created a club manages
                  // it and never sees a Join option for their own club.
                  ['hod', 'faculty'].includes(role) &&
                  club.created_by !== user?.username && (
                    <button
                      type="button"
                      disabled={club.is_full}
                      onClick={() => handleQuickJoin(club)}
                      className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Join
                    </button>
                  )
                )}
                {club.can_manage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClub(club.id)}
                    className="ml-auto text-xs font-semibold text-crimson hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateClubModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(club) => setClubs((prev) => [club, ...prev])}
      />

      <HaveACodeModal
        open={haveCodeOpen}
        onClose={() => setHaveCodeOpen(false)}
        onJoinedClub={(club) => {
          load();
          setActiveClubId(club.id);
        }}
        onJoinedQuiz={(quizId) => navigate('/competition', { state: { autoJoinQuizId: quizId } })}
      />

      <ClubDetailModal clubId={activeClubId} onClose={() => setActiveClubId(null)} onMembershipChange={load} />
    </div>
  );
}

function CreateClubModal({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [leaderUsername, setLeaderUsername] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCandidates(true);
    fetchLeaderCandidates()
      .then(setCandidates)
      .catch((err) => showToast(err.message || 'Could not load students.', 'error'))
      .finally(() => setLoadingCandidates(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Club name is required.');
      return;
    }
    if (!leaderUsername.trim()) {
      setError('Choose a student to be the Club Leader.');
      return;
    }
    const maxNum = Number(maxMembers);
    if (!Number.isInteger(maxNum) || maxNum < 1) {
      setError('Maximum number of members must be a whole number of at least 1.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const club = await createClub({
        name,
        description,
        category,
        leader_username: leaderUsername.trim(),
        max_members: maxNum,
      });
      onCreated(club);
      showToast("Club created. Give the join code (from the club's Members view) to the Club Leader.", 'success');
      setName('');
      setDescription('');
      setCategory('');
      setLeaderUsername('');
      setMaxMembers('10');
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create this club.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New club">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Club name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Technical, Cultural, Sports"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Maximum number of members</label>
          <input
            type="number"
            min={1}
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-ink-light">The Club Leader counts within this limit.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Club Leader</label>
          {loadingCandidates ? (
            <p className="text-xs text-ink-light">Loading students…</p>
          ) : candidates.length === 0 ? (
            <p className="text-xs text-crimson">No eligible students found for you to pick from.</p>
          ) : (
            <select
              value={leaderUsername}
              onChange={(e) => setLeaderUsername(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            >
              <option value="">Select a student…</option>
              {candidates.map((s) => (
                <option key={s.username} value={s.username}>
                  {s.name}{s.roll_number ? ` — ${s.roll_number}` : ''} ({s.username})
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-[11px] text-ink-light">
            A join code is generated on creation — you'll find it in the club's Members view. Give it to this
            student; they'll enter it to activate the club and become Club Leader.
          </p>
        </div>
        {error && <p className="text-xs text-crimson">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create club'}
        </button>
      </form>
    </Modal>
  );
}

// Spec item 6: "Have a Code?" — exactly two choices, Join a Club or Join a
// Quiz, each validated against the matching code type.
function HaveACodeModal({ open, onClose, onJoinedClub, onJoinedQuiz }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState(null); // null | 'club' | 'quiz'
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setMode(null);
    setCode('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'club') {
        const res = await joinClubByCode(code.trim());
        showToast(
          res.role === 'leader' ? `You're now Club Leader of ${res.club.name}.` : `You joined ${res.club.name}.`,
          'success'
        );
        onJoinedClub(res.club);
      } else {
        const res = await joinCompetitionQuiz(code.trim());
        showToast(`Joined "${res.title}" on behalf of ${res.club_name}.`, 'success');
        onJoinedQuiz(res.quiz_id);
      }
      handleClose();
    } catch (err) {
      setError(err.message || 'That code did not work.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Have a code?">
      {!mode ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-light">What kind of code do you have?</p>
          <button
            type="button"
            onClick={() => setMode('club')}
            className="w-full rounded-lg border border-line px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-paper"
          >
            🎭 Join a Club
          </button>
          <button
            type="button"
            onClick={() => setMode('quiz')}
            className="w-full rounded-lg border border-line px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-paper"
          >
            🥇 Join a Quiz
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              {mode === 'club' ? 'Club code' : 'Quiz code'}
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3XQ9KP"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm uppercase tracking-wider"
            />
          </div>
          {error && <p className="text-xs text-crimson">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="flex-1 rounded-lg bg-gold py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'Joining…' : mode === 'club' ? 'Join club' : 'Join quiz'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// Spec item 2: Club View keeps ONLY Members — club name, club leader, club
// members, member details, member count/capacity. Managers additionally
// get the join code, roster tools, and basic settings inline here (no
// separate Posts/Quizzes/Leaderboard/Gallery tabs any more).
function ClubDetailModal({ clubId, onClose, onMembershipChange }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [addingUsername, setAddingUsername] = useState(null);

  const [manageOpen, setManageOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMaxMembers, setEditMaxMembers] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const load = () => {
    if (!clubId) return;
    setLoading(true);
    fetchClub(clubId)
      .then((clubData) => {
        setData(clubData);
        setEditName(clubData.club.name);
        setEditDescription(clubData.club.description);
        setEditCategory(clubData.club.category);
        setEditMaxMembers(String(clubData.club.max_members));
      })
      .catch((err) => showToast(err.message || 'Could not load this club.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!clubId) {
      setData(null);
      setStudentSearch('');
      setEligibleStudents([]);
      setManageOpen(false);
      return;
    }
    load();
  }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!manageOpen || !clubId || !data?.club?.can_add_members) return;
    setSearchingStudents(true);
    const t = setTimeout(() => {
      fetchEligibleStudents(clubId, studentSearch)
        .then(setEligibleStudents)
        .catch((err) => showToast(err.message || 'Could not load students.', 'error'))
        .finally(() => setSearchingStudents(false));
    }, 250);
    return () => clearTimeout(t);
  }, [manageOpen, clubId, studentSearch, data?.club?.can_add_members]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!clubId) return null;

  const club = data?.club;

  const handleAddStudent = async (username) => {
    setAddingUsername(username);
    try {
      const res = await addClubMembers(clubId, [username]);
      if (res.added?.includes(username)) {
        showToast('Student added.', 'success');
      } else if (res.skipped?.some((s) => s.username === username)) {
        const skip = res.skipped.find((s) => s.username === username);
        showToast(`${skip.name} is already a member of ${skip.existing_club}.`, 'error');
      }
      setEligibleStudents((prev) => prev.filter((s) => s.username !== username));
      load();
    } catch (err) {
      showToast(err.message || 'Could not add this student.', 'error');
    } finally {
      setAddingUsername(null);
    }
  };

  const handleRemoveMember = async (username) => {
    if (!window.confirm('Remove this member from the club?')) return;
    try {
      await removeClubMember(clubId, username);
      showToast('Member removed.', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Could not remove this member.', 'error');
    }
  };

  // Post-activation: hand the active leadership to another existing member.
  const handleTransferLeader = async (username) => {
    if (!window.confirm('Transfer Club Leader to this member?')) return;
    try {
      await transferClubLeader(clubId, username);
      showToast('Leadership transferred.', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Could not transfer leadership.', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Club name is required.', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      const updated = await updateClub(clubId, {
        name: editName,
        description: editDescription,
        category: editCategory,
        max_members: Number(editMaxMembers),
      });
      setData((d) => ({ ...d, club: { ...d.club, ...updated } }));
      showToast('Club details updated.', 'success');
      onMembershipChange();
    } catch (err) {
      showToast(err.message || 'Could not save changes.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Modal open onClose={() => { onClose(); onMembershipChange(); }} title={club?.name}>
      {loading || !club ? (
        <LoadingSpinner label="Loading club…" />
      ) : (
        <div className="space-y-4">
          <div>
            {club.leader_name && (
              <p className="text-xs font-semibold text-teal">
                Club Leader: {club.leader_name}
                {!club.leader_confirmed && <span className="ml-1 font-normal text-ink-light">(not yet activated)</span>}
              </p>
            )}
            <p className="mt-1 text-xs text-ink-light">
              {club.member_count}/{club.max_members} members{club.is_full ? ' · Club is full' : ''}
            </p>
          </div>

          {club.can_see_code && club.join_code && (
            <div className="rounded-lg border border-dashed border-hero-primary bg-hero-primary/5 p-3">
              <p className="text-xs font-semibold text-ink">Club join code</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-widest text-hero-primary">{club.join_code}</p>
              <p className="mt-1 text-[11px] text-ink-light">
                {club.leader_confirmed
                  ? 'Share this with students so they can join — the limit is enforced automatically.'
                  : `Give this to ${club.leader_name || 'the designated Club Leader'} — entering it activates the club.`}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-light">Members</p>
            <ul className="space-y-2">
              {data.members.length === 0 ? (
                <p className="text-sm text-ink-light">No members yet.</p>
              ) : (
                data.members.map((m) => (
                  <li key={m.username} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                    <div>
                      <span>{m.name}</span>
                      {m.roll_number && <span className="ml-2 text-xs text-ink-light">{m.roll_number}</span>}
                      {club.leader_username === m.username && club.leader_confirmed && (
                        <span className="ml-2 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">Leader</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-light">{m.role}</span>
                      {(club.can_manage || club.is_leader) && m.role === 'student' && club.leader_username !== m.username && (
                        <button type="button" onClick={() => handleTransferLeader(m.username)} className="text-xs font-semibold text-teal hover:underline">
                          Make leader
                        </button>
                      )}
                      {club.can_manage && (
                        <button type="button" onClick={() => handleRemoveMember(m.username)} className="text-xs font-semibold text-crimson hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {(club.can_manage || club.can_add_members) && (
            <div className="border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setManageOpen((v) => !v)}
                className="text-xs font-semibold text-hero-primary hover:underline"
              >
                {manageOpen ? '▾ Hide club management' : '▸ Manage this club'}
              </button>

              {manageOpen && (
                <div className="mt-3 space-y-4">
                  {club.can_add_members && (
                    <div className="rounded-lg border border-dashed border-line p-3">
                      <p className="mb-2 text-xs font-semibold text-ink">Add students to this club</p>
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search by name, username, or roll number…"
                        className="mb-2 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                      />
                      {searchingStudents ? (
                        <p className="text-xs text-ink-light">Searching…</p>
                      ) : eligibleStudents.length === 0 ? (
                        <p className="text-xs text-ink-light">No matching students.</p>
                      ) : (
                        <ul className="max-h-40 space-y-1 overflow-y-auto">
                          {eligibleStudents.map((s) => (
                            <li key={s.username} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-paper">
                              <span>
                                {s.name} <span className="text-ink-light">· {s.department}{s.roll_number ? ` · ${s.roll_number}` : ''}</span>
                              </span>
                              <button
                                type="button"
                                disabled={addingUsername === s.username || club.is_full}
                                onClick={() => handleAddStudent(s.username)}
                                className="rounded-full bg-gold px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                              >
                                Add
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {club.can_manage && (
                    <form onSubmit={handleSaveSettings} className="space-y-3 rounded-lg border border-dashed border-line p-3">
                      <p className="text-xs font-semibold text-ink">Club settings</p>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-ink">Club name</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-ink">Category</label>
                        <input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-ink">Maximum number of members</label>
                        <input
                          type="number"
                          min={1}
                          value={editMaxMembers}
                          onChange={(e) => setEditMaxMembers(e.target.value)}
                          className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-ink">Description</label>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingSettings}
                        className="rounded-lg bg-hero-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {savingSettings ? 'Saving…' : 'Save changes'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
