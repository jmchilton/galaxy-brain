# Scope evaluation (second, after re-scope)

**Recommendation: keep.** Ship the branch as implemented at `57e1cb42c05` with no further scope change. Both items from the first evaluation are handled. E1 cannot be done on `release_26.2` and is recorded as a merge-order dependency in `index.md`. The existing `test_imported_validators_are_kept` rows go red on a naive merge, so the dependency is detectable. E2, the validator/parameter-type check, is implemented and reviewed. Since then, Codex fixed validator order, and the thermo-nuclear pass collapsed the hidden fields into one. The branch also closes a follow-up that the #24199 branch lists: `step_state_to_tool_state` collapsing persisted `in_range` validators. The new candidates are not in-branch work. The `%s` message bug for a rejected `0` (N1) is real and sits in a file this branch edits, but it is a tool-wide bug that predates this branch. It belongs on `release_26.0` as its own one-line PR. An editor `get_errors()` warning for stored invalid validators (N2) should follow John's K1 decision on #24199, because both would touch the same method. Neither is worth parking a twice-hardened branch.

## Possible Decompositions

The diff is +651/-102 over 9 files. Non-test code is +243/-99: `workflow_parameter_input_definitions.py` +145, `parameter_validators.py` +76 (about 55 of it the moved table), `modules.py` +~16 net, `linters/inputs.py` -57, and a sample. This is not a recommendation; John decides later. The commits are already ordered so that each cut below is a clean prefix or slice.

**Option 1: four PRs, in order**
1. *Model checks* (`tool_util_models`): `check_min_le_max`, `check_expression_compiles`, and the invalid XML sample (from `b9832becd58` / `578b3048f9e`). This makes tool parsing and linting stricter on its own, so tool-util reviewers can review it alone.
2. *Refactors*: Baseline tests (`4a685def277`), the form-codec move (`9aaf33da41d`), and the compatibility-table move (`b61f90bd39a`). No behavior change.
3. *Workflow round trip*: `5056fb88a4f` through `32602bf0331`, and `36b0954ce68` / `57e1cb42c05` (order, malformed lists, one hidden field), with their unit and API tests.
4. *Type compatibility*: `30c1bc91aab`, `00f3667f756` and `6c3e7a1d1a6`. This is the re-scope piece. The original-scope alt shows the branch without it.
5. E2E (`45796c881b7`, `fd41c025473`, `704fd961686`) goes with 3, or after it.

**Option 2: two PRs.** First, Baseline tests plus the two pure moves as a no-behavior refactor. Then everything else.

**Option 3: one PR** (as is).

## Scopes considered

### A. As implemented (recommended)

