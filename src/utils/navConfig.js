// Single source of truth for what each role sees in the sidebar. Kept
// separate from the Sidebar component so later modules can extend it
// without touching layout code.
//
// Tests: faculty create/grade, students take them — no HOD/College Admin
// surface exists for Tests on the backend (tests are owned solely by the
// faculty member who created them), so it's deliberately absent from their
// nav rather than linking to a page with nothing to show.
// Test Monitoring: same ownership rule as Tests above — a faculty member
// can only monitor students taking a test they themselves created, so this
// is faculty-only in the nav (and enforced faculty-only on the backend and
// in AppRoutes.jsx) rather than shown to HOD/College Admin/students.
// Board (Public Board): postable by hod/faculty/student; College Admin can
// moderate (resolve/delete) but never compose — mirrors the backend's own
// requireRole('hod','faculty','student') on POST /api/posts exactly.

export const NAV_CONFIG = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: '🏠' },
    { label: 'Python Course', path: '/python-course', icon: '🐍' },
    { label: 'Events', path: '/events', icon: '📅' },
    { label: 'Clubs', path: '/clubs', icon: '🎭' },
    { label: 'Competition', path: '/competition', icon: '🥇' },
    { label: 'Notes', path: '/notes', icon: '📝' },
    { label: 'Attendance', path: '/attendance', icon: '✅' },
    { label: 'Tests', path: '/tests', icon: '🧪' },
    { label: 'Placements', path: '/placements', icon: '💼' },
    { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
    { label: 'Board', path: '/board', icon: '📌' },
    { label: 'Notifications', path: '/notifications', icon: '🔔' },
    { label: 'Profile', path: '/profile', icon: '👤' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ],
  faculty: [
    { label: 'Dashboard', path: '/faculty/dashboard', icon: '🏠' },
    { label: 'Students', path: '/faculty/students', icon: '🧑‍🎓' },
    { label: 'Events', path: '/events', icon: '📅' },
    { label: 'Clubs', path: '/clubs', icon: '🎭' },
    { label: 'Competition', path: '/competition', icon: '🥇' },
    { label: 'Notes', path: '/notes', icon: '📝' },
    { label: 'Attendance', path: '/attendance', icon: '✅' },
    { label: 'Tests', path: '/tests', icon: '🧪' },
    { label: 'Test Monitoring', path: '/test-monitoring', icon: '🎥' },
    { label: 'Placements', path: '/placements', icon: '💼' },
    { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
    { label: 'Board', path: '/board', icon: '📌' },
    { label: 'Notifications', path: '/notifications', icon: '🔔' },
    { label: 'Profile', path: '/profile', icon: '👤' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ],
  college_admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '🏠' },
    { label: 'People', path: '/people', icon: '🧑‍🤝‍🧑' },
    { label: 'Events', path: '/events', icon: '📅' },
    { label: 'Clubs', path: '/clubs', icon: '🎭' },
    { label: 'Competition', path: '/competition', icon: '🥇' },
    { label: 'Notes', path: '/notes', icon: '📝' },
    { label: 'Attendance', path: '/attendance', icon: '✅' },
    { label: 'Placements', path: '/placements', icon: '💼' },
    { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
    { label: 'Board', path: '/board', icon: '📌' },
    { label: 'Notifications', path: '/notifications', icon: '🔔' },
    { label: 'Profile', path: '/profile', icon: '👤' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ],
  // Super Admin owns the platform, not a college — so its nav is
  // deliberately just the colleges/College-Admins dashboard plus the
  // account basics. It never gets People/Events/Clubs/Notes/Attendance/
  // Placements/Leaderboard/Board: those are all tenant-scoped to a single
  // college, which a Super Admin doesn't have. (Previously this role was
  // aliased straight to the College Admin nav, which linked to pages the
  // backend either blocked or returned empty for — that dead end is now
  // gone in favor of a real dashboard built for this role.)
  super_admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '🏠' },
    { label: 'Profile', path: '/profile', icon: '👤' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ],
};

// hod has no dashboard of its own in the design — it shares the College
// Admin dashboard component, which branches internally by role. Kept as
// its own explicit mapping (rather than folded into NAV_CONFIG) so it's
// obvious this is a deliberate share, not a fallback for an unhandled role.
export const ROLE_DASHBOARD_ALIAS = {
  hod: 'college_admin',
};

export function navItemsForRole(role) {
  const key = ROLE_DASHBOARD_ALIAS[role] || role;
  return NAV_CONFIG[key] || [];
}
