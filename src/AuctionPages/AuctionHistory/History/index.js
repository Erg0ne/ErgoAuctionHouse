import React, {Fragment} from 'react';

import PageTitle from '../../../Layout/AppMain/PageTitle';
import {currentBlock, getCompleteAuctionHistory,} from '../../../auction/explorer';
import PropagateLoader from 'react-spinners/PropagateLoader';
import {css} from '@emotion/core';
import {showMsg} from '../../../auction/helpers';
import {decodeBox} from '../../../auction/serializer';
import {Row} from 'react-bootstrap';
import {Button} from 'reactstrap';
import {ResponsiveContainer} from 'recharts';
import ShowHistories from "./showHistories";
import {auctionAddress} from "../../../auction/consts";

const pagination = 100;

const override = css`
  display: block;
  margin: 0 auto;
`;

export default class AuctionsHistory extends React.Component {
    constructor() {
        super();
        this.state = {
            offset: 0,
            still: true,
            loading: true,
            boxes: [],
        };
        this.loadMore = this.loadMore.bind(this);
        this.loadMore();
    }

    async loadMore(show = false) {
        const block = await currentBlock()
        if (this.state.still) {
            this.setState({loading: true});
            getCompleteAuctionHistory(pagination, this.state.offset)
                .then((res) => {
                    if (res.length < pagination) {
                        this.setState({still: false});
                        if (show)
                            showMsg('Complete auction history is loaded.');
                    }
                    let boxes = res.filter((tx) => {
                        return tx.outputs[0].address !== auctionAddress && tx.inputs[0].address === auctionAddress
                    }).map(tx => {
                        tx.inputs[0].spentTransactionId = tx.id
                        return tx.inputs[0]
                    })
                        .map(bx => decodeBox(bx, block));
                    Promise.all(boxes).then((res) => {
                        res.forEach((box) => {
                            box.finalTx = box.spentTransactionId;
                        });
                        return res;
                    })
                        .then((res) => {
                                this.setState({
                                    boxes: this.state.boxes.concat(res),
                                    offset: this.state.offset + pagination,
                                })
                            }
                        )
                        .catch((_) => {
                            showMsg(
                                'Error connecting to the explorer. Will try again...',
                                false,
                                true
                            );
                            setTimeout(() => this.loadMore(), 8000);
                        })
                        .finally(() => this.setState({loading: false}));
                })
                .catch((_) => {
                    showMsg(
                        'Error connecting to the explorer. Will try again...',
                        false,
                        true
                    );
                    this.loadMore();
                });
        }
    }

    render() {
        return (
            <Fragment>
                <PageTitle
                    heading="Auction History"
                    subheading="Here you can see the list of completed auctions."
                    icon="pe-7s-wristwatch icon-gradient bg-night-fade"
                />

                {!this.state.loading && this.state.boxes.length === 0 && (
                    <strong
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        No Auction History Yet
                    </strong>
                )}

                <ShowHistories
                    boxes={this.state.boxes}
                />
                <ResponsiveContainer height={70}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <Row>
                            <Button
                                onClick={() => this.loadMore(true)}
                                outline
                                className="btn-outline-light m-2 border-0"
                                color="primary"
                            >
                                {this.state.still && !this.state.loading && (
                                    <span>
                                        <i className="nav-link-icon lnr-plus-circle">
                                            {' '}
                                        </i>
                                        Load More
                                    </span>
                                )}
                            </Button>
                        </Row>
                        <br/>
                        <Row>
                            <PropagateLoader
                                css={override}
                                size={20}
                                color={'#0086d3'}
                                loading={this.state.loading}
                            />
                        </Row>
                    </div>
                </ResponsiveContainer>
            </Fragment>
        );
    }
}
