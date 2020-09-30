
import { ComponentEx, types, util, Icon, selectors, tooltip } from "vortex-api";
import * as React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { ListGroupItem, Col, Row } from 'react-bootstrap';
import { NemesisModInfo } from "../types/types";
import { toggleMod } from "../actions/actions";

interface NemesisItemRendererBaseProps {
    item: NemesisModInfo;
    className: string;
    onRef: (element: any) => any;
}

interface NemesisItemRendererConnectedProps {
    profile: types.IProfile;
}

interface NemesisActionProps {
    onToggleMod: (profileId: string, id: string, enabled: boolean) => void;
}

type NemesisItemRendererProps = NemesisItemRendererBaseProps & NemesisItemRendererConnectedProps & NemesisActionProps;

class NemesisItemRenderer extends ComponentEx<NemesisItemRendererProps, {}> {
    constructor(props) {
        super(props);
        this.initState({})
    }

    render() {
        const { item, className, t } = this.props;

        const autoIcon = item.auto ? (
            <tooltip.Icon 
                name='smart' className={item.auto ? 'enabled' : 'disabled'} 
                tooltip={t('Relies on this file in the Data folder:')+`\n${item.auto}` || t('No automatic detection.')} 
            />
        ) : <Icon name='' />;

        return (
            <ListGroupItem className={className} key={item.id}>
            <Row>
            <Col className='nemesis-table-icons'>
                <input type='checkbox' checked={item.enabled} onClick={this.toggleMod.bind(this)} />
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

    toggleMod() {
        const { profile, item, onToggleMod } = this.props;
        onToggleMod(profile.id, item.id, !item.enabled);
    }
}

function mapStateToProps(state: types.IState): NemesisItemRendererConnectedProps {
    return {
        profile: selectors.activeProfile(state),
    }
}

function mapDispatchToProps(dispatch: any): NemesisActionProps {
    return  {
        onToggleMod: (profileId, id, enabled) => dispatch(toggleMod(profileId, id, enabled))
    };
}

export default withTranslation(['common'])(
    connect(mapStateToProps, mapDispatchToProps)(
        NemesisItemRenderer) as any) as React.ComponentClass<{
        className?: string,
        item: NemesisModInfo }>;