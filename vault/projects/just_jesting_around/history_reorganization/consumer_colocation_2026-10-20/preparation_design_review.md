# Preparation design normal review

Reviewed `readability_plan.md`, `readability_inventory.json`, and the proposed AST-fragment scheduling design against `REVIEW_FOCUS.md`. Approved to prepare dangling replacement commits; no branch updates are approved by this review alone.

No blocking design findings. The plan correctly distinguishes existing base exports from new API, retains compatibility implementations until unmigrated consumers move, schedules internal/private dependency closures, pairs matcher augmentation deletion with replacement, and keeps helper-specific README prose with its consumer. Exact final-blob restoration preserves formatting and behavior.

Implementation gates:

- Resolve import origins, not only identifier spelling, before using candidate inventory ownership.
- Resolve support-to-support dependencies transitively and count those as exercised only if an actual introduced test/story reaches the helper.
- Check intermediate full-tree imports, including unchanged tests; final-tree equality alone cannot validate history.
- Keep legacy declarations until their last live importer migrates; preserve private/default dependencies of both versions.
- Verify hoisted Vitest mock factories and exported spy initialization order in GalaxyAI modules.
- Restoring a final blob must not reintroduce an otherwise premature exported helper.
- Preserve all final lane trees, messages/trailers/provenance, recording server and draft RFC/video. No new branches or PR splits.

Stories/play classification is in `story_play_audit.md`. Keep genuine framework API cohesive, move component fixtures and assertion helpers into the first consuming conversions, and retain accessibility policy and historical audit evidence without weakening strict checks.

A separate final prepared-object review remains required before updating refs/pushing.
