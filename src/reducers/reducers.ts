import * as actions from '../actions/actions';
import { types, util } from 'vortex-api';


const nemesisReducer: types.IReducerSpec = {
    reducers: {
        [actions.setLoadOrder as any]: (state, payload) => util.setSafe(state, [payload.profileId, 'loadOrder'], payload.loadOrder),
        [actions.toggleMod as any]: (state, payload) => {
            const loadOrder = util.getSafe(state, [payload.profileId, 'loadOrder'], []);
            let modEntry = loadOrder.find(mod => mod.id === payload.id);
            if (modEntry) {
                modEntry.enabled = payload.enabled;
                return util.setSafe(state, [payload.profileId, 'loadOrder'], loadOrder);
            }
        }
    },
    defaults: {}
};

export default nemesisReducer;