/* eslint no-undef: "off"*/

import {post, get} from './rest';
import {
    addAssemblerBid,
    addBid,
    getAssemblerBids,
    getUrl,
    getWalletAddress,
    isAssembler,
    isWalletNode,
    setAssemblerBids,
    showMsg,
} from './helpers';
import {Address, Transaction} from '@coinbarn/ergo-ts';
import {
    additionalData,
    auctionFee,
    auctionWithExtensionTree,
    extendNum,
    extendThreshold,
    sendTx, trueAddress,
} from './explorer';
import {decodeNum, decodeString, encodeHex, encodeNum} from './serializer';
import {setupYoroi} from "./yoroiUtils";

let ergolib = import('ergo-lib-wasm-browser')

async function signTx(txToBeSigned) {
    try {
        return await ergo.sign_tx(txToBeSigned);
    } catch (err) {
        const msg = `[signTx] Error: ${JSON.stringify(err)}`;
        console.error(msg, err);
        return null;
    }
}

async function submitTx(txToBeSubmitted) {
    try {
        return await ergo.submit_tx(txToBeSubmitted);
    } catch (err) {
        const msg = `[submitTx] Error: ${JSON.stringify(err)}`;
        console.error(msg, err);
        return null;
    }
}

async function processTx(txToBeProcessed) {
    const msg = s => {
        console.log('[processTx]', s);
    };
    const signedTx = await signTx(txToBeProcessed);
    if (!signedTx) {
        console.log(`No signed tx`);
        return null;
    }
    msg("Transaction signed - awaiting submission");
    // const txId = await submitTx(signedTx);
    // if (!txId) {
    //     console.log(`No submotted tx ID`);
    //     return null;
    // }
    // msg("Transaction submitted - thank you for your donation!");
    // return txId;
}

