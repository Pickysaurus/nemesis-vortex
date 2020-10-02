import * as React from 'react';
import { withTranslation } from 'react-i18next';
import { ComponentEx, Icon, DropdownButton, types } from 'vortex-api';
import { NemesisConfigData, INemesisRunningState } from "../types/types";
import { Button, ButtonGroup, MenuItem } from 'react-bootstrap';

interface NemesisControlProps {
    nemesis: NemesisConfigData;
    running: INemesisRunningState;
    setRunning: (newState?: INemesisRunningState) => void;
    mods: {[id: string]: types.IMod};
}

interface NemesisControlState {
    modInUse: string;
}

class NemesisControls extends ComponentEx<NemesisControlProps, NemesisControlState> {

    constructor(props) {
        super(props);
        this.initState({
            modInUse: undefined,
        });
    }

    render() {
        const { nemesis, t, running, mods } = this.props;
        const { modInUse } = this.state;
        // If nemesis isn't detected, we don't need to load the controls.
        if (!nemesis) return (<p><Icon name='toggle-disabled'/> {t('Nemesis is not installed.')}</p>);

        // If we're running something, render the busy state; 
        if (running) return this.renderBusyMessage();

        // Render the controls
        return (
            <div>
            <ButtonGroup className='nemesis-loadorder-buttons'>
                <Button onClick={() => this.detectMods()}><Icon name='smart' /> {t('Detect Mods')}</Button>
                <Button onClick={() => this.updateEngine()}><Icon name='refresh' /> {t('Update Engine')}</Button>
                <Button disabled={!modInUse} onClick={() => this.generate()}><Icon name='launch-application' /> {t('Run Nemesis')}</Button>
            </ButtonGroup>
            {t('Save new animations to: ')}
            <div>
            <DropdownButton
                id=''
                title={modInUse || t('Select a mod...')}
            >
                {Object.keys(mods).map(mod => <MenuItem onSelect={() => this.setOutput(mod)}>{mods[mod].id}</MenuItem>)}
            </DropdownButton>
            <Button><Icon name='select-install'/> {t('Create new mod')}</Button>
            </div>
            </div>
        );
    }

    renderBusyMessage(): JSX.Element {
        const { t, running } = this.props;
        let busyMessage: string;
        switch (running) {
            case 'auto-check': busyMessage = t('Checking your data folder for required files');
            break;
            case 'running': busyMessage = t('Generating animations with Nemesis');
            break;
            case 'updating': busyMessage = t('Updating Nemesis Engine');
            break;
            default: busyMessage = t('The Nemesis extension has encountered an error. You may need to restart Vortex.');
        }

        return (<p><Icon name='spinner' /> {busyMessage}...</p>);
    }

    setOutput(name: string) {
        this.nextState.modInUse = name;
    }

    async detectMods() {
        // Look for "auto" files for each mod in the data directory.
        const { setRunning } = this.props;
        setRunning('auto-check');
        await dummyPromise();
        setRunning();
    }

    async updateEngine() {
        // Update local nemesis engine files
        const { setRunning } = this.props;
        setRunning('updating');
        await dummyPromise();
        setRunning();
    }

    async generate() {
        // Generate the Nemesis animations
        const { setRunning } = this.props;
        setRunning('running');
        await dummyPromise();
        setRunning();
    }


}

function dummyPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {return resolve()}, 5000);
    });
}

export default withTranslation(['common'])(NemesisControls);