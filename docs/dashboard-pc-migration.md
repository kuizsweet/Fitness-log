# kuizFit PC Dashboard migration

Scope: PC Dashboard only. Existing 960px boundary is retained; the smaller-screen presentation and authentication pages are not redesigned. No database, RLS, auth provider or production configuration changes.

## Layout and design rules

The supplied structural reference uses a 12-column grid. Training console: columns 1–6, rows 1–2. Training plan/items tabs: columns 7–9, row 1. Standalone compact calendar: columns 10–12, row 1. Strength progress: columns 7–12, row 2. Body goals, muscle analysis and weekly load: four columns each, row 3.

Palette: page #191919, cards #111111, inset surfaces #202020, borders #303030, text #f4f4f5, secondary #a1a1aa. Restrained blue identifies the training action and selected date; existing blue strength/green cardio markers retain their meaning. No gradients, glass or decorative charts. Titles 16px/600; body 14px; secondary 12px; primary console state 28px. Grid gap 14px, card padding 18–22px, radius 18px. Content aligns left. Card sizes follow their hierarchy rather than being made identical.

## Existing feature → new entry and dependency

| Feature | New PC location | Existing source retained |
| --- | --- | --- |
| Date/year/month/today and training markers | Independent calendar in slot 03 | TrainingCalendar + calendar.ts + monthly sessions query |
| Daily sessions, notes, exercise/set counts | Large training console, scrollable record list | sessions GET, workingSets, existing session editor links |
| Start/add training | Console primary/secondary actions | /train?date and /session/new?date |
| Deleted sessions and restore | Console disclosure | Existing deleted query and PATCH with revision |
| Daily check-in/streak | Dashboard quick-action bar | Checkins, checkins GET/POST and server RPC |
| Public ranking/visibility preferences | Quick-action link and existing navigation | /leaderboard, unchanged preference UI |
| Breakfast/lunch/dinner, notes, uploads, deleted photo restore | Meals dialog for selected date | MealsCard → Meals → existing meals/photos APIs |
| Refresh after focus/save/import | Existing resource/event behavior | useResource, fitness-data-change |

The existing check-in endpoint provides today's status and streak, not daily check-in history. Only the confirmed current check-in date can be marked on the calendar; no historical dots are fabricated.

## Capability boundaries

- Session editor already supports planned sessions, strength/cardio classification, ordering, weights, repetitions, RIR/RPE, failure tags and manual rest seconds. The dashboard links to those real editors.
- No working training/rest countdown or failure-analysis engine exists. Their reserved console area must say it is unavailable; no running clock or start control is simulated.
- Training plan tab can reuse the earliest future saved planned strength session. It is not labelled tomorrow and does not implement rotation, automatic advancement or skipping.
- No persisted item-list, body measurements/targets, strength trends, muscle-analysis or weekly-load service exists. Their cards expose honest empty/unconnected states. No charts or computed analysis are introduced in this phase.

## Implementation structure

- Dashboard owns the shared resource hook and selects the PC view using the existing 960px boundary. The legacy small-screen presentation remains untouched in scope; only one view is mounted at a time.
- DesktopDashboard owns the seven-card PC grid and native meals dialog. Native dialog focus/escape handling is used and the meal editors remain mounted when the dialog closes.
- Shared data hook preserves the profile, monthly sessions, selected-date meals, focus refresh and existing save/import notifications.
- DeletedRecords was moved intact, retaining its revision-checked restore request.
- Tabs are a CSS-module-styled adaptation of shadcn's Radix implementation: https://ui.shadcn.com/r/styles/new-york-v4/tabs.json . Added @radix-ui/react-tabs@1.2.1 (MIT, compatible with React 19); the existing shadcn MIT notice is retained. No chart dependency is installed before chart data is connected.
- Visible PC brand and dashboard document title use `kuizFit`. Authentication and unrelated pages are deliberately left unchanged under the task's scope constraint.

## File inventory

Modified:

