# Lens preference controls

Reference: `lens/lab/design-system/optical-components.js` and `components.css` in https://github.com/ruiqichenbiec/design-systems (MIT).

## Reproduction checklist and evidence

| Category | Result |
| --- | --- |
| Geometry | Native 66×66px circular wells and selector, 44px well offset, 164px field, 14px caption gap retained. Browser measured both wells as 66×66 with 50% round corners. Global squircle override corrected. |
| Layout | Native two-column layout is now inline in the header. There is no popup or collapsed trigger. The wells retain 66px geometry; unused demonstration space above the wells and duplicate status text are removed for header placement. |
| Motion | Native OpticalDragMotion, optics state, hit detection, held/travelling/merging/rest phases and reduced-motion handling reused without replacing them with a simple CSS slide. |
| Interaction | Browser tested theme click, drag from dark well to light well, language arrow keys, selected state, Escape dismissal. Preferences use existing persistence. |
| Responsive | Inspected at 390px phone and desktop widths; phone controls occupy a second header row and the account button stays top-right. No physical mobile-device verification. |
| Theme | Light/dark panels inspected; portal-scoped theme variables corrected. |
| Icons | Original sun/moon paths retained. Chinese and English glyph paths added to the same native icon renderer. |

## Differences and limits

- Rendering uses the upstream CSS optical fallback, not the original generated-scene WebGL refraction.
- Header spacing and dark-theme colors are application adaptations, not original drop-select properties.
- Language preference is selectable and stored; the application still lacks complete English translations.
- Native source parameters and local screenshots were checked; no frame-by-frame comparison against a running upstream demo was completed.
- No additional spring/easing constants were invented for native selection motion.

Screenshots: `test-results/meals-gallery/lens-theme-select.png`, `lens-language-select.png`.

## Additional source lookup (not installed)

The screenshot brightness slider exists in `lens/lab/index.html` as `#brightness` with initial value 82, `.demo-slider-thumb`, styled in `lens/lab/style.css`, wired to the range gesture controller in `lens/lab/app.js`. The search field exists as `.gallery-search` in the same files. Portable factories also exist as `slider` and `search` in `lens/lab/design-system/components.js`.
