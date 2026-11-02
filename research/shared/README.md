# Architecture workspace update — 2026-11-02

- Board and image styles download as versioned `research-style` JSON files. Import validates the complete preset before applying settings. These files contain no source images or arranged project content.
- Images-first mode packs original aspect ratios into justified rows. Reading order follows the source list. Row limit, margins, spacing, source order and explicit board assignment control composition.
- Two-board mode renders separate 700 × 1000 mm SVGs in a vertical stack. Print CSS assigns each sheet to its own page. SVG export selects either board. Print at 100%, no margins or browser headers.
- PNG/JPEG/WebP/SVG imports retain their original data URLs. Board images default to contain fitting. SVG sources are embedded as SVG images; they are not converted to editable paths.
- Image Designer has independent recipe strength, original dark-detail blending, transparency preservation and per-image bypass. Original-size export is the default. Styled outputs are raster PNG; original SVG is available to boards without rasterising it. Inputs above 64 megapixels are rejected with a visible error.
- Existing preset libraries remain available. New architecture styles avoid destructive thresholding, dithering and pixelation by default.
- The combined workspace can use either original sources or full-resolution styled PNGs. Imported images remain local to the browser session.

Validation: mixed landscape, portrait and square SVG imports; two-sheet image counts and contain fitting; board and image preset export/import round-trips including a custom 47% effect strength; shared source propagation; JavaScript syntax; 144 packing cases covering aspect ratios, bounds and overlap.

Print/PDF uses the browser print dialog. Embedded drawings do not acquire a calibrated architectural scale from their placement on a board. Source protection is luminance-based, not OCR; choose Original for exact reproduction.
