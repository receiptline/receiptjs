# Receipt.js

JavaScript printing libraries for receipt printers, simple and easy with receipt markdown, printer status support.  

```javascript
const markdown = `^^^RECEIPT

03/18/2024, 12:34:56 PM
Asparagus | 1| 1.00
Broccoli  | 2| 2.00
Carrot    | 3| 3.00
---
^TOTAL | ^6.00`;

const receipt = Receipt.from(markdown, '-c 42 -l en');
const png = await receipt.toPNG();
```

![example](resource/example.png)  


# Features

Receipt.js is simple printing libraries for receipt printers that prints with easy markdown data for receipts and returns printer status. Even without a printer, it can output images.  

A development tool is provided to edit, preview, and print the receipt markdown.  
https://receiptline.github.io/receiptjs-designer/  

The details of the receipt markdown are explained at  
https://github.com/receiptline/receiptline  

# Convert to image or plain text

The following files are required to use the Receipt API.  

- receipt.js

```html
<script type="text/javascript" src="receipt.js"></script>
```

```javascript
const markdown = `^^^RECEIPT

03/18/2024, 12:34:56 PM
Asparagus | 1| 1.00
Broccoli  | 2| 2.00
Carrot    | 3| 3.00
---
^TOTAL | ^6.00`;

const receipt = Receipt.from(markdown, '-c 42 -l en');
const png = await receipt.toPNG();
```

## Receipt.from(markdown[, options])

The Receipt.from() static method creates a new Receipt instance.  

### Parameters  

- `markdown` &lt;string&gt;
  - receipt markdown text
- `options` &lt;string&gt;
  - `-c <chars>`: characters per line
    - range: `24`-`96`
    - default: `48`
  - `-l <language>`: language of receipt markdown text
    - `en`, `fr`, `de`, `es`, `po`, `it`, `ru`, ...: Multilingual (cp437, 852, 858, 866, 1252 characters)
    - `ja`: Japanese (shiftjis characters)
    - `ko`: Korean (ksc5601 characters)
    - `zh-hans`: Simplified Chinese (gb18030 characters)
    - `zh-hant`: Traditional Chinese (big5 characters)
    - `th`: Thai
    - default: system locale
  - `-s`: paper saving (reduce line spacing)

### Return value

  - A new Receipt instance.

## receipt.toPNG()

The toPNG() instance method converts to PNG.  
https://receiptline.github.io/receiptjs/test/topng.html  

### Parameters

- None.

### Return value

- A Promise that fulfills with a string once the PNG in data URL format is ready to be used.

## receipt.toSVG()

The toSVG() instance method converts to SVG.  
https://receiptline.github.io/receiptjs/test/tosvg.html  

### Parameters

- None.

### Return value

- A Promise that fulfills with a string once the SVG is ready to be used.

## receipt.toText()

The toText() instance method converts to plain text.  
https://receiptline.github.io/receiptjs/test/totext.html  

### Parameters

- None.

### Return value

- A Promise that fulfills with a string once the plain text is ready to be used.

## receipt.toString()

The toString() instance method returns a string representing the receipt markdown text.  

### Parameters

- None.

### Return value

- A string representing the receipt markdown text.


# Convert to printer commands

The following files are required to use the Receipt Printer API.  

- receipt.js
- receipt-printer.js

```html
<script type="text/javascript" src="receipt.js"></script>
<script type="text/javascript" src="receipt-printer.js"></script>
```

```javascript
const markdown = `^^^RECEIPT

03/18/2024, 12:34:56 PM
Asparagus | 1| 1.00
Broccoli  | 2| 2.00
Carrot    | 3| 3.00
---
^TOTAL | ^6.00`;

const receipt = Receipt.from(markdown, '-p generic -c 42');
const command = await receipt.toCommand();
```

## Receipt.from(markdown[, options])

The Receipt.from() static method creates a new Receipt instance.  

### Parameters

- `markdown` &lt;string&gt;
  - receipt markdown text