Declared validators round-trip unchanged, in declared order, through import, export, run and editor re-save. Validators the form cannot show go into one hidden `[position, validator]` field. Save rejects these with a 400: `min > max`, regexes that do not compile, unsafe or malformed entries, and types unsuited to the parameter. The linter and workflows share one type-compatibility table in `tool_util_models`.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes every row of the issue, the `min > max` gap, and mismatched validator types (the gxformat2#266 counterpart).</li><li>Fixes a follow-up listed on the #24199 branch (`step_state_to_tool_state` dropping `negate`/`message`/`exclude_*`).</li><li>Hardened twice: normal, re-scope, test challenge, Codex, thermo-nuclear, E2E on Playwright and Selenium.</li><li>Stored workflows still load. Only new saves are checked.</li></ul> | <ul><li>Merge-order coupling with #24199 (E1) remains, and is documented.</li><li>Hidden validators are still invisible in the editor, and a stored invalid one blocks re-save with a 400 that has no prior warning.</li><li>Two published-package changes in `tool_util_models` (stricter models, moved table).</li></ul> |

### E1. Reconcile with #24199 (carried; done as far as possible)

Whichever branch lands second lifts only form-showable ranges into run-form min/max, and adds a negated-range runtime test.

| Pros | Cons |
| --- | --- |
| <ul><li>Already recorded in `index.md`. The existing parametrized rows fail on a naive merge.</li><li>`_form_can_show` / `FORM_VALIDATOR_SHAPES` is ready to reuse.</li></ul> | <ul><li>Can't land here: `split_numeric_bounds` is not on `release_26.2` (checked against a fresh fetch), and #24199 is itself parked BLOCKED.</li></ul> |

### N1. + `%s` left in messages for a falsy rejected value (not recommended here)

`raise_error_if_validation_fails` (`tool_util_models/parameter_validators.py:694`) checks `if value_to_show and "%s" in message`. Rejecting `0` (or `""`) therefore leaves a literal `%s` in the default in_range message, for example `Value ('%s') must fulfill ...`. The fix is `is not None`.

| Pros | Cons |
| --- | --- |
| <ul><li>One line in a file this branch already edits. It is user-visible on workflow integer inputs (`0` is a common rejected value).</li><li>Fits the issue's message theme (row 4).</li></ul> | <ul><li>A tool-wide validator bug, not workflow-specific. It exists unchanged on `release_26.0`, so the base policy says to fix it there, not in a 26.2 workflow fix.</li><li>#24199 already deferred it as its own PR. Taking it here would mean parking this branch BLOCKED a second time for one line.</li><li>Better as a standalone 26.0 PR or a queued issue (`GX_QUEUING_ISSUE_CREATION.md`).</li></ul> |

### N2. + Editor warning for stored invalid validators via `get_errors()` (not recommended here)

`InputParameterModule.get_errors()` would run `check_validators` and report failures as step errors. The editor would then flag a stored invalid validator on load, instead of returning a bare 400 on re-save.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes the "invisible invalid validator blocks re-save" trap, reusing the pure `check_validators`.</li><li>About 5 lines plus a test.</li></ul> | <ul><li>Same method as #24199's pending K1 (inverted bounds). Doing it twice in parallel invites a conflict. It should follow John's K1 decision and land with whichever branch is second.</li><li>Low current exposure: only API-built or hand-edited workflows from before this branch can hold invalid validators.</li></ul> |

### E3. + `/api/workflows/upload` 500 on missing `annotation` (not recommended; unchanged)

`build_workflow_from_raw_description` reads `data["annotation"]` directly.

| Pros | Cons |
| --- | --- |
| <ul><li>One line.</li></ul> | <ul><li>Unrelated to validators, in code this branch does not touch. It belongs in its own PR or a queued issue.</li></ul> |

### E4. + Show or edit hidden validators in the editor (not recommended; unchanged)

| Pros | Cons |
| --- | --- |
| <ul><li>Makes Format2 `validators` (gxformat2#265) authorable in the UI.</li></ul> | <ul><li>A client feature with new form components. Too large for a 26.2 fix.</li></ul> |

### E5. Cross-group validator order (now done)

The first evaluation did not recommend this. Codex then showed that order changes the reported error, so it was implemented through declared positions in the hidden field. No further action.

### E6. + Build the editor form from `FORM_VALIDATOR_SHAPES` (not recommended; unchanged)

| Pros | Cons |
| --- | --- |
| <ul><li>Removes the last duplicate of "what the form shows" (thermo-nuclear follow-up).</li></ul> | <ul><li>A pure refactor of pre-existing code, with no fix. Better as a dev follow-up.</li></ul> |

### C1. Contract: ship the original scope (alt `3a0384164ee`)

The branch without the type-compatibility check.

| Pros | Cons |
| --- | --- |
| <ul><li>One fewer `tool_util_models` change, and no new rejections of mismatched types.</li></ul> | <ul><li>Mismatched validators would be stored and misbehave at run time (`length` on a boolean raises `TypeError`, a regex on a boolean rejects everything).</li><li>Galaxy would diverge from gxformat2#266.</li><li>Discards reviewed work with no gain.</li></ul> |

### C2. Contract: drop the `tool_util_models` model checks (unchanged; not viable)

Regexes that do not compile would pass import again, and tools would lose lint-time `min > max` errors.
