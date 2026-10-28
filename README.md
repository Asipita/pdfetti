# PDFetti

A free, privacy-first PDF editor built with Next.js App Router and exported as static files. PDFs, signatures, annotations, form values, and downloads are handled in the browser. There is no backend, account, payment flow, or remote document storage.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To build deployable static files, run `npm run build` and serve `out/`. Cloudflare Pages can publish `out/` directly. Set `NEXT_PUBLIC_SITE_URL` to the production origin before building so canonical, Open Graph, robots, and sitemap URLs are correct.

## Verify

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright expects the static build at `http://localhost:3000`; serve `out/` before running E2E tests. Set `PLAYWRIGHT_BASE_URL` if the preview uses another port, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium binary.

## Architecture

- `src/app`: statically rendered marketing, privacy, and editor routes, plus SEO output.
- `src/features/editor`: Zustand state, toolbar, page views, annotation overlays, and signature UI.
- `src/features/fonts`: the document font registry and shared text wrapping rules.
- `src/features/pdf`: local file handoff, PDF.js loading, coordinate conversion, and pdf-lib export with embedded fonts.
- `src/styles`: shared semantic tokens and responsive component styles.

PDF.js renders original pages and provides the form widget rectangles. Overlay placement is recorded in PDF page coordinates and applied with pdf-lib at download time. Interactive form values remain editable in the output PDF.

## Editing text

Choose **Text** and click a page to type. Double-click existing text to edit it; click away or press Escape to finish. A selected annotation can be dragged, resized, or moved with the arrow keys (Shift moves farther). Delete or Backspace removes it; Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo and redo. Hold Shift while dragging to bypass alignment snapping. Zoom can be set to 50%, 75%, 100%, 125%, 150%, or 200% from the toolbar.

Document text can use Inter, Source Serif 4, IBM Plex Mono, Caveat, or Patrick Hand. These assets are bundled locally and embedded into exported PDFs. Their source and redistributable OFL licenses are in `public/document-fonts/`; UI typography remains Inter. If a chosen font lacks a character, export shows an error so the downloaded file does not silently substitute another face. Export embeds each used font face once in full, which can increase the resulting file size.

## Current limitations

- Visual signatures are electronic marks, not certificate-backed digital signatures.
- XFA forms are rejected with an explanation. Some complex AcroForms and unusual page rotations need further compatibility work.
- Browser and PDF font engines can wrap a line a few pixels differently for some scripts or punctuation. Export uses the bundled font's actual widths and preserves explicit line breaks.
- Files over 50 MB are refused to keep in-browser editing responsive.