- `options` &lt;string&gt;
  - `-p <printer>`: printer control language
    - `escpos`: ESC/POS (Epson)
    - `epson`: ESC/POS (Epson)
    - `sii`: ESC/POS (Seiko Instruments)
    - `citizen`: ESC/POS (Citizen)
    - `fit`: ESC/POS (Fujitsu)
    - `impact`: ESC/POS (TM-U220)
    - `impactb`: ESC/POS (TM-U220 Font B)
    - `generic`: ESC/POS (Generic) _Experimental_
    - `star`: StarPRNT
    - `starline`: Star Line Mode
    - `emustarline`: Command Emulator Star Line Mode
    - `stargraphic`: Star Graphic Mode
    - `starimpact`: Star Mode on dot impact printers _Experimental_
    - `starimpact2`: Star Mode on dot impact printers (Font 5x9 2P-1) _Experimental_
    - `starimpact3`: Star Mode on dot impact printers (Font 5x9 3P-1) _Experimental_
  - `-c <chars>`: characters per line
    - range: `24`-`96`
    - default: `48`
  - `-l <language>`: language of receipt markdown text
    - `en`, `fr`, `de`, `es`, `po`, `it`, `ru`, ...: Multilingual (cp437, 852, 858, 866, 1252 characters)
    - `ja`: Japanese (shiftjis characters)
    - `ko`: Korean (ksc5601 characters)
    - `zh-hans`: Simplified Chinese (gb18030 characters)
    - `zh-hant`: Traditional Chinese (big5 characters)
    - `th`: Thai
    - default: system locale
  - `-s`: paper saving (reduce line spacing)
  - `-m [<left>][,<right>]`: print margin
    - range (left): `0`-`24`
    - range (right): `0`-`24`
    - default: `0,0`
  - `-u`: upside down
  - `-i`: print as image
  - `-n`: no paper cut
  - `-b <threshold>`: image thresholding
    - range: `0`-`255`
    - default: error diffusion
  - `-g <gamma>`: image gamma correction
    - range: `0.1`-`10.0`
    - default: `1.0`
  - `-v`: landscape orientation
    - device font support: `escpos`, `epson`, `sii`, `citizen`, `star`
  - `-r <dpi>`: print resolution for ESC/POS, landscape, and device font
    - values: `180`, `203`
    - default: `203`

### Return value

  - A new Receipt instance.

## receipt.toCommand()

The toCommand() instance method converts to printer commands.  
https://receiptline.github.io/receiptjs/test/tocommand.html  

### Parameters

- None.

### Return value

- A Promise that fulfills with a string once the printer commands is ready to be used.


# Print with the Web Serial API

The following files are required to use the Receipt Serial API.  

- receipt.js
- receipt-printer.js
- receipt-serial.js

```html
<script type="text/javascript" src="receipt.js"></script>
<script type="text/javascript" src="receipt-printer.js"></script>
<script type="text/javascript" src="receipt-serial.js"></script>
```

```javascript
const markdown = `^^^RECEIPT

03/18/2024, 12:34:56 PM
Asparagus | 1| 1.00
Broccoli  | 2| 2.00
Carrot    | 3| 3.00
---
^TOTAL | ^6.00`;

const conn = ReceiptSerial.connect({ baudRate: 19200 });
conn.on('status', status => {
    console.log(status);
});
conn.on('ready', async () => {
    const result = await conn.print(markdown, '-c 42');
});
```

## ReceiptSerial.connect([options])

The ReceiptSerial.connect() static method creates a new connection using the Web Serial API.  

### Parameters

- `options` &lt;object&gt;
  - `baudRate`: baud rate to establish serial communication
    - default: `115200`
  - other values
    - parity: `none`
    - data bits: `8`
    - stop bits: `1`
    - flow control: `hardware`

These options are for real serial ports.  

### Return value

  - A new ReceiptSerial instance.

## receiptSerial.status

The receiptSerial.status instance property is a string representing the printer status.  

### Value

- A string representing the printer status.
  - `online`: printer is online
  - `print`: printer is printing
  - `coveropen`: printer cover is open
  - `paperempty`: no receipt paper
  - `error`: printer error (except cover open and paper empty)
  - `offline`: printer is off or offline
  - `disconnect`: printer is not connected

## receiptSerial.print(markdown[, options])

The print() instance method prints a receipt markdown text.  
https://receiptline.github.io/receiptjs/test/print.html  

### Parameters

- `markdown` &lt;string&gt;
  - receipt markdown text
