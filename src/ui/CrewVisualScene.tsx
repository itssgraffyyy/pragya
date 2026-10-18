import { useEffect,useState } from 'react';
import type { CrewRuntime } from '../core/crew/runtime';
import { SimScene,type SimSceneProps } from '../render/SimScene';
/** Read the one authoritative engine; this view never advances its clock. */
export function CrewVisualScene({runtime,...props}:{runtime:CrewRuntime}&Omit<SimSceneProps,'view'>){const [view,setView]=useState(()=>runtime.engine.traineeView());useEffect(()=>{let handle=0;const update=()=>{if(runtime.engine.state==='running')setView(runtime.engine.traineeView());handle=requestAnimationFrame(update);};handle=requestAnimationFrame(update);return()=>cancelAnimationFrame(handle);},[runtime]);return <SimScene {...props} view={view}/>;}
