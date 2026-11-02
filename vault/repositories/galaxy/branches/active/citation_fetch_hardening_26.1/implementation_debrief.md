# citation_fetch_hardening_26.1 — implementation debrief

**STATUS: READY.** Retargeted to `release_26.2` and revised after a fresh review ([retarget](retarget_release_26_2.md)). The previous debrief is in [earlier_drafts/2/](earlier_drafts/2/implementation_debrief.md); what it says about scope, design, decisions and follow-ups still applies.

Tip `ab7c1f0887d` on `jmchilton/citation_fetch_hardening_26.1`, base `origin/release_26.2` (`018ebd2cf60`). 19 commits, 26 files. The branch name keeps its `_26.1` suffix.

```
created .../differential-review/snapshots/20261102T210627Z-revision-ab7c1f0887d8.json
  revision @ ab7c1f0887d8 vs origin/release_26.2 (merge-base 018ebd2cf605)
  since 20261029T154748Z-hardening-cda4733996f0:
    commits: 0 same, 4 rebased, 15 changed, 0 new, 0 dropped
    hunks:   28 carried, 16 changed, 1 new, 0 dropped
```

Most "changed" hunks are the 26.2 typing style. The changes with substance:
- **`bounded_get`:** URL preparation, from the review; possible security issue, details withheld. One new test.
- **Config commit:** the generated `_galaxy_config_schema_attributes.py`, and a `dict[str, Any]` annotation.
- **Commit 19:** now also drops the Tool Shed's `citation_cache_table_name` override, with one new test.
- **`cached_fetch` commit:** `Protocol` is imported from `typing`.

## Same split

- **A:** commits 1–5
- **B:** 6–15
- **C:** 16 (config)
- **D:** 17–18 (`cached_fetch`)
- **E:** 19 (Tool Shed)

## For John

- **The `_26.1` branch name now targets 26.2.** Renaming it means a new remote branch, moving the vault directory, and fixing the yaml branch's links. Ask if you want that.
- **The yaml branch still targets `release_26.1`.** Its Scope 2 can no longer build on this branch there. It needs to move to 26.2 too, or land Scope 3 on 26.1.
- **PR body notes, new this round:**
  - bio.tools lookups have a 15s total deadline, where before they had a 600s per-socket timeout.
  - `cached_fetch` doesn't hold beaker's creation lock, so concurrent misses for the same DOI can each fetch. The per-request budget bounds this.
  - bio.tools 404s are kept until the cache is cleared, the same as before.
- Everything parked earlier is unchanged.

## Validation

- ruff, black and isort are clean, and the touched unit tests pass, at all 19 commits. That's 372 tests at the first commit and 411 at the tip; the tip run had 408 passed and 3 skipped because bio.tools was down.
- One unit failure at commit 8 didn't reproduce. The review attributes it to the live-site `test_cascade_content`.
- The API tests `test_tool_citations` and `test_history_citations` passed on 26.2 at `89b3cc6c3bc`, before the review fixes. Those fixes are covered by unit tests.
- mypy on the changed modules gives the same errors as the base.
- Not run: CI and Selenium.
