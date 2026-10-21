# Hevy public exercise directory replacement — 2026-10-21

- Read the public directory and its linked pages 1–13. 124 visible records, 119 distinct source post IDs; page boundaries repeat five records.
- Runtime snapshot: src/data/hevy-exercises.json, Chinese names: hevy-exercises-zh.json; source and coverage: hevy-exercises-source.json.
- Scope: public website directory only, not the 400+ app catalog. No images, animation, instructions or account data copied. No Pro/API key needed at runtime.
- Removed the previous Free Exercise DB snapshot, name dictionary, source manifest and localization script. The abandoned paid-API helper and its tests were also removed. No historical data migration or gym-device deduplication performed.
- Existing region helper tables remain for their independent composition logic; Hevy records use their own stable hevy: IDs and do not reuse old catalog names.
- Chinese display keeps English originals searchable. Explicit equipment in titles takes precedence over conflicting broad website tags; changes recorded in source metadata. Machine records do not claim plate/selectorized/Smith details absent from the source.
- Public site metadata has quality limits (e.g. broad machine tags and inconsistent muscle assignments). These are not a verified manufacturer device inventory.
- Verification: TypeScript passed; browser searched 卧推 and Incline Bench and returned Chinese Hevy entries with equipment suffixes. Search cleared afterward. Did not create a note or training record during validation.
- Rebuild from saved public HTML evidence: node scripts/prepare-hevy-public.mjs then node scripts/localize-hevy-public.mjs. Re-fetch pages and re-audit names before refreshing the snapshot.
