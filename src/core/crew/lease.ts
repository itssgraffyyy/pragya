/** Browser-local exclusive host lease. It is not a LAN transport or authentication. */
export async function acquireCrewHost(crewId:string):Promise<()=>void>{
 if(typeof navigator==='undefined'||!navigator.locks)throw new Error('This browser cannot protect a single crew host; Web Locks support is required for live Duo Mode.');
 return new Promise((resolve,reject)=>{void navigator.locks.request(`pragya-crew-host:${crewId}`,{mode:'exclusive',ifAvailable:true},async lock=>{if(!lock){reject(new Error('Another local tab already hosts this crew. Leave that workspace before taking over.'));return;}await new Promise<void>(release=>resolve(release));}).catch(reject);});
}
