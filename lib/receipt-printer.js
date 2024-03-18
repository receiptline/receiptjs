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

const ReceiptPrinter = (() => {
    //
    // Buffer
    //
    const Buffer = {
        from(image) {
            return {
                toString() {
                    return image;
                }
            }
        }
    };

    //
    // iconv
    //
    const iconv = (() => {
        // shiftjis table
        const sjistable = { '\u00a5': 0x5c, '\u203e': 0x7e };
        const sjisdecoder = new TextDecoder('shift-jis');
        for (let i = 0x81; i <= 0xfc; i++) {
            if (i <= 0x84 || i >= 0x87 && i <= 0x9f || i >= 0xe0 && i <= 0xea || i >= 0xed && i <= 0xee || i >= 0xfa) {
                for (let j = 0x40; j <= 0xfc; j++) {
                    const c = sjisdecoder.decode(new Uint8Array([i, j]));
                    if (c.length === 1 && c !== '\ufffd' && !sjistable[c]) {
                        sjistable[c] = i << 8 | j;
                    }
                }
            }
        }
        // shiftjis converter
        const shiftjis = content => {
            let r = '';
            for (let i = 0; i < content.length; i++) {
                const c = content.codePointAt(i);
                if (c > 0xffff) {
                    i++;
                }
                if (c < 0x80) {
                    r += String.fromCodePoint(c);
                }
                else if (c >= 0xff61 && c <= 0xff9f) {
                    r += String.fromCodePoint(c - 0xfec0);
                }
                else {
                    const d = sjistable[String.fromCodePoint(c)] || 0x3f;
                    if (d > 0xff) {
                        r += String.fromCodePoint(d >> 8 & 0xff, d & 0xff);
                    }
                    else {
                        r += String.fromCodePoint(d);
                    }
                }
            }
            return r;
        };
        // ksc5601 table
        const kstable = {};
        const ksdecoder = new TextDecoder('euc-kr');
        for (let i = 0xa1; i <= 0xfd; i++) {
            if (i <= 0xac || i >= 0xb0 && i <= 0xc8 || i >= 0xca) {
                for (let j = 0xa1; j <= 0xfc; j++) {
                    const c = ksdecoder.decode(new Uint8Array([i, j]));
                    if (c.length === 1 && c !== '\ufffd' && !kstable[c]) {
                        kstable[c] = i << 8 | j;
                    }
                }
            }
        }
        // ksc5601 converter
        const ksc5601 = content => {
            let r = '';
            for (let i = 0; i < content.length; i++) {
                const c = content.codePointAt(i);
                if (c > 0xffff) {
                    i++;
                }
                if (c < 0x80) {
                    r += String.fromCodePoint(c);
                }
                else if (c >= 0xff61 && c <= 0xff9f) {
                    r += String.fromCodePoint(c - 0xfec0);
                }
                else {
                    const d = kstable[String.fromCodePoint(c)] || 0x3f;
                    if (d > 0xff) {
                        r += String.fromCodePoint(d >> 8 & 0xff, d & 0xff);
                    }
                    else {
                        r += String.fromCodePoint(d);
                    }
                }
            }
            return r;
        };
        // gb18030 table
        const gbtable = {};
        const gbdecoder = new TextDecoder('gb18030');
        // 1, 2
        for (let i = 0xa1; i <= 0xf7; i++) {
            if (i <= 0xa9 || i >= 0xb0) {
                for (let j = 0xa1; j <= 0xfe; j++) {
                    const c = gbdecoder.decode(new Uint8Array([i, j]));
                    if (c.length === 1 && c !== '\ufffd' && !gbtable[c]) {
                        gbtable[c] = i << 8 | j;
                    }
                }
            }
        }
        // 3
        for (let i = 0x81; i <= 0xa0; i++) {
            for (let j = 0x40; j <= 0xfe; j++) {
                const c = gbdecoder.decode(new Uint8Array([i, j]));
                if (c.length === 1 && c !== '\ufffd' && !gbtable[c]) {
                    gbtable[c] = i << 8 | j;
                }
            }
        }
        // 4, 5
        for (let i = 0xa8; i <= 0xfe; i++) {
            for (let j = 0x40; j <= 0xa0; j++) {
                const c = gbdecoder.decode(new Uint8Array([i, j]));
                if (c.length === 1 && c !== '\ufffd' && !gbtable[c]) {
                    gbtable[c] = i << 8 | j;
                }
            }
        }
        // CJK-A
        let f = 0x81, g = 0x39, h = 0xee;
        while (true) {
            for (let i = 0x30; i <= 0x39; i++) {
                if (!(f === 0x81 && g === 0x39 && h === 0xee && i < 0x39 || f === 0x82 && g === 0x35 && h === 0x87 && i > 0x38)) {
                    const c = gbdecoder.decode(new Uint8Array([f, g, h, i]));
                    if (c.length === 1 && c !== '\ufffd' && !gbtable[c]) {
                        gbtable[c] = f << 24 | g << 16 | h << 8 | i;
                    }
                }
            }
            h++;
            if (h > 0xfe) {
                h = 0x81;
                g++;
                if (g > 0x39) {
                    g = 0x30;
                    f++;
                }
            }
            if (f === 0x82 && g === 0x35 && h === 0x88) {
                break;
            }
        }
        // gb18030 converter
        const gb18030 = content => {
            let r = '';
            for (let i = 0; i < content.length; i++) {
                const c = content.codePointAt(i);
                if (c > 0xffff) {
                    i++;
                }
                if (c < 0x80) {
                    r += String.fromCodePoint(c);
                }
                else {
                    const d = gbtable[String.fromCodePoint(c)] || 0xa1a1;
                    if (d < 0 || d > 0xffff) {
                        r += String.fromCodePoint(d >> 24 & 0xff, d >> 16 & 0xff, d >> 8 & 0xff, d & 0xff);
                    }
                    else if (d > 0xff) {
                        r += String.fromCodePoint(d >> 8 & 0xff, d & 0xff);
                    }
                    else {
                        r += String.fromCodePoint(d);
                    }
                }
            }
            return r;
        };
        // big5 table
        const bigtable = {};
        const bigdecoder = new TextDecoder('big5');
        for (let i = 0xa1; i <= 0xf9; i++) {
            if (i <= 0xc6 || i >= 0xc9) {
                for (let j = 0x40; j <= 0x7e; j++) {
                    const c = bigdecoder.decode(new Uint8Array([i, j]));
                    if (c.length === 1 && c !== '\ufffd' && !bigtable[c]) {
                        bigtable[c] = i << 8 | j;
                    }
                }
                if (i !== 0xc6) {
                    for (let j = 0xa1; j <= 0xfe; j++) {
                        if (i !== 0xf9 || j <= 0xd5) {
                            const c = bigdecoder.decode(new Uint8Array([i, j]));
                            if (c.length === 1 && c !== '\ufffd' && !bigtable[c]) {
                                bigtable[c] = i << 8 | j;
                            }
                        }
                    }
                }
            }
        }
        // big5 converter
        const big5 = content => {
            let r = '';
            for (let i = 0; i < content.length; i++) {
                const c = content.codePointAt(i);
                if (c > 0xffff) {
                    i++;
                }
                if (c < 0x80) {
                    r += String.fromCodePoint(c);
                }
                else {
                    const d = bigtable[String.fromCodePoint(c)] || 0x3f;
                    if (d > 0xff) {
                        r += String.fromCodePoint(d >> 8 & 0xff, d & 0xff);
                    }
                    else {
                        r += String.fromCodePoint(d);
                    }
                }
            }
            return r;
        };
        // tis620 converter
        const tis620 = content => {
            let r = '';
            for (let i = 0; i < content.length; i++) {
                const c = content.codePointAt(i);
                if (c > 0xffff) {
                    i++;
                }
                if (c < 0x80) {
                    r += String.fromCodePoint(c);
                }
                else if (c >= 0xe01 && c <= 0xe7f) {
                    r += String.fromCodePoint(c - 0xd60);
                }
                else {
                    r += '?';
                }
            }
            return r;
        };
        // ascii converter
        const ascii = content => {
            let r = '';
            for (let i = 0; i < content.length; i++) {
                const c = content.codePointAt(i);
                if (c > 0xffff) {
                    i++;
                }
                if (c < 0x80) {
                    r += String.fromCodePoint(c);
                }
                else {
                    r += '?';
                }
            }
            return r;
        };
        return {
            encode(content, encoding) {
                let r = '';
                switch (encoding) {
                    case 'cp932':
                    case 'shiftjis':
                        r = shiftjis(content);
                        break;
                    case 'cp936':
                    case 'gb18030':
                        r = gb18030(content);
                        break;
                    case 'cp949':
                    case 'ksc5601':
                        r = ksc5601(content);
                        break;
                    case 'cp950':
                    case 'big5':
                        r = big5(content);
                        break;
                    case 'tis620':
                        r = tis620(content);
                        break;
                    default:
                        r = ascii(content);
                        break;
                }
                return Buffer.from(r);
            }
        };
    })();

    //
    // PNG
    //
    const PNG = {
        async read(buffer) {
            const img = new Image();
            img.src = 'data:image/png;base64,' + buffer.toString();
            await img.decode();
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            return context.getImageData(0, 0, canvas.width, canvas.height);
        }
    };

    // shortcut
    const $ = String.fromCharCode;

    //
    // multilingual conversion table (cp437, cp852, cp858, cp866, cp1252)
    //
    const multitable = {};
    const multipage = {
        '\x00': 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ',
        '\x10': '€�‚ƒ„…†‡ˆ‰Š‹Œ�Ž��‘’“”•–—˜™š›œ�žŸ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ',
        '\x11': 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмноп░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀рстуфхцчшщъыьэюяЁёЄєЇїЎў°∙·√№¤■ ',
        '\x12': 'ÇüéâäůćçłëŐőîŹÄĆÉĹĺôöĽľŚśÖÜŤťŁ×čáíóúĄąŽžĘę¬źČş«»░▒▓│┤ÁÂĚŞ╣║╗╝Żż┐└┴┬├─┼Ăă╚╔╩╦╠═╬¤đĐĎËďŇÍÎě┘┌█▄ŢŮ▀ÓßÔŃńňŠšŔÚŕŰýÝţ´­˝˛ˇ˘§÷¸°¨˙űŘř■ ',
        '\x13': 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈ€ÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ '
    };
    const starpage = { '\x00': '\x01', '\x10': '\x20', '\x11': '\x0a', '\x12': '\x05', '\x13': '\x04' };
    for (let p of Object.keys(multipage)) {
        const s = multipage[p];
        for (let i = 0; i < 128; i++) {
            const c = s[i];
            if (!multitable[c]) {
                multitable[c] = p + $(i + 128);
            }
        }
    }

    //
    // ESC/POS Common
    //
    const _escpos = {
        // printer configuration
        upsideDown: false,
        spacing: false,
        cutting: true,
        gradient: true,
        gamma: 1.8,
        threshold: 128,
        // ruled line composition
        vrtable: {
            ' '    : { ' ' : ' ',    '\x90' : '\x90', '\x95' : '\x95', '\x9a' : '\x9a', '\x9b' : '\x9b', '\x9e' : '\x9e', '\x9f' : '\x9f' },
            '\x91' : { ' ' : '\x91', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x8f', '\x9b' : '\x8f', '\x9e' : '\x8f', '\x9f' : '\x8f' },
            '\x95' : { ' ' : '\x95', '\x90' : '\x90', '\x95' : '\x95', '\x9a' : '\x90', '\x9b' : '\x90', '\x9e' : '\x90', '\x9f' : '\x90' },
            '\x98' : { ' ' : '\x98', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x93', '\x9b' : '\x8f', '\x9e' : '\x93', '\x9f' : '\x8f' },
            '\x99' : { ' ' : '\x99', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x8f', '\x9b' : '\x92', '\x9e' : '\x8f', '\x9f' : '\x92' },
            '\x9c' : { ' ' : '\x9c', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x93', '\x9b' : '\x8f', '\x9e' : '\x93', '\x9f' : '\x8f' },
            '\x9d' : { ' ' : '\x9d', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x8f', '\x9b' : '\x92', '\x9e' : '\x8f', '\x9f' : '\x92' }
        },
        // codepages: (ESC t n) (FS &) (FS C n) (ESC R n)
        codepage: {
            cp437: '\x1bt\x00', cp852: '\x1bt\x12', cp858: '\x1bt\x13', cp860: '\x1bt\x03',
            cp863: '\x1bt\x04', cp865: '\x1bt\x05', cp866: '\x1bt\x11', cp1252: '\x1bt\x10',
            cp932: '\x1bt\x01\x1cC1\x1bR\x08', cp936: '\x1bt\x00\x1c&',
            cp949: '\x1bt\x00\x1c&\x1bR\x0d', cp950: '\x1bt\x00\x1c&',
            shiftjis: '\x1bt\x01\x1cC1\x1bR\x08', gb18030: '\x1bt\x00\x1c&',
            ksc5601: '\x1bt\x00\x1c&\x1bR\x0d', big5: '\x1bt\x00\x1c&', tis620: '\x1bt\x15'
        },
        // convert to multiple codepage characters: (ESC t n)
        multiconv(text) {
            let p = '', r = '';
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (c > '\x7f') {
                    const d = multitable[c];
                    if (d) {
                        const q = d[0];
                        if (p === q) {
                            r += d[1];
                        }
                        else {
                            r += '\x1bt' + d;
                            p = q;
                        }
                    }
                    else {
                        r += '?';
                    }
                }
                else {
                    r += c;
                }
            }
            return r;
        }
    };

    //
    // ESC/POS Thermal
    //
    const _thermal = {
        alignment: 0,
        left: 0,
        width: 48,
        right: 0,
        margin: 0,
        marginRight: 0,
        // start printing: ESC @ GS a n ESC M n FS ( A pL pH fn m ESC SP n FS S n1 n2 (ESC 2) (ESC 3 n) ESC { n FS .
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.right = 0;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            return '\x1b@\x1da\x00\x1bM' + (printer.encoding === 'tis620' ? 'a' : '0') + '\x1c(A' + $(2, 0, 48, 0) + '\x1b \x00\x1cS\x00\x00' + (this.spacing ? '\x1b2' : '\x1b3\x00') + '\x1b{' + $(this.upsideDown) + '\x1c.';
        },
        // finish printing: GS r n
        close() {
            return (this.cutting ? this.cut() : '') + '\x1dr1';
        },
        // set print area: GS L nL nH GS W nL nH
        area(left, width, right) {
            this.left = left;
            this.width = width;
            this.right = right;
            const m = (this.margin + left) * this.charWidth;
            const w = width * this.charWidth;
            return '\x1dL' + $(m & 255, m >> 8 & 255) + '\x1dW' + $(w & 255, w >> 8 & 255);
        },
        // set line alignment: ESC a n
        align(align) {
            this.alignment = align;
            return '\x1ba' + $(align);
        },
        // set absolute print position: ESC $ nL nH
        absolute(position) {
            const p = position * this.charWidth;
            return '\x1b$' + $(p & 255, p >> 8 & 255);
        },
        // set relative print position: ESC \ nL nH
        relative(position) {
            const p = position * this.charWidth;
            return '\x1b\\' + $(p & 255, p >> 8 & 255);
        },
        // print horizontal rule: FS C n FS . ESC t n ...
        hr(width) {
            return '\x1cC0\x1c.\x1bt\x01' + '\x95'.repeat(width);
        },
        // print vertical rules: GS ! n FS C n FS . ESC t n ...
        vr(widths, height) {
            return widths.reduce((a, w) => a + this.relative(w) + '\x96', '\x1d!' + $(height - 1) + '\x1cC0\x1c.\x1bt\x01\x96');
        },
        // start rules: FS C n FS . ESC t n ...
        vrstart(widths) {
            return '\x1cC0\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d';
        },
        // stop rules: FS C n FS . ESC t n ...
        vrstop(widths) {
            return '\x1cC0\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f';
        },
        // print vertical and horizontal rules: FS C n FS . ESC t n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0));
            return '\x1cC0\x1c.\x1bt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
        },
        // set line spacing and feed new line: (ESC 2) (ESC 3 n)
        vrlf(vr) {
            return (vr === this.upsideDown && this.spacing ? '\x1b2' : '\x1b3\x00') + this.lf();
        },
        // cut paper: GS V m n
        cut() {
            return '\x1dVB\x00';
        },
        // underline text: ESC - n FS - n
        ul() {
            return '\x1b-2\x1c-2';
        },
        // emphasize text: ESC E n
        em() {
            return '\x1bE1';
        },
        // invert text: GS B n
        iv() {
            return '\x1dB1';
        },
        // scale up text: GS ! n
        wh(wh) {
            return '\x1d!' + (wh < 3 ? $((wh & 1) << 4 | wh >> 1 & 1) : $(wh - 2 << 4 | wh - 2));
        },
        // cancel text decoration: ESC - n FS - n ESC E n GS B n GS ! n
        normal() {
            return '\x1b-0\x1c-0\x1bE0\x1dB0\x1d!\x00';
        },
        // print text:
        text(text, encoding) {
            switch (encoding) {
                case 'multilingual':
                    return this.multiconv(text);
                case 'tis620':
                    return this.codepage[encoding] + this.arrayFrom(text, encoding).reduce((a, c) => a + '\x00' + iconv.encode(c, encoding).toString('binary'), '');
                default:
                    return this.codepage[encoding] + iconv.encode(text, encoding).toString('binary');
            }
        },
        // feed new line: LF
        lf() {
            return '\x0a';
        },
        // insert commands:
        command(command) {
            return command;
        },
        // image split size
        split: 512,
        // print image: GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk GS ( L pL pH m fn
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const right = arguments[4] || this.right;
            let r = this.upsideDown ? this.area(right + this.marginRight - this.margin, width, left) + this.align(2 - align) : '';
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const d = Array(w).fill(0);
            let j = this.upsideDown ? img.data.length - 4 : 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                const l = (w + 7 >> 3) * h + 10;
                r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += this.upsideDown ? -4 : 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
                r += '\x1d(L' + $(2, 0, 48, 50);
            }
            return r;
        },
        // print QR Code: GS ( k pL pH cn fn n1 n2 GS ( k pL pH cn fn n GS ( k pL pH cn fn n GS ( k pL pH cn fn m d1 ... dk GS ( k pL pH cn fn m
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined') {
                let r = this.upsideDown ? this.area(this.right + this.marginRight - this.margin, this.width, this.left) + this.align(2 - this.alignment) : '';
                if (symbol.data.length > 0) {
                    const qr = qrcode(0, symbol.level.toUpperCase());
                    qr.addData(symbol.data);
                    qr.make();
                    let img = qr.createASCII(2, 0);
                    if (this.upsideDown) {
                        img = img.split('').reverse().join('');
                    }
                    img = img.split('\n');
                    const w = img.length * symbol.cell;
                    const h = w;
                    const l = (w + 7 >> 3) * h + 10;
                    r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                    for (let i = 0; i < img.length; i++) {
                        let d = '';
                        for (let j = 0; j < w; j += 8) {
                            let b = 0;
                            const q = Math.min(w - j, 8);
                            for (let p = 0; p < q; p++) {
                                if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                    b |= 128 >> p;
                                }
                            }
                            d += $(b);
                        }
                        for (let k = 0; k < symbol.cell; k++) {
                            r += d;
                        }
                    }
                    r += '\x1d(L' + $(2, 0, 48, 50);
                }
                return r;
            }
            else {
                const d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary').slice(0, 7089);
                return d.length > 0 ? '\x1d(k' + $(4, 0, 49, 65, 50, 0) + '\x1d(k' + $(3, 0, 49, 67, symbol.cell) + '\x1d(k' + $(3, 0, 49, 69, this.qrlevel[symbol.level]) + '\x1d(k' + $(d.length + 3 & 255, d.length + 3 >> 8 & 255, 49, 80, 48) + d + '\x1d(k' + $(3, 0, 49, 81, 48) : '';
            }
        },
        // QR Code error correction level:
        qrlevel: {
            l: 48, m: 49, q: 50, h: 51
        },
        // print barcode: GS w n GS h n GS H n GS k m n d1 ... dn
        barcode(symbol, encoding) {
            let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
            const b = this.bartype[symbol.type] + Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
            switch (b) {
                case this.bartype.ean:
                    d = d.slice(0, 12);
                    break;
                case this.bartype.upc:
                    d = d.slice(0, 11);
                    break;
                case this.bartype.ean + 1:
                    d = d.slice(0, 7);
                    break;
                case this.bartype.upc + 1:
                    d = this.upce(d);
                    break;
                case this.bartype.code128:
                    d = this.code128(d);
                    break;
                default:
                    break;
            }
            d = d.slice(0, 255);
            return d.length > 0 ? '\x1dw' + $(symbol.width) + '\x1dh' + $(symbol.height) + '\x1dH' + $(symbol.hri ? 2 : 0) + '\x1dk' + $(b, d.length) + d : '';
        },
        // barcode types:
        bartype: {
            upc: 65, ean: 67, jan: 67, code39: 69, itf: 70, codabar: 71, nw7: 71, code93: 72, code128: 73
        },
        // generate UPC-E data (convert UPC-E to UPC-A):
        upce(data) {
            let r = '';
            let s = data.replace(/((?!^0\d{6,7}$).)*/, '');
            if (s.length > 0) {
                r += s.slice(0, 3);
                switch (s[6]) {
                    case '0': case '1': case '2':
                        r += s[6] + '0000' + s[3] + s[4] + s[5];
                        break;
                    case '3':
                        r += s[3] + '00000' + s[4] + s[5];
                        break;
                    case '4':
                        r += s[3] + s[4] + '00000' + s[5];
                        break;
                    default:
                        r += s[3] + s[4] + s[5] + '0000' + s[6];
                        break;
                }
            }
            return r;
        },
        // CODE128 special characters:
        c128: {
            special: 123, codea: 65, codeb: 66, codec: 67, shift: 83
        },
        // generate CODE128 data (minimize symbol width):
        code128(data) {
            let r = '';
            let s = data.replace(/((?!^[\x00-\x7f]+$).)*/, '').replace(/{/g, '{{');
            if (s.length > 0) {
                const d = [];
                const p = s.search(/[^ -_]/);
                if (/^\d{2}$/.test(s)) {
                    d.push(this.c128.special, this.c128.codec, Number(s));
                }
                else if (/^\d{4,}/.test(s)) {
                    this.code128c(this.c128.codec, s, d);
                }
                else if (p >= 0 && s.charCodeAt(p) < 32) {
                    this.code128a(this.c128.codea, s, d);
                }
                else if (s.length > 0) {
                    this.code128b(this.c128.codeb, s, d);
                }
                else {
                    // end
                }
                r = d.reduce((a, c) => a + $(c), '');
            }
            return r;
        },
        // process CODE128 code set A:
        code128a(x, s, d) {
            if (x !== this.c128.shift) {
                d.push(this.c128.special, x);
            }
            s = s.replace(/^((?!\d{4,})[\x00-_])+/, m => (m.split('').forEach(c => d.push(c.charCodeAt(0))), ''));
            s = s.replace(/^\d(?=(\d\d){2,}(\D|$))/, m => (d.push(m.charCodeAt(0)), ''));
            const t = s.slice(1);
            const p = t.search(/[^ -_]/);
            if (/^\d{4,}/.test(s)) {
                this.code128c(this.c128.codec, s, d);
            }
            else if (p >= 0 && t.charCodeAt(p) < 32) {
                d.push(this.c128.special, this.c128.shift, s.charCodeAt(0));
                this.code128a(this.c128.shift, t, d);
            }
            else if (s.length > 0) {
                this.code128b(this.c128.codeb, s, d);
            }
            else {
                // end
            }
        },
        // process CODE128 code set B:
        code128b(x, s, d) {
            if (x !== this.c128.shift) {
                d.push(this.c128.special, x);
            }
            s = s.replace(/^((?!\d{4,})[ -\x7f])+/, m => (m.split('').forEach(c => d.push(c.charCodeAt(0))), ''));
            s = s.replace(/^\d(?=(\d\d){2,}(\D|$))/, m => (d.push(m.charCodeAt(0)), ''));
            const t = s.slice(1);
            const p = t.search(/[^ -_]/);
            if (/^\d{4,}/.test(s)) {
                this.code128c(this.c128.codec, s, d);
            }
            else if (p >= 0 && t.charCodeAt(p) > 95) {
                d.push(this.c128.special, this.c128.shift, s.charCodeAt(0));
                this.code128b(this.c128.shift, t, d);
            }
            else if (s.length > 0) {
                this.code128a(this.c128.codea, s, d);
            }
            else {
                // end
            }
        },
        // process CODE128 code set C:
        code128c(x, s, d) {
            if (x !== this.c128.shift) {
                d.push(this.c128.special, x);
            }
            s = s.replace(/^\d{4,}/g, m => m.replace(/\d{2}/g, c => (d.push(Number(c)), '')));
            const p = s.search(/[^ -_]/);
            if (p >= 0 && s.charCodeAt(p) < 32) {
                this.code128a(this.c128.codea, s, d);
            }
            else if (s.length > 0) {
                this.code128b(this.c128.codeb, s, d);
            }
            else {
                // end
            }
        }
    };

    //
    // SII
    //
    const _sii = {
        // start printing: ESC @ GS a n ESC M n ESC SP n FS S n1 n2 (ESC 2) (ESC 3 n) ESC { n FS .
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.right = 0;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            return '\x1b@\x1da\x00\x1bM0\x1b \x00\x1cS\x00\x00' + (this.spacing ? '\x1b2' : '\x1b3\x00') + '\x1b{' + $(this.upsideDown) + '\x1c.';
        },
        // finish printing: DC2 q n
        close() {
            return (this.cutting ? this.cut() : '') + '\x12q\x00';
        },
        // set print area: GS L nL nH GS W nL nH
        area(left, width, right) {
            this.left = left;
            this.width = width;
            this.right = right;
            const m = (this.upsideDown ? this.marginRight + right : this.margin + left) * this.charWidth;
            const w = width * this.charWidth;
            return '\x1dL' + $(m & 255, m >> 8 & 255) + '\x1dW' + $(w & 255, w >> 8 & 255);
        },
        // image split size
        split: 1662,
        // print image: GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk GS ( L pL pH m fn
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const right = arguments[4] || this.right;
            let r = this.upsideDown ? this.area(right, width, left) + this.align(2 - align) : '';
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const d = Array(w).fill(0);
            let j = this.upsideDown ? img.data.length - 4 : 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                const l = (w + 7 >> 3) * h + 10;
                r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += this.upsideDown ? -4 : 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
                r += '\x1d(L' + $(2, 0, 48, 50);
            }
            return r;
        },
        // print QR Code: DC2 ; n GS p 1 model e v mode nl nh dk
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined') {
                let r = this.upsideDown ? this.area(this.right, this.width, this.left) + this.align(2 - this.alignment) : '';
                if (symbol.data.length > 0) {
                    const qr = qrcode(0, symbol.level.toUpperCase());
                    qr.addData(symbol.data);
                    qr.make();
                    let img = qr.createASCII(2, 0);
                    if (this.upsideDown) {
                        img = img.split('').reverse().join('');
                    }
                    img = img.split('\n');
                    const w = img.length * symbol.cell;
                    const h = w;
                    const l = (w + 7 >> 3) * h + 10;
                    r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                    for (let i = 0; i < img.length; i++) {
                        let d = '';
                        for (let j = 0; j < w; j += 8) {
                            let b = 0;
                            const q = Math.min(w - j, 8);
                            for (let p = 0; p < q; p++) {
                                if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                    b |= 128 >> p;
                                }
                            }
                            d += $(b);
                        }
                        for (let k = 0; k < symbol.cell; k++) {
                            r += d;
                        }
                    }
                    r += '\x1d(L' + $(2, 0, 48, 50);
                }
                return r;
            }
            else {
                const d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary').slice(0, 7089);
                return d.length > 0 ? '\x12;' + $(symbol.cell) + '\x1dp' + $(1, 2, this.qrlevel[symbol.level], 0, 77, d.length & 255, d.length >> 8 & 255) + d : '';
            }
        },
        // QR Code error correction levels:
        qrlevel: {
            l: 76, m: 77, q: 81, h: 72
        },
        // print barcode: GS w n GS h n GS H n GS k m n d1 ... dn
        barcode(symbol, encoding) {
            let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
            const b = this.bartype[symbol.type] + Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
            switch (b) {
                case this.bartype.upc + 1:
                    d = this.upce(d);
                    break;
                case this.bartype.codabar:
                    d = this.codabar(d);
                    break;
                case this.bartype.code93:
                    d = this.code93(d);
                    break;
                case this.bartype.code128:
                    d = this.code128(d);
                    break;
                default:
                    break;
            }
            d = d.slice(0, 255);
            return d.length > 0 ? '\x1dw' + $(symbol.width) + '\x1dh' + $(symbol.height) + '\x1dH' + $(symbol.hri ? 2 : 0) + '\x1dk' + $(b, d.length) + d : '';
        },
        // generate Codabar data:
        codabar(data) {
            return data.toUpperCase();
        },
        // CODE93 special characters:
        c93: {
            escape: 'cU,dA,dB,dC,dD,dE,dF,dG,dH,dI,dJ,dK,dL,dM,dN,dO,dP,dQ,dR,dS,dT,dU,dV,dW,dX,dY,dZ,cA,cB,cC,cD,cE, ,sA,sB,sC,$,%,sF,sG,sH,sI,sJ,+,sL,-,.,/,0,1,2,3,4,5,6,7,8,9,sZ,cF,cG,cH,cI,cJ,cV,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,cK,cL,cM,cN,cO,cW,pA,pB,pC,pD,pE,pF,pG,pH,pI,pJ,pK,pL,pM,pN,pO,pP,pQ,pR,pS,pT,pU,pV,pW,pX,pY,pZ,cP,cQ,cR,cS,cT'.split(','),
            code: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%dcsp'.split('').reduce((a, c, i) => (a[c] = i, a), {}),
            start: 47, stop: 48
        },
        // generate CODE93 data:
        code93(data) {
            let r = '';
            let s = data.replace(/((?!^[\x00-\x7f]+$).)*/, '');
            if (s.length > 0) {
                const d = s.split('').reduce((a, c) => a + this.c93.escape[c.charCodeAt(0)], '').split('').map(c => this.c93.code[c]);
                d.push(this.c93.stop);
                r = d.reduce((a, c) => a + $(c), '');
            }
            return r;
        },
        // CODE128 special characters:
        c128: {
            starta: 103, startb: 104, startc: 105, atob: 100, atoc: 99, btoa: 101, btoc: 99, ctoa: 101, ctob: 100, shift: 98, stop: 105
        },
        // generate CODE128 data (minimize symbol width):
        code128(data) {
            let r = '';
            let s = data.replace(/((?!^[\x00-\x7f]+$).)*/, '');
            if (s.length > 0) {
                const d = [];
                const p = s.search(/[^ -_]/);
                if (/^\d{2}$/.test(s)) {
                    d.push(this.c128.startc, Number(s));
                }
                else if (/^\d{4,}/.test(s)) {
                    this.code128c(this.c128.startc, s, d);
                }
                else if (p >= 0 && s.charCodeAt(p) < 32) {
                    this.code128a(this.c128.starta, s, d);
                }
                else if (s.length > 0) {
                    this.code128b(this.c128.startb, s, d);
                }
                else {
                    // end
                }
                d.push(this.c128.stop);
                r = d.reduce((a, c) => a + $(c), '');
            }
            return r;
        },
        // process CODE128 code set A:
        code128a(x, s, d) {
            if (x !== this.c128.shift) {
                d.push(x);
            }
            s = s.replace(/^((?!\d{4,})[\x00-_])+/, m => (m.split('').forEach(c => d.push((c.charCodeAt(0) + 64) % 96)), ''));
            s = s.replace(/^\d(?=(\d\d){2,}(\D|$))/, m => (d.push((m.charCodeAt(0) + 64) % 96), ''));
            const t = s.slice(1);
            const p = t.search(/[^ -_]/);
            if (/^\d{4,}/.test(s)) {
                this.code128c(this.c128.atoc, s, d);
            }
            else if (p >= 0 && t.charCodeAt(p) < 32) {
                d.push(this.c128.shift, s.charCodeAt(0) - 32);
                this.code128a(this.c128.shift, t, d);
            }
            else if (s.length > 0) {
                this.code128b(this.c128.atob, s, d);
            }
            else {
                // end
            }
        },
        // process CODE128 code set B:
        code128b(x, s, d) {
            if (x !== this.c128.shift) {
                d.push(x);
            }
            s = s.replace(/^((?!\d{4,})[ -\x7f])+/, m => (m.split('').forEach(c => d.push(c.charCodeAt(0) - 32)), ''));
            s = s.replace(/^\d(?=(\d\d){2,}(\D|$))/, m => (d.push(m.charCodeAt(0) - 32), ''));
            const t = s.slice(1);
            const p = t.search(/[^ -_]/);
            if (/^\d{4,}/.test(s)) {
                this.code128c(this.c128.btoc, s, d);
            }
            else if (p >= 0 && t.charCodeAt(p) > 95) {
                d.push(this.c128.shift, s.charCodeAt(0) + 64);
                this.code128b(this.c128.shift, t, d);
            }
            else if (s.length > 0) {
                this.code128a(this.c128.btoa, s, d);
            }
            else {
                // end
            }
        },
        // process CODE128 code set c:
        code128c(x, s, d) {
            if (x !== this.c128.shift) {
                d.push(x);
            }
            s = s.replace(/^\d{4,}/g, m => m.replace(/\d{2}/g, c => (d.push(Number(c)), '')));
            const p = s.search(/[^ -_]/);
            if (p >= 0 && s.charCodeAt(p) < 32) {
                this.code128a(this.c128.ctoa, s, d);
            }
            else if (s.length > 0) {
                this.code128b(this.c128.ctob, s, d);
            }
            else {
                // end
            }
        }
    };

    //
    // Citizen
    //
    const _citizen = {
        // image split size
        split: 1662,
        // print barcode: GS w n GS h n GS H n GS k m n d1 ... dn
        barcode(symbol, encoding) {
            let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
            const b = this.bartype[symbol.type] + Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
            switch (b) {
                case this.bartype.ean:
                    d = d.slice(0, 12);
                    break;
                case this.bartype.upc:
                    d = d.slice(0, 11);
                    break;
                case this.bartype.ean + 1:
                    d = d.slice(0, 7);
                    break;
                case this.bartype.upc + 1:
                    d = this.upce(d);
                    break;
                case this.bartype.codabar:
                    d = this.codabar(d);
                    break;
                case this.bartype.code128:
                    d = this.code128(d);
                    break;
                default:
                    break;
            }
            d = d.slice(0, 255);
            return d.length > 0 ? '\x1dw' + $(symbol.width) + '\x1dh' + $(symbol.height) + '\x1dH' + $(symbol.hri ? 2 : 0) + '\x1dk' + $(b, d.length) + d : '';
        },
        // generate Codabar data:
        codabar(data) {
            return data.toUpperCase();
        }
    };

    //
    // Fujitsu Isotec
    //
    const _fit = {
        // image split size
        split: 1662,
        // print image: GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk GS ( L pL pH m fn
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const right = arguments[4] || this.right;
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const d = Array(w).fill(0);
            const s = [];
            let j = 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                const l = (w + 7 >> 3) * h + 10;
                let r = '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
                r += '\x1d(L' + $(2, 0, 48, 50);
                s.push(r);
            }
            if (this.upsideDown) {
                s.reverse();
            }
            return (this.upsideDown && align === 2 ? this.area(right, width, left) : '') + s.join('');
        },
        // print QR Code: GS ( k pL pH cn fn n1 n2 GS ( k pL pH cn fn n GS ( k pL pH cn fn n GS ( k pL pH cn fn m d1 ... dk GS ( k pL pH cn fn m
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined') {
                let r = this.upsideDown && this.alignment === 2 ? this.area(this.right, this.width, this.left) : '';
                if (symbol.data.length > 0) {
                    const qr = qrcode(0, symbol.level.toUpperCase());
                    qr.addData(symbol.data);
                    qr.make();
                    const img = qr.createASCII(2, 0).split('\n');
                    const w = img.length * symbol.cell;
                    const h = w;
                    const l = (w + 7 >> 3) * h + 10;
                    r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                    for (let i = 0; i < img.length; i++) {
                        let d = '';
                        for (let j = 0; j < w; j += 8) {
                            let b = 0;
                            const q = Math.min(w - j, 8);
                            for (let p = 0; p < q; p++) {
                                if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                    b |= 128 >> p;
                                }
                            }
                            d += $(b);
                        }
                        for (let k = 0; k < symbol.cell; k++) {
                            r += d;
                        }
                    }
                    r += '\x1d(L' + $(2, 0, 48, 50);
                }
                return r;
            }
            else {
                const d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary').slice(0, 7089);
                return d.length > 0 ? '\x1d(k' + $(4, 0, 49, 65, 50, 0) + '\x1d(k' + $(3, 0, 49, 67, symbol.cell) + '\x1d(k' + $(3, 0, 49, 69, this.qrlevel[symbol.level]) + '\x1d(k' + $(d.length + 3 & 255, d.length + 3 >> 8 & 255, 49, 80, 48) + d + '\x1d(k' + $(3, 0, 49, 81, 48) : '';
            }
        }
    };

    //
    // ESC/POS Impact
    //
    const _impact = {
        font: 0,
        style: 0,
        color: 0,
        left: 0,
        right: 0,
        position: 0,
        margin: 0,
        marginRight: 0,
        red: [],
        black: [],
        // start printing: ESC @ GS a n ESC M n (ESC 2) (ESC 3 n) ESC { n
        open(printer) {
            this.style = this.font;
            this.color = 0;
            this.left = 0;
            this.right = 0;
            this.position = 0;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            this.red = [];
            this.black = [];
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            return '\x1b@\x1da\x00\x1bM' + $(this.font) + (this.spacing ? '\x1b2' : '\x1b3\x12') + '\x1b{' + $(this.upsideDown) + '\x1c.';
        },
        // finish printing: GS r n
        close() {
            return (this.cutting ? this.cut() : '') + '\x1dr1';
        },
        // set print area:
        area(left, width, right) {
            this.left = this.margin + left;
            this.right = right + this.marginRight;
            return '';
        },
        // set line alignment: ESC a n
        align(align) {
            return '\x1ba' + $(align);
        },
        // set absolute print position:
        absolute(position) {
            this.position = position;
            return '';
        },
        // set relative print position:
        relative(position) {
            this.position += Math.round(position);
            return '';
        },
        // print horizontal rule: ESC t n ...
        hr(width) {
            return '\x1b!' + $(this.font) + ' '.repeat(this.left) + '\x1bt\x01' + '\x95'.repeat(width);
        },
        // print vertical rules: ESC ! n ESC t n ...
        vr(widths, height) {
            const d = '\x1b!' + $(this.font + (height > 1 ? 16 : 0)) + '\x1bt\x01\x96';
            this.black.push({ data: d, index: this.position, length: 1 });
            widths.forEach(w => {
                this.position += w + 1;
                this.black.push({ data: d, index: this.position, length: 1 });
            });
            return '';
        },
        // start rules: ESC ! n ESC t n ...
        vrstart(widths) {
            return '\x1b!' + $(this.font) + ' '.repeat(this.left) + '\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d';
        },
        // stop rules: ESC ! n ESC t n ...
        vrstop(widths) {
            return '\x1b!' + $(this.font) + ' '.repeat(this.left) + '\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f';
        },
        // print vertical and horizontal rules: ESC ! n ESC t n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0));
            return '\x1b!' + $(this.font) + ' '.repeat(this.left) + '\x1bt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
        },
        // set line spacing and feed new line: (ESC 2) (ESC 3 n)
        vrlf(vr) {
            return (vr === this.upsideDown && this.spacing ? '\x1b2' : '\x1b3\x12') + this.lf();
        },
        // cut paper: GS V m n
        cut() {
            return '\x1dVB\x00';
        },
        // underline text:
        ul() {
            this.style += 128;
            return '';
        },
        // emphasize text:
        em() {
            this.style += 8;
            return '';
        },
        // invert text:
        iv() {
            this.color = 1;
            return '';
        },
        // scale up text:
        wh(wh) {
            if (wh > 0) {
                this.style += wh < 3 ? 64 >> wh : 48;
            }
            return '';
        },
        // cancel text decoration:
        normal() {
            this.style = this.font;
            this.color = 0;
            return '';
        },
        // print text:
        text(text, encoding) {
            const t = iconv.encode(text, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
            const d = '\x1b!' + $(this.style) + (encoding === 'multilingual' ? this.multiconv(text) : this.codepage[encoding] + iconv.encode(text, encoding).toString('binary'));
            const l = t.length * (this.style & 32 ? 2 : 1);
            if (this.color > 0) {
                this.red.push({ data: d, index: this.position, length: l });
            }
            else {
                this.black.push({ data: d, index: this.position, length: l });
            }
            this.position += l;
            return '';
        },
        // feed new line: LF
        lf() {
            let r = '';
            if (this.red.length > 0) {
                let p = 0;
                r += this.red.sort((a, b) => a.index - b.index).reduce((a, c) => {
                    const s = a + '\x1b!' + $(this.font) + ' '.repeat(c.index - p) + c.data;
                    p = c.index + c.length;
                    return s;
                }, '\x1br\x01\x1b!' + $(this.font) + ' '.repeat(this.left)) + '\x0d\x1br\x00';
            }
            if (this.black.length > 0) {
                let p = 0;
                r += this.black.sort((a, b) => a.index - b.index).reduce((a, c) => {
                    const s = a + '\x1b!' + $(this.font) + ' '.repeat(c.index - p) + c.data;
                    p = c.index + c.length;
                    return s;
                }, '\x1b!' + $(this.font) + ' '.repeat(this.left));
            }
            r += '\x0a';
            this.position = 0;
            this.red = [];
            this.black = [];
            return r;
        },
        // insert commands:
        command(command) {
            return command;
        },
        // print image: ESC * 0 wL wH d1 ... dk ESC J n
        async image(image) {
            let r = '';
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            if (w < 1024) {
                const d = Array(w).fill(0);
                let j = this.upsideDown ? img.data.length - 4 : 0;
                for (let y = 0; y < img.height; y += 8) {
                    const b = Array(w).fill(0);
                    const h = Math.min(8, img.height - y);
                    for (let p = 0; p < h; p++) {
                        let i = 0, e = 0;
                        for (let x = 0; x < w; x++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += this.upsideDown ? -4 : 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (this.upsideDown ? b[w - x - 1] |= 1 << p : b[x] |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    this.upsideDown ? b[w - x - 1] |= 1 << p : b[x] |= 128 >> p;
                                }
                            }
                        }
                    }
                    r += ' '.repeat(this.left) + '\x1b*\x00' + $(w & 255, w >> 8 & 255) + b.reduce((a, c) => a + $(c), '') + ' '.repeat(this.right) + '\x1bJ' + $(h * 2);
                }
            }
            return r;
        }
    };

    //
    // ESC/POS Impact Font B
    //
    const _fontb = {
        font: 1
    };

    //
    // StarPRNT Common
    //
    const _star = {
        // printer configuration
        upsideDown: false,
        spacing: false,
        cutting: true,
        gradient: true,
        gamma: 1.8,
        threshold: 128,
        margin: 0,
        // start printing: ESC @ ESC RS a n (ESC RS R n) ESC RS F n ESC SP n ESC s n1 n2 (ESC z n) (ESC 0) (SI) (DC2)
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.margin = printer.margin;
            return '\x1b@\x1b\x1ea\x00' + (printer.encoding === 'tis620' ? '\x1b\x1eR\x01': '') + '\x1b\x1eF\x00\x1b 0\x1bs00' + (this.spacing ? '\x1bz1' : '\x1b0') + (this.upsideDown ? '\x0f' : '\x12');
        },
        // finish printing: ESC GS ETX s n1 n2
        close() {
            return (this.cutting ? this.cut() : '') + '\x1b\x1d\x03\x01\x00\x00';
        },
        // set print area: ESC l n ESC Q n
        area(left, width, right) {
            return '\x1bl' + $(0) + '\x1bQ' + $(this.margin + left + width + right) + '\x1bl' + $(this.margin + left) + '\x1bQ' + $(this.margin + left + width);
        },
        // set line alignment: ESC GS a n
        align(align) {
            return '\x1b\x1da' + $(align);
        },
        // set absolute print position: ESC GS A n1 n2
        absolute(position) {
            const p = position * this.charWidth;
            return '\x1b\x1dA' + $(p & 255, p >> 8 & 255);
        },
        // set relative print position: ESC GS R n1 n2
        relative(position) {
            const p = position * this.charWidth;
            return '\x1b\x1dR' + $(p & 255, p >> 8 & 255);
        },
        // set line spacing and feed new line: (ESC z n) (ESC 0)
        vrlf(vr) {
            return (this.upsideDown ? this.lf() : '') + (vr === this.upsideDown && this.spacing ? '\x1bz1' : '\x1b0') + (this.upsideDown ? '' : this.lf());
        },
        // cut paper: ESC d n
        cut() {
            return '\x1bd3';
        },
        // underline text: ESC - n
        ul() {
            return '\x1b-1';
        },
        // emphasize text: ESC E
        em() {
            return '\x1bE';
        },
        // invert text: ESC 4
        iv() {
            return '\x1b4';
        },
        // scale up text: ESC i n1 n2
        wh(wh) {
            return '\x1bi' + (wh < 3 ? $(wh >> 1 & 1, wh & 1) : $(wh - 2, wh - 2));
        },
        // cancel text decoration: ESC - n ESC F ESC 5 ESC i n1 n2
        normal() {
            return '\x1b-0\x1bF\x1b5\x1bi' + $(0, 0);
        },
        // print text:
        text(text, encoding) {
            return encoding === 'multilingual' ? this.multiconv(text) : this.codepage[encoding] + iconv.encode(text, encoding).toString('binary');
        },
        // codepages: (ESC GS t n) (ESC $ n) (ESC R n)
        codepage: {
            cp437: '\x1b\x1dt\x01', cp852: '\x1b\x1dt\x05', cp858: '\x1b\x1dt\x04', cp860: '\x1b\x1dt\x06',
            cp863: '\x1b\x1dt\x08', cp865: '\x1b\x1dt\x09', cp866: '\x1b\x1dt\x0a', cp1252: '\x1b\x1dt\x20',
            cp932: '\x1b$1\x1bR8', cp936: '', cp949: '\x1bRD', cp950: '',
            shiftjis: '\x1b$1\x1bR8', gb18030: '', ksc5601: '\x1bRD', big5: '', tis620: '\x1b\x1dt\x61'
        },
        // convert to multiple codepage characters: (ESC GS t n)
        multiconv(text) {
            let p = '', r = '';
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (c > '\x7f') {
                    const d = multitable[c];
                    if (d) {
                        const q = d[0];
                        if (p === q) {
                            r += d[1];
                        }
                        else {
                            r += '\x1b\x1dt' + starpage[q] + d[1];
                            p = q;
                        }
                    }
                    else {
                        r += '?';
                    }
                }
                else {
                    r += c;
                }
            }
            return r;
        },
        // feed new line: LF
        lf() {
            return '\x0a';
        },
        // insert commands:
        command(command) {
            return command;
        },
        // image split size
        split: 2400,
        // print image: ESC GS S m xL xH yL yH n [d11 d12 ... d1k]
        async image(image) {
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const d = Array(w).fill(0);
            const l = w + 7 >> 3;
            const s = [];
            let j = 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                let r = '\x1b\x1dS' + $(1, l & 255, l >> 8 & 255, h & 255, h >> 8 & 255, 0);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
                s.push(r);
            }
            if (this.upsideDown) {
                s.reverse();
            }
            return s.join('');
        },
        // print QR Code: ESC GS y S 0 n ESC GS y S 1 n ESC GS y S 2 n ESC GS y D 1 m nL nH d1 d2 ... dk ESC GS y P
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined') {
                let r = '';
                if (symbol.data.length > 0) {
                    const qr = qrcode(0, symbol.level.toUpperCase());
                    qr.addData(symbol.data);
                    qr.make();
                    const img = qr.createASCII(2, 0).split('\n');
                    const w = img.length * symbol.cell;
                    const h = w;
                    const l = w + 7 >> 3;
                    r += '\x1b\x1dS' + $(1, l & 255, l >> 8 & 255, h & 255, h >> 8 & 255, 0);
                    for (let i = 0; i < img.length; i++) {
                        let d = '';
                        for (let j = 0; j < w; j += 8) {
                            let b = 0;
                            const q = Math.min(w - j, 8);
                            for (let p = 0; p < q; p++) {
                                if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                    b |= 128 >> p;
                                }
                            }
                            d += $(b);
                        }
                        for (let k = 0; k < symbol.cell; k++) {
                            r += d;
                        }
                    }
                }
                return r;
            }
            else {
                const d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary').slice(0, 7089);
                return d.length > 0 ? '\x1b\x1dyS0' + $(2) + '\x1b\x1dyS1' + $(this.qrlevel[symbol.level]) + '\x1b\x1dyS2' + $(symbol.cell) + '\x1b\x1dyD1' + $(0, d.length & 255, d.length >> 8 & 255) + d + '\x1b\x1dyP' : '';
            }
        },
        // QR Code error correction levels:
        qrlevel: {
            l: 0, m: 1, q: 2, h: 3
        },
        // print barcode: ESC b n1 n2 n3 n4 d1 ... dk RS
        barcode(symbol, encoding) {
            let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
            const b = this.bartype[symbol.type] - Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
            switch (b) {
                case this.bartype.upc - 1:
                    d = this.upce(d);
                    break;
                case this.bartype.code128:
                    d = this.code128(d);
                    break;
                default:
                    break;
            }
            const u = symbol.type === 'itf' ? [ 49, 56, 50 ][symbol.width - 2] : symbol.width + (/^(code39|codabar|nw7)$/.test(symbol.type) ? 50 : 47);
            return d.length > 0 ? '\x1bb' + $(b, symbol.hri ? 50 : 49, u, symbol.height) + d + '\x1e' : '';
        },
        // barcode types:
        bartype: {
            upc: 49, ean: 51, jan: 51, code39: 52, itf: 53, codabar: 56, nw7: 56, code93: 55, code128: 54
        },
        // generate UPC-E data (convert UPC-E to UPC-A):
        upce(data) {
            let r = '';
            let s = data.replace(/((?!^0\d{6,7}$).)*/, '');
            if (s.length > 0) {
                r += s.slice(0, 3);
                switch (s[6]) {
                    case '0': case '1': case '2':
                        r += s[6] + '0000' + s[3] + s[4] + s[5];
                        break;
                    case '3':
                        r += s[3] + '00000' + s[4] + s[5];
                        break;
                    case '4':
                        r += s[3] + s[4] + '00000' + s[5];
                        break;
                    default:
                        r += s[3] + s[4] + s[5] + '0000' + s[6];
                        break;
                }
            }
            return r;
        },
        // generate CODE128 data:
        code128(data) {
            return data.replace(/((?!^[\x00-\x7f]+$).)*/, '').replace(/%/g, '%0').replace(/[\x00-\x1f]/g, m => '%' + $(m.charCodeAt(0) + 64)).replace(/\x7f/g, '%5');
        }
    };

    //
    // Star Line Mode
    //
    const _line = {
        // finish printing: ESC GS ETX s n1 n2 EOT
        close() {
            return (this.cutting ? this.cut() : '') + '\x1b\x1d\x03\x01\x00\x00\x04';
        },
        // print image: ESC k n1 n2 d1 ... dk
        async image(image) {
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const h = img.height;
            const d = Array(w).fill(0);
            const l = w + 7 >> 3;
            const s = [];
            let j = 0;
            for (let y = 0; y < h; y += 24) {
                let r = '\x1bk' + $(l & 255, l >> 8 & 255);
                for (let z = 0; z < 24; z++) {
                    if (y + z < h) {
                        let i = 0, e = 0;
                        for (let x = 0; x < w; x += 8) {
                            let b = 0;
                            const q = Math.min(w - x, 8);
                            for (let p = 0; p < q; p++) {
                                const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                                j += 4;
                                if (this.gradient) {
                                    d[i] = e * 3;
                                    e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                    if (i > 0) {
                                        d[i - 1] += e;
                                    }
                                    d[i++] += e * 7;
                                }
                                else {
                                    if (f < this.threshold) {
                                        b |= 128 >> p;
                                    }
                                }
                            }
                            r += $(b);
                        }
                    }
                    else {
                        r += '\x00'.repeat(l);
                    }
                }
                s.push(r + '\x0a');
            }
            if (this.upsideDown) {
                s.reverse();
            }
            return '\x1b0' + s.join('') + (this.spacing ? '\x1bz1' : '\x1b0');
        },
        // print QR Code: ESC GS y S 0 n ESC GS y S 1 n ESC GS y S 2 n ESC GS y D 1 m nL nH d1 d2 ... dk ESC GS y P
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined') {
                let r = '';
                if (symbol.data.length > 0) {
                    const qr = qrcode(0, symbol.level.toUpperCase());
                    qr.addData(symbol.data);
                    qr.make();
                    const img = qr.createASCII(2, 0).split('\n');
                    const w = img.length * symbol.cell;
                    const l = w + 7 >> 3;
                    const s = [];
                    for (let i = 0; i < img.length; i++) {
                        let d = '';
                        for (let j = 0; j < w; j += 8) {
                            let b = 0;
                            const q = Math.min(w - j, 8);
                            for (let p = 0; p < q; p++) {
                                if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                    b |= 128 >> p;
                                }
                            }
                            d += $(b);
                        }
                        for (let k = 0; k < symbol.cell; k++) {
                            s.push(d);
                        }
                    }
                    while (s.length % 24) {
                        const d = '\x00'.repeat(l);
                        s.push(d);
                    }
                    if (this.upsideDown) {
                        s.reverse();
                    }
                    r += '\x1b0';
                    for (let k = 0; k < s.length; k += 24) {
                        const a = s.slice(k, k + 24);
                        if (this.upsideDown) {
                            a.reverse();
                        }
                        r += '\x1bk' + $(l & 255, l >> 8 & 255) + a.join('') + '\x0a';
                    }
                    r += (this.spacing ? '\x1bz1' : '\x1b0');
                }
                return r;
            }
            else {
                const d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary').slice(0, 7089);
                return '\x1b\x1dyS0' + $(2) + '\x1b\x1dyS1' + $(this.qrlevel[symbol.level]) + '\x1b\x1dyS2' + $(symbol.cell) + '\x1b\x1dyD1' + $(0, d.length & 255, d.length >> 8 & 255) + d + '\x1b\x1dyP';
            }
        }
    };

    //
    // Star Mode on dot impact printers
    //
    const _dot = {
        font: 0,
        // start printing: ESC @ ESC RS a n (ESC M) (ESC P) (ESC :) ESC SP n ESC s n1 n2 (ESC z n) (ESC 0) (SI) (DC2)
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.margin = printer.margin;
            return '\x1b@\x1b\x1ea\x00\x1b' + [ 'M', 'P', ':' ][this.font] + '\x1b \x00\x1bs\x00\x00' + (this.spacing ? '\x1bz\x01' : '\x1b0') + (this.upsideDown ? '\x0f' : '\x12');
        },
        // finish printing: ESC GS ETX s n1 n2 EOT
        close() {
            return (this.cutting ? this.cut() : '') + '\x1b\x1d\x03\x01\x00\x00\x04';
        },
        // scale up text: ESC W n ESC h n
        wh(wh) {
            return '\x1bW' + $(wh < 3 ? wh & 1 : 1) + '\x1bh' + $(wh < 3 ? wh >> 1 & 1 : 1);
        },
        // cancel text decoration: ESC - n ESC F ESC 5 ESC W n ESC h n
        normal() {
            return '\x1b-\x00\x1bF\x1b5\x1bW' + $(0) + '\x1bh' + $(0);
        },
        // print image: ESC 0 ESC K n NUL d1 ... dn LF (ESC z n) (ESC 0)
        async image(image) {
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = Math.min(img.width, 255);
            const d = Array(w).fill(0);
            const s = [];
            for (let y = 0; y < img.height; y += 8) {
                const b = Array(w).fill(0);
                const h = Math.min(8, img.height - y);
                for (let p = 0; p < h; p++) {
                    let i = 0, e = 0;
                    let j = (y + p) * img.width * 4;
                    for (let x = 0; x < w; x++) {
                        const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                        j += 4;
                        if (this.gradient) {
                            d[i] = e * 3;
                            e = f < this.threshold ? (b[x] |= 128 >> p, f) : f - 255;
                            if (i > 0) {
                                d[i - 1] += e;
                            }
                            d[i++] += e * 7;
                        }
                        else {
                            if (f < this.threshold) {
                                b[x] |= 128 >> p;
                            }
                        }
                    }
                }
                s.push('\x1bK' + $(w) + '\x00' + b.reduce((a, c) => a + $(c), '') + '\x0a');
            }
            if (this.upsideDown) {
                s.reverse();
            }
            return '\x1b0' + s.join('') + (this.spacing ? '\x1bz\x01' : '\x1b0');
        },
        // print QR Code:
        qrcode(symbol, encoding) {
            return '';
        },
        // print barcode:
        barcode(symbol, encoding) {
            return '';
        }
    };

    //
    // Star Mode on dot impact printers (Font 5x9 2P-1)
    //
    const _font2 = {
        font: 1,
    };

    //
    // Star Mode on dot impact printers (Font 5x9 3P-1)
    //
    const _font3 = {
        font: 2,
    };

    //
    // Command Emulator Star Line Mode
    //
    const _emu = {
        // set line spacing and feed new line: (ESC z n) (ESC 0)
        vrlf(vr) {
            return (vr === this.upsideDown && this.spacing ? '\x1bz1' : '\x1b0') + this.lf();
        }
    };

    //
    // Star SBCS
    //
    const _sbcs = {
        // print horizontal rule: ESC GS t n ...
        hr(width) {
            return '\x1b\x1dt\x01' + '\xc4'.repeat(width);
        },
        // print vertical rules: ESC i n1 n2 ESC GS t n ...
        vr(widths, height) {
            return widths.reduce((a, w) => a + this.relative(w) + '\xb3', '\x1bi' + $(height - 1, 0) + '\x1b\x1dt\x01\xb3');
        },
        // start rules: ESC GS t n ...
        vrstart(widths) {
            return '\x1b\x1dt\x01' + widths.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc2', '\xda').slice(0, -1) + '\xbf';
        },
        // stop rules: ESC GS t n ...
        vrstop(widths) {
            return '\x1b\x1dt\x01' + widths.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc1', '\xc0').slice(0, -1) + '\xd9';
        },
        // print vertical and horizontal rules: ESC GS t n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc1', '\xc0').slice(0, -1) + '\xd9' + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc2', '\xda').slice(0, -1) + '\xbf' + ' '.repeat(Math.max(-dr, 0));
            return '\x1b\x1dt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
        },
        // ruled line composition
        vrtable: {
            ' '    : { ' ' : ' ',    '\xc0' : '\xc0', '\xc1' : '\xc1', '\xc4' : '\xc4', '\xd9' : '\xd9' },
            '\xbf' : { ' ' : '\xbf', '\xc0' : '\xc5', '\xc1' : '\xc5', '\xc4' : '\xc2', '\xd9' : '\xb4' },
            '\xc2' : { ' ' : '\xc2', '\xc0' : '\xc5', '\xc1' : '\xc5', '\xc4' : '\xc2', '\xd9' : '\xc5' },
            '\xc4' : { ' ' : '\xc4', '\xc0' : '\xc1', '\xc1' : '\xc1', '\xc4' : '\xc4', '\xd9' : '\xc1' },
            '\xda' : { ' ' : '\xda', '\xc0' : '\xc3', '\xc1' : '\xc5', '\xc4' : '\xc2', '\xd9' : '\xc5' }
        }
    };

    //
    // Star MBCS Japanese
    //
    const _mbcs = {
        // print horizontal rule: ESC $ n ...
        hr(width) {
            return '\x1b$0' + '\x95'.repeat(width);
        },
        // print vertical rules: ESC i n1 n2 ESC $ n ...
        vr(widths, height) {
            return widths.reduce((a, w) => a + this.relative(w) + '\x96', '\x1bi' + $(height - 1, 0) + '\x1b$0\x96');
        },
        // start rules: ESC $ n ...
        vrstart(widths) {
            return '\x1b$0' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d';
        },
        // stop rules: ESC $ n ...
        vrstop(widths) {
            return '\x1b$0' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f';
        },
        // print vertical and horizontal rules: ESC $ n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0));
            return '\x1b$0' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
        },
        // ruled line composition
        vrtable: {
            ' '    : { ' ' : ' ',    '\x90' : '\x90', '\x95' : '\x95', '\x9a' : '\x9a', '\x9b' : '\x9b', '\x9e' : '\x9e', '\x9f' : '\x9f' },
            '\x91' : { ' ' : '\x91', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x8f', '\x9b' : '\x8f', '\x9e' : '\x8f', '\x9f' : '\x8f' },
            '\x95' : { ' ' : '\x95', '\x90' : '\x90', '\x95' : '\x95', '\x9a' : '\x90', '\x9b' : '\x90', '\x9e' : '\x90', '\x9f' : '\x90' },
            '\x98' : { ' ' : '\x98', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x93', '\x9b' : '\x8f', '\x9e' : '\x93', '\x9f' : '\x8f' },
            '\x99' : { ' ' : '\x99', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x8f', '\x9b' : '\x92', '\x9e' : '\x8f', '\x9f' : '\x92' },
            '\x9c' : { ' ' : '\x9c', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x93', '\x9b' : '\x8f', '\x9e' : '\x93', '\x9f' : '\x8f' },
            '\x9d' : { ' ' : '\x9d', '\x90' : '\x8f', '\x95' : '\x91', '\x9a' : '\x8f', '\x9b' : '\x92', '\x9e' : '\x8f', '\x9f' : '\x92' }
        }
    };

    //
    // Star MBCS Chinese Korean
    //
    const _mbcs2 = {
        // print horizontal rule: - ...
        hr(width) {
            return '-'.repeat(width);
        },
        // print vertical rules: ESC i n1 n2 | ...
        vr(widths, height) {
            return widths.reduce((a, w) => a + this.relative(w) + '|', '\x1bi' + $(height - 1, 0) + '|');
        },
        // start rules: + - ...
        vrstart(widths) {
            return widths.reduce((a, w) => a + '-'.repeat(w) + '+', '+');
        },
        // stop rules: + - ...
        vrstop(widths) {
            return widths.reduce((a, w) => a + '-'.repeat(w) + '+', '+');
        },
        // print vertical and horizontal rules: + - ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '-'.repeat(w) + '+', '+') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '-'.repeat(w) + '+', '+') + ' '.repeat(Math.max(-dr, 0));
            return r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
        },
        // ruled line composition
        vrtable: {
            ' ' : { ' ' : ' ', '+' : '+', '-' : '-' },
            '+' : { ' ' : '+', '+' : '+', '-' : '+' },
            '-' : { ' ' : '-', '+' : '+', '-' : '-' }
        }
    };

    //
    // Star Graphic Mode
    //
    const _stargraphic = {
        // printer configuration
        upsideDown: false,
        spacing: false,
        cutting: true,
        gradient: true,
        gamma: 1.8,
        threshold: 128,
        alignment: 0,
        left: 0,
        width: 48,
        right: 0,
        margin: 0,
        // start printing: ESC RS a n ESC * r A ESC * r P n NUL (ESC * r E n NUL)
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.right = 0;
            this.margin = (printer.upsideDown ? printer.marginRight : printer.margin) * this.charWidth;
            return '\x1b\x1ea\x00\x1b*rA\x1b*rP0\x00' + (this.cutting ? '' : '\x1b*rE1\x00');
        },
        // finish printing: ESC * r B ESC ACK SOH
        close() {
            return '\x1b*rB\x1b\x06\x01';
        },
        // set print area:
        area(left, width, right) {
            this.left = left;
            this.width = width;
            this.right = right;
            return '';
        },
        // set line alignment:
        align(align) {
            this.alignment = align;
            return '';
        },
        // cut paper: ESC FF NUL
        cut() {
            return '\x1b\x0c\x00';
        },
        // feed new line: ESC * r Y n NUL
        lf() {
            return '\x1b*rY' + this.charWidth * (this.spacing ? 2.5 : 2) + '\x00';
        },
        // insert commands:
        command(command) {
            return command;
        },
        // print image: b n1 n2 data
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const right = arguments[4] || this.right;
            let r = '';
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const d = Array(w).fill(0);
            const m = this.margin + Math.max((this.upsideDown ? right : left) * this.charWidth + (width * this.charWidth - w) * (this.upsideDown ? 2 - align : align) >> 1, 0);
            const l = m + w + 7 >> 3;
            let j = this.upsideDown ? img.data.length - 4 : 0;
            for (let y = 0; y < img.height; y++) {
                let i = 0, e = 0;
                r += 'b' + $(l & 255, l >> 8 & 255);
                for (let x = 0; x < m + w; x += 8) {
                    let b = 0;
                    const q = Math.min(m + w - x, 8);
                    for (let p = 0; p < q; p++) {
                        if (m <= x + p) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += this.upsideDown ? -4 : 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                    }
                    r += $(b);
                }
            }
            return r;
        }
    };

    //
    // ESC/POS Generic
    //
    const _generic = {
        // start printing: ESC @ GS a n ESC M n ESC SP n FS S n1 n2 (ESC 2) (ESC 3 n) ESC { n FS .
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.right = 0;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            return '\x1b@\x1da\x00\x1bM\x00\x1b \x00\x1cS\x00\x00' + (this.spacing ? '\x1b2' : '\x1b3\x00') + '\x1b{' + $(this.upsideDown) + '\x1c.';
        },
        // finish printing: GS r n
        close() {
            return (this.cutting ? this.cut() : '') + '\x1dr\x01';
        },
        // print horizontal rule: FS C n FS . ESC t n ...
        hr(width) {
            return '\x1cC\x00\x1c.\x1bt\x01' + '\x95'.repeat(width);
        },
        // print vertical rules: GS ! n FS C n FS . ESC t n ...
        vr(widths, height) {
            return widths.reduce((a, w) => a + this.relative(w) + '\x96', '\x1d!' + $(height - 1) + '\x1cC\x00\x1c.\x1bt\x01\x96');
        },
        // start rules: FS C n FS . ESC t n ...
        vrstart(widths) {
            return '\x1cC\x00\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d';
        },
        // stop rules: FS C n FS . ESC t n ...
        vrstop(widths) {
            return '\x1cC\x00\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f';
        },
        // print vertical and horizontal rules: FS C n FS . ESC t n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0));
            return '\x1cC\x00\x1c.\x1bt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
        },
        // underline text: ESC - n FS - n
        ul() {
            return '\x1b-\x02\x1c-\x02';
        },
        // emphasize text: ESC E n
        em() {
            return '\x1bE\x01';
        },
        // invert text: GS B n
        iv() {
            return '\x1dB\x01';
        },
        // scale up text: GS ! n
        wh(wh) {
            return '\x1d!' + (wh < 3 ? $((wh & 1) << 4 | wh >> 1 & 1) : $(wh - 2 << 4 | wh - 2));
        },
        // cancel text decoration: ESC - n FS - n ESC E n GS B n GS ! n
        normal() {
            return '\x1b-\x00\x1c-\x00\x1bE\x00\x1dB\x00\x1d!\x00';
        },
        // image split size
        split: 2048,
        // print image: GS v 0 m xL xH yL yH d1 ... dk
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const right = arguments[4] || this.right;
            let r = this.upsideDown ? this.area(right + this.marginRight - this.margin, width, left) + this.align(2 - align) : '';
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const d = Array(w).fill(0);
            let j = this.upsideDown ? img.data.length - 4 : 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                const l = w + 7 >> 3;
                r += '\x1dv0' + $(0, l & 255, l >> 8 & 255, h & 255, h >> 8 & 255);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += this.upsideDown ? -4 : 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
            }
            return r;
        },
        // print QR Code: GS ( k pL pH cn fn n1 n2 GS ( k pL pH cn fn n GS ( k pL pH cn fn n GS ( k pL pH cn fn m d1 ... dk GS ( k pL pH cn fn m
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined') {
                let r = this.upsideDown ? this.area(this.right + this.marginRight - this.margin, this.width, this.left) + this.align(2 - this.alignment) : '';
                if (symbol.data.length > 0) {
                    const qr = qrcode(0, symbol.level.toUpperCase());
                    qr.addData(symbol.data);
                    qr.make();
                    let img = qr.createASCII(2, 0);
                    if (this.upsideDown) {
                        img = img.split('').reverse().join('');
                    }
                    img = img.split('\n');
                    const w = img.length * symbol.cell;
                    const h = w;
                    const l = w + 7 >> 3;
                    r += '\x1dv0' + $(0, l & 255, l >> 8 & 255, h & 255, h >> 8 & 255);
                    for (let i = 0; i < img.length; i++) {
                        let d = '';
                        for (let j = 0; j < w; j += 8) {
                            let b = 0;
                            const q = Math.min(w - j, 8);
                            for (let p = 0; p < q; p++) {
                                if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                    b |= 128 >> p;
                                }
                            }
                            d += $(b);
                        }
                        for (let k = 0; k < symbol.cell; k++) {
                            r += d;
                        }
                    }
                }
                return r;
            }
            else {
                const d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary').slice(0, 7089);
                return d.length > 0 ? '\x1d(k' + $(4, 0, 49, 65, 50, 0) + '\x1d(k' + $(3, 0, 49, 67, symbol.cell) + '\x1d(k' + $(3, 0, 49, 69, this.qrlevel[symbol.level]) + '\x1d(k' + $(d.length + 3 & 255, d.length + 3 >> 8 & 255, 49, 80, 48) + d + '\x1d(k' + $(3, 0, 49, 81, 48) : '';
            }
        }
    };

    //
    // ESC/POS Thermal Landscape
    //
    const _escpos90 = {
        position: 0,
        content: '',
        height: 1,
        feed: 24,
        cpl: 48,
        buffer: '',
        // start printing: ESC @ GS a n ESC M n FS ( A pL pH fn m ESC SP n FS S n1 n2 FS . GS P x y ESC L ESC T n
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.right = 0;
            this.position = 0;
            this.content = '';
            this.height = 1;
            this.feed = this.charWidth * (printer.spacing ? 2.5 : 2);
            this.cpl = printer.cpl;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            this.buffer = '';
            const r = printer.resolution;
            return '\x1b@\x1da\x00\x1bM' + (printer.encoding === 'tis620' ? 'a' : '0') + '\x1c(A' + $(2, 0, 48, 0) + '\x1b \x00\x1cS\x00\x00\x1c.\x1dP' + $(r, r) + '\x1bL\x1bT' + $(printer.upsideDown ? 3 : 1);
        },
        // finish printing: ESC W xL xH yL yH dxL dxH dyL dyH FF GS r n
        close() {
            const w = this.position;
            const h = this.cpl * this.charWidth;
            const v = (this.margin + this.cpl + this.marginRight) * this.charWidth;
            const m = (this.upsideDown ? this.margin : this.marginRight) * this.charWidth;
            return '\x1bW' + $(0, 0, 0, 0, w & 255, w >> 8 & 255, v & 255, v >> 8 & 255) + ' \x1bW' + $(0, 0, m & 255, m >> 8 & 255, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255) + this.buffer + '\x0c' + (this.cutting ? this.cut() : '') + '\x1dr1';
        },
        // set print area:
        area(left, width, right) {
            this.left = left;
            this.width = width;
            this.right = right;
            return '';
        },
        // set line alignment:
        align(align) {
            this.alignment = align;
            return '';
        },
        // set absolute print position: ESC $ nL nH
        absolute(position) {
            const p = (this.left + position) * this.charWidth;
            this.content += '\x1b$' + $(p & 255, p >> 8 & 255);
            return '';
        },
        // set relative print position: ESC \ nL nH
        relative(position) {
            const p = position * this.charWidth;
            this.content += '\x1b\\' + $(p & 255, p >> 8 & 255);
            return '';
        },
        // print horizontal rule: FS C n FS . ESC t n ...
        hr(width) {
            this.content += '\x1cC0\x1c.\x1bt\x01' + '\x95'.repeat(width);
            return '';
        },
        // print vertical rules: GS ! n FS C n FS . ESC t n ...
        vr(widths, height) {
            this.content += widths.reduce((a, w) => {
                const p = w * this.charWidth;
                return a + '\x1b\\' + $(p & 255, p >> 8 & 255) + '\x96';
            }, '\x1d!' + $(height - 1) + '\x1cC0\x1c.\x1bt\x01\x96');
            return '';
        },
        // start rules: FS C n FS . ESC t n ...
        vrstart(widths) {
            this.content += '\x1cC0\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d';
            return '';
        },
        // stop rules: FS C n FS . ESC t n ...
        vrstop(widths) {
            this.content += '\x1cC0\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f';
            return '';
        },
        // print vertical and horizontal rules: FS C n FS . ESC t n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0));
            this.content += '\x1cC0\x1c.\x1bt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
            return '';
        },
        // set line spacing and feed new line:
        vrlf(vr) {
            this.feed = this.charWidth * (!vr && this.spacing ? 2.5 : 2);
            return this.lf();
        },
        // underline text: ESC - n FS - n
        ul() {
            this.content += '\x1b-2\x1c-2';
            return '';
        },
        // emphasize text: ESC E n
        em() {
            this.content += '\x1bE1';
            return '';
        },
        // invert text: GS B n
        iv() {
            this.content += '\x1dB1';
            return '';
        },
        // scale up text: GS ! n
        wh(wh) {
            this.height = Math.max(this.height, wh < 3 ? wh : wh - 1);
            this.content += '\x1d!' + (wh < 3 ? $((wh & 1) << 4 | wh >> 1 & 1) : $(wh - 2 << 4 | wh - 2));
            return '';
        },
        // cancel text decoration: ESC - n FS - n ESC E n GS B n GS ! n
        normal() {
            this.content += '\x1b-0\x1c-0\x1bE0\x1dB0\x1d!\x00';
            return '';
        },
        // print text:
        text(text, encoding) {
            switch (encoding) {
                case 'multilingual':
                    this.content += this.multiconv(text);
                    break;
                case 'tis620':
                    this.content += this.codepage[encoding] + this.arrayFrom(text, encoding).reduce((a, c) => a + '\x00' + iconv.encode(c, encoding).toString('binary'), '');
                    break;
                default:
                    this.content += this.codepage[encoding] + iconv.encode(text, encoding).toString('binary');
                    break;
            }
            return '';
        },
        // feed new line: GS $ nL nH ESC $ nL nH
        lf() {
            const h = this.height * this.charWidth * 2;
            const x = this.left * this.charWidth;
            const y = this.position + h * 21 / 24 - 1;
            this.buffer += '\x1d$' + $(y & 255, y >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255) + this.content;
            this.position += Math.max(h, this.feed);
            this.height = 1;
            this.content = '';
            return '';
        },
        // print image: GS $ nL nH ESC $ nL nH GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const x = left * this.charWidth + align * (width * this.charWidth - w) / 2;
            const y = this.position;
            let r = '';
            const d = Array(w).fill(0);
            let j = 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                const l = (w + 7 >> 3) * h + 10;
                r += '\x1d$' + $(y + h - 1 & 255, y + h - 1 >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255) + '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
            }
            this.buffer += r;
            this.position += img.height;
            return '';
        },
        // print QR Code: GS $ nL nH ESC $ nL nH GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined' && symbol.data.length > 0) {
                const qr = qrcode(0, symbol.level.toUpperCase());
                qr.addData(symbol.data);
                qr.make();
                const img = qr.createASCII(2, 0).split('\n');
                const w = img.length * symbol.cell;
                const h = w;
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position;
                let r = '\x1d$' + $(y + h - 1 & 255, y + h - 1 >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255);
                const l = (w + 7 >> 3) * h + 10;
                r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let i = 0; i < img.length; i++) {
                    let d = '';
                    for (let j = 0; j < w; j += 8) {
                        let b = 0;
                        const q = Math.min(w - j, 8);
                        for (let p = 0; p < q; p++) {
                            if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                b |= 128 >> p;
                            }
                        }
                        d += $(b);
                    }
                    for (let k = 0; k < symbol.cell; k++) {
                        r += d;
                    }
                }
                this.buffer += r;
                this.position += h;
            }
            return '';
        },
        // print barcode: GS $ nL nH ESC $ nL nH GS w n GS h n GS H n GS k m n d1 ... dn
        barcode(symbol, encoding) {
            const bar = Receipt.barcode.generate(symbol);
            if ('length' in bar) {
                const w = bar.length;
                const l = symbol.height;
                const h = l + (symbol.hri ? this.charWidth * 2 + 2 : 0);
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position;
                let r = '\x1d$' + $(y + l - 1 & 255, y + l - 1 >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255);
                let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
                const b = this.bartype[symbol.type] + Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
                switch (b) {
                    case this.bartype.ean:
                        d = d.slice(0, 12);
                        break;
                    case this.bartype.upc:
                        d = d.slice(0, 11);
                        break;
                    case this.bartype.ean + 1:
                        d = d.slice(0, 7);
                        break;
                    case this.bartype.upc + 1:
                        d = this.upce(d);
                        break;
                    case this.bartype.code128:
                        d = this.code128(d);
                        break;
                    default:
                        break;
                }
                d = d.slice(0, 255);
                r += '\x1dw' + $(symbol.width) + '\x1dh' + $(symbol.height) + '\x1dH' + $(symbol.hri ? 2 : 0) + '\x1dk' + $(b, d.length) + d;
                this.buffer += r;
                this.position += h;
            }
            return '';
        }
    };

    //
    // SII Landscape
    //
    const _sii90 = {
        // start printing: ESC @ GS a n ESC M n ESC SP n FS S n1 n2 FS . GS P x y ESC L ESC T n
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.right = 0;
            this.position = 0;
            this.content = '';
            this.height = 1;
            this.feed = this.charWidth * (printer.spacing ? 2.5 : 2);
            this.cpl = printer.cpl;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            this.buffer = '';
            const r = printer.resolution;
            return '\x1b@\x1da\x00\x1bM0\x1b \x00\x1cS\x00\x00\x1c.\x1dP' + $(r, r) + '\x1bL\x1bT' + $(printer.upsideDown ? 3 : 1);
        },
        // finish printing: ESC W xL xH yL yH dxL dxH dyL dyH ESC $ nL nH FF DC2 q n
        close() {
            const w = this.position;
            const h = this.cpl * this.charWidth;
            const v = (this.margin + this.cpl + this.marginRight) * this.charWidth;
            const m = (this.upsideDown ? this.margin : this.marginRight) * this.charWidth;
            return '\x1bW' + $(0, 0, 0, 0, w & 255, w >> 8 & 255, v & 255, v >> 8 & 255) + ' \x1bW' + $(0, 0, m & 255, m >> 8 & 255, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255) + this.buffer + '\x0c' + (this.cutting ? this.cut() : '') + '\x12q\x00';
        },
        // feed new line: GS $ nL nH ESC $ nL nH
        lf() {
            const h = this.height * this.charWidth * 2;
            const x = this.left * this.charWidth;
            const y = this.position + h;
            this.buffer += '\x1d$' + $(y & 255, y >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255) + this.content;
            this.position += Math.max(h, this.feed);
            this.height = 1;
            this.content = '';
            return '';
        },
        // print image: GS $ nL nH ESC $ nL nH GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const x = left * this.charWidth + align * (width * this.charWidth - w) / 2;
            const y = this.position;
            let r = '';
            const d = Array(w).fill(0);
            let j = 0;
            for (let z = 0; z < img.height; z += this.split) {
                const h = Math.min(this.split, img.height - z);
                const l = (w + 7 >> 3) * h + 10;
                r += '\x1d$' + $(y + h & 255, y + h >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255) + '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let y = 0; y < h; y++) {
                    let i = 0, e = 0;
                    for (let x = 0; x < w; x += 8) {
                        let b = 0;
                        const q = Math.min(w - x, 8);
                        for (let p = 0; p < q; p++) {
                            const f = Math.floor((d[i] + e * 5) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                            j += 4;
                            if (this.gradient) {
                                d[i] = e * 3;
                                e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                if (i > 0) {
                                    d[i - 1] += e;
                                }
                                d[i++] += e * 7;
                            }
                            else {
                                if (f < this.threshold) {
                                    b |= 128 >> p;
                                }
                            }
                        }
                        r += $(b);
                    }
                }
            }
            this.buffer += r;
            this.position += img.height;
            return '';
        },
        // print QR Code: GS $ nL nH ESC $ nL nH GS 8 L p1 p2 p3 p4 m fn a bx by c xL xH yL yH d1 ... dk
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined' && symbol.data.length > 0) {
                const qr = qrcode(0, symbol.level.toUpperCase());
                qr.addData(symbol.data);
                qr.make();
                const img = qr.createASCII(2, 0).split('\n');
                const w = img.length * symbol.cell;
                const h = w;
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position;
                let r = '\x1d$' + $(y + h & 255, y + h >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255);
                const l = (w + 7 >> 3) * h + 10;
                r += '\x1d8L' + $(l & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255, 48, 112, 48, 1, 1, 49, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255);
                for (let i = 0; i < img.length; i++) {
                    let d = '';
                    for (let j = 0; j < w; j += 8) {
                        let b = 0;
                        const q = Math.min(w - j, 8);
                        for (let p = 0; p < q; p++) {
                            if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                b |= 128 >> p;
                            }
                        }
                        d += $(b);
                    }
                    for (let k = 0; k < symbol.cell; k++) {
                        r += d;
                    }
                }
                this.buffer += r;
                this.position += h;
            }
            return '';
        },
        // print barcode: GS $ nL nH ESC $ nL nH GS w n GS h n GS H n GS k m n d1 ... dn
        barcode(symbol, encoding) {
            const bar = Receipt.barcode.generate(symbol);
            if ('length' in bar) {
                const w = bar.length + symbol.width * (/^(upc|ean|jan)$/.test(symbol.type) ? (data.length < 9 ? 14 : 18) : 20);
                const l = symbol.height;
                const h = l + (symbol.hri ? this.charWidth * 2 + 4 : 0);
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position;
                let r = '\x1d$' + $(y + l & 255, y + l >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255);
                let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
                const b = this.bartype[symbol.type] + Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
                switch (b) {
                    case this.bartype.upc + 1:
                        d = this.upce(d);
                        break;
                    case this.bartype.codabar:
                        d = this.codabar(d);
                        break;
                    case this.bartype.code93:
                        d = this.code93(d);
                        break;
                    case this.bartype.code128:
                        d = this.code128(d);
                        break;
                    default:
                        break;
                }
                d = d.slice(0, 255);
                r += '\x1dw' + $(symbol.width) + '\x1dh' + $(symbol.height) + '\x1dH' + $(symbol.hri ? 2 : 0) + '\x1dk' + $(b, d.length) + d;
                this.buffer += r;
                this.position += h;
            }
            return '';
        }
    };

    //
    // Citizen Landscape
    //
    const _citizen90 = {
        // print barcode: GS $ nL nH ESC $ nL nH GS w n GS h n GS H n GS k m n d1 ... dn
        barcode(symbol, encoding) {
            const bar = Receipt.barcode.generate(symbol);
            if ('length' in bar) {
                const w = bar.length;
                const l = symbol.height;
                const h = l + (symbol.hri ? this.charWidth * 2 + 2 : 0);
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position;
                let r = '\x1d$' + $(y + l - 1 & 255, y + l - 1 >> 8 & 255) + '\x1b$' + $(x & 255, x >> 8 & 255);
                let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
                const b = this.bartype[symbol.type] + Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
                switch (b) {
                    case this.bartype.ean:
                        d = d.slice(0, 12);
                        break;
                    case this.bartype.upc:
                        d = d.slice(0, 11);
                        break;
                    case this.bartype.ean + 1:
                        d = d.slice(0, 7);
                        break;
                    case this.bartype.upc + 1:
                        d = this.upce(d);
                        break;
                    case this.bartype.codabar:
                        d = this.codabar(d);
                        break;
                    case this.bartype.code128:
                        d = this.code128(d);
                        break;
                    default:
                        break;
                }
                d = d.slice(0, 255);
                r += '\x1dw' + $(symbol.width) + '\x1dh' + $(symbol.height) + '\x1dH' + $(symbol.hri ? 2 : 0) + '\x1dk' + $(b, d.length) + d;
                this.buffer += r;
                this.position += h;
            }
            return '';
        }
    };

    //
    // Star Landscape
    //
    const _star90 = {
        alignment: 0,
        width: 48,
        left: 0,
        position: 0,
        content: '',
        height: 1,
        feed: 24,
        cpl: 48,
        marginRight: 0,
        buffer: '',
        // start printing: ESC @ ESC RS a n (ESC RS R n) ESC RS F n ESC SP n ESC s n1 n2 ESC GS P 0 ESC GS P 2 n
        open(printer) {
            this.upsideDown = printer.upsideDown;
            this.spacing = printer.spacing;
            this.cutting = printer.cutting;
            this.gradient = printer.gradient;
            this.gamma = printer.gamma;
            this.threshold = printer.threshold;
            this.alignment = 0;
            this.left = 0;
            this.width = printer.cpl;
            this.position = 0;
            this.content = '';
            this.height = 1;
            this.feed = this.charWidth * (printer.spacing ? 2.5 : 2);
            this.cpl = printer.cpl;
            this.margin = printer.margin;
            this.marginRight = printer.marginRight;
            this.buffer = '';
            return '\x1b@\x1b\x1ea\x00' + (printer.encoding === 'tis620' ? '\x1b\x1eR\x01': '') + '\x1b\x1eF\x00\x1b 0\x1bs00\x1b\x1dP0\x1b\x1dP2' + $(printer.upsideDown ? 3 : 1);
        },
        // finish printing: ESC GS P 3 xL xH yL yH dxL dxH dyL dyH ESC GS P 7 ESC GS ETX s n1 n2
        close() {
            const w = this.position;
            const h = this.cpl * this.charWidth;
            const v = (this.margin + this.cpl + this.marginRight) * this.charWidth;
            const m = (this.upsideDown ? this.margin : this.marginRight) * this.charWidth;
            return '\x1b\x1dP3' + $(0, 0, 0, 0, w & 255, w >> 8 & 255, v & 255, v >> 8 & 255) + ' \x1b\x1dP3' + $(0, 0, m & 255, m >> 8 & 255, w & 255, w >> 8 & 255, h & 255, h >> 8 & 255) + this.buffer + '\x1b\x1dP7' + (this.cutting ? this.cut() : '') + '\x1b\x1d\x03\x01\x00\x00';
        },
        // set print area:
        area(left, width, right) {
            this.left = left;
            this.width = width;
            return '';
        },
        // set line alignment:
        align(align) {
            this.alignment = align;
            return '';
        },
        // set absolute print position: ESC GS A n1 n2
        absolute(position) {
            const p = (this.left + position) * this.charWidth;
            this.content += '\x1b\x1dA' + $(p & 255, p >> 8 & 255);
            return '';
        },
        // set relative print position: ESC GS R n1 n2
        relative(position) {
            const p = position * this.charWidth;
            this.content += '\x1b\x1dR' + $(p & 255, p >> 8 & 255);
            return '';
        },
        // set line spacing and feed new line:
        vrlf(vr) {
            this.feed = this.charWidth * (!vr && this.spacing ? 2.5 : 2);
            return this.lf();
        },
        // underline text: ESC - n
        ul() {
            this.content += '\x1b-1';
            return '';
        },
        // emphasize text: ESC E
        em() {
            this.content += '\x1bE';
            return '';
        },
        // invert text: ESC 4
        iv() {
            this.content += '\x1b4';
            return '';
        },
        // scale up text: ESC i n1 n2
        wh(wh) {
            this.height = Math.max(this.height, wh < 3 ? wh : wh - 1);
            this.content += '\x1bi' + (wh < 3 ? $(wh >> 1 & 1, wh & 1) : $(wh - 2, wh - 2));
            return '';
        },
        // cancel text decoration: ESC - n ESC F ESC 5 ESC i n1 n2
        normal() {
            this.content += '\x1b-0\x1bF\x1b5\x1bi' + $(0, 0);
            return '';
        },
        // print text:
        text(text, encoding) {
            this.content += encoding === 'multilingual' ? this.multiconv(text) : this.codepage[encoding] + iconv.encode(text, encoding).toString('binary');
            return '';
        },
        // feed new line: ESC GS P 4 nL nH ESC GS A n1 n2
        lf() {
            const h = this.height * this.charWidth * 2;
            const x = this.left * this.charWidth;
            const y = this.position + h * 20 / 24;
            this.buffer += '\x1b\x1dP4' + $(y & 255, y >> 8 & 255) + '\x1b\x1dA' + $(x & 255, x >> 8 & 255) + this.content;
            this.position += Math.max(h, this.feed);
            this.height = 1;
            this.content = '';
            return '';
        },
        // print image: ESC GS P 4 nL nH ESC GS A n1 n2 ESC k n1 n2 d1 ... dk
        async image(image) {
            const align = arguments[1] || this.alignment;
            const left = arguments[2] || this.left;
            const width = arguments[3] || this.width;
            const img = await PNG.read(Buffer.from(image, 'base64'));
            const w = img.width;
            const h = img.height;
            const x = left * this.charWidth + align * (width * this.charWidth - w) / 2;
            const y = this.position + this.charWidth * 40 / 24;
            const d = Array(w).fill(0);
            const l = w + 7 >> 3;
            let r = '\x1b0' + '\x1b\x1dP4' + $(y & 255, y >> 8 & 255);
            let j = 0;
            for (let y = 0; y < h; y += 24) {
                r += '\x1b\x1dA' + $(x & 255, x >> 8 & 255) + '\x1bk' + $(l & 255, l >> 8 & 255);
                for (let z = 0; z < 24; z++) {
                    if (y + z < h) {
                        let i = 0, e = 0;
                        for (let x = 0; x < w; x += 8) {
                            let b = 0;
                            const q = Math.min(w - x, 8);
                            for (let p = 0; p < q; p++) {
                                const f = Math.floor((d[i] + e * 7) / 16 + Math.pow(((img.data[j] * .299 + img.data[j + 1] * .587 + img.data[j + 2] * .114 - 255) * img.data[j + 3] + 65525) / 65525, 1 / this.gamma) * 255);
                                j += 4;
                                if (this.gradient) {
                                    d[i] = e * 3;
                                    e = f < this.threshold ? (b |= 128 >> p, f) : f - 255;
                                    if (i > 0) {
                                        d[i - 1] += e;
                                    }
                                    d[i++] += e * 5;
                                }
                                else {
                                    if (f < this.threshold) {
                                        b |= 128 >> p;
                                    }
                                }
                            }
                            r += $(b);
                        }
                    }
                    else {
                        r += '\x00'.repeat(l);
                    }
                }
                r += '\x0a';
            }
            r += (this.spacing ? '\x1bz1' : '\x1b0');
            this.buffer += r;
            this.position += h;
            return '';
        },
        // print QR Code: ESC GS P 4 nL nH ESC GS A n1 n2 ESC k n1 n2 d1 ... dk
        qrcode(symbol, encoding) {
            if (typeof qrcode !== 'undefined' && symbol.data.length > 0) {
                const qr = qrcode(0, symbol.level.toUpperCase());
                qr.addData(symbol.data);
                qr.make();
                const img = qr.createASCII(2, 0).split('\n');
                const w = img.length * symbol.cell;
                const h = w;
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position + this.charWidth * 40 / 24;
                const l = w + 7 >> 3;
                let r = '\x1b0' + '\x1b\x1dP4' + $(y & 255, y >> 8 & 255);
                const s = [];
                for (let i = 0; i < img.length; i++) {
                    let d = '';
                    for (let j = 0; j < w; j += 8) {
                        let b = 0;
                        const q = Math.min(w - j, 8);
                        for (let p = 0; p < q; p++) {
                            if (img[i][Math.floor((j + p) / symbol.cell) * 2] === ' ') {
                                b |= 128 >> p;
                            }
                        }
                        d += $(b);
                    }
                    for (let k = 0; k < symbol.cell; k++) {
                        s.push(d);
                    }
                }
                while (s.length % 24) {
                    const d = '\x00'.repeat(l);
                    s.push(d);
                }
                for (let k = 0; k < s.length; k += 24) {
                    r += '\x1b\x1dA' + $(x & 255, x >> 8 & 255) + '\x1bk' + $(l & 255, l >> 8 & 255) + s.slice(k, k + 24).join('') + '\x0a';
                }
                r += (this.spacing ? '\x1bz1' : '\x1b0');
                this.buffer += r;
                this.position += h;
            }
            return '';
        },
        // print barcode: ESC GS P 4 nL nH ESC GS A n1 n2 ESC b n1 n2 n3 n4 d1 ... dk RS
        barcode(symbol, encoding) {
            const bar = Receipt.barcode.generate(symbol);
            if ('length' in bar) {
                let w = bar.length;
                switch (symbol.type) {
                    case 'code39':
                        w += symbol.width;
                        break;
                    case 'itf':
                        w += bar.widths.reduce((a, c) => (c === 8 ? a + 1 : a), 0);
                        break;
                    case 'code128':
                        w += symbol.width * 11;
                        break;
                    default:
                        break;
                }
                const x = this.left * this.charWidth + this.alignment * (this.width * this.charWidth - w) / 2;
                const y = this.position + symbol.height;
                const h = y + (symbol.hri ? this.charWidth * 2 + 2 : 0);
                let r = '\x1b\x1dP4' + $(y & 255, y >> 8 & 255) + '\x1b\x1dA' + $(x & 255, x >> 8 & 255);
                let d = iconv.encode(symbol.data, encoding === 'multilingual' ? 'ascii' : encoding).toString('binary');
                const b = this.bartype[symbol.type] - Number(/upc|[ej]an/.test(symbol.type) && symbol.data.length < 9);
                switch (b) {
                    case this.bartype.upc - 1:
                        d = this.upce(d);
                        break;
                    case this.bartype.code128:
                        d = this.code128(d);
                        break;
                    default:
                        break;
                }
                const u = symbol.type === 'itf' ? [ 49, 56, 50 ][symbol.width - 2] : symbol.width + (/^(code39|codabar|nw7)$/.test(symbol.type) ? 50 : 47);
                r += '\x1bb' + $(b, symbol.hri ? 50 : 49, u, symbol.height) + d + '\x1e';
                this.buffer += r;
                this.position += h;
            }
            return '';
        }
    };

    //
    // Star SBCS Landscape
    //
    const _sbcs90 = {
        // print horizontal rule: ESC GS t n ...
        hr(width) {
            this.content += '\x1b\x1dt\x01' + '\xc4'.repeat(width);
            return '';
        },
        // print vertical rules: ESC i n1 n2 ESC GS t n ...
        vr(widths, height) {
            this.content += widths.reduce((a, w) => {
                const p = w * this.charWidth;
                return a + '\x1b\x1dR' + $(p & 255, p >> 8 & 255) + '\xb3';
            }, '\x1bi' + $(height - 1, 0) + '\x1b\x1dt\x01\xb3');
            return '';
        },
        // start rules: ESC GS t n ...
        vrstart(widths) {
            this.content += '\x1b\x1dt\x01' + widths.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc2', '\xda').slice(0, -1) + '\xbf';
            return '';
        },
        // stop rules: ESC GS t n ...
        vrstop(widths) {
            this.content += '\x1b\x1dt\x01' + widths.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc1', '\xc0').slice(0, -1) + '\xd9';
            return '';
        },
        // print vertical and horizontal rules: ESC GS t n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc1', '\xc0').slice(0, -1) + '\xd9' + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\xc4'.repeat(w) + '\xc2', '\xda').slice(0, -1) + '\xbf' + ' '.repeat(Math.max(-dr, 0));
            this.content += '\x1b\x1dt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
            return '';
        }
    };

    //
    // Star MBCS Japanese Landscape
    //
    const _mbcs90 = {
        // print horizontal rule: ESC $ n ...
        hr(width) {
            this.content += '\x1b$0' + '\x95'.repeat(width);
            return '';
        },
        // print vertical rules: ESC i n1 n2 ESC $ n ...
        vr(widths, height) {
            this.content += widths.reduce((a, w) => {
                const p = w * this.charWidth;
                return a + '\x1b\x1dR' + $(p & 255, p >> 8 & 255) + '\x96';
            }, '\x1bi' + $(height - 1, 0) + '\x1b$0\x96');
            return '';
        },
        // start rules: ESC $ n ...
        vrstart(widths) {
            this.content += '\x1b$0' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d';
            return '';
        },
        // stop rules: ESC $ n ...
        vrstop(widths) {
            this.content += '\x1b$0' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f';
            return '';
        },
        // print vertical and horizontal rules: ESC $ n ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0));
            this.content += '\x1b$0' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
            return '';
        }
    };

    //
    // Star MBCS Chinese Korean Landscape
    //
    const _mbcs290 = {
        // print horizontal rule: - ...
        hr(width) {
            this.content += '-'.repeat(width);
            return '';
        },
        // print vertical rules: ESC i n1 n2 | ...
        vr(widths, height) {
            this.content += widths.reduce((a, w) => {
                const p = w * this.charWidth;
                return a + '\x1b\x1dR' + $(p & 255, p >> 8 & 255) + '|';
            }, '\x1bi' + $(height - 1, 0) + '|');
            return '';
        },
        // start rules: + - ...
        vrstart(widths) {
            this.content += widths.reduce((a, w) => a + '-'.repeat(w) + '+', '+');
            return '';
        },
        // stop rules: + - ...
        vrstop(widths) {
            this.content += widths.reduce((a, w) => a + '-'.repeat(w) + '+', '+');
            return '';
        },
        // print vertical and horizontal rules: + - ...
        vrhr(widths1, widths2, dl, dr) {
            const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '-'.repeat(w) + '+', '+') + ' '.repeat(Math.max(dr, 0));
            const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '-'.repeat(w) + '+', '+') + ' '.repeat(Math.max(-dr, 0));
            this.content += r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '');
            return '';
        }
    };

    return {
        /**
         * Create command object.
         * @param {string} command name of command set
         * @returns {object} command object
         */
        create(command) {
            // create command object
            const _base = Receipt.commands.base;
            switch (command) {
                case 'escpos':
                    return { ..._base, ..._escpos, ..._thermal };
                case 'epson':
                    return { ..._base, ..._escpos, ..._thermal };
                case 'sii':
                    return { ..._base, ..._escpos, ..._thermal, ..._sii };
                case 'citizen':
                    return { ..._base, ..._escpos, ..._thermal, ..._citizen };
                case 'fit':
                    return { ..._base, ..._escpos, ..._thermal, ..._fit };
                case 'impact':
                    return { ..._base, ..._escpos, ..._impact };
                case 'impactb':
                    return { ..._base, ..._escpos, ..._impact, ..._fontb };
                case 'generic':
                    return { ..._base, ..._escpos, ..._thermal, ..._generic };
                case 'starsbcs':
                    return { ..._base, ..._star, ..._sbcs };
                case 'starmbcs':
                    return { ..._base, ..._star, ..._mbcs };
                case 'starmbcs2':
                    return { ..._base, ..._star, ..._mbcs2 };
                case 'starlinesbcs':
                    return { ..._base, ..._star, ..._line, ..._sbcs };
                case 'starlinembcs':
                    return { ..._base, ..._star, ..._line, ..._mbcs };
                case 'starlinembcs2':
                    return { ..._base, ..._star, ..._line, ..._mbcs2 };
                case 'emustarlinesbcs':
                    return { ..._base, ..._star, ..._line, ..._emu, ..._sbcs };
                case 'emustarlinembcs':
                    return { ..._base, ..._star, ..._line, ..._emu, ..._mbcs };
                case 'emustarlinembcs2':
                    return { ..._base, ..._star, ..._line, ..._emu, ..._mbcs2 };
                case 'stargraphic':
                    return { ..._base, ..._stargraphic };
                case 'starimpact':
                    return { ..._base, ..._star, ..._dot, ..._sbcs };
                case 'starimpact2':
                    return { ..._base, ..._star, ..._dot, ..._font2, ..._sbcs };
                case 'starimpact3':
                    return { ..._base, ..._star, ..._dot, ..._font3, ..._sbcs };
                case 'escpos90':
                    return { ..._base, ..._escpos, ..._thermal, ..._escpos90 };
                case 'epson90':
                    return { ..._base, ..._escpos, ..._thermal, ..._escpos90 };
                case 'sii90':
                    return { ..._base, ..._escpos, ..._thermal, ..._sii, ..._escpos90, ..._sii90 };
                case 'citizen90':
                    return { ..._base, ..._escpos, ..._thermal, ..._citizen, ..._escpos90, ..._citizen90 };
                case 'starsbcs90':
                    return { ..._base, ..._star, ..._sbcs, ..._star90, ..._sbcs90 };
                case 'starmbcs90':
                    return { ..._base, ..._star, ..._mbcs, ..._star90, ..._mbcs90 };
                case 'starmbcs290':
                    return { ..._base, ..._star, ..._mbcs2, ..._star90, ..._mbcs290 };
                default:
                    return { ..._base };
            }
        }
    };
})();
