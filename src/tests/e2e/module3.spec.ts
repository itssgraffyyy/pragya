import { test, expect, type Page } from '@playwright/test';
import { createProfile } from '../../core/learning/profile';
import { MemoryStorage } from '../../core/persistence/memoryStorage';
import { exportTrainee } from '../../core/learning/trainees';
import type { LearningPlan } from '../../core/learning/plan';
import { learningSession } from '../learningFixtures';

async function localRecord<T>(page:Page,store:string,key:string):Promise<T>{
  return page.evaluate(({store,key})=>new Promise((resolve,reject)=>{const open=indexedDB.open('pragya-local');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const req=db.transaction(store,'readonly').objectStore(store).get(key);req.onsuccess=()=>{resolve(req.result);db.close();};req.onerror=()=>reject(req.error);};}),{store,key}) as Promise<T>;
}
async function importedHistory(page:Page,id:string){
  const p=createProfile('Learning Tester','2026-10-01T00:00:00.000Z',id);const storage=new MemoryStorage();await storage.saveTrainee(p);
  for(let d=1;d<=3;d++)await storage.saveSession(learningSession(`history-${d}`,id,'wrong',d));const bundle=await exportTrainee(storage,p);
  await page.getByTestId('home-trainee-profiles').click();await page.getByLabel('Import profile data').setInputFiles({name:'trainee.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
  await expect(page.getByLabel('Profile selector').locator(`option[value="${id}"]`)).toBeAttached();await page.getByLabel('Profile selector').selectOption(id);await expect(page.getByText('Selected: Learning Tester')).toBeVisible();return p;
}
async function prepareCalibration(page:Page){
  await page.getByRole('button',{name:'Adaptive training',exact:true}).click();const card=page.getByTestId('recommendation-card').filter({hasText:'Target: calibration;'}).first();
  await expect(card).toBeVisible();await card.getByRole('button',{name:'Generate tailored exercise'}).click();await expect(page.getByTestId('adaptive-preview')).toBeVisible();await page.getByRole('button',{name:'Start personalized exercise'}).click();await expect(page.getByTestId('state-badge')).toHaveText('ready');
}
async function finishAssigned(page:Page,traineeId:string){
  await expect(page.getByTestId('state-badge')).toHaveText('ready');
  const plan=await localRecord<LearningPlan>(page,'learningPlans',traineeId);const exercise=plan.exercises.find((e)=>e.status==='running')!;expect(exercise).toBeTruthy();
  await page.getByTestId('btn-start').click();
  for(const def of exercise.scenario.contacts){
    await page.getByTestId(`contact-row-${def.id}`).click();await expect(page.getByTestId(`btn-ack-${def.id}`)).toBeEnabled({timeout:60000});await page.getByTestId(`btn-ack-${def.id}`).click();
    await page.getByTestId(`select-classification-${def.id}`).selectOption(def.assessment.acceptableClassifications[0]);await page.getByTestId(`btn-confidence-high-${def.id}`).click();
    for(const evidence of def.assessment.requiredEvidence)await page.getByTestId(`check-evidence-${evidence}-${def.id}`).check();
    await page.getByTestId(`select-response-${def.id}`).selectOption(def.assessment.correctResponse);await page.getByTestId(`btn-submit-${def.id}`).click();
  }
  await expect(page.getByTestId('state-badge')).toHaveText('completed');await page.getByTestId('btn-summary').click();await expect(page.getByTestId('assessment-dashboard')).toBeVisible();await expect(page.getByTestId('post-session-learning').getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Start recommended exercise'})).toBeVisible();return exercise;
}

test.describe('Module 3 personalized learning',()=>{
  test.beforeEach(async({page})=>{
    await page.goto('/');await expect(page.getByTestId('home-trainee-profiles')).toBeVisible();await page.getByTestId('home-settings').click();await page.getByTestId('settings-graphics').selectOption('low');await page.getByTestId('settings-reduced-motion').check();await page.getByRole('button',{name:/Home/}).click();
  });
  test('new trainee onboarding reaches empty Skill DNA and starts a baseline scenario',async({page})=>{
    await page.getByTestId('home-trainee-profiles').click();await page.getByLabel('Display name').fill('New Learner');await page.getByRole('button',{name:'Save profile'}).click();await expect(page.getByText('Selected: New Learner')).toBeVisible();
    await page.getByRole('button',{name:'Skill DNA',exact:true}).click();await expect(page.getByTestId('skill-empty')).toBeVisible();await page.getByRole('button',{name:'Start baseline assessment'}).click();await page.getByTestId('begin-scn-single-recognition').click();await page.getByTestId('btn-start').click();await expect(page.getByTestId('state-badge')).toHaveText('running');
  });
  test('assessment history produces a weakness-based exercise using real services',async({page})=>{
    const p=await importedHistory(page,'personalized');await prepareCalibration(page);const plan=await localRecord<LearningPlan>(page,'learningPlans',p.id);const e=plan.exercises[0];expect(e.recommendationId).toBeTruthy();expect(e.scenario.learningObjectives.some((o)=>o.id==='unknown-classification')).toBe(true);expect(e.baselineSessionIds).toHaveLength(3);
  });
  test('complete learning loop reassesses practice and unseen evaluation and measures progress',async({page})=>{
    test.setTimeout(120000);const p=await importedHistory(page,'closed-loop');await prepareCalibration(page);const practice=await finishAssigned(page,p.id);
    await page.getByRole('button',{name:'Start recommended exercise'}).click();const evaluation=await finishAssigned(page,p.id);expect(evaluation.stage).toBe('evaluation');expect(evaluation.seed).not.toBe(practice.seed);
    const plan=await localRecord<LearningPlan>(page,'learningPlans',p.id);expect(plan.recommendations.find((r)=>r.id===practice.recommendationId)?.status).toBe('resolved');
    await page.getByRole('button',{name:'Learning progress',exact:true}).click();await expect(page.getByText(/afterPractice: calibration/)).toBeVisible();await expect(page.getByText(/unseenEvaluation: calibration/)).toBeVisible();
  });
  test('completed training, selected profile and recommendations survive a reload',async({page})=>{
    const p=await importedHistory(page,'persistent');await prepareCalibration(page);await finishAssigned(page,p.id);const before=await localRecord<LearningPlan>(page,'learningPlans',p.id);
    await page.reload();await page.getByTestId('home-trainee-profiles').click();await expect(page.getByLabel('Profile selector')).toHaveValue(p.id);await expect(page.getByTestId('profile-history-count')).toHaveText('4 completed sessions');const after=await localRecord<LearningPlan>(page,'learningPlans',p.id);expect(after.recommendations.map((r)=>r.id)).toEqual(before.recommendations.map((r)=>r.id));expect(after.exercises[0].status).toBe('completed');
  });
  test('packaged shell reloads and generates personalized training with network disabled',async({page,context})=>{
    const p=await importedHistory(page,'offline');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>((resolve)=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
    await context.setOffline(true);
    try{await page.reload();await expect(page.getByTestId('home-skill-dna')).toBeVisible();await page.getByTestId('home-skill-dna').click();await expect(page.getByLabel('Assessment cohort')).toBeVisible();await page.getByRole('button',{name:'Adaptive training',exact:true}).click();const card=page.getByTestId('recommendation-card').filter({hasText:'Target: calibration;'}).first();await card.getByRole('button',{name:'Generate tailored exercise'}).click();await expect(page.getByTestId('adaptive-preview')).toBeVisible();const plan=await localRecord<LearningPlan>(page,'learningPlans',p.id);expect(plan.exercises).toHaveLength(1);}finally{await context.setOffline(false);}
  });
});
