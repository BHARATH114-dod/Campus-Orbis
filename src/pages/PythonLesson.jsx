import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPythonLesson, runPythonPractice } from '../services/pythonCourseService';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
// Reusing the EXACT SAME compiler component the Exam Module uses for
// coding-test questions — no second compiler, per the course brief.
import CodeEditor from '../components/tests/CodeEditor';

export default function PythonLesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(null);
  const [runError, setRunError] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPythonLesson(lessonId)
      .then((res) => {
        setData(res);
        setCode(res.lesson.practice?.starter_code || '');
      })
      .catch((err) => {
        showToast(err.message || 'Could not open this lesson.', 'error');
        if (err.status === 403) navigate('/python-course');
      })
      .finally(() => setLoading(false));
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    try {
      const res = await runPythonPractice(lessonId, code, input);
      setOutput(res.output);
      if (res.error) setRunError(res.error);
    } catch (err) {
      showToast(err.message || 'Could not run your code.', 'error');
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setCode(data.lesson.practice?.starter_code || '');
    setOutput(null);
    setRunError(null);
  }

  if (loading) return <LoadingSpinner fullPage label="Loading lesson…" />;
  if (!data) return null;

  const { lesson, module: mod, completed } = data;
  const { learn } = lesson;

  return (
    <div>
      <Link to="/python-course" className="text-xs font-semibold text-teal hover:underline">← Python Full Course</Link>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">{mod.title}</p>
          <h1 className="text-xl font-bold text-ink">{lesson.title}</h1>
          <p className="text-xs text-ink-light">Est. {lesson.est_minutes} min {completed && '· ✅ Completed'}</p>
        </div>
      </div>

      <section className="rounded-xl border border-line bg-paper-card p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">📖 Learn</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{learn.explanation}</p>

        {learn.syntax && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-light">Syntax</p>
            <pre className="overflow-x-auto rounded-lg bg-surface-dark p-3 font-mono text-xs text-white">{learn.syntax}</pre>
          </div>
        )}

        {learn.examples && learn.examples.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">Example</p>
            {learn.examples.map((ex, i) => (
              <div key={i}>
                <pre className="overflow-x-auto rounded-lg bg-surface-dark p-3 font-mono text-xs text-white">{ex.code}</pre>
                {ex.output && (
                  <>
                    <p className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-ink-light">Output</p>
                    <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-3 font-mono text-xs text-ink">{ex.output}</pre>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {learn.important_points && learn.important_points.length > 0 && (
          <BulletBlock title="Important Points" items={learn.important_points} />
        )}
        {learn.common_mistakes && learn.common_mistakes.length > 0 && (
          <BulletBlock title="Common Mistakes" items={learn.common_mistakes} />
        )}
        {learn.real_world && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-light">Real-world Example</p>
            <p className="text-sm text-ink-light">{learn.real_world}</p>
          </div>
        )}
      </section>

      {lesson.practice && (
        <section className="mt-6 rounded-xl border border-line bg-paper-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">💻 Try in Compiler</h2>
            <span className="text-xs text-ink-light">Python</span>
          </div>
          <div className="h-56 overflow-hidden rounded-lg border border-line">
            <CodeEditor value={code} onChange={setCode} language="python" />
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Program input (optional, one line per input() call)"
            className="mt-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={handleRun} disabled={running} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {running ? 'Running…' : 'Run'}
            </button>
            <button onClick={() => setCode('')} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">Clear</button>
            <button onClick={handleReset} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">Reset</button>
          </div>
          {(output !== null || runError) && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-light">Output</p>
              <pre className={`overflow-x-auto rounded-lg border p-3 font-mono text-xs ${runError ? 'border-crimson/40 bg-crimson/5 text-crimson' : 'border-line bg-paper text-ink'}`}>
                {runError || output || '(no output)'}
              </pre>
            </div>
          )}
        </section>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => navigate(`/python-course/lessons/${lessonId}/test`)}
          className="rounded-lg bg-teal px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Continue to Test →
        </button>
      </div>
    </div>
  );
}

function BulletBlock({ title, items }) {
  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-light">{title}</p>
      <ul className="list-inside list-disc space-y-1 text-sm text-ink-light">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