- `package.json`, `package-lock.json`: Tabs dependency.
- `src/app/(private)/dashboard/page.tsx`: dashboard document title.
- `src/app/(private)/layout.tsx`: route-aware Dashboard brand slot only.
- `src/components/AppNavigation.tsx`: Dashboard-only brand; existing menu/action behavior retained.
- `src/components/Dashboard.tsx`: shared data composition and PC/legacy presentation selection; old PC rendering replaced.
- `src/components/Checkins.tsx`: optional toolbar presentation and data callback; existing RPC calls, leaderboard and settings behavior retained.
- `src/components/TrainingCalendar.tsx`: optional title/current confirmed check-in marker; date computation and selection behavior retained.
- `scripts/smoke.mjs`: stale login-heading assertion replaced with the actual password-field presence check. The earlier heading rename had already made this assertion fail before the Dashboard changes; no authentication UI edit was needed.

Created:

- `src/components/dashboard/DesktopDashboard.tsx`: PC composition and functional entries.
- `src/components/dashboard/Dashboard.module.css`: PC-scoped tokens, grid, header and dialog styling.
- `src/components/dashboard/useDashboardData.ts`: existing resource/event logic extracted for reuse.
- `src/components/dashboard/DeletedRecords.tsx`: existing restore UI/logic moved for reuse.
- `src/components/ui/tabs.tsx`: adapted shadcn/Radix Tabs.
- `src/lib/dashboard.ts`: pure saved-plan selector.
- `tests/dashboard.test.ts`: earliest future strength-plan selection, excluding past, cardio, unclassified, completed and deleted records; original order preserved.
- `docs/dashboard-pc-migration.md`: this report.

Deleted files: none. The old small-screen view still carries working features and is retained because mobile work is excluded. No shared global CSS, auth page/component, API, database, RLS or credential/configuration changes.

## Verification results

- Production build, TypeScript check, ESLint and diff whitespace check passed.
- 35 tests passed, including existing calendar, check-in, data isolation, photo handling and the new saved-plan selection case. Database tests use the existing local PostgreSQL test engine, not production data.
- Local HTTP smoke passed: unauthenticated business pages redirect and protected APIs reject access. Its first run exposed the stale login copy assertion described above; the corrected check passed.
- Actual authenticated browser checks at 1440×900, 1280×720 and 1024×768. Seven visible cards, 12-column placement, no overlap or horizontal overflow. With the real empty training state, no page or card vertical overflow at these sizes. Long records and dialog content can scroll intentionally within their containers.
- Browser date check: selecting 2026-10-14 updated both training action URLs and the meals dialog date. Switching to February 2024 exposed February 29; choosing it and changing to 2025 selected February 28; Today restored the current date.
- Plan/items tabs switch in place; ArrowLeft returns to the training tab.
- Meals dialog: breakfast/lunch/dinner controls and original upload inputs present, lunch selection retained after closing/reopening, Escape closes and focus returns to its launcher. The dialog was corrected to center after detecting Tailwind's reset of the browser's default dialog margins.
- Deleted-record disclosure successfully fetched the real empty result. The selected account had no corresponding deleted training to restore.
- Existing check-in returned a real 1-day streak and an already-checked-in disabled button; the corresponding date carried the check-in marker. No historical check-in status was inferred.
- Start training opened `/train?date=2026-10-15`; add record opened the original editor with training date 2026-10-15. Ranking entry opened the existing page with its real preference controls. No save or new workout was submitted.
- Other-page isolation: training route returned to the original white page background. Git diff confirmed auth files, global CSS, API routes and domain/calendar calculation files unchanged.
- Browser artifacts: `test-results/dashboard-pc/1440x900.png`, `1280x720.png`, `meals.png`, `layout-1440.json` (ignored local verification outputs).
- No mobile styling or visual QA was performed. No production deployment was performed.

## Unverified / follow-up business work

- Live creation/editing of a workout, meal-note save, photo upload/replacement/restoration, deleted-workout restoration and a fresh check-in were not submitted in this visual migration. Existing handlers and backend tests remain in place; no test records or demo content were added to the user's account.
- The current account had no future planned strength session, so the populated plan branch is covered by selector tests and source inspection, not a populated live screenshot.
- Strength/cardio marker calculations are covered by existing tests; the current month's live records were empty, so no training markers were fabricated for screenshots.
- The four statistics cards, item persistence/daily checklists, rotation rules and timer/analysis tools need future approved data/business work. Measurement goals need a real model and UI; historical check-in markers need a read API. None are simulated here.
