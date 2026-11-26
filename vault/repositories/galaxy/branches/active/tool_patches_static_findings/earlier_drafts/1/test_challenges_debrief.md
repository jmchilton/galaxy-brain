Run via Claude Opus at high effort.

# Test challenges: `test_patch_review.py`

Scope: `test/unit/tool_util/security/test_patch_review.py`, the only test file this branch's integration adds. The `finding_to_dict` rename in `report.py` is covered by the existing `Report.to_dict` tests and by the CLI JSON tests here. Commit: `a417855700b`.

## Layer

The review and its CLI are offline and use no Galaxy app, server or browser, so unit tests are the right layer: no API, integration or E2E test applies. The fixtures are real: synthetic patch collections written with `tool_patches` test helpers, `identifier_single.xml`, and a synthetic awk tool written to `tmp_path`.

## Changes

- **Dropped `test_patch_breaking_the_template_is_a_regression`.** `test_cli_fails_on_a_patch_breaking_the_template` covers the same case more strictly: exit 1, and NEW lines equal to exactly the two notes, which implies no introduced finding. The library test only checked `assert review.notes_added`.
- **Rewrote `test_unmatched_tool_reviews_once` as `test_unmatched_tool_has_no_patch_changes`.** It asserted `after is before`, which skips a second review. That is an implementation detail. The new test asserts what callers see: no patch, the unpatched finding still reported, and nothing cleared, introduced or added.
- **Stricter:**
  - `test_cli_rejects_a_missing_collection` now asserts exit 2 and the error text, not just any `SystemExit`.
  - `test_cli_matches_shed_keys_by_guid` now also checks that the shed-keyed patch does not match without `--guid`. Without that check, the test would pass if guid handling were a no-op.
  - The mismatch test gains a `compat` case: a mismatched compat unit does not fail `--fail-on mismatch`. This pins the security-only scope.

## Kept, and why

- Clearing, cosmetic rewrite, new sink, unquoting, severity raise and lower, decode (uncheckable), reason-only churn: each is a distinct match-key or notes behavior.
  - The reason-only churn test builds two `Report`s directly rather than finding a real tool that flips NOT_ANALYSED to NOT_CHECKABLE with no other note. It uses no mocks.
- CLI usage errors (`_usage_error` asserts exit 2 plus message), JSON shape, text lines, `--min-severity` filtering, mismatch, and an error entry.
- `test_cli_lists_a_patch_review_that_raises_as_an_error` monkeypatches `review_patches` to raise. No real input makes it raise, and a one-line stub is the simplest form.
- `test_cli_judges_the_patched_source` uses a small `_RecordingJudge` class (no `Mock`) that implements the judge's `assess`. `main` builds `AnthropicJudge()` itself, so the monkeypatch is the only seam. Injecting a judge factory into `main` was not worth it for one test.

## Red-to-green

Every test is new on this branch, so none is a baseline test. The step 1 fixes went red first:

- severity raise;
- decode → uncheckable;
- the JSON shape without `after` and with `before` codes;
- `--min-severity` CLEARED filtering;
- the guid guards;
- `--fail-on mismatch`.

`test_lowering_a_findings_severity_clears_nothing` and the reason-only churn test pin behavior. The churn test pins the case the old reason-keyed `_notes` got wrong. That is by reasoning: the old code has no `notes_added` to call.

Suite: `test/unit/tool_util/security` + `test/unit/tool_util/test_tool_patches.py`, 793 passed.
