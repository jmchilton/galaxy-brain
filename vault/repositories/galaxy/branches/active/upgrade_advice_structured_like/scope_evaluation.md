# Scope evaluation — upgrade_advice_structured_like (#23884)

**Recommendation: expand (modestly).** Keep the 26.0 `structured_like` migration as built, and also add the 26.1 and 26.2 migrations that dev's other profile gates need. Raise `latest_supported_version` to 26.2 so the advisor stops refusing current-profile tools. The issue's second complaint ("the advisor refuses tools or targets above 24.2") is only half fixed while 26.1/26.2 tools are still rejected. Each gate is small and can be found with an XPath (invalid citations become fatal in 26.1; `value_json="[]"` is required for empty multiple test params in 26.1; optional booleans start unset in 26.2; the tool-provided-metadata default changes in 26.2). Leave the top-level shadowing advice (Codex P1) and the `parser/output_references.py` relocation as follow-ups.

## Possible Decompositions

The branch is about 222 lines added and 111 removed over 3 commits.

1. **Refactor**: move `_InputReference`/`_InputReferences` from `linters/output.py` to public `InputReference`/`InputReferences` + `legacy()` in `linters/_util.py`. No behavior change. Linter tests pass unchanged.
2. **Advice fix**: drop `18_01_consider_structured_like`, add `ProfileMigration26_0` + `26_0_fix_unqualified_structured_like`, bump `latest_supported_version`, plus the upgrade tests. This depends on 1.
3. (If expanded) **26.1/26.2 migrations**: a separate commit or PR on top of 2. Each migration is independent and could land one at a time.

## Scopes considered

### A. As implemented
Replace the wrong 18.01 `consider` advice with a 26.0 `must_fix` that names the qualified path(s) for each bare or partially qualified `structured_like` that resolves only through the legacy alias (repeats skipped). Share the input-reference resolver with the linter.

| Pros | Cons |
|---|---|
| Fixes both directions of the issue exactly | Advisor still refuses tools at profile 26.1/26.2 (`initial_version > latest_supported_version`) |
| Reuses dev's resolver and doesn't duplicate it | `upgrade` imports from private-ish `linters._util` |
| Small and easy to review | |

### B. A + 26.1/26.2 migrations (recommended)
Add `ProfileMigration26_1`/`26_2` with advice for the existing profile gates, and bump `latest_supported_version` to 26.2.

| Pros | Cons |
|---|---|
| Fully covers the issue's "advisor stops at 24.2" complaint, so tool authors can run the advisor on current profiles | Goes beyond `structured_like`, so the PR title broadens |
| Each gate is one check plus one code, following the existing per-profile pattern | Each migration needs its own message and URL, which means digging up the PRs behind those gates |
| Galaxy reviewers tend to prefer general fixes in touched code | Some gates (the metadata default, optional booleans) can only be `consider` advice |

<details><summary>Gates found on the branch (non-test)</summary>

- `parser/xml.py:756`: an invalid citation is fatal from 26.1 and skipped below it.
- `parameters/case.py:167`: a `multiple` test param needs explicit `value_json="[]"` from 26.1.
- `parser/util.py:86`, `parameters/convert.py:521`: optional booleans start unset (not false) from 26.2.
- `abstract_tool.py:302`: the default for tool-provided metadata / `galaxy.json` changes at 26.2.
- `verify/__init__.py:77`, `verify/asserts/tabular.py`: tabular assertions split on the datatype delimiter from 26.2.

Only `structured_like` (`tools/execute.py:585`, `linters/output.py:355`) is gated at 26.0, so A already covers 26.0 completely.
</details>

### C. A + top-level shadowing advice (Codex P1)
Also advise when a qualified/top-level `structured_like` name is shadowed by a same-named nested input declared earlier. In that case mapped-over resolution before 26.0 picks the nested input and 26.0 picks the top-level one.

| Pros | Cons |
|---|---|
| Catches a silent behavior change | The ref is already valid and qualified; this needs a new "resolution changes" message for an unusual, ambiguous tool shape |
| | Has no user report behind it, and is better done as a linter warning than as upgrade advice |

### D. A + move resolver to `parser/output_references.py`
Put `InputReferences` in its planned public home (#23891/#23902) instead of `linters/_util.py`.

| Pros | Cons |
|---|---|
| Cleaner package boundary (the thermo-nuclear review agrees `parser/` is the right home) | Collides with in-flight PRs that own that move; creating a third location now is worse |

### E. Add `type_source` / `format_source` / `change_format` advice
Cover the other output references in the same migration.

| Pros | Cons |
|---|---|
| Groups the reference checks together | Not gated at 26.0. Bare `type_source` is rejected at every profile (earlier decision in `type_source_nested_inputs`), so there is nothing profile-specific to advise |

### F. Contract: only reword/drop the 18.01 advice
Fix the message and leave out the 26.0 migration.

| Pros | Cons |
|---|---|
| Tiny | Leaves the real break silent. That is the main harm in the issue |
