/** Presentation-only world: original deterministic geometry, materials and scenario-derived atmosphere. */
import { useEffect,useMemo } from 'react';
import * as THREE from 'three';
import type { EnvironmentPreset,TimeOfDay,VisibilityCondition,WeatherEffect } from '../core/types';
import { useSettingsStore } from '../store/settingsStore';
import { UrbanDistrict } from './UrbanDistrict';
import { RuralLandscape } from './RuralLandscape';
import { GRAPHICS } from './quality';
export interface EnvironmentProps {environment:EnvironmentPreset;timeOfDay:TimeOfDay;visibility:VisibilityCondition;weather:WeatherEffect}
const PALETTES={day:{sky:'#b1c5c9',fog:'#b1c5c9',sun:'#fff0d2',hemi:1.25,direct:2.1,ambient:.22},dusk:{sky:'#777b8b',fog:'#777b8b',sun:'#f2bc93',hemi:.65,direct:1.05,ambient:.17},night:{sky:'#172632',fog:'#172632',sun:'#a0bbd4',hemi:.35,direct:.32,ambient:.13}};
const FOG={clear:.0012,lightFog:.006,denseFog:.016};
export function Environment({environment,timeOfDay,visibility,weather}:EnvironmentProps){
 const preset=useSettingsStore(s=>s.graphicsPreset),detail=preset==='low'?0:preset==='medium'?1:2,shadows=preset!=='low',palette=PALETTES[timeOfDay];
 const surface=useMemo(()=>{const pixels=new Uint8Array(128*128*4);let state=137;for(let i=0;i<128*128;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;const shade=170+(state%55);pixels.set([shade,shade,shade,255],i*4);}const texture=new THREE.DataTexture(pixels,128,128);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(70,70);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;},[]);
 useEffect(()=>{surface.needsUpdate=true;return()=>surface.dispose();},[surface]);
 const terrain=useMemo(()=>{const geometry=new THREE.PlaneGeometry(1000,1000,GRAPHICS[preset].terrainSegments,GRAPHICS[preset].terrainSegments);geometry.rotateX(-Math.PI/2);const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),edge=Math.max(0,Math.min(1,(Math.abs(x)+Math.max(0,-z-160)-220)/130));positions.setY(i,edge*(10+Math.sin(x*.021)*7+Math.cos(z*.024)*9));}geometry.computeVertexNormals();return geometry;},[preset]);
 useEffect(()=>()=>terrain.dispose(),[terrain]);
 const rain=useMemo(()=>{if(weather!=='rain')return null;const count=GRAPHICS[preset].rain,positions=new Float32Array(count*3);for(let i=0;i<count;i++){positions[i*3]=-220+(i*73)%440;positions[i*3+1]=(i*17)%120;positions[i*3+2]=-240+(i*53)%360;}return positions;},[weather,preset]);
 const sky=useMemo(()=>{const geometry=new THREE.SphereGeometry(650,24,12),position=geometry.attributes.position,colors=new Float32Array(position.count*3),horizon=new THREE.Color(palette.sky),zenith=new THREE.Color(timeOfDay==='day'?'#6b97ae':timeOfDay==='dusk'?'#4c586e':'#091421');for(let i=0;i<position.count;i++){const color=horizon.clone().lerp(zenith,Math.pow(Math.max(0,position.getY(i)/650),.65));colors.set([color.r,color.g,color.b],i*3);}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;},[palette.sky,timeOfDay]);
 useEffect(()=>()=>sky.dispose(),[sky]);
 return <><mesh geometry={sky}><meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false}/></mesh><color attach="background" args={[palette.sky]}/><fogExp2 attach="fog" args={[palette.fog,FOG[visibility]*(weather==='reducedContrast'?1.4:1)]}/><hemisphereLight args={[palette.sky,'#4f5545',palette.hemi]}/>{/* Only authored static scenery casts shadows. Refresh on environment/quality/light changes. */}<directionalLight key={`${environment}-${preset}-${timeOfDay}`} shadow-autoUpdate={false} shadow-needsUpdate={true} position={timeOfDay==='night'?[-90,100,-100]:[90,130,30]} color={palette.sun} intensity={palette.direct} castShadow={shadows} shadow-mapSize={[preset==='high'?2048:1024,preset==='high'?2048:1024]} shadow-camera-left={-210} shadow-camera-right={210} shadow-camera-top={200} shadow-camera-bottom={-200} shadow-camera-far={550} shadow-bias={-.0005} shadow-normalBias={.12}/><ambientLight intensity={palette.ambient}/>
 <mesh geometry={terrain} receiveShadow position={[0,-.08,0]}><meshStandardMaterial color={environment==='urban'?'#8b9186':'#889069'} map={surface} roughness={.98}/></mesh>
 {environment==='urban'?<UrbanDistrict night={timeOfDay==='night'} detail={detail} shadows={shadows}/>:<RuralLandscape detail={detail} shadows={shadows}/>}
 {rain&&<points><bufferGeometry><bufferAttribute attach="attributes-position" args={[rain,3]}/></bufferGeometry><pointsMaterial color="#b7c8d1" size={.25} transparent opacity={.45}/></points>}
 </>;
}
