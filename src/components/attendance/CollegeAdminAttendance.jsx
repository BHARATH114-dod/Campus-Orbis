import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { fetchAttendanceReport, attendanceReportCsvUrl, sendLowAttendanceAlert } from '../../services/attendanceService';
import LoadingSpinner from '../common/LoadingSpinner';

// College Admin gets the college-wide report + export + alert tools, but not
// Subjects/Semesters/Timetable management — those are HOD-owned per
// department, by design (a College Admin can still see the *result* across
// every department at once here).
export default function CollegeAdminAttendance() {
  const { showToast } = useToast();
  const [department, setDepartment] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(75);
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAttendanceReport('college_admin', { department: department || undefined })
      .then(setReport)
      .catch((err) => showToast(err.message || 'Could not load the report.', 'error'))
      .finally(() => setLoading(false));
  }, [department]); // eslint-disable-line react-hooks/exhaustive-deps

  const departments = [...new Set(report.map((r) => r.department).filter(Boolean))];
  const belowThreshold = report.filter((r) => r.percentage !== null && r.percentage < threshold);

  const handleAlert = async () => {
    if (!window.confirm(`Send a low-attendance notification to ${belowThreshold.length} student(s) below ${threshold}%?`)) return;
    setSendingAlert(true);
    try {
      const { flagged_count } = await sendLowAttendanceAlert('college_admin', { threshold, department: department || undefined });
      showToast(`Sent to ${flagged_count} student(s).`, 'success');
    } catch (err) {
      showToast(err.message || 'Could not send alerts.', 'error');
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Attendance</h1>
      <p className="mb-5 text-sm text-ink-light">College-wide attendance, across every department.</p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <a
          href={attendanceReportCsvUrl('college_admin', { department: department || undefined })}
          download
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-paper"
        >
          ⬇ Export CSV
        </a>
        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Alert threshold %</label>
            <input
              type="number" min={1} max={100} value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-24 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAlert}
            disabled={sendingAlert || belowThreshold.length === 0}
            className="rounded-lg bg-crimson px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sendingAlert ? 'Sending…' : `Alert ${belowThreshold.length} below ${threshold}%`}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading report…" />
      ) : report.length === 0 ? (
        <p className="text-sm text-ink-light">No student attendance data yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase text-ink-light">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Roll No.</th>
                <th className="px-4 py-2 text-right">Present</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.username} className={`border-t border-line bg-paper-card ${r.percentage !== null && r.percentage < threshold ? 'bg-crimson/5' : ''}`}>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-ink-light">{r.department}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.roll_number}</td>
                  <td className="px-4 py-2 text-right">{r.present_count}</td>
                  <td className="px-4 py-2 text-right">{r.total_count}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${r.percentage !== null && r.percentage < threshold ? 'text-crimson' : 'text-teal'}`}>
                    {r.percentage === null ? '—' : `${r.percentage}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