- `options` &lt;string&gt;
  - `-c <chars>`: characters per line
    - range: `24`-`96`
    - default: `48`
  - `-l <language>`: language of receipt markdown text
    - `en`, `fr`, `de`, `es`, `po`, `it`, `ru`, ...: Multilingual (cp437, 852, 858, 866, 1252 characters)
    - `ja`: Japanese (shiftjis characters)
    - `ko`: Korean (ksc5601 characters)
    - `zh-hans`: Simplified Chinese (gb18030 characters)
    - `zh-hant`: Traditional Chinese (big5 characters)
    - `th`: Thai
    - default: system locale
  - `-s`: paper saving (reduce line spacing)
  - `-m [<left>][,<right>]`: print margin
    - range (left): `0`-`24`
    - range (right): `0`-`24`
    - default: `0,0`
  - `-u`: upside down
  - `-i`: print as image
  - `-n`: no paper cut
  - `-b <threshold>`: image thresholding
    - range: `0`-`255`
    - default: error diffusion
  - `-g <gamma>`: image gamma correction
    - range: `0.1`-`10.0`
    - default: `1.0`
  - `-p <printer>`: printer control language
    - `escpos`: ESC/POS (Epson)
    - `epson`: ESC/POS (Epson)
    - `sii`: ESC/POS (Seiko Instruments)
    - `citizen`: ESC/POS (Citizen)
    - `fit`: ESC/POS (Fujitsu)
    - `impact`: ESC/POS (TM-U220)
    - `impactb`: ESC/POS (TM-U220 Font B)
    - `generic`: ESC/POS (Generic) _Experimental_
    - `star`: StarPRNT
    - `starline`: Star Line Mode
    - `emustarline`: Command Emulator Star Line Mode
    - `stargraphic`: Star Graphic Mode
    - `starimpact`: Star Mode on dot impact printers _Experimental_
    - `starimpact2`: Star Mode on dot impact printers (Font 5x9 2P-1) _Experimental_
    - `starimpact3`: Star Mode on dot impact printers (Font 5x9 3P-1) _Experimental_
    - default: auto detection (`epson`, `sii`, `citizen`, `fit`, `impactb`, `generic`, `star`)
  - `-v`: landscape orientation
    - device font support: `escpos`, `epson`, `sii`, `citizen`, `star`
  - `-r <dpi>`: print resolution for ESC/POS, landscape, and device font
    - values: `180`, `203`
    - default: `203`

### Return value

- A Promise that fulfills with a string once the print result is ready to be used.
  - `success`: printing success
  - `print`: printer is printing
  - `coveropen`: printer cover is open
  - `paperempty`: no receipt paper
  - `error`: printer error (except cover open and paper empty)
  - `offline`: printer is off or offline
  - `disconnect`: printer is not connected

## receiptSerial.drawer

The receiptSerial.drawer instance property is a string representing the cash drawer status.  

### Value

- A string representing the cash drawer status.
  - `drawerclosed`: drawer is closed
  - `draweropen`: drawer is open
  - `offline`: printer is off or offline
  - `disconnect`: printer is not connected

## receiptSerial.invertDrawerState(invert)

The invertDrawerState() instance method inverts cash drawer state.  

### Parameters

- `invert` &lt;boolean&gt;
  - if true, invert drawer state

### Return value

- None.

## receiptSerial.close()

The close() instance method closes the connection.  
The current implementation also closes other open connections.  

### Parameters

- None.

### Return value

- None.

## receiptSerial.on(name, listener)

The on() instance method adds the `listener` function to the listeners array for the event named `name`.  

### Parameters

- `name`
  - event name
    - `status`: printer status updated
    - `ready`: ready to print
    - `online`: printer is online
    - `print`: printer is printing
    - `coveropen`: printer cover is open
    - `paperempty`: no receipt paper
    - `error`: printer error (except cover open and paper empty)
    - `offline`: printer is off or offline
    - `disconnect`: printer is not connected
    - `drawer`: drawer status updated
    - `drawerclosed`: drawer is closed
    - `draweropen`: drawer is open
- `listener`
  - the listener function

### Return value

- None.

## receiptSerial.off(name, listener)

The off() instance method removes the `listener` function from the listeners array for the event named `name`.  

### Parameters

- `name`
  - event name
    - `status`: printer status updated
    - `ready`: ready to print
    - `online`: printer is online
    - `print`: printer is printing
    - `coveropen`: printer cover is open
    - `paperempty`: no receipt paper
    - `error`: printer error (except cover open and paper empty)
    - `offline`: printer is off or offline
    - `disconnect`: printer is not connected
    - `drawer`: drawer status updated
    - `drawerclosed`: drawer is closed
    - `draweropen`: drawer is open
- `listener`
  - the listener function

### Return value

- None.


# Web browsers

The print function is available on Chrome, Edge, and Opera that support the Web Serial API.  
(Windows, Linux, macOS, ChromeOS, and **Android**)  


# Receipt printers

- Epson TM series
- Seiko Instruments RP series
- Star MC series
- Citizen CT series
- Fujitsu FP series

Connect with the Web Serial API.  
(Bluetooth, virtual serial port, and serial port)  

Epson TM series (South Asia model) and Star MC series (StarPRNT model) can print with device font of Thai characters.  

## Restrictions

The Web Serial API has no write timeout, so if hardware flow control is enabled, opening the printer cover during printing may cause the browser to stop responding. In this case, close the printer cover or press the paper feed button. Alternatively, change the printer's busy condition setting from "Offline or receive buffer full" to "Receive buffer full".  
