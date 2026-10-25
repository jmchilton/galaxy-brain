# Scope evaluation (second pass) — custom_build_from_fasta

**Recommendation: keep this branch as implemented (scope A) and send the newly found product bug, with the API test that exposed it, to the sibling `custom_build_no_converter_400_26.0` (scope G). The first pass's scope B was built on a wrong premise. API tests load the stock `datatypes_conf.xml.sample`, which already has the FASTA converters, so the API test never needed this branch's datatypes hunk. It then failed for a different reason. `add_custom_builds` calls `get_converted_dataset(trans, ...)` without `history=`, so for an API-key request the converter runs with `trans.history` set to None and hits `assert history` (`tools/actions/__init__.py:533`). Every API-key FASTA custom build gets a 500 "Failed to convert dataset." This is a real bug on the path this branch's E2E covers, so it should be fixed alongside. But the fix goes in the same `try` block that `custom_build_no_converter_400_26.0` (no PR yet, older base, already holds the custom-build `test_users.py` tests) and #24310 rewrite. Putting it here would make a three-way conflict on merge-forward, and a 26.2-only fix would leave 26.0 broken. G adds the history fix (two calls, passing a history owned by the requesting user) and the owner happy-path API test to that sibling. The base policy points at 25.1, so where G lands is a question for John. A 26.2 E2E-only PR stays clean and has no dependency on it.**

Reviewed `origin/release_26.2...364768249c4` (2 commits, 3 files, +70/−60; HEAD unchanged, worktree clean) in `/Users/jxc755/projects/worktrees/galaxy/branch/galaxy_ui_driver`. New input: the coordinator's scope-B implementation attempt, which was reverted. Its findings were checked against the code:
- `users.py:578-579` doesn't pass `history=`.
- `convert_dataset` takes `history=None`.
- The tool-action path passes `history=history` (`tools/actions/__init__.py:212-218`).
- The `assert history` is at line 533.
- The coordinator reports the same code on `origin/dev`.

Prior pass: [earlier_drafts/1/scope_evaluation.md](earlier_drafts/1/scope_evaluation.md). Sources as before: all debriefs, #24309 records, and the `custom_build_no_converter_400_26.0` and `better_custom_build_error_handling_25.1` (#24310) records.

Corrections to earlier claims:
- First pass: "this branch's datatypes hunk unblocks #24309's red API test" is wrong. The hunk only affects selenium/framework servers (`framework_tool_and_types`).
- #24310's debrief says "API test datatypes can't convert fasta → len". That is wrong too. The real blocker is the missing `history=`.
- #24309's `index.md` says its red test "needs the fasta→len→linecount converters in test datatypes". Also wrong. It needs the history fix, because its PUT goes through the same broken path.

## Possible Decompositions

130 changed lines, all hand-maintained. These are options only. No split is recommended.

1. **One PR, both commits**: refactor `f4efcfbec35`, then feature `364768249c4`.
2. **Two PRs**: the refactor (existing 2 tests only, applies cleanly on 26.2), then the FASTA test, which depends on the refactor's `name`/`key`/`definition`/`save` components.
3. **Datatypes hunk alone, then the rest.** This is less attractive than in the first pass. The hunk serves only this E2E and no longer unblocks any API test.

## A. As implemented (recommended for this branch)

Helper refactor onto `custom_builds` components. Then `test_build_add_from_fasta` with its components and the framework `fasta -> len -> linecount` datatypes. It re-navigates after `wait_for_history()` to work around #24309.

| Pros | Cons |
|---|---|
| - Closes the FASTA-path E2E gap for 26.2. Red without the datatypes hunk. Fully hardened, green 3/3 on both backends.<br>- Test-only, so it can't conflict with the custom-build `users.py` fixes on 25.1/26.0.<br>- UI path is unaffected by the history bug, because a session request has a `trans.history`. | - Leaves the custom-build API happy path unpinned and the history bug unfixed on this branch. Mitigated by G. |

## G. History fix + owner happy-path API test on `custom_build_no_converter_400_26.0` (recommended, in the sibling)

