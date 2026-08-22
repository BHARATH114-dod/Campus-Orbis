import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPythonCertificate } from '../services/pythonCourseService';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PythonCourseCertificate() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);

  useEffect(() => {
    fetchPythonCertificate()
      .then(setCert)
      .catch((err) => showToast(err.message || 'Certificate not available yet.', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingSpinner fullPage label="Loading certificate…" />;

  return (
    <div>
      <Link to="/python-course" className="text-xs font-semibold text-teal hover:underline">← Python Full Course</Link>
      {!cert ? (
        <p className="mt-6 text-sm text-ink-light">Complete every module to unlock your certificate.</p>
      ) : (
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border-4 border-teal/30 bg-paper-card p-10 text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-light">Certificate of Completion</p>
          <h1 className="mt-4 font-serif text-2xl font-bold text-ink">{cert.student_name}</h1>
          <p className="mt-2 text-sm text-ink-light">has successfully completed the</p>
          <p className="mt-1 text-lg font-bold text-teal">{cert.course_name}</p>
          <p className="mt-4 text-xs text-ink-light">Completed on {new Date(cert.completion_date).toLocaleDateString()}</p>
          <p className="text-xs text-ink-light">Final score: {cert.final_score}% · Course completion: {cert.percentage}%</p>
        </div>
      )}
    </div>
  );
}
