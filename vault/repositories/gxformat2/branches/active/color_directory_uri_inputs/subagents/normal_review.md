# Normal review debrief

Reviewed `5b6f370` (general-purpose subagent, Opus 5.5, inherited effort). Verdict: approve with minor follow-ups. No P1s. Acted on P2 and P3 1–2 in `3dd0a45`. Added a YAML comment for the predicate change.

Not acted on:
- P3 3 (`test_color_directory_uri_input_classes` partly repeats the declarative validation tests). Kept it, because the class-name assertion is the only check that the discriminator picks the new classes.
- Multiple boolean (Galaxy doesn't offer it either). It was already accepted before this branch and is outside scope, so it's left as a follow-up.
- TS twin: syncing the fixtures will turn galaxy-tool-util-ts red until a companion change lands. Recorded as a follow-up.

<details><summary>Full review</summary>

**Verdict:** Approve with minor follow-ups. 935 passed. Generated files match a fresh dry-run build byte for byte. Dispatch is consistent across every site that switches on input type. The behavior matches Galaxy `modules.py`. Native color used to fall back to WorkflowTextParameter and now correctly rejects restrictions/validators.

**Domain checks**
- BaseComment.color predicate: required. Without it the build fails with a predicate collision, and a dedicated IRI collides too. Legacy load/save code is unchanged. A one-line YAML comment would help.
- galaxy-tool-util-ts: fixture sync goes red until TS adds `directory_uri` to the GalaxyType/toNative map, the new models, directory_uri validators and the lint checks. This is coordination, not a defect.
- `java/` and `typescript/` codegen were already stale before this branch.

**P2 1:** multiple color/directory_uri is accepted even though Galaxy never supports it. `_conversion.py:535` now lets validators travel on `["directory_uri"]`. Fix: reject list types in `validate_input_parameter`, add a bad fixture, and narrow `:535`.

**P3 1:** the regex-validator type set is duplicated in `_semantic_validators` and `_conversion`. Define it once.
**P3 2:** the color/directory_uri lint checks copy `_STRING_DEFAULT`. Use `_replace(type_name=...)`.
**P3 3:** `test_color_directory_uri_input_classes` is borderline redundant with the declarative tests.

</details>
