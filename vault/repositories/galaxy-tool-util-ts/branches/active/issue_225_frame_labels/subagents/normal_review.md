# Normal review — `issue_225_frame_labels` @ `0e74a2f0`

Run via Claude Opus 5.5 at low effort.

Verdict: approve with one P2. The P2 didn't reproduce; I acted on one nit: `format2StepLabelIndices` in `labels.ts` is now shared by `_registerLabels` and `unresolvedFrameReferences` (`ebf58cd0`).

Not acted on:
- **P2 `convert-tree` crashes on a bad frame:** disproved. `tree.ts` already catches each file's error: `bad.gxwf.yml: ERROR (Frame 'Typo' references …)`, and the good file still converts.
- **Wide try in `convert.ts`:** acceptable for a CLI; it reports one line, matching other CLI errors.
- **gxwf-web:** conversion throws surface as a 500 with the message, like every existing conversion error. A 422 is an API-contract change shared with Python gxwf-web, so it's a follow-up.
- **Digit strings without a range check:** matches Python; follow-up.
- **`commentLabelMap.get(ref)!`:** relies on the pre-check ordering, which is intended.

<details><summary>Full review</summary>

- Label resolution matches TS conversion (`label ?? id`); fixtures synced.
- Other `toNative` callers (`graph-builder.ts`, `ensure.ts`, `expanded.ts`): library paths where a clear throw beats a `null` child.
- Dict-form comments: `{ label, ...comment }` lets an explicit label win, matching Python. This is a behaviour change from `{...comment, label}`.
- Subworkflow frames are checked against their own labels (tested).
- Profiles and exports are right; changeset patch for schema and cli.
- No weakened tests. No security concerns.

</details>
