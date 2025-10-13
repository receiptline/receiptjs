/*
Copyright 2024 Open Foodservice System Consortium

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// QR Code is a registered trademark of DENSO WAVE INCORPORATED.

const ReceiptSerial = (() => {
    //
    // event dispatcher
    //
    const dispatch = (listener, ...args) => {
        setTimeout(() => {
            for (let callback of listener) callback(...args);
        });
    };

    //
    // serial port
    //
    const serialport = () => {
        let port;
        let reader;
        let writer;
        const listeners = { open: [], data: [], drain: [], error: [], close: [] };
        return {
            // open serial port
            open(options) {
                // select port
                navigator.serial.requestPort().then(p => {
                    port = p;
                    // read data
                    const read = async () => {
                        reader = port.readable.getReader();
                        writer = port.writable.getWriter();
                        dispatch(listeners.open);
                        try {
                            while (true) {
                                const { value, done } = await reader.read();
                                if (done) {
                                    break;
                                }
                                dispatch(listeners.data, value);
                            }
                        }
                        catch (e) {
                            dispatch(listeners.error, e);
                        }
                    };
                    // open port
                    let retry = 2;
                    const open = () => {
                        port.open(options).then(read).catch(e => {
                            if (retry-- > 0) {
                                setTimeout(open, 3000);
                            }
                            else {
                                dispatch(listeners.error, e);
                            }
                        });
                    };
                    open();
                }).catch(e => {
                    dispatch(listeners.close, e);
                });
            },
            // write data
            write(data, encoding) {
                if (writer) {
                    const chunk = encoding !== 'binary' ? new TextEncoder().encode(data) : Uint8Array.from(data, c => c.charCodeAt(0));
                    writer.write(chunk).then(() => {
                        dispatch(listeners.drain);
                    }).catch(e => {
                        dispatch(listeners.error, e);
                    });
                }
                return false;
            },
            // close serial port
            close() {
                if (port) {
                    port.forget().then(() => {
                        reader = undefined;
                        writer = undefined;
                        port = undefined;
                        dispatch(listeners.close);
                    });
                }
            },
            // add event listener
            on(name, listener) {
                if (listeners[name]) {
                    listeners[name].push(listener);
                }
            },
            // remove event listener
            off(name, listener) {
                if (listeners[name]) {
                    listeners[name] = listeners[name].filter(c => c !== listener);
                }
            }
        };
    };

    // all states
    const state = {
        online: 'online',
        print: 'print',
        coveropen: 'coveropen',
        paperempty: 'paperempty',
        error: 'error',
        offline: 'offline',
        disconnect: 'disconnect',
        drawerclosed: 'drawerclosed',
        draweropen: 'draweropen'
    };

    // control commands
    const command = {
        hello: '\x10\x04\x02\x1b\x06\x01\x1b@', // DLE EOT n ESC ACK SOH ESC @
        clear: '\x10\x14\x08\x01\x03\x14\x01\x06\x02\x08', // DLE DC4 n d1 d2 d3 d4 d5 d6 d7
        siiasb: '\x1da\xff', // GS a n
        starasb: '\x1b\x1ea\x01\x17', // ESC RS a n ETB
        escasb: '\x10\x04\x01\x1dI\x42\x1dI\x43\x1da\xff' // DLE EOT n GS I n GS I n GS a n
    };

    return {
        /**
         * Create serial port connection.
         * @param {object} [options] serial port options
         * @returns {object} connection instance
         */
        connect(options = {}) {
            // listeners
            const listeners = {
                status: [],
                ready: [],
                online: [],
                print: [],
                coveropen: [],
                paperempty: [],
                error: [],
                offline: [],
                disconnect: [],
                drawer: [],
                drawerclosed: [],
                draweropen: []
            };
            // promise resolver
            let resolve = () => {};
            // status
            let status = state.offline;
            // ready
            let ready = false;
            // update status
            const update = newstatus => {
                if (newstatus !== status) {
                    // print response
                    if (status === state.print) {
                        resolve(newstatus === state.online ? 'success' : newstatus);
                    }
                    // status event
                    status = newstatus;
                    dispatch(listeners.status, status);
                    dispatch(listeners[status]);
                    // ready event
                    if (!ready && status === state.online) {
                        dispatch(listeners.ready);
                        ready = true;
                    }
                }
            };
            // drawer status
            let drawer = state.offline;
            // invert drawer status
            let invertion = false;
            // update drawer status
            const updateDrawer = newstatus => {
                let d = newstatus;
                // invert drawer status
                if (invertion) {
                    switch (d) {
                        case state.drawerclosed:
                            d = state.draweropen;
                            break;
                        case state.draweropen:
                            d = state.drawerclosed;
                            break;
                        default:
                            break;
                    }
                }
                if (d !== drawer) {
                    // status event
                    drawer = d;
                    dispatch(listeners.drawer, drawer);
                    dispatch(listeners[drawer]);
                }
            };
            // timer
            let timeout = 0;
            // printer control language
            let printer = '';
            // receive buffer
            const buffer = [];
            // drain
            let drain = true;
            // connection
            const conn = serialport();
            // drain event
            conn.on('drain', () => {
                // write buffer is empty
                drain = true;
            });
            // open event
            conn.on('open', () => {
                // hello to printer
                drain = conn.write(command.hello, 'binary');
                // set timer
                timeout = setTimeout(() => {
                    // buffer clear
                    drain = conn.write(command.clear, 'binary');
                    // set timer
                    timeout = setTimeout(() => {
                        // buffer clear
                        drain = conn.write('\x00'.repeat(65536) + command.clear, 'binary');
                    }, 3000);
                }, 3000);
            });
            // error event
            conn.on('error', err => {
                // clear timer
                clearTimeout(timeout);
                // close port
                conn.close();
            });
            // close event
            conn.on('close', () => {
                // disconnect event
                update(state.disconnect);
                updateDrawer(state.disconnect);
            });
            // data event
            conn.on('data', data => {
                // append data
                buffer.push(...data);
                // parse response
                let len;
                do {
                    len = buffer.length;
                    switch (printer) {
                        case '':
                            if ((buffer[0] & 0xf0) === 0xb0) {
                                // sii: initialized response
                                // clear data
                                buffer.shift();
                                // clear timer
                                clearTimeout(timeout);
                                // printer control language
                                printer = 'sii';
                                // enable automatic status
                                drain = conn.write(command.siiasb, 'binary');
                            }
                            else if ((buffer[0] & 0x91) === 0x01) {
                                // star: automatic status
                                if (len > 1) {
                                    const l = ((buffer[0] >> 2 & 0x18) | (buffer[0] >> 1 & 0x07)) + (buffer[1] >> 6 & 0x02);
                                    // check length
                                    if (l <= len) {
                                        // printer
                                        if ((buffer[2] & 0x20) === 0x20) {
                                            // cover open event
                                            update(state.coveropen);
                                        }
                                        else if ((buffer[5] & 0x08) === 0x08) {
                                            // paper empty event
                                            update(state.paperempty);
                                        }
                                        else if ((buffer[3] & 0x2c) !== 0 || (buffer[4] & 0x0a) !== 0) {
                                            // error event
                                            update(state.error);
                                        }
                                        else {
                                            // nothing to do
                                        }
                                        // cash drawer
                                        updateDrawer((buffer[2] & 0x04) === 0x04 ? state.draweropen : state.drawerclosed);
                                        // clear data
                                        buffer.splice(0, l);
                                        // clear timer
                                        clearTimeout(timeout);
                                        // printer control language
                                        printer = 'star';
                                        // enable automatic status
                                        drain = conn.write(command.starasb, 'binary');
                                    }
                                }
                            }
                            else if ((buffer[0] & 0x93) === 0x12) {
                                // escpos: realtime status
                                if ((buffer[0] & 0x97) === 0x16) {
                                    // cover open event
                                    update(state.coveropen);
                                }
                                else if ((buffer[0] & 0xb3) === 0x32) {
                                    // paper empty event
                                    update(state.paperempty);
                                }
                                else if ((buffer[0] & 0xd3) === 0x52) {
                                    // error event
                                    update(state.error);
                                }
                                else {
                                    // nothing to do
                                }
                                // clear data
                                buffer.shift();
                                // clear timer
                                clearTimeout(timeout);
                                // printer control language
                                printer = 'generic';
                                // get model info and enable automatic status
                                drain = conn.write(command.escasb, 'binary');
                                // set timer
                                timeout = setTimeout(() => {
                                    // printer control language
                                    printer = '';
                                    // buffer clear
                                    drain = conn.write('\x00'.repeat(65536) + command.clear, 'binary');
                                }, 3000);
                            }
                            else if ((buffer[0] & 0x93) === 0x10) {
                                // escpos: automatic status
                                if (len > 3 && (buffer[1] & 0x90) === 0 && (buffer[2] & 0x90) === 0 && (buffer[3] & 0x90) === 0) {
                                    // clear data
                                    buffer.splice(0, 4);
                                }
                            }
                            else if (buffer[0] === 0x35 || buffer[0] === 0x37 || buffer[0] === 0x3b || buffer[0] === 0x3d || buffer[0] === 0x5f) {
                                // escpos: block data
                                const i = buffer.indexOf(0);
                                // check length
                                if (i > 0) {
                                    // clear data
                                    buffer.splice(0, i + 1);
                                }
                            }
                            else {
                                // other
                                buffer.shift();
                            }
                            break;

                        case 'sii':
                            if ((buffer[0] & 0xf0) === 0x80) {
                                // sii: status
                                if (status === state.print && drain) {
                                    // online event
                                    update(state.online);
                                }
                                // clear data
                                buffer.shift();
                            }
                            else if ((buffer[0] & 0xf0) === 0xc0) {
                                // sii: automatic status
                                if (len > 7) {
                                    // printer
                                    if ((buffer[1] & 0xf8) === 0xd8) {
                                        // cover open event
                                        update(state.coveropen);
                                    }
                                    else if ((buffer[1] & 0xf1) === 0xd1) {
                                        // paper empty event
                                        update(state.paperempty);
                                    }
                                    else if ((buffer[0] & 0x0b) !== 0) {
                                        // error event
                                        update(state.error);
                                    }
                                    else if (status !== state.print) {
                                        // online event
                                        update(state.online);
                                    }
                                    else {
                                        // nothing to do
                                    }
                                    // cash drawer
                                    updateDrawer((buffer[3] & 0xf8) === 0xd8 ? state.drawerclosed : state.draweropen);
                                    // clear data
                                    buffer.splice(0, 8);
                                }
                            }
                            else {
                                // sii: other
                                buffer.shift();
                            }
                            break;

                        case 'star':
                            if ((buffer[0] & 0xf1) === 0x21) {
                                // star: automatic status
                                if (len > 1) {
                                    const l = ((buffer[0] >> 2 & 0x08) | (buffer[0] >> 1 & 0x07)) + (buffer[1] >> 6 & 0x02);
                                    // check length
                                    if (l <= len) {
                                        // printer
                                        if ((buffer[2] & 0x20) === 0x20) {
                                            // cover open event
                                            update(state.coveropen);
                                        }
                                        else if ((buffer[5] & 0x08) === 0x08) {
                                            // paper empty event
                                            update(state.paperempty);
                                        }
                                        else if ((buffer[3] & 0x2c) !== 0 || (buffer[4] & 0x0a) !== 0) {
                                            // error event
                                            update(state.error);
                                        }
                                        else if (status !== state.print) {
                                            // online event
                                            update(state.online);
                                        }
                                        else if (drain) {
                                            // online event
                                            update(state.online);
                                        }
                                        else {
                                            // nothing to do
                                        }
                                        // cash drawer
                                        updateDrawer((buffer[2] & 0x04) === 0x04 ? state.draweropen : state.drawerclosed);
                                        // clear data
                                        buffer.splice(0, l);
                                    }
                                }
                            }
                            else {
                                // star: other
                                buffer.shift();
                            }
                            break;

                        default:
                            // check response type
                            if ((buffer[0] & 0x90) === 0) {
                                // escpos: status
                                if (status === state.print && drain) {
                                    // online event
                                    update(state.online);
                                }
                                // clear data
                                buffer.shift();
                            }
                            else if ((buffer[0] & 0x93) === 0x10) {
                                // escpos: automatic status
                                if (len > 3 && (buffer[1] & 0x90) === 0 && (buffer[2] & 0x90) === 0 && (buffer[3] & 0x90) === 0) {
                                    // printer
                                    if ((buffer[0] & 0x20) === 0x20) {
                                        // cover open event
                                        update(state.coveropen);
                                    }
                                    else if ((buffer[2] & 0x0c) === 0x0c) {
                                        // paper empty event
                                        update(state.paperempty);
                                    }
                                    else if ((buffer[1] & 0x2c) !== 0) {
                                        // error event
                                        update(state.error);
                                    }
                                    else if (status !== state.print) {
                                        // online event
                                        update(state.online);
                                    }
                                    else {
                                        // nothing to do
                                    }
                                    // cash drawer
                                    updateDrawer((buffer[0] & 0x04) === 0x04 ? state.drawerclosed : state.draweropen);
                                    // clear data
                                    buffer.splice(0, 4);
                                }
                            }
                            else if (buffer[0] === 0x35 || buffer[0] === 0x37 || buffer[0] === 0x3b || buffer[0] === 0x3d || buffer[0] === 0x5f) {
                                // escpos: block data
                                const i = buffer.indexOf(0);
                                // check length
                                if (i > 0) {
                                    // clear data
                                    const block = buffer.splice(0, i + 1);
                                    if (block[0] === 0x5f) {
                                        // clear timer
                                        clearTimeout(timeout);
                                        // model info
                                        const model = String.fromCharCode(...block.slice(1, -1)).toLowerCase();
                                        if (printer === 'generic' && /^(epson|citizen|fit)$/.test(model)) {
                                            // escpos thermal
                                            printer = model;
                                        }
                                        else if (printer === 'epson' && /^tm-u/.test(model)) {
                                            // escpos impact
                                            printer = 'impactb';
                                        }
                                        else {
                                            // nothing to do
                                        }
                                    }
                                    else if (block[0] === 0x3b) {
                                        // power on
                                        if (block[1] === 0x31) {
                                            // printer control language
                                            printer = '';
                                            // hello to printer
                                            drain = conn.write(command.hello, 'binary');
                                        }
                                        // offline event
                                        update(state.offline);
                                        updateDrawer(state.offline);
                                    }
                                    else {
                                        // nothing to do
                                    }
                                }
                            }
                            else if ((buffer[0] & 0x93) === 0x12) {
                                // escpos: realtime status
                                // clear timer
                                clearTimeout(timeout);
                                // cash drawer
                                updateDrawer((buffer[0] & 0x97) === 0x16 ? state.drawerclosed : state.draweropen);
                                // clear data
                                buffer.shift();
                            }
                            else {
                                // escpos: other
                                buffer.shift();
                            }
                            break;
                    }
                }
                while (buffer.length > 0 && buffer.length < len);
            });
            // open port
            conn.open({ ...{ baudRate: 115200, flowControl: 'hardware', bufferSize: 1024 }, ...options });

            return {
                /**
                 * Printer status.
                 * @type {string} printer status
                 */
                get status() {
                    return status;
                },
                /**
                 * Cash drawer status.
                 * @type {string} cash drawer status
                 */
                get drawer() {
                    return drawer;
                },
                /**
                 * Invert cash drawer state.
                 * @param {boolean} invert invert cash drawer state
                 */
                invertDrawerState(invert) {
                    invertion = !!invert;
                    switch (drawer) {
                        case state.drawerclosed:
                            drawer = state.draweropen;
                            break;
                        case state.draweropen:
                            drawer = state.drawerclosed;
                            break;
                        default:
                            break;
                    }
                },
                /**
                 * Print receipt markdown.
                 * @param {string} markdown receipt markdown
                 * @param {string} [options] print options
                 * @returns {string} print result
                 */
                print(markdown, options) {
                    // asynchronous printing
                    return new Promise(res => {
                        // online or ready
                        if (status === state.online) {
                            // convert markdown to printer command
                            Receipt.from(markdown, `-p ${printer} ${options}`).toCommand().then(command => {
                                // write command
                                if (/^star$/.test(printer)) {
                                    // star
                                    drain = conn.write(command
                                        .replace(/^(\x1b@)?\x1b\x1ea\x00/, '$1\x1b\x1ea\x01')  // (ESC @) ESC RS a n
                                        .replace(/(\x1b\x1d\x03\x01\x00\x00\x04?|\x1b\x06\x01)$/, '\x17'), 'binary'); // ETB
                                }
                                else {
                                    // escpos
                                    drain = conn.write(command.replace(/^\x1b@\x1da\x00/, '\x1b@\x1da\xff'), 'binary'); // ESC @ GS a n
                                }
                            });
                            // save resolver
                            resolve = res;
                            // print event
                            update(state.print);
                        }
                        else {
                            // print response
                            res(status);
                        }
                    });
                },
                /**
                 * Close serial port.
                 */
                close() {
                    // clear timer
                    clearTimeout(timeout);
                    // close port
                    conn.close();
                },
                /**
                 * Add event listener.
                 * @param {string} name event name
                 * @param {function} listener event listener
                 */
                on(name, listener) {
                    if (listeners[name]) {
                        listeners[name].push(listener);
                    }
                },
                /**
                 * Remove event listener.
                 * @param {string} name event name
                 * @param {function} listener event listener
                 */
                off(name, listener) {
                    if (listeners[name]) {
                        listeners[name] = listeners[name].filter(c => c !== listener);
                    }
                }
            };
        }
    };
})();
