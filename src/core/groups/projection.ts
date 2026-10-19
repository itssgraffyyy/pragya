import type { GroupTraining } from './models';
import type { Vec3 } from '../contacts/motion';
export function groupStateAt(group:GroupTraining['groups'][number],time:number){return [...group.states].reverse().find(s=>s.atTime<=time);}
/** Bounded educational formation offsets, added to the original engine's path. */
export function groupOffset(training:GroupTraining|undefined,contactId:string,time:number):Vec3{
 for(const group of training?.groups??[]){if(group.relationship!=='coordinated')continue;const state=groupStateAt(group,time),index=state?.members.indexOf(contactId)??-1;if(!state||index<0)continue;
  const centered=index-(state.members.length-1)/2;
  if(state.formation==='line')return [centered*12,0,0];
  if(state.formation==='dispersed')return [centered*25,0,index%2*18];
  const angle=index/state.members.length*Math.PI*2;return [Math.cos(angle)*9,0,Math.sin(angle)*9];
 }
 return [0,0,0];
}
