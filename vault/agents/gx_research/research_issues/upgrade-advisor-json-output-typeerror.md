# `galaxy-tool-upgrade-advisor --json` raises TypeError

- Area: lib/galaxy/tool_util/upgrade/script.py
- Found while: [[Component - Tool Profile Versions and Upgrade Advisor]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`advise()` (`script.py:75-82`) prints JSON output with `dumps(a.to_dict() for a in advice_list)`. That passes a generator to `json.dumps`, which raises `TypeError: Object of type generator is not JSON serializable`. The `-j/--json` flag of the `galaxy-tool-upgrade-advisor` console script (`packages/tool_util/pyproject.toml:79`) therefore always fails, even when the advice list is empty.

Two cosmetic problems in the same file: the `--json` help text says "aadvice", and `_print_advice` prints the level emoji with no space before the message (`f"- {level_str}{message}"`).

## Evidence / repro

`python3 -c "import json; json.dumps(x for x in [1])"` raises the same TypeError. No test calls `script.main` or `script.advise`. Draft PR #24524 doesn't touch `script.py`.

## Suggested fix

`dumps([a.to_dict() for a in advice_list])`, plus a test that runs `main([xml, "--json"])` and parses the output.
