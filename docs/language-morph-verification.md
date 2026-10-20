# Language morph button verification

Scope: language preference/icon only. English page copy is intentionally deferred by user instruction. Theme icon implementation is unchanged.

## Files

- `src/components/LanguageMorphButton.tsx`, `.module.css`: real two-character button with one Motion spring.
- `src/lib/language-morph.ts`: shared position/scale/opacity mapping.
- `src/components/LanguageProvider.tsx`: existing `kuizfit-language` preference persistence, plus shared state and storage-event synchronization. Does not translate page copy or mislabel the document language.
- `src/components/AppNavigation.tsx`: replace only the language control.
- `src/components/AppShell.module.css`: extend the existing theme button's glass styling to the language button; restore a compact header after removing inline drop-select.
- `src/app/(private)/layout.tsx`: mount preference provider; no authentication/database logic changed.
- `tests/language-morph.test.ts`: semicircle and visual-weight regression checks.

## Reference reuse

Arc source: https://uiarc.dev/r/icon-morph.json and its motion tokens. The existing native SunMoonIcon remains unchanged. Language animation follows Arc's stable Motion values and reversible spring approach, with the user's requested 380/32/0.8 spring parameters.

Lens sources reviewed: `component-patterns.js`, `components.css`, `tokens.css`, `runtime.js`. Material reuses kuizFit's existing Dock/theme-button CSS, avoiding another GPU renderer.

## Fidelity checklist

| Area | Verified / distinction |
| --- | --- |
| Geometry | Browser measured language, theme and avatar buttons at 38×38px with equal top alignment. Radius remains 10px, matching the completed theme button. |
| Path | One shared `p`; 文=(-r cos πp,-r sin πp), A=(r cos πp,r sin πp). Radius 7px fits the 38px button instead of the reference's 48px / 9px example. |
| Mid-animation | Actual DOM sample: 文 matrix scale=.899311, translation=(-5.10675,-4.7876), opacity=.9089; A scale=.680689, translation=(5.10675,4.7876), opacity=.7111. Both on the expected opposite semicircles, positive scale, no rotation/skew terms. |
| Shared weight | Scale and opacity derive from the same progress as coordinates. Neither glyph is hidden or replaced. |
| Interaction | Browser tested clicks, a rapid double-click, state/persistence, and phone layout. Double-click returned to the original selected state. Intermediate samples confirm curved motion; not a frame-by-frame recording of every reversal. |
| Motion | Motion useSpring retains position/velocity on target changes. No manual RAF loop. Reduced motion uses `jump`; simulated reduced-motion system settings were not tested. |
| Material | Both buttons computed `blur(20px) saturate(1.3)` and share the same background/rim/shadow declaration. CSS material does not provide Lens WebGL scene refraction. |
| Responsive | Desktop/default viewport and 390×844 phone inspected. No physical iOS device tested. |
| Resources | Hook lifecycle handles animation cleanup; preference event listener is removed on unmount. No new WebGL renderer. No heap/GPU profiling performed. |

## Self-review

The two glyphs are stable DOM nodes, remain upright and visible, and are not swapped or cross-faded. The glass layer does not control glyph transforms. Existing theme behavior was not rewritten. Geometry, transforms and mid-animation opacity have browser evidence; exact WebGL fidelity, physical-device safe areas and long-run memory behavior are not claimed.
