/** Presentation over TraineeView. Camera is fixed-world, never target tracking. */
import { Suspense,useState,useRef,useEffect } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as Controls } from 'three-stdlib';
import { ACESFilmicToneMapping,SRGBColorSpace } from 'three';
import type { TraineeView } from '../core/sim/engine';
import { useSettingsStore } from '../store/settingsStore';
import { GRAPHICS,boundedDpr } from './quality';
import { Environment } from './Environment';
import { Contacts } from './Contacts';
export interface SimSceneProps {view:TraineeView;selectedContactId:string|null;onSelectContact:(id:string)=>void;interactive:boolean;renderScale:number;reducedMotion:boolean}
const POSITION:[number,number,number]=[16,48,115],TARGET:[number,number,number]=[0,22,-65];
type CameraAction={sequence:number;kind:'reset'|'in'|'out'|'left'|'right'};
function CameraRig({action,reducedMotion}:{action:CameraAction;reducedMotion:boolean}){
 const ref=useRef<Controls>(null),camera=useThree(s=>s.camera);
 useEffect(()=>{const controls=ref.current;if(!controls)return;if(action.kind==='reset'){const damping=controls.enableDamping;controls.enableDamping=false;controls.update();camera.position.set(...POSITION);controls.target.set(...TARGET);controls.update();controls.enableDamping=damping;}else if(action.kind==='in')controls.dollyIn(.8);else if(action.kind==='out')controls.dollyOut(.8);else controls.setAzimuthalAngle(controls.getAzimuthalAngle()+(action.kind==='left'?-1:1)*Math.PI/12);},[camera,action]);
 useFrame(({gl})=>{const {render,memory}=gl.info;gl.domElement.dataset.drawCalls=String(render.calls);gl.domElement.dataset.triangles=String(render.triangles);gl.domElement.dataset.geometries=String(memory.geometries);gl.domElement.dataset.textures=String(memory.textures);gl.domElement.dataset.cameraDistance=String(ref.current?.getDistance().toFixed(2));gl.domElement.dataset.camera=camera.position.toArray().map(v=>v.toFixed(2)).join(',');});
 return <OrbitControls ref={ref} enableDamping={!reducedMotion} dampingFactor={.08} target={TARGET} maxPolarAngle={Math.PI/2.1} minDistance={20} maxDistance={320}/>;
}
export function SimScene({view,selectedContactId,onSelectContact,interactive,renderScale,reducedMotion}:SimSceneProps){
 const preset=useSettingsStore(s=>s.graphicsPreset),[action,setAction]=useState<CameraAction>({sequence:0,kind:'reset'}),dpr=boundedDpr(preset,renderScale,window.devicePixelRatio);
 return <div role="group" aria-label="Synthetic observation viewport" className="scene-frame" data-quality={preset} data-dpr={dpr}>
 <Canvas dpr={dpr} shadows={GRAPHICS[preset].shadowSize>0} camera={{position:POSITION,fov:52,near:.5,far:900}} style={{width:'100%',height:'100%'}} gl={{antialias:preset!=='low'&&!reducedMotion,powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping,outputColorSpace:SRGBColorSpace}} data-testid="sim-canvas">
 <Suspense fallback={null}><Environment environment={view.environment} timeOfDay={view.timeOfDay} visibility={view.visibility} weather={view.weather}/><Contacts contacts={view.contacts} selectedId={selectedContactId} onSelect={onSelectContact} interactive={interactive} simTime={view.simTime} reducedMotion={reducedMotion}/><CameraRig action={action} reducedMotion={reducedMotion}/></Suspense></Canvas>
 <div className="camera-tools"><span>Drag to orbit  /  scroll to zoom</span>{([['left','Orbit observation view left','←'],['right','Orbit observation view right','→'],['in','Zoom observation view in','+'],['out','Zoom observation view out','−'],['reset','Reset observation view','Reset view']] as const).map(([kind,label,text])=><button key={kind} onClick={()=>setAction(v=>({sequence:v.sequence+1,kind}))} aria-label={label}>{text}</button>)}<small>{GRAPHICS[preset].label}</small></div></div>;
}