export async function placeBid(currentHeight, bidAmount, box) {
    let wasm = await ergolib
    let yoroiRes = await setupYoroi()
    if (!yoroiRes) throw new Error('Could not connect to Yoroi wallet')

    let ourAddr = getWalletAddress();
    let tree = new Address(ourAddr).ergoTree;

    let oldBid = wasm.ErgoBox.from_json(JSON.stringify(box))

    try {
        const requiredAmount = bidAmount + auctionFee
        const utxos = await ergo.get_utxos(requiredAmount.toString());
        utxos.push(oldBid.to_json())
        console.log('u', utxos)
        const selector = new wasm.SimpleBoxSelector();
        let dataIns = new wasm.DataInputs()
        dataIns.add(new wasm.DataInput(wasm.BoxId.from_str(additionalData.dataInput.id)))
        let ins = wasm.ErgoBoxes.from_boxes_json(utxos)
        let needTokens = new wasm.Tokens()
        needTokens.add(oldBid.tokens().get(0))
        const boxSelection = selector.select(
            ins,
            wasm.BoxValue.from_i64(wasm.I64.from_str(bidAmount.toString())
                .checked_add(wasm.I64.from_str(auctionFee.toString())
                    .checked_add(oldBid.value().as_i64()))),
            needTokens)

        const returnBidder = new wasm.ErgoBoxCandidateBuilder(
            oldBid.value(),
            wasm.Contract.pay_to_address(wasm.Address.from_base58(box.bidder)),
            currentHeight)

        const bid = new wasm.ErgoBoxCandidateBuilder(
            wasm.BoxValue.from_i64(wasm.I64.from_str(bidAmount.toString())),
            wasm.Contract.pay_to_address(wasm.Address.from_base58(box.address)), currentHeight)
        bid.add_token(oldBid.tokens().get(0).id(), oldBid.tokens().get(0).amount())

        let nextEndTime =
            box.finalBlock - currentHeight <= extendThreshold &&
            box.ergoTree === auctionWithExtensionTree
                ? box.finalBlock + extendNum
                : box.finalBlock;
        if (nextEndTime !== box.finalBlock)
            console.log(
                `extended from ${box.finalBlock} to ${nextEndTime}. height: ${currentHeight}`
            );

        bid.set_register_value(4, oldBid.register_value(4))
        bid.set_register_value(5, wasm.Constant.from_i32(nextEndTime))
        bid.set_register_value(6, oldBid.register_value(6))
        bid.set_register_value(7, oldBid.register_value(7))
        bid.set_register_value(8, wasm.Constant.from_byte_array(Buffer.from(tree, 'hex')))
        if (oldBid.register_value(9) !== undefined)
            bid.set_register_value(9, oldBid.register_value(9))

        let outs = wasm.ErgoBoxCandidates.empty()
        outs.add(bid.build())
        outs.add(returnBidder.build())

        const txBuilder = wasm.TxBuilder.new(
            boxSelection,
            outs,
            currentHeight,
            wasm.BoxValue.from_i64(wasm.I64.from_str(auctionFee.toString())),
            wasm.Address.from_base58(ourAddr),
            wasm.BoxValue.SAFE_USER_MIN());
        txBuilder.set_data_inputs(dataIns)
        let tx = txBuilder.build().to_json()
        console.log(`tx: ${JSON.stringify(tx)}`);
        console.log(`original id: ${tx.id}`);

        const correctTx = wasm.UnsignedTransaction.from_json(JSON.stringify(tx)).to_json();

        // we must use the exact order chosen as after 0.4.3 in sigma-rust
        // this can change and might not use all the utxos as the coin selection
        // might choose a more optimal amount
        correctTx.inputs = correctTx.inputs.map(box => {
            const fullBoxInfo = utxos.find(utxo => utxo.boxId === box.boxId);
            return {
                ...fullBoxInfo,
                extension: {}
            };
        });
        console.log(`correct tx: ${JSON.stringify(correctTx)}`);
        console.log(`new id: ${correctTx.id}`);


        processTx(correctTx).then(txId => {
            console.log('[txId]', txId);
        });

        // let signed = await ergo.sign_tx(correctTx)
        // if (!signed) {
        //     console.log(`No signed tx`);
        // }
        // console.log('here', signed)
        // console.log('signed:', JSON.stringify(signed))
        // // } catch (e) {
        // //     console.log('here', signed)
        // //     console.log('err', JSON.stringify(e))
        // // }
        // console.log('done')

    } catch (e) {
        console.log('wow')
        console.log(e)
    }


    return

    let newBox = {
        value: bidAmount,
        address: Address.fromErgoTree(box.ergoTree).address,
        assets: box.assets,
        registers: {
            R4: box.additionalRegisters.R4,
            R5: encodedNextEndTime,
            R6: box.additionalRegisters.R6,
            R7: box.additionalRegisters.R7,
            R8: encodedTree,
            R9: box.additionalRegisters.R9,
        },
    };
    let request = {
        address: address,
        returnTo: ourAddr,
        startWhen: {
            erg: bidAmount + auctionFee,
        },
        txSpec: {
            requests: [newBox, returnBidder],
            fee: auctionFee,
            inputs: ['$userIns', box.id],
            dataInputs: [additionalData.dataInput.id],
        },
    };
    return await follow(request)
        .then((res) => {
            if (res.id !== undefined) {
                let bid = {
                    id: res.id,
                    msg: "Your bid is being placed by the assembler service, see 'My Bids' section for more details.",
                    info: {
                        token: box.assets[0],
                        boxId: box.id,
                        txId: null,
                        tx: null,
                        prevEndTime: box.finalBlock,
                        shouldExtend:
                            box.ergoTree === auctionWithExtensionTree &&
                            nextEndTime === box.finalBlock,
                        status: 'pending mining',
                        amount: bidAmount,
                        isFirst: false,
                    },
                };
                addAssemblerBid(bid);
            }
            return res;
        });
}

export async function getBidP2s(bid, box) {
    let id64 = Buffer.from(box.id, 'hex').toString('base64');
    let script = template
        .replace('$userAddress', getWalletAddress())
        .replace('$bidAmount', bid)
        .replace('$endTime', box.finalBlock)
        .replace('$auctionId', id64)
        .replaceAll('\n', '\\n');
    return p2s(script);
}

