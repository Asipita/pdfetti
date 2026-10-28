# Third-party licenses

The root Apache-2.0 license applies to PDFetti's original code and documentation. It does not replace the licenses of bundled third-party assets.

| Assets | License and attribution |
| --- | --- |
| Interface Inter fonts in `src/fonts/` and document Inter fonts in `public/document-fonts/inter/` | SIL Open Font License 1.1, [copyright and license](public/document-fonts/inter/OFL.txt). The document TrueType instances are derived from the pinned source recorded in [SOURCE.txt](public/document-fonts/SOURCE.txt). |
| Source Serif 4, IBM Plex Mono, Caveat, and Patrick Hand in `public/document-fonts/` | Each font's copyright and SIL Open Font License 1.1 are in its own `OFL.txt` file. Asset provenance is recorded in [SOURCE.txt](public/document-fonts/SOURCE.txt). |
| PDF.js character maps in `public/cmaps/` | [Bundled license](public/cmaps/LICENSE). |
| PDF.js standard fonts in `public/standard_fonts/` | [Foxit license](public/standard_fonts/LICENSE_FOXIT) and [Liberation license](public/standard_fonts/LICENSE_LIBERATION). |
| PDF.js WebAssembly support in `public/wasm/` | The PDF.js distribution is Apache-2.0; additional component notices are retained as `LICENSE_*` files in that directory. |

JavaScript dependencies installed from npm retain their respective licenses. Dependency names and resolved versions are recorded in `package-lock.json`.
