# issue_24219_foreign_collection_carry_26.1_alt_original_scope

Head `3147227b128` on `jmchilton`. The branch as hardened before the 2026-10-19 re-scope.

- Narrow 26.1 backport: carries only a collection selected from **another history**; 26.1's collection listing still includes hidden HDCAs (direct-only).
- Does not cherry-pick #23865; forward merge into 26.2 conflicts with `ee476eb5a3b`.
- Parent now backports #23865 whole (visible-only collection listing, carry hidden/deleted/foreign) and keeps this alt's `map_over_type` classification on top.

Use it if the hidden-collection listing change is judged too broad for 26.1.
