import type { StoredSession } from '../core/persistence/storage';
import { evidenceJudgment } from '../core/evidenceMind/judgment';
import { scoringInputFor } from '../core/scoring/storedSession';
import { integrityForSession } from '../core/assessGuard/eligibility';
export function EvidenceMindPanel({session}:{session:StoredSession}){
 if(!session.assessment)return null;
 const result=evidenceJudgment(scoringInputFor(session),session.assessment.contacts,integrityForSession(session));
 return <section className="panel p-3 space-y-2" data-testid="evidence-mind"><h4>EvidenceMind — judgment and supporting observations</h4><p>Stage: {result.stage}. Correctness and evidence quality are separate.</p>{result.contacts.map(c=><article key={c.contactId}><p>{c.contactId}: correctness {c.correctness}; evidence {c.sufficiency}; relevance {c.relevance}; contradictions {c.contradiction}; uncertainty {c.uncertainty}; reporting {c.reporting}.</p><p>Available synthetic observations: {c.availableOpportunityIds.join(', ')||'unknown or unavailable'}. Selected evidence: {c.selectedEvidence.join(', ')||'none'}.</p><p>Pre-decision recorded observations: {c.preDecisionObservationIds.join(', ')||'none'}. Post-decision references: {c.postDecisionObservationIds.join(', ')||'none'}.</p><details><summary>Judgment provenance</summary><p>{c.sourceEventIds.join(', ')||'unavailable'}</p>{c.limitations.map(x=><p key={x}>{x}</p>)}</details></article>)}{result.limitations.map(x=><p key={x}>{x}</p>)}</section>;
}
