/** Original fictional silhouettes. Geometry consumes only the trainee projection. */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TraineeContactView } from '../core/sim/engine';
import { useSettingsStore } from '../store/settingsStore';
export interface ContactsProps {contacts:TraineeContactView[];onSelect:(id:string)=>void;selectedId:string|null;interactive:boolean;simTime:number;reducedMotion:boolean}
function ContactMesh({contact,selected,onSelect,interactive,simTime,reducedMotion}:{contact:TraineeContactView;selected:boolean;onSelect:(id:string)=>void;interactive:boolean;simTime:number;reducedMotion:boolean}){
 const group=useRef<THREE.Group>(null),rotors=useRef<THREE.Group>(null),details=useRef<THREE.Group>(null),light=useRef<THREE.Mesh>(null),wings=useRef<THREE.Group>(null);
 const preset=useSettingsStore(s=>s.graphicsPreset);
 const category=contact.visualShape?{rotorCompact:'smallMultirotor',rotorWide:'largeMultirotor',wingOutline:'fixedWing',flappingOutline:'birdLike',plainOutline:'civilianLike',indistinct:'unidentified'}[contact.visualShape]:contact.category;
 const rotor=category==='smallMultirotor'||category==='largeMultirotor'||category==='civilianLike',large=category==='largeMultirotor',span=large?1.2:.7,color=contact.appearance.color;
 useFrame(({camera,gl})=>{if(!group.current||!contact.position)return;group.current.position.set(...contact.position);group.current.rotation.y=contact.heading;
  if(details.current)details.current.visible=preset!=='low'&&camera.position.distanceTo(group.current.position)<110;
  if(rotors.current)rotors.current.children.forEach((hub,i)=>{hub.rotation.y=reducedMotion?0:simTime*48*(i%2?-1:1);});
  if(wings.current)wings.current.children.forEach((wing,i)=>{wing.rotation.z=(i?1:-1)*(.25+(reducedMotion?0:Math.sin(simTime*9)*.35));});
  if(light.current)light.current.visible=Math.floor(simTime*2)%2===0;
  // Diagnostic sample from the real renderer; no clock or engine ownership here.
  gl.domElement.dataset.cosmeticTime=String(simTime);
 });
 const material=<meshStandardMaterial color={color} roughness={.62} metalness={.15}/>;
 return <group ref={group} position={contact.position??[0,0,0]} rotation={[0,contact.heading,0]} scale={contact.appearance.scale} name={`contact-${contact.id}`} onClick={e=>{e.stopPropagation();if(interactive)onSelect(contact.id);}}>
 {rotor?<>
  <mesh scale={[large?1.5:.85,large?.48:.32,large?1.45:.85]}><sphereGeometry args={[.65,12,8]}/>{material}</mesh>
  {[Math.PI/4,-Math.PI/4].map(angle=><mesh key={angle} rotation={[0,angle,0]}><boxGeometry args={[span*2.9,.09,.12]}/>{material}</mesh>)}
  {[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={`${x}${z}`} position={[x*span,.08,z*span]}><cylinderGeometry args={[.13,.15,.25,8]}/><meshStandardMaterial color="#303b40"/></mesh>))}
  <group ref={rotors}>{[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x}${z}`} position={[x*span,.23,z*span]}><mesh><boxGeometry args={[large?1.04:.66,.025,.08]}/><meshStandardMaterial color="#87938e"/></mesh></group>))}</group>
  <group ref={details}>{[-1,1].map(x=><group key={x}><mesh position={[x*.35,-.3,0]}><boxGeometry args={[.05,.32,.08]}/>{material}</mesh><mesh position={[x*.35,-.46,0]}><boxGeometry args={[.06,.05,.8]}/><meshStandardMaterial color="#465359"/></mesh></group>)}<mesh position={[0,-.18,.34]}><sphereGeometry args={[.12,8,6]}/><meshStandardMaterial color="#30424a"/></mesh></group>
 </>:category==='fixedWing'?<>
  <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.12,.25,2.4,10]}/>{material}</mesh><mesh><boxGeometry args={[3.2,.08,.7]}/>{material}</mesh><mesh position={[0,0,-1.05]}><boxGeometry args={[1.1,.06,.35]}/>{material}</mesh><mesh position={[0,.26,-.95]}><boxGeometry args={[.07,.5,.4]}/>{material}</mesh><group ref={details}><mesh position={[0,.16,.35]} scale={[.75,.55,1.6]}><sphereGeometry args={[.2,10,6]}/><meshStandardMaterial color="#374d58" roughness={.3}/></mesh></group>
 </>:category==='birdLike'?<><mesh scale={[.7,.6,1.3]}><sphereGeometry args={[.28,8,6]}/>{material}</mesh><group ref={wings}>{[-1,1].map(x=><group key={x}><mesh position={[x*.5,0,0]}><boxGeometry args={[.9,.04,.25]}/>{material}</mesh></group>)}</group></>:<mesh><dodecahedronGeometry args={[.5,0]}/><meshStandardMaterial color={color} roughness={.95} flatShading/></mesh>}
 {contact.appearance.hasLights&&<mesh ref={light} position={[0,.24,0]}><sphereGeometry args={[.06,6,4]}/><meshBasicMaterial color="#e99578"/></mesh>}
 {selected&&<mesh><sphereGeometry args={[1.6,12,8]}/><meshBasicMaterial color="#83c7b7" wireframe transparent opacity={.5}/></mesh>}
 </group>;
}
export function Contacts({contacts,onSelect,selectedId,interactive,simTime,reducedMotion}:ContactsProps){return <group>{contacts.filter(c=>c.visibility==='visible'&&c.position).map(c=><ContactMesh key={c.id} contact={c} selected={c.id===selectedId} onSelect={onSelect} interactive={interactive} simTime={simTime} reducedMotion={reducedMotion}/>)}</group>;}
