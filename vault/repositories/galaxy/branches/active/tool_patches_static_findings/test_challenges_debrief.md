Run via Claude Opus at high effort.

# Test challenges: static findings refusal

Scope: the tests this round added (`817454ed1e8..67d756d9ca2`). They are:
- `test_refusal.py`
- `test_static_findings_refusal.py`
- `TestStaticReview` in `test_populate_store.py`
- the static-review tests in `test_toolbox.py` and `test_cached_tool.py`
- `test/integration/test_tool_static_findings_refusal.py`

The earlier draft, which covered patch review, is in `earlier_drafts/2/`. Changes are in commit `65194bb4453`.

## Bug: the new unit tests failed mypy

`make mypy` runs `mypy . ../test`, so CI would have gone red on 14 errors:
- `test_static_findings_refusal.py` passed `SimpleNamespace` where `Tool` and `GalaxyAppConfiguration` are expected (12 errors).
- `test_refusal.py` typed `_review(**report: dict)` wrong (2 errors).

Fixed. The one mypy error left, at `galaxy/managers/notification.py:995`, comes from the environment; the branch doesn't touch that file.

## Changes

- **`test_static_findings_refusal.py`.** `SimpleNamespace` is replaced by `RefusalConfig` and `ReviewedTool` dataclasses. `_config` and `_tool` cast them, the same way `populate_config()` does in `app_unittest_utils/tool_source_support.py`.
- **Rewritten on the production path.** `test_refusal.py::test_finding_a_patch_lowered_still_refuses_at_its_new_severity` checked `StaticReview.of(PatchReview.after)`. Load doesn't call that path. The test also imported the private `_awk_review` from another test module.
  - It is now `test_reviews_the_patched_source_only_when_refusals_are_on`, which calls `patch_and_review_tool_source` on an awk tool with the lowering patch. It asserts `StaticReview(severities={"nested-interpreter": "medium"})` with refusal on, and `None` with refusal off.
  - It replaces `test_reviews_the_loaded_source_only_when_refusals_are_on`, whose on case (identifier_single, shell-injection) the integration `static_refused` test already covers.
  - The integration lowered test can't take this over. Its threshold is `medium`, and the awk finding is `high` before the patch and `medium` after, so it refuses either way. That test proves an applied patch doesn't exempt a tool. It doesn't prove the severity is lowered.
- **`test_toolbox.py`.** The parse-path half was dropped. It asserted only `static_review is not None` and the version, and integration covers the same path. The test is now `test_static_review_kept_on_stored_source`. Its stored-source assertion went from `refused_rules("critical") == ["template-exec"]` to the exact `StaticReview`.
- **`test_cached_tool.py`.** `reviewed != kept` became `reviewed == StaticReview(version=REVIEW_VERSION)`. The fresh review of `echo merge` is empty.
- **`test_refusal.py`.**
  - The worst-severity test now has a third, `low` finding after the `high` one, so it fails if the last finding wins. Before, it only failed if the first one won.
  - The notes-only test builds its `Report` inline, and `_review` takes findings only.
- **Integration.** A `_show_tool(tool_id)` helper, which asserts 200, replaces the two raw `tools/<id>` GETs. The load check now asserts the returned `id`.

## Red-to-green

Each check is a one-line mutation to the branch's code, run against the in-scope unit tests:

| Mutation | Red |
|---|---|
| `StaticReview.of` keeps the first severity | worst-severity |
| `StaticReview.of` keeps the last severity | worst-severity |
| `at_or_above` uses `>` | threshold (3 params), message |
| `refused_rules` ignores the on/off flag | `runs...[off]` |
| lib/galaxy exemption removed | own-tools |
| review before patching | patched-source; populator `entries_keep`, `turning_refusals_on` |
| `except Exception` narrowed | failed-review |
| severity not validated | config error |
| eager store return not reviewed | toolbox stored |
| materialization always reviews fresh | cached |
| materialization trusts a stale entry review | cached |
| index entry drops `static_review` | populator `entries_keep`, `stale`, `turning_refusals_on` |
| carry-forward ignores the review | populator `stale`, `turning_refusals_on` |
| freshness token ignores refusals | populator token |
| `expected_review_version` ignores the off switch | populator `refusals_off`, token, `turning_refusals_on`; patched-source (off half) |

`implementation_rescope_debrief.md` showed that the integration file goes red when the prepare check is removed. That run wasn't repeated.

## Kept, and why

- `test_uncheckable_codes_and_unchecked_locations_alone_refuse_nothing` pins a documented decision: no option refuses on uncheckable codes. It goes red if `of` or `refused_rules` starts reading report notes.
- `test_refuses_a_job_naming_the_rules_at_or_above_the_severity` pins the exact message with several rules joined. Integration checks only the prefix and the tool id.
- `test_failed_review_is_kept_and_refuses_nothing` monkeypatches `review_tool_source`. No real input makes the review raise, so the stub is the simplest seam.
- `TestStaticReview` in the populator tests is not covered by integration. The cached integration test would still pass without the stored review, because materialization falls back to a fresh review.
- The cached test's missing-review and stale-review cases are not covered by integration.

## Not changed

- No E2E test: the feature has no UI.
- The awk fixture now exists three times: in `test_patch_review.py`, the integration test and `test_static_findings_refusal.py`. A shared fixture would mean editing the older `test_patch_review.py`, which is out of scope, so the copies are left as they are.

## Results

- Related unit suites passed: `tool_util/security`, `test_tool_patches`, `test_static_findings_refusal`, `test_toolbox`, `test_cached_tool`, `source_store`, `scripts/tool_source` and `test_job_wrapper`. 1228 passed and 2 xpassed.
- Integration: `test_tool_static_findings_refusal.py`, 6 passed (eager and cached).
- ruff, black, isort and mypy are clean on the touched files.
