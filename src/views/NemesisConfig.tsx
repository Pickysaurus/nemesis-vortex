import { ComponentEx, Modal, types, util, log, Icon, Spinner, selectors, DraggableList, tooltip } from "vortex-api";
import { Alert, Button, ButtonGroup, ListGroupItem, Col, Row } from 'react-bootstrap';
import * as React from 'react';
import Select from 'react-select';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { getNemesisPaths, getAvailableMods, buildLoadOrder } from '../util/nemesisUtil';
import { NemesisConfigData, NemesisModInfo, NemesisLoadOrderInfo } from "../types/types";

export interface INemesisConfigProps {
    visible: boolean;
    onHide: () => void;
    localState: {
        reloadNecessary: boolean;
    };
    updateExtensions: () => void;
    onRefreshExtensions: () => void;
}

interface IConnectedProps {
    gameId: string;
    game: types.IGame;
    gamePath: string;
    language: string;
    mods: { [modId: string]: types.IMod };
    stagingPath: string;
}

type IProps = INemesisConfigProps & IConnectedProps;

type modalState = 'loading' | 'ready';

interface INemesisConfigState {
    error?: Error;
    modalState: modalState;
    nemesis: NemesisConfigData;
    mods: NemesisModInfo[];
    running: boolean;
    loadOrder: NemesisModInfo[];
}

interface NemesisItemRendererProps {
    item: NemesisModInfo;
    className: string;
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
            running: false,
            loadOrder: []
        });
    }

    public UNSAFE_componentWillReceiveProps(newProps: IProps) {
        if (!this.props.visible && newProps.visible) {
            this.start();
        }
    }

    private async start(): Promise<void> {
        const { gamePath, mods } = this.props;
        this.nextState.modalState = 'loading';
        this.nextState.error = undefined;
        try {
            const nemesis = await getNemesisPaths(gamePath, mods);
            const availableMods = await getAvailableMods(nemesis.modsPath);
            this.nextState.nemesis = nemesis;
            this.nextState.mods = availableMods;
            this.nextState.loadOrder = buildLoadOrder(availableMods, nemesis.getActive(), nemesis.getOrder());
            this.nextState.modalState = 'ready';
        }
        catch(err) {
            this.nextState.error = err;
            this.nextState.nemesis = undefined;
            this.nextState.mods = [];
            this.nextState.modalState = 'ready';
        }
    }
    
    render() {
        const { t, visible, onHide } = this.props;
        const { modalState } = this.state;
        
        return (
            <Modal id='nemesis-config-dialog' show={visible} onHide={nop}>
                <Modal.Header>
                <h1>{t('Nemesis Unlimited Behaviour Engine')}</h1>
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
        const { t, visible, mods } = this.props;
        const { nemesis, error, running, loadOrder } = this.state;

        const installState: string = nemesis?.mod ? t('with Vortex') : t('manually');
        const active = nemesis ? nemesis.getActive() : [];
        const order = nemesis ? nemesis.getOrder() : [];

        return (
            <>
            {error ? <Alert>Error: {error.message}</Alert> : undefined}
            <p>{t('Nemesis an animation framework that enables behavior mods like CGO, SkySA, Ultimate Combat and most FNIS dependent mods to work together. '+
            'Using the table below you can enable or disable animation mods and reorder their priority by dragging and dropping each item.')}</p>
            <p>{t('Nemesis {{version}} has been installed {{installState}}.', { replace: { installState, version: nemesis?.version || '???' }})}</p>
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
            <ButtonGroup className='nemesis-loadorder-buttons'>
            <Button disabled={!nemesis || running}><Icon name='smart' /> {t('Detect Mods')}</Button>
            <Button disabled={!nemesis || running}><Icon name='refresh' /> {t('Update Engine')}</Button>
            <Button disabled={!nemesis || running}><Icon name='launch-application' /> {t('Run Nemesis')}</Button>
            </ButtonGroup>
            <select>{Object.keys(mods).map(mod => <option>{mods[mod].id}</option>)}</select>
            </>
        );
    }

    toggleAllMods(enable) {
        const { nemesis, loadOrder } = this.state;

        this.nextState.loadOrder = loadOrder.map(mod => {
            mod.enabled = enable;
            return mod;
        });

        nemesis.updateActiveMods(this.nextState.loadOrder.filter(mod => mod.enabled));
    }

    // openStagingFolder() {
    //     const { nemesis } = this.state;
    //     const { stagingPath } = this.props;
    //     const opnPath = path.join(stagingPath, nemesis.mod?.installationPath);
    //     util.opn(opnPath);
    // }

    applyLoadOrder(order: NemesisModInfo[]): void {
        const { nemesis } = this.state;
        if (order.map(mod => mod.idx) === nemesis.getOrder()) return;
        nemesis.updateOrderCache(order.map(mod => mod.idx));
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

class NemesisItemRenderer extends ComponentEx<NemesisItemRendererProps, {}> {
    render() {
        const { item, className } = this.props;

        const autoIcon = item.auto ? (
            <tooltip.Icon 
                name='smart' className={item.auto ? 'enabled' : 'disabled'} 
                tooltip={`Relies on this file in the Data folder:\n${item.auto}` || 'No automatic detection.'} 
            />
        ) : <Icon name='' />;

        return (
            <ListGroupItem className={className} key={item.idx}>
            <Row>
            <Col className='nemesis-table-icons'>
                <input type='checkbox' checked={item.enabled} onClick={() => item.enabled = !item.enabled} />
            </Col>
            <Col className='nemesis-table-text' title={item.name}>
                {item.name}
            </Col>
            <Col className='nemesis-table-text' title={item.author}>
                {item.author}
            </Col>
            <Col className='nemesis-table-icons'>
                {autoIcon} {' '}
                <a onClick={() => util.opn(item.site)} title={item.site} target='_blank'><Icon name='open-in-browser' /></a>
            </Col>
            </Row>
            </ListGroupItem>
        );
    }
}


function mapStateToProps(state: types.IState): IConnectedProps {
    const gameId = selectors.activeGameId(state);

    return {
        game: selectors.gameById(gameId),
        gameId: gameId,
        gamePath: util.getSafe(state, ['settings', 'gameMode', 'discovered', gameId, 'path'], undefined),
        language: state.settings.interface.language,
        mods: util.getSafe(state, ['persistent', 'mods', gameId], {}),
        stagingPath: selectors.installPath(state)
    }
} 

export default withTranslation([ 'common' ])(connect(mapStateToProps)(NemesisConfig));