import { PostSessionLearning } from './PostSessionLearning';
import { AssessmentDashboard } from './AssessmentDashboard';
/**
 * Session Summary — shown after completion/abort.
 * Reveals ground truth ONLY here (session is over).
 */

import { useSimulationStore } from '../store/simulationStore';
import { useUiStore } from '../store/uiStore';

export function SessionSummaryScreen() {
  const saveError = useSimulationStore((s) => s.lastActionError);
  const lastSummary = useSimulationStore((s) => s.lastSummary);
  const lastExport = useSimulationStore((s) => s.lastExport);
  const navigate = useUiStore((s) => s.navigate);

  if (!lastSummary) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4">
        <p className="text-console-muted">No session summary available.</p>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          Home
        </button>
      </div>
    );
  }

  const correct = lastSummary.assessments.filter((a) => a.correct === true).length;
  const incorrect = lastSummary.assessments.filter((a) => a.correct === false).length;
  const unanswered = lastSummary.assessments.filter((a) => a.submittedClassification === null).length;

  const download = () => {
    const blob = new Blob([JSON.stringify(lastExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pragya-session-${lastSummary.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Session Summary</h2>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          &larr; Home
        </button>
      </div>

      <div className="panel p-4 mb-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Scenario" value={lastSummary.scenarioTitle} />
          <Field label="Status" value={lastSummary.status} />
          <Field label="Session ID" value={lastSummary.sessionId} mono />
          <Field label="Trainee" value={lastSummary.traineeId} />
          <Field label="Seed" value={String(lastSummary.seed)} mono />
          {lastSummary.generatorVersion && <Field label="Generator" value={lastSummary.generatorVersion} mono />}
          <Field label="Duration (sim)" value={`${lastSummary.durationSimSeconds.toFixed(1)}s`} />
          <Field label="Events logged" value={String(lastSummary.eventCount)} />
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="text-console-ok" data-testid="count-correct">{correct} correct</span>
          <span className="text-console-danger" data-testid="count-incorrect">{incorrect} incorrect</span>
          <span className="text-console-muted" data-testid="count-unanswered">{unanswered} unanswered</span>
        </div>
      </div>

      {saveError && <p role="alert" className="text-console-danger">{saveError}</p>}
      {lastExport && <PostSessionLearning session={lastExport} />}
      {lastExport && <AssessmentDashboard key={lastSummary.sessionId} session={lastExport} />}

      {/* Ground truth revealed post-session only */}
      <div className="panel p-4 mb-4" data-testid="summary-assessments">
        <h3 className="font-semibold mb-2">Assessments (ground truth revealed)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-console-muted">
              <th className="py-1">Contact</th>
              <th>Your classification</th>
              <th>Ground truth</th>
              <th>Result</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {lastSummary.assessments.map((a) => (
              <tr key={a.contactId} className="border-t border-console-border" data-testid={`summary-row-${a.contactId}`}>
                <td className="py-1 font-mono">{a.contactId}</td>
                <td>{a.submittedClassification ?? '—'}</td>
                <td>{a.groundTruth}</td>
                <td>
                  {a.correct === null ? (
                    <span className="text-console-muted">unanswered</span>
                  ) : a.correct ? (
                    <span className="text-console-ok">correct</span>
                  ) : (
                    <span className="text-console-danger">incorrect</span>
                  )}
                </td>
                <td className="capitalize">{a.confidence ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button onClick={download} className="bg-console-accent/90 hover:bg-console-accent text-black font-medium px-4 py-1.5 rounded" data-testid="btn-export">
          Export session (JSON)
        </button>
        <button onClick={() => navigate('scenarios')} className="border border-console-border px-4 py-1.5 rounded">
          Back to scenarios
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-console-muted">{label}</div>
      <div className={mono ? 'font-mono' : ''}>{value}</div>
    </div>
  );
}
