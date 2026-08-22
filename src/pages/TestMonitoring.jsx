import { useAuth } from '../context/AuthContext';
import FacultyTestMonitoring from '../components/monitoring/FacultyTestMonitoring';

export default function TestMonitoring() {
  const { role } = useAuth();
  if (role === 'faculty') return <FacultyTestMonitoring />;
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center text-sm text-ink-light">
      Test Monitoring is available to faculty only — it shows students live while they take a faculty member's own test.
    </div>
  );
}
