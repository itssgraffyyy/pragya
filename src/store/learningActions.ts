import { initStorage } from '../core/persistence/appStorage';
import { assignExerciseSession } from '../core/learning/adaptive';
import { useSimulationStore } from './simulationStore';
import { useSettingsStore } from './settingsStore';
import { useUiStore } from './uiStore';
export async function startAdaptiveExercise(exerciseId:string):Promise<void>{
  const traineeId=useSettingsStore.getState().traineeId;const storage=await initStorage();
  const sessionId=`adaptive-${crypto.randomUUID()}`;const exercise=await assignExerciseSession(storage,traineeId,exerciseId,sessionId);
  useSimulationStore.getState().loadScenario(exercise.scenario,sessionId,traineeId,exercise.policySnapshot?{policy:exercise.policySnapshot}:undefined);
  const error=useSimulationStore.getState().lastActionError;if(error)throw new Error(error);
  useUiStore.getState().navigate('console');
}
