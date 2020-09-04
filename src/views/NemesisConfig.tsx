import { ComponentEx, Modal, types, util, log, FormInput, Icon, IconBar, FlexLayout, Toggle, Spinner, ToolbarIcon, selectors, DraggableList } from "vortex-api";
import { Alert, Button, FormControl, ListGroup, ListGroupItem, Col, Row } from 'react-bootstrap';
import * as React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { app, remote } from "electron";
import { getNemesisPaths, getAvailableMods } from '../util/nemesisUtil';
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
}

type IProps = INemesisConfigProps & IConnectedProps;

const version = (() => {
    let result: string;

    return () => {
        if (result === undefined) {
            const electronApp = remote !== undefined ? remote.app : app;
            result = electronApp.getVersion();

        }

        return result;
    }
});

type modalState = 'loading' | 'ready';

interface INemesisConfigState {
    error?: Error;
    modalState: modalState;
    nemesis: NemesisConfigData;
    mods: NemesisModInfo[];
    running: boolean;
}

// Should be moved to types if used.
export interface ISelector {
    modId: number;
    github: string;
    githubRawPath: string;
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
            running: false
        });
    }

    public UNSAFE_componentWillReceiveProps(newProps: IProps) {
        if (!this.props.visible && newProps.visible) {
            this.start();
        }
    }

    private async start(): Promise<void> {
        const { gamePath } = this.props;
        this.nextState.modalState = 'loading';
        this.nextState.error = undefined;
        try {
            const nemesis = await getNemesisPaths(gamePath);
            const mods = await getAvailableMods(nemesis.modsPath);
            this.nextState.nemesis = nemesis;
            this.nextState.mods = mods;
            this.nextState.modalState = 'ready';
        }
        catch(err) {
            this.nextState.error = err;
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
        const { t, visible } = this.props;
        const { nemesis, mods, error } = this.state;

        const active = nemesis.getActive();
        const order = nemesis.getOrder();
        let loadOrder = visible ? buildLoadOrder(mods, active, order) : [];

        return (
            <>
            {error ? <Alert>Error: {error.message}</Alert> : undefined}
            <p>{t('Nemesis an animation framework that enables behavior mods like CGO, SkySA, Ultimate Combat and most FNIS dependent mods to work together.')}</p>
            <h2>Mods</h2>
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
            </div>
            <Button>Update Engine</Button>
            <Button>Generate animation files</Button>
            </>
        );
    }

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
            Loading...
            </>
        );
    }

}

function buildLoadOrder(mods: NemesisModInfo[], active: NemesisLoadOrderInfo[], order: string[]): NemesisModInfo[] {
    // See which mods are currently active.
    const activeMods = mods.map(mod => {
        mod.enabled = !!active.find(a => a.name === mod.name);
        return mod;
    });
    // Filter out the mods that don't have an order position.
    const orderlessMods = activeMods.filter(mod => !order.includes(mod.idx));
    // Map mods by their order position, filter out the blanks and add on the orderless mods
    let loadOrder = order.map(id => activeMods.find(mod => mod.idx === id)).filter(m => m !== undefined).concat(orderlessMods);

    return loadOrder;
}

class NemesisItemRenderer extends ComponentEx<{item: NemesisModInfo, className: string}, {}> {
    render() {
        const { item, className } = this.props;
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
        mods: util.getSafe(state, ['persistent', 'mods', gameId], {})
    }
} 

export default withTranslation([ 'common' ])(connect(mapStateToProps)(NemesisConfig));