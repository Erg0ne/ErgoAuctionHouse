import React from 'react';
import yoroiWallet from '../../../assets/images/yoroi-logo-shape-blue.inline.svg';
import {getWalletAddress, isAddressValid, isAssembler, isWalletSaved, showMsg} from '../../../auction/helpers';

import {
    Button,
    FormFeedback,
    FormGroup,
    FormText,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    TabContent,
    TabPane,
} from 'reactstrap';
import classnames from 'classnames';
import SyncLoader from 'react-spinners/SyncLoader';
import {css} from '@emotion/core';

const override = css`
  display: block;
  margin: 0 auto;
`;

class WalletModal extends React.Component {
    constructor(props) {
        super(props);

        let type = 'assembler'
        let walletState = 'Configure';
        if (isWalletSaved()) walletState = 'Update';
        let userAddress = ''
        if (isAssembler()) userAddress = getWalletAddress()
        this.state = {
            modal: false,
            activeTab: type,
            userAddress: userAddress,
            processing: false,
            apiKey: '',
            walletState: walletState,
        };

        this.toggle = this.toggle.bind(this);
        this.saveWallet = this.saveWallet.bind(this);
        this.clearWallet = this.clearWallet.bind(this);
    }

    toggle() {
        this.setState({
            modal: !this.state.modal,
        });

        let type = 'assembler'

        this.setState({
            activeTab: type,
            processing: false,
            apiKey: '',
        });
    }

    toggleTab(tab) {
        if (this.state.activeTab !== tab) {
            this.setState({
                activeTab: tab,
            });
        }
    }

    saveWallet() {
        this.setState({
            processing: true,
        });
        if (this.state.activeTab === 'assembler') {
            this.clearWallet(false)
            localStorage.setItem(
                'wallet',
                JSON.stringify({
                    type: this.state.activeTab,
                    address: this.state.userAddress,
                })
            );
            showMsg('Successfully configured the wallet.');
            this.toggle();
            this.setState({walletState: 'Update'});
        }
    }

    clearWallet(showMsgg = true) {
        sessionStorage.removeItem('wallet');
        localStorage.removeItem('wallet');
        this.setState({walletState: 'Configure'});
        if (showMsgg) {
            showMsg('Successfully cleared wallet info from local storage.');
            this.toggle();
        }
    }

    render() {
        return (
            <span className="d-inline-block mb-2 mr-2">
                {/*{this.walletOk() ? <p>ok</p> : <p>fuck no</p>}*/}
                <Button
                    onClick={this.toggle}
                    className="mr-2 btn-transition"
                    color="primary"
                    outline
                    size="lg"
                >
                    <i className="nav-link-icon pe-7s-cash mr-2"/>
                    <span>{this.state.walletState} Wallet</span>
                </Button>
                <Modal
                    isOpen={this.state.modal}
                    toggle={this.toggle}
                    className={this.props.className}
                >
                    <ModalHeader toggle={this.toggle}>
                        <div className="btn-actions-pane-right">
                            <Button
                                outline
                                className={
                                    'mx-2 btn-wide btn-pill ' +
                                    classnames({
                                        active:
                                            this.state.activeTab ===
                                            'assembler',
                                    })
                                }
                                color="light"
                                onClick={() => {
                                    this.toggleTab('assembler');
                                }}
                            >
                                <span>Any Wallet</span>
                            </Button>
                            <Button
                                outline
                                disabled={true}
                                className={
                                    'mx-2 btn-wide btn-pill ' +
                                    classnames({
                                        active:
                                            this.state.activeTab === 'yoroi',
                                    })
                                }
                                color="light"
                                onClick={() => {
                                    this.toggleTab('yoroi');
                                }}
                            >
                                <img
                                    style={{height: '20px', width: '20px'}}
                                    src={yoroiWallet}
                                />
                                <span className="px-2">Yoroi Wallet</span>
                            </Button>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        <TabContent activeTab={this.state.activeTab}>
                            <TabPane tabId="yoroi">
                                <p>
                                    Support for Yoroi will be added in the
                                    future.
                                </p>
                            </TabPane>
                            <TabPane tabId="assembler">
                                <p>
                                    You can use <b>any wallet</b> including <b>Yoroi</b> to place bid and start new auctions.
                                </p>
                                <p>
                                    This uses the assembler service which is an intermediate
                                    step; you can find out more about it{' '}
                                    <a
                                        target="_blank"
                                        href="https://www.ergoforum.org/t/tx-assembler-service-bypassing-node-requirement-for-dapps/443"
                                    >
                                        here
                                    </a>
                                    . Your funds will be safe, find out more
                                    about how{' '}
                                    <a target="_blank"
                                       href="https://www.ergoforum.org/t/some-details-about-ergo-auction-house/428/6">
                                        here
                                    </a>
                                    .
                                </p>

                                <FormGroup>
                                    <Label for="apiKey">Address</Label>
                                    <Input
                                        value={this.state.userAddress}
                                        type="text"
                                        name="address"
                                        id="address"
                                        invalid={!isAddressValid(this.state.userAddress)}
                                        onChange={(event) =>
                                            this.setState({
                                                userAddress: event.target.value,
                                            })
                                        }
                                        placeholder="Your ergo address"
                                    />
                                    <FormFeedback invalid>
                                        Invalid ergo address.
                                    </FormFeedback>
                                    <FormText>
                                        Your funds and winning tokens will be sent to this address. {' '}
                                        <b>Make sure your wallet supports custom tokens!</b> {' '}
                                        Currently, <a href="https://github.com/ergoplatform/ergo">Ergo Node</a>, {' '}
                                        <a href="https://github.com/coinbarn/coinbarn-extension">Coinbarn</a>, {' '}
                                        <a href="https://ergowallet.io/">Ergo Wallet</a> and {' '}
                                        <a href="https://yoroi-wallet.com/">Yoroi</a> support tokens.
                                    </FormText>
                                </FormGroup>
                            </TabPane>
                        </TabContent>
                    </ModalBody>
                    <ModalFooter>
                        <SyncLoader
                            css={override}
                            size={8}
                            color={'#0086d3'}
                            loading={this.state.processing}
                        />
                        <Button
                            disabled={this.state.walletState === 'Configure'}
                            className="ml-5 mr-2 btn-transition"
                            color="secondary"
                            onClick={this.clearWallet}
                        >
                            Clear wallet info
                        </Button>
                        <Button
                            className="ml mr-2 btn-transition"
                            color="secondary"
                            onClick={this.toggle}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="mr-2 btn-transition"
                            color="secondary"
                            disabled={
                                this.state.activeTab === 'yoroi' ||
                                this.state.processing ||
                                (this.state.activeTab === 'assembler' && !isAddressValid(this.state.userAddress))
                            }
                            onClick={this.saveWallet}
                        >
                            Save {this.state.processing}
                        </Button>
                    </ModalFooter>
                </Modal>
            </span>
        );
    }
}

export default WalletModal;
