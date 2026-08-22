import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { fetchColleges, collegeLogoUrl } from '../services/authService';
import { dashboardPathForRole } from '../utils/roleLabels';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ROLE_TABS = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'hod', label: 'HOD' },
  { value: 'college_admin', label: 'College Admin' },
];

// UPDATED (per correction): no separate "Super Admin" link anywhere on the
// page. Instead, typing something matching "super admin" into the same
// college search box surfaces it as a selectable suggestion, same list,
// same input — that's the only way in now (plus the quiet #admin URL hash,
// kept as a fallback direct link, never shown on the page itself).
const MIN_SEARCH_LENGTH = 3;
const SUPER_ADMIN_MATCH = 'super admin';

export default function Login() {
  const { login, isAuthenticated, role: sessionRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState(() => (window.location.hash === '#admin' ? 'form' : 'college'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => window.location.hash === '#admin');
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCollege, setSelectedCollege] = useState(null);

  const [role, setRole] = useState(() => (window.location.hash === '#admin' ? 'super_admin' : 'student'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(dashboardPathForRole(sessionRole), { replace: true });
  }, [isAuthenticated, sessionRole, navigate]);

  useEffect(() => {
    if (isSuperAdmin) { setCollegesLoading(false); return; }
    fetchColleges()
      .then(setColleges)
      .catch(() => showToast('Could not load the college list. Is the API running?', 'error'))
      .finally(() => setCollegesLoading(false));
  }, [showToast, isSuperAdmin]);

  // UPDATED: nothing shows until at least 3 characters are typed, and a
  // search matching "super admin" surfaces that as its own suggestion
  // alongside any matching colleges (there won't be any real college named
  // that, so in practice it's the only result — but it's still just an
  // entry in the same list, not a separate link).
  const trimmedSearch = search.trim();
  const searchLower = trimmedSearch.toLowerCase();
  const meetsMinLength = trimmedSearch.length >= MIN_SEARCH_LENGTH;
  const filteredColleges = meetsMinLength
    ? colleges.filter((c) => c.name.toLowerCase().includes(searchLower))
    : [];
  const showSuperAdminSuggestion = meetsMinLength && SUPER_ADMIN_MATCH.includes(searchLower);

  const chooseCollege = (college) => {
    setSelectedCollege(college);
    setIsSuperAdmin(false);
    setRole('student');
    setStage('form');
  };

  const chooseSuperAdmin = () => {
    setIsSuperAdmin(true);
    setSelectedCollege(null);
    setRole('super_admin');
    setStage('form');
  };

  const validate = () => {
    const next = {};
    if (!username.trim()) next.username = 'Username is required.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await login({
        username: username.trim(),
        password,
        role,
        collegeId: selectedCollege?.id,
      });
      showToast(`Welcome back, ${user.name}!`, 'success');
      const redirectTo = location.state?.from?.pathname || dashboardPathForRole(user.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      showToast(err.message || 'Login failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-paper"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="rounded-2xl border border-line bg-paper-card p-8 shadow-lg">
        {stage === 'college' && (
          <>
            <h1 className="text-xl font-bold text-ink">Select your college</h1>
            <p className="mt-1 text-sm text-ink-light">Search for your institution to continue.</p>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search colleges…"
              autoFocus
              className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {collegesLoading ? (
                <LoadingSpinner size="sm" label="Loading colleges…" />
              ) : !meetsMinLength ? (
                <p className="text-sm text-ink-light">
                  {trimmedSearch.length === 0 ? 'Start typing to find your college.' : `Type at least ${MIN_SEARCH_LENGTH} characters to search.`}
                </p>
              ) : filteredColleges.length === 0 && !showSuperAdminSuggestion ? (
                <p className="text-sm text-ink-light">No colleges match that search.</p>
              ) : (
                <>
                  {filteredColleges.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => chooseCollege(c)}
                      className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-paper"
                    >
                      {c.has_logo && (
                        <img src={collegeLogoUrl(c.id)} alt="" className="h-7 w-7 rounded object-contain" />
                      )}
                      {c.name}
                    </button>
                  ))}
                  {showSuperAdminSuggestion && (
                    <button
                      type="button"
                      onClick={chooseSuperAdmin}
                      className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2 text-left text-sm hover:bg-paper"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded bg-purple/10 text-sm">🛡️</span>
                      Super Admin
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {stage === 'form' && (
          <>
            {!isSuperAdmin && (
              <button
                type="button"
                onClick={() => setStage('college')}
                className="mb-4 text-xs font-semibold text-ink-light hover:text-ink"
              >
                ← Change college
              </button>
            )}

            <h1 className="text-xl font-bold text-ink">
              {isSuperAdmin ? 'Super Admin sign-in' : `Sign in to ${selectedCollege?.name}`}
            </h1>

            {!isSuperAdmin && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ROLE_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setRole(tab.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      role === tab.value
                        ? 'border-teal bg-teal text-white'
                        : 'border-line text-ink hover:bg-paper'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              <div>
                <label htmlFor="username" className="mb-1 block text-xs font-semibold text-ink">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  autoComplete="username"
                />
                {errors.username && <p className="mt-1 text-xs text-crimson">{errors.username}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-semibold text-ink">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  autoComplete="current-password"
                />
                {errors.password && <p className="mt-1 text-xs text-crimson">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-hero-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Login'}
              </button>
            </form>
          </>
        )}

        <Link
          to="/"
          className="mt-6 block w-full rounded-lg border border-line py-2.5 text-center text-sm font-semibold text-ink hover:bg-paper"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
