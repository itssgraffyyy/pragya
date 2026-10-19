import { useMemo } from 'react';
import { WorldBatch,instance,type WorldInstance } from './WorldBatch';
/** Authored fictional streets and plots. Central aerial observation corridor stays open. */
export function UrbanDistrict({night,detail,shadows}:{night:boolean;detail:number;shadows:boolean}){
 const layout=useMemo(()=>{
  const buildings:WorldInstance[]=[],roofs:WorldInstance[]=[],windows:WorldInstance[]=[],props:WorldInstance[]=[],roads:WorldInstance[]=[],markings:WorldInstance[]=[],trees:WorldInstance[]=[],trunks:WorldInstance[]=[],lights:WorldInstance[]=[];
  const plaster=['#a0a18e','#a9a292','#8d9797','#969f9d','#afa99b'],roof=['#64706e','#5c666a','#7d7266'];
  for(const x of [-110,-64,66,118])for(let row=0;row<4;row++){
   const i=buildings.length,z=-65-row*53,w=22+(i%3)*5,d=23+(i%2)*8,h=12+(i%4)*7;
   buildings.push(instance(x,h/2,z,w,h,d,plaster[i%plaster.length]));
   roofs.push(instance(x,h+.5,z,w+1,1,d+1,roof[i%3]));
   if(i%3===0){roofs.push(instance(x,h+2,z,8,3,8,'#66736e'));props.push(instance(x+6,h+1.4,z+5,3,2,5,'#899390'));}
   else{for(const sign of [-1,1])roofs.push(instance(x+sign*w/4,h+3,z,w*.54,.7,d+1,roof[i%3],[0,0,sign*-.28]));}
   for(let floor=0;floor<Math.floor(h/4);floor++)for(let col=0;col<Math.floor(w/5);col++){const wx=x-w/2+3+col*5,wy=3+floor*4;windows.push(instance(wx,wy,z+d/2+.08,2.4,1.9,.15,night&&(floor+col+i)%4===0?'#bca277':'#354955'));if(detail>0)props.push(instance(wx,wy-1.1,z+d/2+.22,2.9,.18,.5,'#b6b7a7'));}
   props.push(instance(x-w/2-2,1,z+d*.4,1.5,2,2,'#4a645d'));
  }
  for(const x of [-154,-31,32,163])roads.push(instance(x,.06,-112,10,.12,390,'#424c50'));
  for(const z of [8,-36,-118,-228])roads.push(instance(0,.09,z,410,.15,10,'#424c50'));
  for(const x of [-39,40])roads.push(instance(x,.16,-104,3,.26,360,'#91958b'));
  for(let i=0;i<30;i++)for(const x of [-31,32])markings.push(instance(x,.16,65-i*11,.18,.03,4.5,'#c7c5a9'));
  for(let i=0;i<12;i++){const sign=i%2?1:-1,x=sign*(45+(i%3)*56),z=30-Math.floor(i/2)*48;trunks.push(instance(x,3,z,.8,6,.8,'#55594c'));trees.push(instance(x,7,z,3.7,4.5,3.7,'#4d6251'));props.push(instance(x+5,1,z,4,2,1,'#7e877c'));}
  for(let i=0;i<12;i++){const x=i%2?-39:40,z=24-Math.floor(i/2)*51;props.push(instance(x,4.5,z,.25,9,.25,'#566266'));props.push(instance(x+(x<0?2:-2),9,z,4,.2,.3,'#68777a'));lights.push(instance(x+(x<0?3:-3),8.9,z,1.1,.15,.6,night?'#e7c58b':'#a3aba8'));}
  if(detail>0)for(let i=0;i<7;i++){const x=i%2?-147:151,z=-15-i*26;props.push(instance(x,1,z,2.2,1.5,4.8,['#647e83','#a19784','#717974'][i%3]));props.push(instance(x,1.9,z-.3,1.9,.7,2.7,'#3b505a'));}
  return {buildings,roofs,windows,props,roads,markings,trees,trunks,lights};
 },[night,detail]);
 return <group name="fictional-urban-district"><WorldBatch items={layout.roads}/><WorldBatch items={layout.markings}/><WorldBatch items={layout.buildings} shadow={shadows}/><WorldBatch items={layout.roofs} shadow={shadows}/><WorldBatch items={layout.windows}/><WorldBatch items={layout.props} shadow={shadows}/><WorldBatch items={layout.trunks} shape="cylinder" shadow={shadows}/><WorldBatch items={layout.trees} shape="sphere" shadow={shadows}/><WorldBatch items={layout.lights} emissive={night}/></group>;
}
