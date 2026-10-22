# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `yaml_boolean_defaults` (`01027324b35`; targets `release_26.1`) — Description: First slice of #23888: honors explicit YAML Boolean defaults; specifies user-tool contracts with reusable API execution helpers and real YAML/JSON authoring fixtures; blockers: polish (fork CI on `01027324b35` green except E2E runs that failed at "Restore client cache" — fork cache eviction, rerun 2026-10-06 evening) — YAML tools now follow the canonical contract on every load path (omitted `optional`/Boolean `value` → False, explicit null Boolean stays null under request execution; XML unchanged, John 2026-10-05); PR must flag the YAML behaviour change on a release branch; fixed CI's 401s by making `conftest.py` API interactor fixtures per-test (a session interactor's API key expired once a class-based test ran); PR should mention the conftest change; [debrief](implementation_debrief.md).

## Moved from index.md (2026-10-22): dev-conflict notes, measured against `dev` not `release_26.1`

### TICK — 2026-10-12

Current fork tip `01027324b35b860fd2136d1baf442a882c3a80f6` conflicts with dev in `lib/galaxy/tool_util/parameters/convert.py`, `lib/galaxy/tool_util/parser/interface.py`, `lib/galaxy/tool_util/parser/util.py`, `lib/galaxy/tools/__init__.py`, `lib/galaxy_test/base/populators.py`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

### GOOD_MORNING — 2026-10-13

Current fork head `01027324b35b860fd2136d1baf442a882c3a80f6` conflicts with `origin/dev` in 5 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `lib/galaxy/tool_util/parameters/convert.py` · `lib/galaxy/tool_util/parser/interface.py` · `lib/galaxy/tool_util/parser/util.py` · `lib/galaxy/tools/__init__.py` · `lib/galaxy_test/base/populators.py`

### Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `01027324b35b860fd2136d1baf442a882c3a80f6` found overlapping changes in 5 paths (`lib/galaxy/tool_util/parameters/convert.py`, `lib/galaxy/tool_util/parser/interface.py`, `lib/galaxy/tool_util/parser/util.py`, `lib/galaxy/tools/__init__.py`, `lib/galaxy_test/base/populators.py`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