On the 26.0 sibling (or on 25.1, John's call), pass a `history=` owned by the requesting user (e.g. their current/most recent history) to both `get_converted_dataset` calls in `add_custom_builds`. Add `test_custom_build_from_fasta` (PUT `len|type=fasta`, wait, GET, `count == 2`) next to the sibling's existing `test_custom_build_from_unconvertible_dataset`. Red is the 500 `AssertionError` path, green is count 2.

| Pros | Cons |
|---|---|
| - The fix lands where the code is already being changed. One merge-forward resolution, not three.<br>- Older base, so 26.0, 26.1 and 26.2 all get it. Base policy (oldest supported release with the bug) points to 25.1, so 26.0 is a compromise to avoid touching John's open #24310. Fits the sibling's "custom build API errors" theme, and the sibling has no PR yet, so its scope can still grow.<br>- Gives #24309 the working PUT its red test needs. | - Expands another branch's scope, which needs that branch's own review/scope pass.<br>- Not on 25.1. #24310 is John's opened PR and shouldn't be edited without asking. A 25.1 backport is John's call. |

<details><summary>Details</summary>

- Pass a history owned by the requesting user (e.g. their current/most recent history). For session requests that matches today's behavior.
- 25.1 is the oldest supported base with the bug. #24310 is John's open PR there, so placement is a question for John.
- The API test doesn't need this branch's datatypes hunk. API servers load the stock conf, which ships `fasta_to_len`/`len_to_linecount`.

</details>

## B. A + history fix + API test on this branch

The first pass's B, corrected: the 2-line `users.py` fix plus the API test, here on 26.2.

| Pros | Cons |
|---|---|
| - Everything about the FASTA custom-build path is in one PR. | - Turns a test-only PR into a product fix in the same `try` block as `custom_build_no_converter_400_26.0` and #24310. Guaranteed 3-way conflict on merge-forward.<br>- 26.0/26.1 stay broken unless it's done twice. |

## H. Model-level default history for callers of `get_converted_dataset` that omit `history=`

Fix the bug for every caller that omits `history=`: `services/datasets.py:984,1063`, `visualization/genomes.py`, `data_providers/registry.py`, `managers/dbkeys.py`.

| Pros | Cons |
|---|---|
| - General fix. The converted-dataset endpoint and other API callers probably have the same API-key failure. | - Unverified for those callers. The default must be a history owned by the requesting user. Changes where implicit conversions land for session requests (today the current history), so a behavior change across the codebase.<br>- Belongs on dev or its own branch with tests per caller, not on a 26.2 E2E PR. Worth a follow-up investigation. |

## C. Fold in the conversion-error fix (`NoConverterException` → 400)

| Pros | Cons |
|---|---|
| - Same code path. | - Already implemented on `custom_build_no_converter_400_26.0`. It reaches 26.2 by merge-forward. Duplicating it here guarantees conflicts. |

## D. Fold in #24309 (list pending/failed FASTA builds, client polling)

| Pros | Cons |
|---|---|
| - Fixes the user-facing bug the FAQ walkthrough hit, and lets the E2E drop its reload workaround. | - A separately filed, assigned issue with its own proposal; schema, API, generated types and Vue changes need their own review.<br>- Its red API test now depends on the history fix (G), not on this branch. |

## E. Contract: feature commit only

| Pros | Cons |
|---|---|
| - Smallest diff. | - The feature commit needs the refactor's components. It would bring back the `UX_RENDER` sleep/retry the reviews removed. Decomposition 2 already gives the separation. |

## F. Expand E2E: dbkey picker check, delete the FASTA build

| Pros | Cons |
|---|---|
| - Covers using the build. | - The picker path isn't FASTA-specific, and delete is already covered by `test_build_delete`. Low signal for the runtime cost. |

## Follow-ups (not scope changes for this branch)

- G: ask John whether it goes on `custom_build_no_converter_400_26.0`, a new branch, or on 25.1 next to #24310.
- Correct the stale prerequisite in `issues/queued/24309/index.md` (needs the history fix, not test datatypes) and the claim in #24310's implementation debrief.
- Investigate H: whether `GET /api/datasets/{id}/converted/{ext}` and the visualization callers also fail for API-key requests.
- Update this branch's `index.md`: the related issues are #24309, `custom_build_no_converter_400_26.0` and #24310, not `to_file` drafts.
- Once #24309 lands, switch `test_build_add_from_fasta` to wait for the row.
