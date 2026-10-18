import { useEffect, useMemo, useState } from 'react';
import { initStorage } from '../core/persistence/appStorage';
import { traineeHistory } from '../core/learning/trainees';
import { traineeProfileSchema, type TraineeProfile } from '../core/learning/profile';
import { calculateSkillDNA } from '../core/learning/skillDNA';
import type { StoredSession } from '../core/persistence/storage';
import { useSettingsStore } from '../store/settingsStore';

export function useTraineeLearning() {
  const traineeId=useSettingsStore((s)=>s.traineeId);
  const [profile,setProfile]=useState<TraineeProfile|null>(null); const [sessions,setSessions]=useState<StoredSession[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [revision,setRevision]=useState(0);
  useEffect(()=>{let active=true; setLoading(true);setProfile(null);setSessions([]);setError('');
    void initStorage().then(async(storage)=>{
      const raw=await storage.getTrainee(traineeId); if(!raw) return;
      const p=traineeProfileSchema.parse(raw); const h=await traineeHistory(storage,p);
      if(active){setProfile(p);setSessions(h.sessions);setError(h.warnings.join(' '));}
    }).catch((e:unknown)=>{if(active)setError(e instanceof Error?e.message:String(e));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[traineeId,revision]);
  const dna=useMemo(()=>profile?calculateSkillDNA(profile,sessions):null,[profile,sessions]);
  const belongs=!profile||profile.id===traineeId;
  return {profile:belongs?profile:null,sessions:belongs?sessions:[],dna:belongs?dna:null,loading:loading||!belongs,error,refresh:()=>setRevision((r)=>r+1)};
}
