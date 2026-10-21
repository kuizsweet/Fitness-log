# Video supplement — 2026-10-21

Source: user supplied 7eeec41acdc4e5437773f0062f66166c.mp4 (116.8 seconds, 3501 decoded frames).

Processing: decode all frames; inspect list-area changes at <=0.2s intervals. Retain 552 change frames at source resolution. Windows Chinese OCR processed all 552 frames; repeated text, spatial title/muscle pairing and manual text review produced the review manifest. Original frames were visually inspected for ambiguous rows and equipment variants. This does not certify every OCR word or app translation as anatomically authoritative.

Result: 401 normalized observations, 99 linked to existing catalog records as searchable aliases, 302 additional records; total 421. New records store source frame/time and original label. No images or animations added to the app. Gym inventory reconciliation remains out of scope.

Files: hevy-video-review.json is the reviewed manifest; hevy-video-exercises.json contains additions; hevy-video-links.json contains aliases to existing source IDs. The public website snapshot remains separate. Re-running public website extraction does not erase video additions.

Pending five source labels: 平卧划举, 跪姿撑体, 双杠, 肩部水龙头, 单腿（机器）. Source wording is insufficient to safely identify a precise movement; excluded from the live catalog. Unknown equipment remains null rather than inventing plate/selectorized details. Machine Plates is mapped to plate-loaded; Smith remains distinct.

Validation: 103 tests passed after integration; TypeScript passed after Chinese chest-orientation handling. Actual config page showed 上斜卧推（史密斯） under chest/upper-chest and search 史密斯; cleared search afterward. Existing filter selection was preserved. No user training records created, deleted or migrated.
