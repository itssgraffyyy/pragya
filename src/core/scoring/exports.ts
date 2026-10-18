import type { AssessmentResult } from './results';
import type { ScoringPolicy } from './policy';
import type { StoredSession } from '../persistence/storage';
import { detectBlindSpots } from '../intelligence/blindSpots';

export function assessmentExport(session: StoredSession, result: AssessmentResult, policy: ScoringPolicy) {
  return { kind: 'pragya-assessment-export', exportVersion: 1, session, policy, result, blindSpots: detectBlindSpots([result]) };
}

export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function assessmentCsv(result: AssessmentResult): string {
  const rows: unknown[][] = [['sessionId', 'traineeId', 'policyId', 'policyVersion', 'contactId', 'assessable', 'detection', 'classification', 'procedural', 'evidence', 'calibration', 'classificationOutcome', 'rules']];
  for (const c of result.contacts) rows.push([result.sessionId, result.traineeId, result.policyId, result.policyVersion, c.contactId, c.assessable, c.detection, c.classification, c.procedural, c.evidence, c.calibration, c.classificationOutcome, c.appliedRuleIds.join(';')]);
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
