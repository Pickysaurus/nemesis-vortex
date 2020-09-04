import { actions, log, types, util } from 'vortex-api';
import ExtensionsBrowser from './views/NemesisConfig';
import * as path from 'path';

interface ILocalState {
  reloadNecessary: boolean;
}

const localState: ILocalState = util.makeReactive({
  reloadNecessary: false,
});

function main(context: types.IExtensionContext) {
  const updateExtensions = genUpdateInstalledExtensions(context.api);

  const forceUpdateExtensions = () => {
    updateAvailableExtensions(context.api, true);
  };

  context.registerAction('mod-icons', 200, 'menu', {}, 'Nemesis', () => {
    context.api.store.dispatch(actions.setDialogVisible('nemesis-config'));
  })

  context.registerDialog('nemesis-config', ExtensionsBrowser, () => ({
    localState,
    updateExtensions,
    onRefreshExtensions: forceUpdateExtensions,
  }));

  context.once(() => {
    context.api.setStylesheet('better-extensions', path.join(__dirname, 'nemesis-config.scss'));
  });

  return true;
}

function updateAvailableExtensions(api: types.IExtensionApi, force: boolean = false) {
  // Dummy function for now. 
  return Promise.resolve();
}

function genUpdateInstalledExtensions(api: types.IExtensionApi) {
  // Dummy function for now.
  return Promise.resolve();
}

export default main;
