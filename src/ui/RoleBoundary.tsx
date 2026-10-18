import { useSimulationStore } from '../store/simulationStore';
import { useEffect,useState,type ReactNode } from 'react';
import { useIdentityStore } from '../store/identityStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore,type Screen } from '../store/uiStore';
import { initStorage } from '../core/persistence/appStorage';
import { records } from '../core/unit/service';
/** Demo workflow restriction. Browser/OS access remains outside this boundary. */
export function RoleBoundary({screen,children}:{screen:Screen;children:ReactNode}){
 const userId=useIdentityStore(s=>s.userId);const traineeId=useSettingsStore(s=>s.traineeId);const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);const [checkedKey,setCheckedKey]=useState('');const permissionKey=JSON.stringify([userId,traineeId,screen]);
 useEffect(()=>{let active=true;setLoading(true);void (async()=>{if(!userId||screen==='home'||screen==='units'||screen==='settings'||screen==='transfer')return true;const s=await initStorage();const user=(await records(s,'users')).find(u=>u.id===userId&&!u.archived);if(!user)return false;const roles=(await records(s,'memberships')).filter(m=>!m.archived&&m.userId===userId&&(m.unitId));const units=await records(s,'units');const enabled=roles.filter(m=>units.some(u=>u.id===m.unitId&&!u.archived));if(['console','summary'].includes(screen)&&enabled.some(m=>m.role==='instructor')&&useSimulationStore.getState().engine?.traineeId===('preview:'+userId))return true;if(['console','summary'].includes(screen)&&useSimulationStore.getState().engine&&useSimulationStore.getState().engine?.traineeId!==user.traineeId)return false;if(screen==='analytics')return enabled.some(m=>m.role==='commander'||m.role==='instructor');if(screen==='instructor')return enabled.some(m=>m.role==='trainee'||m.role==='instructor');if(screen==='crew')return enabled.some(m=>m.role==='trainee'||m.role==='instructor');if(screen==='editor')return enabled.some(m=>m.role==='instructor');return enabled.some(m=>m.role==='trainee')&&user.traineeId===traineeId&&screen!=='trainees';})().then(ok=>{if(active){setAllowed(ok);setCheckedKey(permissionKey);setLoading(false);}}).catch(()=>{if(active){setAllowed(false);setCheckedKey(permissionKey);setLoading(false);}});return()=>{active=false;};},[userId,traineeId,screen]);
 if(!userId)return <>{children}</>;if(loading||checkedKey!==permissionKey)return <p role="status">Checking local role permissions…</p>;
 if(!allowed)return <main className="p-6"><p role="alert">Access denied for the selected local identity. Use the unit workspace for authorized records.</p><button onClick={()=>useUiStore.getState().navigate('units')}>Local identities & units</button></main>;return <>{children}</>;
}
