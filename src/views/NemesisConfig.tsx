import { ComponentEx, Modal, types, util, Icon, Spinner, selectors, DraggableList } from "vortex-api";
import { Alert, Button, ButtonGroup, ListGroupItem, Col, Row } from 'react-bootstrap';
import * as React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { getNemesisPaths, getAvailableMods, buildLoadOrder } from '../util/nemesisUtil';
import { NemesisConfigData, NemesisModInfo, INemesisRunningState } from "../types/types";
import { setLoadOrder } from '../actions/actions';
import NemesisItemRenderer from './NemesisItemRenderer';
import NemesisControls from './NemesisControls'

export interface INemesisConfigProps {
    visible: boolean;
    onHide: () => void;
    localState: {
        reloadNecessary: boolean;
    };
}

interface IConnectedProps {
    game: types.IGame;
    gamePath: string;
    language: string;
    mods: { [modId: string]: types.IMod };
    profile: types.IProfile;
    stagingPath: string;
    loadOrder: NemesisModInfo[];
}

interface IActionProps {
    onSetLoadOrder: (profileId: string, loadOrder: NemesisModInfo[]) => void;
}

type IProps = INemesisConfigProps & IConnectedProps & IActionProps;

type modalState = 'loading' | 'ready';

interface INemesisConfigState {
    error?: Error;
    modalState: modalState;
    nemesis: NemesisConfigData;
    mods: NemesisModInfo[];
    running: INemesisRunningState;
}


function nop() {
    //nop
}

class NemesisConfig extends ComponentEx<IProps, INemesisConfigState> {

    constructor(props: IProps) {
        super(props);

        this.initState({
            modalState: undefined,
            nemesis: undefined,
            mods: [],
            running: undefined,
        });
    }

    public UNSAFE_componentWillReceiveProps(newProps: IProps) {
        if (!this.props.visible && newProps.visible) {
            this.start();
        }
    }

    private async start(): Promise<void> {
        const { gamePath, mods, onSetLoadOrder, profile } = this.props;
        this.nextState.modalState = 'loading';
        this.nextState.error = undefined;
        try {
            const nemesis = await getNemesisPaths(gamePath, mods);
            const availableMods = await getAvailableMods(nemesis.modsPath);
            this.nextState.nemesis = nemesis;
            this.nextState.mods = availableMods;
            onSetLoadOrder(profile.id, buildLoadOrder(availableMods, nemesis.getActive(), nemesis.getOrder()));
            this.nextState.modalState = 'ready';
        }
        catch(err) {
            this.nextState.error = err;
            this.nextState.nemesis = undefined;
            this.nextState.mods = [];
            this.nextState.modalState = 'ready';
        }
    }

    setRunning(newState?: INemesisRunningState) {
        this.nextState.running = newState;
    }
    
    render() {
        const { t, visible, onHide } = this.props;
        const { modalState } = this.state;
        
        return (
            <Modal id='nemesis-config-dialog' show={visible} onHide={nop}>
                <Modal.Header>
                <h2><Icon name='nemesis' /> {t('Nemesis Unlimited Behaviour Engine')}</h2>
                </Modal.Header>
                <Modal.Body>
                    { modalState ? this.renderContent(modalState): undefined }
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={onHide}>{t('Close')}</Button>
                </Modal.Footer>
            </Modal>
        );
    }

    renderContent(modalState: modalState): JSX.Element {
        switch(modalState) {
            case 'loading' : return this.renderLoading();
            case 'ready' : return this.renderMain();
            default: return null;
        }
    }

    renderMain(): JSX.Element {
        const { t, mods, loadOrder } = this.props;
        const { nemesis, error, running } = this.state;

        const installState: string = nemesis?.mod ? t('with Vortex') : t('manually');

        return (
            <>
            {error ? <Alert>Error: {error.message}</Alert> : undefined}
            <p>{t('Nemesis an animation framework that enables behavior mods like CGO, SkySA, Ultimate Combat and most FNIS dependent mods to work together. '+
            'Using the table below you can enable or disable animation mods and reorder their priority by dragging and dropping each item.')}</p>
            {!!nemesis ? <p>{t('Nemesis {{version}} has been installed {{installState}}.', { replace: { installState, version: nemesis?.version || '???' }})}</p> : ''}
            <div className='nemesis-loadorder-container'>
                {this.renderHeaderRow()}
                <DraggableList 
                    id='nemesis-loadorder'
                    itemTypeId='nemesis-loadorder-draggable'
                    items={nemesis ? loadOrder: []}
                    itemRenderer={NemesisItemRenderer}
                    apply={this.applyLoadOrder.bind(this)}
                    className='nemesis-table'
                />
                <a onClick={() => this.toggleAllMods(true)}>Enable all</a> | <a onClick={() => this.toggleAllMods(false)}>Disable all</a>
            </div>
            <NemesisControls 
                nemesis={nemesis}
                running={running}
                setRunning={this.setRunning.bind(this)}
                mods={mods}
            />
            </>
        );
    }

    toggleAllMods(enable) {
        const { loadOrder, profile, onSetLoadOrder } = this.props;
        const { nemesis } = this.state;

        if (!nemesis) {
            return this.nextState.error = new Error('Nemesis isn\'t installed, you silly sausage!');
        }

        const newLO = loadOrder.map(mod => {
            mod.enabled = enable;
            return mod;
        })

        onSetLoadOrder(profile.id, newLO);

        nemesis.updateActiveMods(newLO.filter(mod => mod.enabled));
    }

    // openStagingFolder() {
    //     const { nemesis } = this.state;
    //     const { stagingPath } = this.props;
    //     const opnPath = path.join(stagingPath, nemesis.mod?.installationPath);
    //     util.opn(opnPath);
    // }

    applyLoadOrder(order: NemesisModInfo[]): void {
        const { profile, onSetLoadOrder} = this.props;
        const { nemesis } = this.state;

        if (order.map(mod => mod.id) === nemesis.getOrder()) return;

        onSetLoadOrder(profile.id, order);

        nemesis.updateOrderCache(order.map(mod => mod.id));
    }

    renderHeaderRow(): JSX.Element {
        return (
            <ListGroupItem className='nemesis-loadorder-header'>
            <Row>
            <Col className='nemesis-table-icons'>
                {' '}
            </Col>
            <Col className='nemesis-table-text'>
                Name
            </Col>
            <Col className='nemesis-table-text'>
                Author
            </Col>
            <Col className='nemesis-table-icons'>
                {' '}
            </Col>
            </Row>
            </ListGroupItem>
        )
    }

    renderLoading(): JSX.Element {
        return (
            <>
            <Spinner />
            Loading...
            </>
        );
    }

}


function mapStateToProps(state: types.IState): IConnectedProps {
    const gameId = selectors.activeGameId(state);
    const profile = selectors.activeProfile(state);

    return {
        profile,
        loadOrder: util.getSafe(state, ['settings', 'nemesis', profile?.id, 'loadOrder'], []),
        game: selectors.gameById(gameId),
        gamePath: util.getSafe(state, ['settings', 'gameMode', 'discovered', gameId, 'path'], undefined),
        language: state.settings.interface.language,
        mods: util.getSafe(state, ['persistent', 'mods', gameId], {}),
        stagingPath: selectors.installPath(state)
    }
} 

function mapDispatchToProps(dispatch: any): IActionProps {
    return  {
        onSetLoadOrder: (profileId, loadOrder) => dispatch(setLoadOrder(profileId, loadOrder))
    };
}

export default withTranslation([ 'common' ])(connect(mapStateToProps, mapDispatchToProps)(NemesisConfig));