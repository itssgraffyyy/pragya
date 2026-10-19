import type { ScoringInput } from './results';
import type { ScoringPolicy } from './policy';
import type { GroupScore } from '../groups/models';
import { groupStateAt } from '../groups/projection';
/** Additional transparent categories in the canonical Module 2 scorer. Legacy overall is unchanged. */
export function scoreGroupReports(input:ScoringInput,policy:ScoringPolicy):GroupScore[]{
 const w=policy.groupReporting;if(!w)return [];
 const events=input.events.filter(e=>e.sessionId===input.sessionId&&e.traineeId===input.traineeId&&e.simTimestamp<=input.endedAtSimTime);
 return (input.scenario.groupTraining?.groups??[]).map(group=>{
  const report=events.find(e=>e.type==='groupReportSubmitted'&&e.actionDetails?.groupId===group.id),state=groupStateAt(group,report?.simTimestamp??input.endedAtSimTime);
  const observations=events.filter(e=>e.type==='groupObservationRecorded'&&e.actionDetails?.groupId===group.id&&e.actionDetails?.stateId===state?.id&&(!report||e.simTimestamp<=report.simTimestamp&&events.indexOf(e)<events.indexOf(report)));
  const ids=[...new Set(observations.flatMap(e=>Array.isArray(e.actionDetails?.contactIds)?e.actionDetails.contactIds:[]))];
  const supported=ids.filter(id=>state?.members.includes(id)&&events.some(e=>e.type==='contactAcknowledged'&&e.contactId===id&&observations.some(o=>Array.isArray(o.actionDetails?.contactIds)&&o.actionDetails.contactIds.includes(id)&&events.indexOf(e)<events.indexOf(o))));
  const completeness=state?Math.min(1,supported.length/state.members.length):0,attribution=ids.length?supported.length/ids.length:0;
  const accepted=!!report&&group.acceptedReports.includes(report.actionDetails?.report as import('../groups/models').GroupReport);
  const qualified=accepted&&supported.length>=2&&(group.relationship!=='ambiguous'||report?.actionDetails?.confidence==='low')?1:0;

  return {groupId:group.id,policyRef:`${policy.policyId}@${policy.policyVersion}`,observationCompleteness:Math.round(completeness*100),attribution:Math.round(attribution*100),qualification:qualified*100,overall:Math.round((w.completeness*completeness+w.attribution*attribution+w.qualification*qualified)*100),sourceEventIds:[...observations.map(e=>e.eventId),...(report?[report.eventId]:[])],explanation:report?`Recorded ${supported.length}/${state?.members.length??0} supported contact references. ${qualified?'Report matches the synthetic educational rubric.':'Report is missing support or appropriate qualification under the declared rubric.'}`:'No committed group report; observation and reporting completeness are distinct from contact classification.'};
 });
}
