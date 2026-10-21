# Config exercise-library refactor verification — 2026-10-21

## Design evidence and scope

Reference: https://uiarc.dev/components/glass-menu . Its public documentation describes trigger-to-panel spring morphing, a moving row highlight and an in-place submenu. The demo page timed out twice in the browser; no paid source was accessed. The implementation uses existing Base UI Menu semantics and Motion, independently authored. Spring 420/38/.8, 200ms 16px subtree entrance and 120ms close fade are project choices, not verified original Arc parameters.

New 4.4-second muscle video sampled every 0.25 seconds, all portions inspected via contact sheets. Twenty muscle categories follow the video; original exercise muscle/equipment properties remain in records. Nine top-level device categories follow the supplied image/earlier full nine-category reference. The machine branch preserves explicit cable, plate-loaded, selectorized and Smith metadata without guessing unknown loading types.

## Checklist

- Geometry: original search row height 32px; search now occupies the entire toolbar with no funnel. Two equal 32px-high entrances; 256px popup, 20px outer radius, 8px padding, 36px items, 12px hover pill. Actual default viewport 940x871, muscle popup x669.33/y146.67/w256/h436, right edge inside viewport. List capped at380px with internal scrolling.
- Layout: removed broad chest-to-cardio and region-button rows. Search and two filters remain fixed above one scrolling exercise area. Default popular items derive from the user video (19 unique source IDs), followed by every exercise sorted by Chinese name. Filter/search mode suppresses popular ranking and shows matching results. Popular/all instances have separate drag IDs while retaining the same source exercise ID.
- Motion: shared Motion layout surface moves from trigger bounds into popup; measured mid-animation surface w226.77/h341.01 with matrix(.885822,0,0,.819726,123.005,-8.85347), then final256px width. In-place machine branch moves16px, row-hover highlight uses shared layout. No replacement GPU renderer or animation loop introduced. Reduced-motion bypass is implemented; OS reduced-motion visual check not performed.
- Interaction: actual pointer tested machine→Smith, then chest intersection, all-device/all-muscle resets. Keyboard ArrowDown opens; ArrowRight enters machine; ArrowLeft returns; Escape closes and restores keyboard focus. Pointer selection returns focus to page without persistent focus decoration. Outside click dismiss uses Base UI. Search remains connected and data attributes retained.
- Material: reused global Lens-style CSS glass (blur20/saturate1.3) and theme-specific optical edges. Corrected popup portal background to --popover. Light and dark actual screenshots checked; dark retains weak #ffffff0a top edge. This is the existing CSS glass system, not Lens WebGL refraction.
- Adaptation: viewport collision uses shift on both axes. Actual desktop edge fit verified. Phone viewport and real touch gesture checks not performed; the surrounding existing fixed-width workbench was not redesigned.

## Validation and limits

107 tests passed, including new device grouping, exact muscle identity, combined filter and popular-order checks. TypeScript and scoped ESLint passed. No training data, authentication, database or original exercise classifications changed. No source images copied from Hevy. Existing custom-action creation remains available under Other muscle. Arc exact timing, curvature and optical parity cannot be claimed because its live preview was unavailable.

Screens: test-results/library-refactor/default.png, devices.png, dark-muscles.png.

## Compact menu correction
- Removed shared surface layout projection; the portal opens below the filter row without resizing page content.
- Popup width follows the filter row (221px at 940x871 viewport). Muscle options use unlabeled separators and three columns.
- Browser verified document dimensions remain 940x871 with menu open; popup 221x316, transform none, trigger remains visible.
- TypeScript and scoped ESLint passed. Screenshot: test-results/library-refactor/compact-groups.png.
- Other viewport sizes and dark mode were not rechecked for this correction.
