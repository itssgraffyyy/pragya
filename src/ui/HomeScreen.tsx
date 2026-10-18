/**
 * Home screen — entry point.
 */

import { useUiStore } from '../store/uiStore';
import { BUNDLED_SCENARIOS } from '../core/scenario/bundled';

export function HomeScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const cards: { title: string; subtitle: string; action: () => void }[] = [
    { title: 'Duo Crew Mode', subtitle: 'One shared scenario, structured communication and crew review', action: () => navigate('crew') },
    { title: 'Units & Identities', subtitle: 'Local demo roles, membership and instructor scope', action: () => navigate('units') },
    { title: 'Personal Coach', subtitle: 'Offline explanations grounded in assessment evidence', action: () => navigate('coach') },
    { title: 'Learning Progress', subtitle: 'Before/after evidence and refresher planning', action: () => navigate('progress') },
    { title: 'Adaptive Training', subtitle: 'Personalized corrective exercises and explanations', action: () => navigate('adaptive') },
    { title: 'Skill DNA', subtitle: 'Evidence, competencies and comparable trends', action: () => navigate('learning') },
    { title: 'Trainee Profiles', subtitle: 'Local profiles and individual assessment history', action: () => navigate('trainees') },
    {
      title: 'Scenario Selection',
      subtitle: `${BUNDLED_SCENARIOS.length} scripted scenarios + procedural generator`,
      action: () => navigate('scenarios'),
    },
    {
      title: 'Generate Scenario',
      subtitle: 'Deterministic seeded procedural generation',
      action: () => navigate('generator'),
    },
    {
      title: 'Instructor Editor',
      subtitle: 'Author, validate, import and export scenarios',
      action: () => navigate('editor'),
    },
    {
      title: 'Session History',
      subtitle: 'Review saved results and re-export logs',
      action: () => navigate('history'),
    },
    {
      title: 'Settings',
      subtitle: 'Graphics, accessibility and trainee profile',
      action: () => navigate('settings'),
    },
  ];

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-wide text-console-accent">PRAGYA</h1>
        <p className="mt-2 text-console-muted max-w-xl">
          Personalized Readiness &amp; Adaptive Guidance for Aerial Threat Awareness —
          an offline-first recognition training simulator.
        </p>
        <p className="mt-1 text-xs text-console-muted">
          Module 1: Simulation &amp; Scenario Engine — training content only; no real-world
          targeting, jamming or counter-drone tactics.
        </p>
      </div>
      <div className="grid gap-4 w-full max-w-3xl sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.title}
            onClick={c.action}
            className="panel p-4 text-left hover:border-console-accent transition-colors"
            data-testid={`home-${c.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="font-semibold text-console-text">{c.title}</div>
            <div className="text-sm text-console-muted mt-1">{c.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
