import { createAction } from 'redux-act';
import { NemesisModInfo } from '../types/types';

export const setLoadOrder = createAction('SET_NEMESIS_LOADORDER', 
    (profileId: string, loadOrder: NemesisModInfo[]) => ({ profileId, loadOrder }));

export const toggleMod = createAction('NEMESIS_TOGGLE_MOD', 
    (profileId: string, id: string, enabled: boolean) => ({ profileId, id, enabled }));
