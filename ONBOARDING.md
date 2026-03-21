# Receipt.js Quick Onboarding

This short guide mirrors the internal plan so you can get productive quickly.

## What it is
- JavaScript libraries to render receipt-markdown to PNG/SVG/text and to generate ESC/POS or Star printer commands.
- Helpers for Web Serial/USB printing from modern browsers.
- Current version: 5.0.0 (see `package.json`).

## Project layout
- Core modules (ESM): `src/index.js`, plus `receipt`, `receipt-printer`, `receipt-serial`, `receipt-usb`, `receipt2buffer`.
- Browser bundles (IIFE globals): `dist/receipt.js`, `dist/receipt-printer.js`, `dist/receipt-serial.js`, `dist/receipt-usb.js`.
- Demos (served by Vite): `demo/*.html` such as `topng.html`, `tosvg.html`, `totext.html`, `tocommand.html`, `print-serial.html`, `print-usb.html`.
- Samples/assets: `receipt_template/*.receipt`, `resource/example.png` referenced in README.

## Quick start (local)
1) Install deps: `npm install`.
2) Build browser bundles: `npm run build` (runs `build:browser` with esbuild).
3) Run demo server: `npm run dev` then open the shown URL (default http://localhost:5173) to explore `demo/` pages.
4) Try conversion: open `demo/topng.html`, paste the README markdown, and view PNG/SVG/Text outputs.
5) Try printer commands: open `demo/tocommand.html` or in code:
   ```js
   import Receipt from 'receiptjs/receipt';
   const receipt = Receipt.from(markdown, '-p escpos -c 42');
   const cmd = await receipt.toCommand();
   ```
6) Web Serial/USB: in a Chromium-based browser, open `demo/print-serial.html` or `demo/print-usb.html`, grant device permission, then call `print(markdown, opts)`.

## Using in your app
- Browser: include `dist/receipt.js`; add `dist/receipt-printer.js` if you need command generation.
- Node/ESM: `import Receipt from 'receiptjs/receipt';` or `import { toBuffer } from 'receiptjs/receipt2buffer';`.
- Common options: `-c` (chars per line), `-l` (language/encoding), `-p` (printer model), `-s` (paper-saving), `-m` (margins).

## Assumptions
- npm workflow; modern browser for Web Serial/USB; printer speaks ESC/POS or Star-compatible commands.
