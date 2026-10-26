# Codex review debrief

Codex raised two P2 findings, and I confirmed both against the installed `@galaxy-tool-util` 1.14.0 source. Both are fixed in `064ff5a5`; nothing was refuted.

- **Skip drops map-over rank.** In `connection-validator.js`, a `skip` connection pushes `null` into the map-over contributions, while a declared collection output keeps its base type. A non-null type behind a skip can therefore be missing a rank. Fix: `validate.md` now treats any value at or behind a `skip` as unknown, and the eval's deterministic property excludes those paths.
- **`change_datatype` overrides format.** `toNative.js` maps `change_datatype` to `ChangeDatatypeAction`. The step 4 `ftype` check and the eval datatype property now prefer it over the tool output's `format`.

Thermo-nuclear review skipped: the branch has no implementation or test code, only Mold/eval/CLI-note prose and regenerated casts.

<details><summary>Full findings</summary>

1. P2 correctness, `content/cli/gxwf/validate.md:30`. "Non-null collection types can omit unresolved map-over ranks." Skipped connections contribute null to map-over inference (connection-validator.js:54-58), and declared collection outputs keep their base type (:203-228). Scenario: an unknown list feeds a dataset input on a list-producing tool. Galaxy makes `list:list`, gxwf reports `list`.
2. P2 correctness, `eval.md:38` and step 4. "Datatype agreement must account for workflow datatype actions." `change_datatype` → `ChangeDatatypeAction` (toNative.js:59; Galaxy post.py:134). A correct `ftype: tabular` after `change_datatype` would fail the eval.

Coverage: all authored files, plus the installed gxwf implementation. Generated casts and Dashboard were excluded.
</details>
