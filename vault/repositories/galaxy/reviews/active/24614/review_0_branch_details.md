`pr_24614_review_0` builds on the reviewed commit `cbb45b061b1` and addresses both P3 findings: a full upgrade now writes the bumped uv pin to `.tool-versions` only after the lock and all exports succeed, together with the other checked-in exports, and `packages/README.md` stops hardcoding the uv version that the weekly update will now change.

- `f798982402b` Write the bumped uv pin only after lock and exports succeed — moves the `.tool-versions` copy into the final non-check block, guarded by the temp file existing (P3 1).
- `39fa0d409e3` Drop hardcoded uv version from packages/README.md — removes the "(`uv 0.12.23`)" parenthetical (P3 2).
