import React from 'react';
import {Bounce, Flip, Slide, toast, Zoom} from 'react-toastify';

const explorerUrl = 'https://explorer.ergoplatform.com/en/';

export function friendlyToken(token, quantity = true, length = 13) {
    let res = '';
    if (quantity) res = token.amount + ' of ';
    res +=
        token.tokenId.slice(0, length) +
        '...' +
        token.tokenId.slice(-length) +
        ' token';
    return res
}

export function friendlyAddress(addr) {
    return addr.slice(0, 13) + '...' + addr.slice(-13);
}

export function getTxUrl(txId) {
    return explorerUrl + 'transactions/' + txId;
}
export function getAddrUrl(addr) {
    return explorerUrl + 'addresses/' + addr;
}

export function showMsg(message, isError = false) {
    toast(message, {
        transition: Slide,
        closeButton: true,
        autoClose: 5000,
        position: 'top-right',
        type: isError ? 'error' : 'default',
    });
}

export function showStickyNotif(message, isError = false) {
    toast(message, {
        transition: Flip,
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        position: 'top-center',
        type: isError ? 'error' : 'default',
    });
}

export function isWalletSaved() {
    return sessionStorage.getItem('wallet') !== null;
}
