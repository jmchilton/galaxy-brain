# yaml_boolean_defaults — polish debrief (2026-10-22)

Polished per `gx_branches/POLISH_BRANCH.md`. Old tip `58f9664c617` (kept as tag `yaml_boolean_defaults_pre_polish_20261022` on the fork); new tip `ef275d8fa42` on current `origin/release_26.1` (`6ff6692662d`), force-pushed with lease.

## CI

The fork CI on `58f9664c617` showed only infra reds: a `galaxy-static-<sha>` cache miss (`fail-on-cache-miss`) in first startup, Integration Selenium and Selenium, plus a Playwright download DNS failure (`ENOTFOUND playwright.download.prss.microsoft.com`) in tool form harness. No test failed. The reruns were superseded by the push, and CI on `ef275d8fa42` came back all green (CWL conformance skipped).

## Checklist (GENERAL.md)

A fresh subagent passed every item except the human-read one, which it left unchecked. It flagged two optional nits, and neither was acted on:
- the two YAML twins in `base/data/user_tools/` copy stock tools without their `tests:` blocks. The reason is recorded in `initial_implementation_debrief.md`: the embedded tests break when used as API authoring sources;
- stale pre-rebase SHAs in the `test_challenges_debrief.md` red/green table.

## Strengthening round

The subagent found that the bold claim "class-less YAML tools load exactly as before" was false. The Boolean `value` override sat on the base `YamlInputSource`, so class-less tools also started honoring `value`, while their request fill kept XML's `value or False`.
- **Fix:** I moved the override onto `CanonicalYamlInputSource` in the commit that introduces it, now `YAML tools default omitted optional and Boolean value to False`, and updated that commit's message. `f3178c7f971` still adds the override to plain YAML sources, and the next commit moves it behind the class gate. Workflow-module dicts set `value` and `checked` together, and CWL booleans never set `value`, so neither is affected.
- **Description fixes:**
  - the invented `$(inputs.group)` example now uses the real fixture output;
  - the element-access claim cites `simple_constructs_y`;
  - the `simple_constructs.yml` exposure is named (`check_select`);
  - the vague `__class__` advice is replaced;
  - the test counts name what ran at which code.
- **Added** a bold-italic note that the fixture-scope change is test-setup only.
- **Not done:** a unit test pinning class-less YAML behavior. It would pin legacy-dialect quirks, and the class gate is covered by the contract suite plus the unchanged framework tests.

## Verification at the final code (pre-rebase `3eda3dbf48f`)

- API: `test_user_tool_contract.py` + `test_unprivileged_tools.py`, 81 passed.
- Framework: `simple_constructs_y`, `gx_boolean_user*`, `gx_repeat*`, `gx_section*`, `configfile`, 19 passed.
- Unit: `test/unit/tool_util` + `test/unit/app/tools`, 1711 passed (cwl/conda/mulled/watcher/expression excluded).
- ruff 0.15.13 and black are clean on `yaml.py`.
- The rebase onto `release_26.1` was conflict-free and was not re-tested locally; CI covers it.

I didn't re-run the checklist subagent. The fix moves one method and none of the items' answers depend on it.

## Open for John

- Why `release_26.1` and not dev? The description doesn't argue for the release branch, and it should.
- Is the disk-optionality change OK on 26.1? It's flagged in Risk Review Advice.
- The opener reads "Toward 🎯 #23888", because this is the input-loading slice and doesn't fix the whole umbrella issue.
