import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleLabel } from '../utils/roleLabels';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // UPDATED (mobile polish): lock background scroll while the drawer is
  // open, so the page behind it doesn't scroll along with it — standard
  // native-app drawer behavior.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar — hamburger opens the drawer, hidden on desktop since the sidebar is always visible there */}
        <div className="flex items-center gap-3 border-b border-line bg-paper-card px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="icon-btn-glass grid h-9 w-9 place-items-center rounded-lg border border-line text-ink"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
            {user?.name} · {roleLabel(role)}
          </div>
          <NotificationBell />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="icon-btn-glass grid h-9 w-9 place-items-center rounded-lg border border-line text-ink"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="icon-btn-glass rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Log out
          </button>
        </div>

        {/* Desktop top bar — UPDATED (Module 2 fix): this didn't exist before, which meant
            there was no way to reach theme toggle / notifications / logout on desktop at
            all (they only lived in the md:hidden mobile bar above). */}
        <div className="hidden items-center justify-end gap-3 border-b border-line bg-paper-card px-8 py-3 md:flex">
          <NotificationBell />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="icon-btn-glass grid h-9 w-9 place-items-center rounded-lg border border-line text-ink"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link
            to="/profile"
            className="icon-btn-glass flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-purple/[0.08]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-purple text-[11px] font-bold text-white">
              {(user?.name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            {user?.name}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="icon-btn-glass rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-purple/[0.08]"
          >
            Log out
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
