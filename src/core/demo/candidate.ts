/** Demo composition only: keep the scripted baseline comparable to its normal-channel adaptive loop. */
import { generateCurriculumCandidate,DEFAULT_LEARNING_DEMAND } from '../curriculum/generation';
import type { ObjectiveDefinition } from '../curriculum/models';
import type { ScoringPolicy } from '../scoring/policy';
export function comparableDemoSeed(objectiveKey:string,objective:ObjectiveDefinition,policy:ScoringPolicy){
 for(let offset=0;offset<32;offset++){
  const seed=505+offset;
  const candidate=generateCurriculumCandidate(objectiveKey,objective,DEFAULT_LEARNING_DEMAND,seed,policy,8);
  const scenario=candidate.scenario;
  if(candidate.quality.status!=='invalid_for_declared_assessment'&&scenario.sensor.channels.length===1&&scenario.sensor.channels[0].actualCondition==='normal'&&!scenario.timedEvents.some(e=>e.type==='sensorChange'))return seed;
 }
 throw new Error('No comparable normal-channel synthetic demo candidate within 32 bounded seed choices.');
}
