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
- `src/features/pdf`: local file handoff, PDF.js loading, coordinate conversion, and pdf-lib export.
- `src/styles`: shared semantic tokens and responsive component styles.

PDF.js renders original pages and provides the form widget rectangles. Overlay placement is recorded in PDF page coordinates and applied with pdf-lib at download time. Interactive form values remain editable in the output PDF.

## Current limitations

- Visual signatures are electronic marks, not certificate-backed digital signatures.
- XFA forms are rejected with an explanation. Some complex AcroForms and unusual page rotations need further compatibility work.
- Inserted text uses PDF standard Helvetica; characters outside that font's encoding receive a clear export error.
- Files over 50 MB are refused to keep in-browser editing responsive.
