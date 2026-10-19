import { useMemo } from 'react';
import { WorldBatch,instance,type WorldInstance } from './WorldBatch';
export function RuralLandscape({detail,shadows}:{detail:number;shadows:boolean}){
 const layout=useMemo(()=>{const foliage:WorldInstance[]=[],trunks:WorldInstance[]=[],shrubs:WorldInstance[]=[],fields:WorldInstance[]=[],props:WorldInstance[]=[],roofs:WorldInstance[]=[];
  for(let i=0;i<54+detail*18;i++){const sign=i%2?1:-1,x=sign*(55+((i*37)%177)),z=52-((i*61)%310),h=6+(i%5)*1.1;trunks.push(instance(x,h*.4,z,.5,h*.8,.5,'#625d49'));foliage.push(instance(x,h*.86,z,2.7+(i%3)*.5,h*.42,2.6,'#4c6043'));if(detail>0)foliage.push(instance(x+1.8,h*.7,z+1.1,2.5,h*.3,2.5,'#526547'));if(i%3===0)shrubs.push(instance(x-4,.9,z+3,2.4,1.1,1.8,'#656e4a'));}
  for(let i=0;i<10;i++){const sign=i%2?1:-1;fields.push(instance(sign*(73+Math.floor(i/2)*39),.05,-80-Math.floor(i/2)*35,32,.08,28,['#8a8b5f','#737e53','#969169'][i%3]));}
  for(let i=0;i<3;i++){const x=i===0?-95:110+i*24,z=-130-i*32,w=12+i*3,h=5+i;props.push(instance(x,h/2,z,w,h,15,'#a4a08a'));for(const sign of [-1,1])roofs.push(instance(x+sign*w/4,h+1.4,z,w*.56,.45,16,'#756b5b',[0,0,sign*-.3]));props.push(instance(x,h*.45,z+7.6,3,h*.8,.2,'#535c55'));}
  for(let i=0;i<38;i++){const z=60-i*8,x=Math.sin(i*.15)*12;fields.push(instance(x,.1,z,8,.12,9.3,'#9d9275',[0,Math.cos(i*.15)*.12,0]));if(i%2===0)for(const sign of [-1,1]){props.push(instance(sign*48,1,z,.25,2,.25,'#8d8265'));props.push(instance(sign*48,1.2,z-3.5,.15,.16,7.5,'#8d8265'));}}
  if(detail>0)for(let i=0;i<130;i++){const x=-195+(i*47)%390,z=-200+(i*31)%275;shrubs.push(instance(x,.23,z,.7,.6,.5,'#76825a'));}
  return {foliage,trunks,shrubs,fields,props,roofs};},[detail]);
 return <group name="fictional-rural-landscape"><WorldBatch items={layout.fields}/><WorldBatch items={layout.trunks} shape="cylinder" shadow={shadows}/><WorldBatch items={layout.foliage} shape="sphere" shadow={shadows}/><WorldBatch items={layout.shrubs} shape="sphere"/><WorldBatch items={layout.props} shadow={shadows}/><WorldBatch items={layout.roofs} shadow={shadows}/></group>;
}
