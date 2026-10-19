import { useEffect,useState,type ReactNode } from 'react';
import { useUiStore,type Screen } from '../store/uiStore';
import { useIdentityStore } from '../store/identityStore';
import { useSettingsStore } from '../store/settingsStore';
import { initStorage } from '../core/persistence/appStorage';
import { records } from '../core/unit/service';
import { OfflineStatus } from './OfflineStatus';
export const WORKSPACES:{label:string;links:[Screen,string][]}[]=[
 {label:'Overview',links:[['home','Dashboard']]},
 {label:'Training',links:[['scenarios','Scenario library'],['generator','Procedural generator'],['console','Training console'],['crew','Duo crew training']]},
 {label:'Assessment & learning',links:[['history','Session history & AAR'],['learning','Skill DNA'],['adaptive','Adaptive training'],['progress','Learning progress'],['coach','Personal coach']]},
 {label:'Instruction',links:[['instructor','Curriculum & assignments'],['editor','Editor & AssessGuard']]},
 {label:'Organization',links:[['analytics','Unit intelligence'],['units','Units & identities']]},
 {label:'System',links:[['demo','Synthetic demo'],['transfer','Backups & transfer'],['settings','Settings']]},
];
export function useWorkspaceAccess(){
 const userId=useIdentityStore(s=>s.userId),traineeId=useSettingsStore(s=>s.traineeId);const [identity,setIdentity]=useState({key:'',name:'Local workspace',roles:[] as string[],ownProfile:false});
 useEffect(()=>{let live=true;if(!userId){setIdentity({key:'',name:'Unrestricted local demo',roles:[],ownProfile:true});return;}void initStorage().then(async storage=>{const [users,members,units]=await Promise.all([records(storage,'users'),records(storage,'memberships'),records(storage,'units')]);const user=users.find(u=>u.id===userId&&!u.archived),roles=members.filter(m=>m.userId===userId&&!m.archived&&units.some(u=>u.id===m.unitId&&!u.archived)).map(m=>m.role);if(live)setIdentity({key:userId,name:user?.name??'Select an active identity',roles,ownProfile:!!user&&user.traineeId===traineeId});}).catch(()=>{if(live)setIdentity({key:userId,name:'Identity unavailable',roles:[],ownProfile:false});});return()=>{live=false;};},[userId,traineeId]);
 const ready=!userId||identity.key===userId;const roles=ready?identity.roles:[];
 const permitted=(screen:Screen)=>{if(!userId)return true;if(['home','units','settings','demo','transfer'].includes(screen))return true;if(!ready)return false;if(screen==='analytics')return roles.includes('commander')||roles.includes('instructor');if(screen==='instructor'||screen==='crew')return roles.includes('trainee')||roles.includes('instructor');if(screen==='editor')return roles.includes('instructor');return roles.includes('trainee')&&identity.ownProfile&&screen!=='trainees';};
 return {permitted,name:ready?identity.name:'Checking identity…',roles};
}
function WorkspaceIcon({index}:{index:number}){return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="3"/>{index%3===0?<path d="M4 10h16M10 10v10"/>:index%3===1?<path d="m8 15 3-6 3 6 3-6"/>:<path d="M8 8h8M8 12h8M8 16h5"/>}</svg>;}
export function AppShell({children}:{children:ReactNode}){
 const screen=useUiStore(s=>s.screen),navigate=useUiStore(s=>s.navigate),reducedMotion=useSettingsStore(s=>s.reducedMotion);const [collapsed,setCollapsed]=useState(false);const access=useWorkspaceAccess();const current=WORKSPACES.flatMap(g=>g.links).find(([id])=>id===screen)?.[1]??'After-action review';
 return <div className={`app-shell ${collapsed?'is-collapsed':''} ${reducedMotion?'reduce-motion':''}`}><a className="skip-link" href="#workspace-content">Skip to workspace</a><aside className="app-sidebar" aria-label="Primary navigation"><a className="product-brand" href="#home" onClick={e=>{e.preventDefault();navigate('home');}}><span className="brand-symbol" aria-hidden="true">P<span/></span><span className="brand-word">PRAGYA<small>TRAINING INTELLIGENCE</small></span></a><button className="sidebar-toggle" aria-label={collapsed?'Expand navigation':'Collapse navigation'} aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>{collapsed?'→':'←'}<span className="nav-copy">Collapse navigation</span></button><nav>{WORKSPACES.map((group,index)=>{const links=group.links.filter(([id])=>access.permitted(id));return links.length>0&&<details key={group.label} open className="nav-group"><summary title={group.label}><span className="nav-copy">{group.label}</span></summary>{links.map(([id,label])=><a key={id} href={'#'+id} title={label} aria-current={screen===id?'page':undefined} onClick={e=>{e.preventDefault();navigate(id);}}><WorkspaceIcon index={index}/><span className="nav-copy">{label}</span></a>)}</details>;})}</nav><div className="sidebar-footer"><span className="status-dot"/> <span className="nav-copy">Local-first training<br/><small>Private to this browser profile</small></span></div></aside><div className="app-main"><header className="workspace-topbar"><div><span className="eyebrow">WORKSPACE</span><strong>{current}</strong></div><div className="workspace-context"><span className="identity-caption">{access.name}</span><OfflineStatus/></div></header><div id="workspace-content" className={'workspace-content '+(['console','crew'].includes(screen)?'immersive-workspace':'')} tabIndex={-1}>{children}</div></div></div>;
}

