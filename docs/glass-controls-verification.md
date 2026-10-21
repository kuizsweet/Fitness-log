# Compact Dock controls verification

- Source: existing MobileDock.tsx, MobileDock.module.css, vendored Lens jelly.js / jelly-physics.js (MIT); Lens components.css lg-search and lg-segment-bar inspected.
- Geometry: preserved existing padding, font, width and height constraints. Live sizes at the current viewport: Plan/List 66.93 x 33.33, range 68 x 32, search 182.67 x 32, filter 32 x 32, new note 86.33 x 28. Radii scaled from Dock to 12/13px outer and 10px indicator; search 16px.
- Layout: no navigation or dashboard row changes. Dashboard main clientHeight equals scrollHeight (739).
- Motion: reuses the actual Dock JellyController, including pressure, stretch, spring retargeting, drag-to-select and reduced-motion listener. Live intermediate matrices observed before settling, and drag committed 30 days to 24 weeks. Controller and observers disposed on unmount.
- Interaction: pointer click leaves BODY focused on dashboard; keyboard focus-visible remains. Selected semantic state and Dock position indicator remain, while extra pointer-focus decoration is suppressed. Drag release clears button focus.
- Config: search and filter live blur(20px) saturate(1.3) verified; new note material verified after correcting its canvas class. No new note was created as a test.
- Material: same CSS fallback as current Dock, not WebGL refraction. Neutral HTML background does not reproduce Lens demo's coloured backdrop. Theme-specific highlight tokens reused.
- Validation: TypeScript passed. Current desktop screenshots saved. Dark theme, narrow viewport and reduced-motion visual verification were not performed this turn. No claim of exact Lens WebGL parity.
