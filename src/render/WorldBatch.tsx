import { useLayoutEffect,useRef } from 'react';
import * as THREE from 'three';
export interface WorldInstance {position:[number,number,number];scale:[number,number,number];color:string;rotation?:[number,number,number]}
/** One geometry/material/draw call per decorative batch; disposed by the R3F tree. */
export function WorldBatch({items,shape='box',shadow=false,emissive=false}:{items:WorldInstance[];shape?:'box'|'sphere'|'cylinder';shadow?:boolean;emissive?:boolean}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const transform=new THREE.Object3D();items.forEach((item,i)=>{transform.position.set(...item.position);transform.scale.set(...item.scale);transform.rotation.set(...item.rotation??[0,0,0]);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,new THREE.Color(item.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();},[items]);
 if(!items.length)return null;
 return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} castShadow={shadow} receiveShadow>{shape==='sphere'?<sphereGeometry args={[1,10,7]}/>:shape==='cylinder'?<cylinderGeometry args={[1,1,1,8]}/>:<boxGeometry args={[1,1,1]}/>}<meshStandardMaterial roughness={.9} metalness={.02} emissive={emissive?'#b38b49':'#000000'} emissiveIntensity={emissive?.65:0}/></instancedMesh>;
}
export function instance(x:number,y:number,z:number,w:number,h:number,d:number,color:string,rotation?:[number,number,number]):WorldInstance{return {position:[x,y,z],scale:[w,h,d],color,...rotation?{rotation}:{}};}
