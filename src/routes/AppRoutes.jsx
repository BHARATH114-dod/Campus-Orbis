import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';

import Home from '../pages/Home';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import StudentDashboard from '../pages/StudentDashboard';
import FacultyDashboard from '../pages/FacultyDashboard';
import FacultyStudents from '../pages/FacultyStudents';
import AdminDashboard from '../pages/AdminDashboard';
import Events from '../pages/Events';
import Clubs from '../pages/Clubs';
import Competition from '../pages/Competition';
import Notes from '../pages/Notes';
import Attendance from '../pages/Attendance';
import Placements from '../pages/Placements';
import People from '../pages/People';
import Leaderboard from '../pages/Leaderboard';
import Tests from '../pages/Tests';
import TestMonitoring from '../pages/TestMonitoring';
import Board from '../pages/Board';
import PythonCourse from '../pages/PythonCourse';
import PythonLesson from '../pages/PythonLesson';
import PythonLessonTest from '../pages/PythonLessonTest';
import PythonCourseCertificate from '../pages/PythonCourseCertificate';
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';
import Settings from '../pages/Settings';

import TermsAndConditions from '../pages/legal/TermsAndConditions';
import PrivacyPolicy from '../pages/legal/PrivacyPolicy';
import CookiePolicy from '../pages/legal/CookiePolicy';
import CopyrightPolicy from '../pages/legal/CopyrightPolicy';
import Disclaimer from '../pages/legal/Disclaimer';
import ContactSupport from '../pages/legal/ContactSupport';
import CommunityGuidelines from '../pages/legal/CommunityGuidelines';
import AccessibilityStatement from '../pages/legal/AccessibilityStatement';
import SecurityInformation from '../pages/legal/SecurityInformation';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />

        {/* Legal & Policies — public so they're readable without logging in,
            and linked from the footer on every page that uses it. */}
        <Route path="/legal/terms" element={<TermsAndConditions />} />
        <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        <Route path="/legal/cookies" element={<CookiePolicy />} />
        <Route path="/legal/copyright" element={<CopyrightPolicy />} />
        <Route path="/legal/disclaimer" element={<Disclaimer />} />
        <Route path="/legal/contact" element={<ContactSupport />} />
        <Route path="/legal/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/legal/accessibility" element={<AccessibilityStatement />} />
        <Route path="/legal/security" element={<SecurityInformation />} />
      </Route>

      {/* Login is deliberately standalone — no Navbar/Footer. The page
          itself has its own "Go to Home" link since there's no header to
          provide that navigation here. */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated — tenant-scoped pages, every role except Super
          Admin. Super Admin has no college of its own, and the backend
          either blocks these outright or hands back empty data for that
          role (e.g. clubs/board/leaderboard all short-circuit to nothing
          for super_admin) — excluding it here turns that dead end into a
          clean redirect instead of a page that loads to show nothing. */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['student', 'faculty', 'college_admin', 'hod']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/events" element={<Events />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/competition" element={<Competition />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/placements" element={<Placements />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/board" element={<Board />} />
      </Route>

      {/* Authenticated — account pages, any role including Super Admin */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Authenticated — role-restricted dashboards */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
      </Route>

      <Route
        path="/faculty/dashboard"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FacultyDashboard />} />
      </Route>

      <Route
        path="/faculty/students"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FacultyStudents />} />
      </Route>

      {/* Test Monitoring — faculty only, mirrors the /faculty/students
          pattern above: it shows students live while they take a test
          this faculty member owns, so there's no reason for any other
          role (including college_admin/hod, who have no tests of their
          own — see Tests.jsx / navConfig.js) to ever reach this page. */}
      <Route
        path="/test-monitoring"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TestMonitoring />} />
      </Route>

      {/* Python Full Course — student only, mirrors the /test-monitoring
          pattern above: the backend routes (/api/student/python-course/*)
          are requireRole('student') only, so there's no other role for
          this to show up under. */}
      <Route
        path="/python-course"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PythonCourse />} />
        <Route path="lessons/:lessonId" element={<PythonLesson />} />
        <Route path="lessons/:lessonId/test" element={<PythonLessonTest />} />
        <Route path="certificate" element={<PythonCourseCertificate />} />
      </Route>

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['college_admin', 'hod', 'super_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
      </Route>

      <Route
        path="/people"
        element={
          <ProtectedRoute allowedRoles={['college_admin', 'hod']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<People />} />
      </Route>

      {/* 404 — kept outside PublicLayout's Navbar/Footer wrapper on purpose,
          so it reads as a standalone error state rather than a normal page. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
