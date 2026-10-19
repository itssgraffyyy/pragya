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
function CameraRig({reset,reducedMotion}:{reset:number;reducedMotion:boolean}){
 const ref=useRef<Controls>(null),camera=useThree(s=>s.camera);
 useEffect(()=>{camera.position.set(...POSITION);ref.current?.target.set(...TARGET);ref.current?.update();},[camera,reset]);
 useFrame(({gl})=>{const {render,memory}=gl.info;gl.domElement.dataset.drawCalls=String(render.calls);gl.domElement.dataset.triangles=String(render.triangles);gl.domElement.dataset.geometries=String(memory.geometries);gl.domElement.dataset.textures=String(memory.textures);gl.domElement.dataset.camera=camera.position.toArray().map(v=>v.toFixed(2)).join(',');});
 return <OrbitControls ref={ref} enableDamping={!reducedMotion} dampingFactor={.08} target={TARGET} maxPolarAngle={Math.PI/2.1} minDistance={20} maxDistance={320}/>;
}
export function SimScene({view,selectedContactId,onSelectContact,interactive,renderScale,reducedMotion}:SimSceneProps){
 const preset=useSettingsStore(s=>s.graphicsPreset),[reset,setReset]=useState(0),dpr=boundedDpr(preset,renderScale,window.devicePixelRatio);
 return <div className="scene-frame" data-quality={preset} data-dpr={dpr}>
 <Canvas dpr={dpr} shadows={GRAPHICS[preset].shadowSize>0} camera={{position:POSITION,fov:52,near:.5,far:900}} style={{width:'100%',height:'100%'}} gl={{antialias:preset!=='low'&&!reducedMotion,powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping,outputColorSpace:SRGBColorSpace}} data-testid="sim-canvas">
 <Suspense fallback={null}><Environment environment={view.environment} timeOfDay={view.timeOfDay} visibility={view.visibility} weather={view.weather}/><Contacts contacts={view.contacts} selectedId={selectedContactId} onSelect={onSelectContact} interactive={interactive} simTime={view.simTime} reducedMotion={reducedMotion}/><CameraRig reset={reset} reducedMotion={reducedMotion}/></Suspense></Canvas>
 <div className="camera-tools"><span>Drag to orbit  /  scroll to zoom</span><button onClick={()=>setReset(v=>v+1)} aria-label="Reset observation view">Reset view</button><small>{GRAPHICS[preset].label}</small></div></div>;
}
