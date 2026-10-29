# galaxy #23984 — Surface remote_tool_eval failures as job errors

[PR #23984](https://github.com/galaxyproject/galaxy/pull/23984) · Status: verification complete; assessment returned to John; no GitHub review posted.

## Verification — 2026-10-14

John asked whether all of Marius’ comments are adequately addressed. Reviewed current head `8e27a75a1cc1890aa23e091402363eaebbba976e` against [Marius’ review](https://github.com/galaxyproject/galaxy/pull/23984#pullrequestreview-5500880804), including surrounding runner code and tests. All five inline concerns are adequately addressed; no remaining blocker found.

- Failure/resubmission handlers run before final failure.
- Readable streams and `stdio_read_error` messages survive.
- The user message includes the chained root cause; full traceback persists through database refresh.
- The inaccurate redirection comment was removed.
- `remote_tool_eval_error.json` is cleared before each evaluation attempt.

The requested regression cases are covered. Both relevant unit-test files (`test_runner_output_collection.py` and `test_remote_tool_eval.py`) passed locally: 28 tests. The extended-metadata integration test includes the Cheetah root-cause assertion but was not run locally.

All five threads are resolved by the author; this assessment checks implementation rather than relying on resolution state. Current-head package CI failures are collection-time `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'` on Python 3.10 and 3.14 ([run](https://github.com/galaxyproject/galaxy/actions/runs/38387907952)). They are separate from the comment verification.

## Risks

Risk is low: localized, reversible changes to failure reporting and regression coverage (a two-way door). Runner failure/resubmission behavior and diagnostic persistence were specifically checked.

## Archived — 2026-10-29

GitHub: MERGED 2026-10-14 (merge commit `a7c89a6e5783099bee598b62f9dc4985167e7fe2`). Tracking ended on merge.
