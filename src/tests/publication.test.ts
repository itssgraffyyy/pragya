import { it,expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbStorage } from '../core/persistence/indexedDbStorage';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { BUNDLED_SCENARIOS } from '../core/scenario/bundled';
import type { TrainingRecord } from '../core/unit/models';
for(const adapter of ['memory','indexeddb'])it(`${adapter} rolls back scenario publication when related metadata cannot be stored`,async()=>{if(adapter==='indexeddb')globalThis.indexedDB=new IDBFactory();const s=adapter==='indexeddb'?new IndexedDbStorage():new MemoryStorage();await s.init();const original=structuredClone(BUNDLED_SCENARIOS[0]);await s.saveScenario(original);const changed={...original,title:'Must not commit'};const invalid={kind:'units',id:'invalid',value:{id:'invalid',uncloneable:()=>{}}} as unknown as TrainingRecord;await expect(s.saveScenarioPublication(changed,[invalid])).rejects.toThrow();expect((await s.getScenario(original.id))?.title).toBe(original.title);expect(await s.listTrainingRecords('units')).toEqual([]);});
