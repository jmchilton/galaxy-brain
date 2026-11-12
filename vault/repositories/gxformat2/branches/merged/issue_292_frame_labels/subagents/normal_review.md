# Normal review — `issue_292_frame_labels` @ `c0e5f73`

Run via Claude Opus 5.5 at low effort.

Verdict: approve, no bugs. Acted on nothing; both optional points stay out of scope.

Not acted on:
- Out-of-range integer / digit-string indices (`99`) lint clean and convert to a dangling `child_steps` entry. Issue doesn't ask; follow-up.
- Four nested `_child_context` calls in `_validate_frame_references` could be a loop. Cosmetic.

<details><summary>Full review</summary>

- Label sets match: `known_labels` (`label or id`, input ids) equals `_register_labels` / `_register_subworkflow_labels`; labels checked before index fallback, so a step labelled `"2"` resolves identically.
- One method feeds lint and conversion; old ad-hoc `Exception` for comment labels gone.
- Dict-form comments (labels from keys) probe: lint clean, conversion resolves.
- Subworkflows covered by recursion plus a test.
- Rule severities/profiles match existing `Linter` classes and `lint_profiles.yml`; pointers exact.
- Fixtures minimal, all catalogued, exact-string assertions port cleanly to TS. No weakened tests.
- `_is_index_string` is stricter than `int()` (`"-1"`, `" 2"` flagged): right direction.
- `frame_description` / `UnresolvedFrameReference` placement in `_format2.py` is fine.

No security concerns.

</details>
