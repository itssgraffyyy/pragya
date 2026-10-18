// @vitest-environment jsdom
import './setup';
import { describe,it,expect } from 'vitest';
import { render,screen,fireEvent,act } from '@testing-library/react';
import { UnitManagementScreen } from '../ui/UnitManagementScreen';
import { RoleBoundary } from '../ui/RoleBoundary';
import { initStorage } from '../core/persistence/appStorage';
import { useIdentityStore } from '../store/identityStore';
import { createProfile } from '../core/learning/profile';
import { addLocalUser,initializeLocalUnit } from '../core/unit/service';
import { useSettingsStore } from '../store/settingsStore';
describe('local role workflows',()=>{
 it('sets up a persistent unit and labels the identity selector honestly',async()=>{const s=await initStorage();await s.clearAll();useIdentityStore.getState().select('');render(<UnitManagementScreen/>);await screen.findByRole('button',{name:'Create local unit'});fireEvent.change(screen.getByLabelText('Commander name'),{target:{value:'Local Commander'}});fireEvent.change(screen.getByLabelText('Unit name'),{target:{value:'Training Unit'}});fireEvent.click(screen.getByRole('button',{name:'Create local unit'}));await screen.findByText('Selected: Local Commander',{exact:false});expect(screen.getByText('This is not secure authentication.',{exact:false})).toBeVisible();expect((await s.listTrainingRecords('units'))[0].value).toMatchObject({name:'Training Unit'});});
 it('denies another profile and commander views even when reached directly',async()=>{const s=await initStorage();await s.clearAll();const {unit,user}=await initializeLocalUnit(s,'Commander','Unit');await s.saveTrainee(createProfile('One',undefined,'t1'));const trainee=await addLocalUser(s,{userId:user.id},unit.id,'One','trainee','t1');useIdentityStore.getState().select(trainee.id);useSettingsStore.getState().update({traineeId:'t2'});const view=render(<RoleBoundary screen="learning"><span>Private data</span></RoleBoundary>);await screen.findByRole('alert');expect(screen.queryByText('Private data')).toBeNull();await act(async()=>{useSettingsStore.getState().update({traineeId:'t1'});});await screen.findByText('Private data');view.rerender(<RoleBoundary screen="editor"><span>Private editor</span></RoleBoundary>);await screen.findByRole('alert');expect(screen.queryByText('Private editor')).toBeNull();view.unmount();useIdentityStore.getState().select('');});
});
