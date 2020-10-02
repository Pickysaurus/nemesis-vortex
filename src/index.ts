import { actions, log, selectors, types, util } from 'vortex-api';
import ExtensionsBrowser from './views/NemesisConfig';
import * as path from 'path';
import nemesisReducer from './reducers/reducers';

const supportedGames: string[] = [ 'skyrim', 'skyrimse', 'skyrimvr' ];

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
  }, 
  () => {
    const gameId = selectors.activeGameId(context.api.store.getState());
    return supportedGames.includes(gameId);
  });

  context.registerDialog('nemesis-config', ExtensionsBrowser, () => ({
    localState
  }));

  context.once(() => {
    util.installIconSet('nemesis-icons', `${__dirname}/images/nemesis-icon.svg`);
    context.api.setStylesheet('better-extensions', path.join(__dirname, 'nemesis-config.scss'));
  });

  return true;
}

export default main;
