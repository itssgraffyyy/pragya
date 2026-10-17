/**
 * Session History — lists locally saved sessions, allows re-export.
 * Ground truth is visible here (post-session review tool).
 */

import { useEffect, useState } from 'react';
import type { StoredSession, StorageAdapter } from '../core/persistence/storage';
import { getStorage } from '../core/persistence/appStorage';
import { useUiStore } from '../store/uiStore';

export function HistoryScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [storage] = useState<StorageAdapter>(() => getStorage());

  useEffect(() => {
    let cancelled = false;
    storage
      .listSessions()
      .then((all) => {
        if (!cancelled) setSessions(all.sort((a, b) => b.summary.startedAt.localeCompare(a.summary.startedAt)));
      })
      .catch(() => setSessions([]));
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const reExport = (session: StoredSession) => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pragya-session-${session.summary.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Session History</h2>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          &larr; Home
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-console-muted" data-testid="history-empty">
          No saved sessions yet. Complete or abort an exercise to create one.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.summary.sessionId} className="panel p-3 flex items-center gap-4" data-testid={`history-${s.summary.sessionId}`}>
              <div className="min-w-0">
                <div className="font-semibold truncate">{s.summary.scenarioTitle}</div>
                <div className="text-xs text-console-muted">
                  {s.summary.startedAt} · {s.summary.status} · {s.summary.durationSimSeconds.toFixed(0)}s ·{' '}
                  {s.summary.assessments.filter((a) => a.correct === true).length}/
                  {s.summary.assessments.length} correct · seed {s.summary.seed}
                </div>
              </div>
              <button onClick={() => reExport(s)} className="ml-auto text-sm border border-console-border px-2 py-0.5 rounded">
                Export
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
