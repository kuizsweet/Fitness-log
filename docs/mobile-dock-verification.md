# Mobile Dock reference and verification

Reference: https://github.com/ruiqichenbiec/design-systems/tree/main/lens/lab/design-system

The repository's Lens Dock supplies geometry and its original JellyController / Spring implementation. MIT notice is retained in `src/vendor/lens/LICENSE`. The only gesture integration change makes native link elements valid pointer-capture targets alongside buttons, preserving normal links and modifier-key navigation.

## Checklist

| Area | Evidence / status |
| --- | --- |
| Geometry | Source: 4px inset, 62px item and indicator height, 27px outer radius, 23px indicator radius, 6px icon-label gap, 11px label. Local measurements: 70px overall height; four equal items. |
| Position | Local phone 390×844: 358px width, 16px side inset, 12px bottom offset. Tablet 834×1112: 440px centered width, 12px bottom offset. Safe-area inset added in CSS; iOS device not tested. |
| Motion | Original bounded-step spring and deformation matrix retained, including velocity-dependent stretch, pressure and release. No CSS timing substitution. Original reduced-motion handling retained. |
| Interaction | Browser tested ordinary navigation tap and drag-to-select release. Current route sets active link. Original drag click-suppression and cancellation retained. |
| Layout | Desktop 1440px: top nav visible, bottom nav hidden. Phone/tablet: top nav hidden. Bottom clearance added to all app content areas. Global nav gap and margin overrides corrected after inspection. |
| Theme | Light phone and dark tablet screenshots inspected. User theme restored afterwards. |
| Material difference | CSS backdrop blur/saturation and rim are used. This does not implement Lens's WebGL refraction of its generated scene. It is not pixel-identical to the WebGL demo. |
| Product adaptation | Four existing app destinations and Lucide icons replace reference demo destinations/icons. Bottom placement follows user screenshot; 440px tablet maximum is a local layout decision. |

## Self-review

- Geometry and interaction above come from source or browser measurements.
- Rim/shadow styling and page-backed material are an adaptation, not a verified copy of the WebGL shader.
- Elastic physics were reused, not replaced with a simple transition.
- Real iOS safe areas, mobile GPU performance and frame-by-frame shader comparison remain unverified.
- Screenshots: `test-results/meals-gallery/dock-phone.png`, `dock-tablet-dark.png`.
