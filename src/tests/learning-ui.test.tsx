import { createProfile } from '../core/learning/profile';
// @vitest-environment jsdom
import './setup';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TraineeProfilesScreen } from '../ui/TraineeProfilesScreen';
import { LearningScreen } from '../ui/LearningScreen';
import { initStorage } from '../core/persistence/appStorage';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
describe('learning workspace UI',()=>{
  it('creates and selects a real local profile, archives it and protects deletion with confirmation',async()=>{
    const storage=await initStorage();await storage.clearAll();useSettingsStore.getState().update({traineeId:'legacy'});
    render(<TraineeProfilesScreen/>);fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'Alice'}});fireEvent.click(screen.getByText('Save profile'));
    await screen.findByText('Selected: Alice');expect((await storage.listTrainees())).toHaveLength(1);expect(useSettingsStore.getState().traineeId).toBe((await storage.listTrainees())[0].id);
    fireEvent.click(screen.getByText('Archive profile'));await screen.findByText('Restore profile');expect((await storage.listTrainees())[0].archived).toBe(true);
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(screen.getByText('Delete profile'));expect(confirm).toHaveBeenCalled();expect(await storage.listTrainees()).toHaveLength(1);confirm.mockRestore();
  });
  it('shows an honest empty Skill DNA and working learning navigation',async()=>{
    const storage=await initStorage();const p=createProfile('Empty trainee');await storage.saveTrainee(p);useSettingsStore.getState().update({traineeId:p.id});
    render(<LearningScreen/>);await screen.findByTestId('skill-empty');expect(screen.getByText('Missing data is not a zero score.',{exact:false})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Adaptive training'}));await waitFor(()=>expect(useUiStore.getState().screen).toBe('adaptive'));
  });
});
