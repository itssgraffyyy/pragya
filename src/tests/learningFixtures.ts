import { SimulationEngine } from '../core/sim/engine';
import { buildSessionExport } from '../core/sim/sessionSummary';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';

export function learningSession(id = 's1', traineeId = 't1', score: 'correct' | 'wrong' = 'correct', day = 1) {
  const engine = new SimulationEngine({ scenario: structuredClone(SCENARIO_SINGLE_RECOGNITION), sessionId: id, traineeId });
  engine.load(); engine.start(); for (let i=0;i<6;i++) engine.tick(1);
  engine.acknowledgeContact('c1'); engine.setClassification('c1', score === 'correct' ? 'smallMultirotor' : 'birdLike'); engine.setConfidence('c1','high');
  if (score === 'correct') engine.toggleEvidence('c1','rotorSilhouette',true);
  engine.setProceduralResponse('c1', score === 'correct' ? 'recordAndReport' : 'escalateSupervisor'); engine.submitAssessment('c1');
  const session = structuredClone(buildSessionExport(engine));
  session.summary.startedAt = `2026-10-${String(day).padStart(2,'0')}T00:00:00.000Z`;
  session.summary.endedAt = `2026-10-${String(day).padStart(2,'0')}T00:01:00.000Z`;
  session.assessment!.calculatedAt = session.summary.endedAt;
  return session;
}
