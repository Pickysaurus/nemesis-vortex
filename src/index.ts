import { actions, log, types, util } from 'vortex-api';
import ExtensionsBrowser from './views/NemesisConfig';
import * as path from 'path';
import nemesisReducer from './reducers/reducers';

interface ILocalState {
  reloadNecessary: boolean;
}

const localState: ILocalState = util.makeReactive({
  reloadNecessary: false,
});

function main(context: types.IExtensionContext) {

  context.registerReducer(['settings', 'nemesis'], nemesisReducer)

  context.registerAction('mod-icons', 200, 'nemesis', {}, 'Nemesis', () => {
    context.api.store.dispatch(actions.setDialogVisible('nemesis-config'));
  })

  context.registerDialog('nemesis-config', ExtensionsBrowser, () => ({
    localState
  }));

  context.once(() => {
    util.installIconSet('xedit-icons', `${__dirname}/images/nemesis-icon.svg`);
    context.api.setStylesheet('better-extensions', path.join(__dirname, 'nemesis-config.scss'));
  });

  return true;
}

export default main;
