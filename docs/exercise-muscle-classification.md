# Exercise muscle classification

`src/data/exercise-muscle-metadata.json` supplies structured metadata for all 421 built-in actions, keyed by stable source ID. It is an overlay, so the original imported source snapshots remain intact.

- `classificationSource: catalog`: preserved original source muscle assignments.
- `curated-from-movement`: nine clearly identifiable movements refined from a broad full-body assignment (one-arm push-up, overhead squat variants, frog jump, front lever, handstand, kettlebell swing, mountain climber, cable squat).
- `curated-broad`: 21 cardio entries and generic stretching. Lower-body locomotion has broad leg targets; ambiguous/general activity retains full-body. These are coarse editorial assignments, not validated activation percentages. Generic stretching cannot be assigned a specific muscle without knowing the stretch.
- Source secondary muscles are retained. An empty secondary array means no secondary muscles recorded, not proof that none participate.

Library adaptation, API output, new note insertion, and old-note restoration all use the same overlay. User training numbers and note positions are not replaced.

The pie counts only positive sets, apportioned equally between multiple primary muscles to avoid inflating totals. Secondary muscles are not added again. This is a bookkeeping convention, not a physiological stimulus weighting. Cardio and generic stretching are excluded from strength set distribution. The unfiltered pie shows specific regions across all families (upper/middle/lower chest, triceps, etc.); a muscle filter narrows these regions.

Chest/shoulder regional labels are conservative movement-name rules. Unspecific chest uses pectoralis major; unspecific shoulder uses deltoid. Existing legacy/custom records without known source IDs retain their previous label fallback.

Validation: 25 local unit tests passed, TypeScript passed. Browser confirmed the existing note reports middle chest 6 sets (35%), upper chest 3 sets (18%), lower chest 2 sets (12%), and triceps 6 sets (35%).

