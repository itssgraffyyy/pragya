import type { StoredSession } from '../core/persistence/storage';
import { integrityForSession } from '../core/assessGuard/eligibility';
export function AssessmentIntegrity({session}:{session:StoredSession}){
 const integrity=integrityForSession(session);
 return <section className="panel integrity-panel p-3 space-y-2" data-testid="assessment-integrity"><h4>AssessGuard — assessment eligibility</h4><p>Training stage: {integrity.stage}. Original rubric scores are preserved separately from qualified competency evidence.</p>
 {integrity.competencies.map(c=><div className="eligibility-row" data-state={c.state} key={c.blueprintId+c.competency}><p>{c.competency}: {c.state}; eligible contacts: {c.eligibleContactIds.join(', ')||'none established'}.</p><details><summary>Reasons and event references</summary><p>Reasons: {c.reasonCodes.join(', ')||'declared observation and response conditions met'}. Event references: {c.sourceEventIds.join(', ')||'unavailable'}.</p></details></div>)}
 {integrity.limitations.map(x=><p key={x}>{x}</p>)}
 <details><summary>Recorded opportunity ledger</summary>{session.events.events.filter(e=>e.type.startsWith('opportunity')||e.type.startsWith('group')).map(e=><p key={e.eventId}>{e.eventId} · {e.simTimestamp}s · {e.type} · {e.contactId} · {JSON.stringify(e.actionDetails)}</p>)}</details></section>;
}
