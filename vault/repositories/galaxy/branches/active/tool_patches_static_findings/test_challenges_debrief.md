Run via Claude Opus at high effort.

# Test challenges: `test_patch_review.py`

Scope: `test/unit/tool_util/security/test_patch_review.py`, the only test file this branch's integration adds. This is a fresh pass after the re-scope. Commits: `937ca04214d` (guard case, from the re-scope review) and `87eab50a554`. The earlier draft is in `earlier_drafts/1/test_challenges_debrief.md`.

## Layer

The review and its CLI are offline. They use no Galaxy app, server or browser, so unit tests are the right layer, and no API, integration or E2E test applies. `test/integration/test_tool_patches.py` covers runtime patching, which is the parent's code, not this branch's. The fixtures are real: synthetic patch collections written with the `tool_patches` test helpers, `identifier_single.xml`, and synthetic awk and import tools written to `tmp_path`. No `Mock` is used.

## Changes

- **`--fail-on uncleared` test reshaped** to mirror the mismatch test as `(patch, fail_on, exit_code)`. The test is now `test_cli_fails_on_an_applied_security_patch_that_clears_nothing_only_when_asked`, with four cases:
  - `default`: a cosmetic security patch without the flag exits 0. This pins that the gate is opt-in.
  - `clears`: a cleaning patch exits 0.
  - `clears-nothing`: a cosmetic patch with the flag exits 1.
  - `compat`: an applied compat patch that clears nothing, with the flag, exits 0. This pins that the gate covers security patches only, as the mismatch test's `compat` case does for mismatch.
- **Ids** now use hyphens, like the rest of the file. The old ones were `clears_its_finding` and `clears_nothing`.
- **`STALE_COMPAT` replaced** by a local `_compat_patch(ops)` helper, shared by the mismatch and uncleared tests. A shared `compat_patch` next to `security_patch` in `unittest_utils/tool_patches.py` would be parent (`tool_patches`) code. `test_tool_patches.py` has its own `compat_doc`, so a shared helper is worth doing if the parent is reopened.
- **Guard case added** (`937ca04214d`): `fail-on-uncleared` in `test_cli_rejects_patch_options_without_a_collection`.

## Red-to-green

Each new case fails at its own assertion, not at argparse:

| Mutation | Failing case |
|---|---|
| `PatchReview.uncleared` returns `False` | `clears-nothing` |
| `kind == SECURITY` filter removed | `compat` |
| `FailOn.parse` turns `uncleared` on always | `default` |
| guard tuple set back to `(MISMATCH,)` | `fail-on-uncleared` (guard test) |

The `clears` case fails if `not self.cleared` is dropped, by reasoning.

## Kept, and why

- **Library tests:** clearing, cosmetic rewrite, new sink, unquoting, severity raise and lower, decode (uncheckable), import-line append and reorder, and reason-only churn. Each pins a distinct match-key or notes behaviour of the reusable `review_patches` API.
  - `test_cleaning_patch_clears_its_finding` overlaps `test_cli_text_shows_patch_states_and_cleared_findings`. It is kept as the one library-level happy path, because `review_patches` is public API and a split that lands the library first would need it.
  - The reason-only churn test builds two `Report`s directly. No real tool flips `NOT_ANALYSED` to `NOT_CHECKABLE` with no other note change.
- **CLI tests:** usage errors (exit 2 plus message), JSON shape, text lines, `--min-severity`, mismatch, uncleared, broken template, error entry and judge.
- **`test_cli_lists_a_patch_review_that_raises_as_an_error`** monkeypatches `review_patches` to raise. No real input makes it raise, and a one-line stub is the simplest seam.
- **`_RecordingJudge`** is a small class (no `Mock`) that implements `assess`. `main` builds `AnthropicJudge()` itself, so the monkeypatch is the only seam.

## Not changed

- **No test for a severity-lowering security patch under `--fail-on uncleared`.** It fails today, and the semantics are a decision for John (see `subagents/review_rescope.md`). A test can pin the answer once he decides.

Suite: `test/unit/tool_util/security` + `test/unit/tool_util/test_tool_patches.py`, 800 passed.
