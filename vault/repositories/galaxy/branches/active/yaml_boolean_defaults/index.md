# yaml_boolean_defaults

- [#24365](https://github.com/galaxyproject/galaxy/pull/24365)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/yaml_boolean_defaults)

## Status

`ready`: head `19b7933d5a9` on `release_26.1`; class-declaring YAML reads only `value:`/`parameters:` (John 2026-10-22).

[#24365](https://github.com/galaxyproject/galaxy/pull/24365) out of draft (found undrafted 2026-10-24); mvdbeek requested.

PR CI green except Playwright and Tool form harness (`Playwright does not support chromium on ubuntu26.04-x64`, install infra), unrelated; rerun.

## Polish (2026-10-22)

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md). Open for John: release-branch rationale for 26.1, and the disk-optionality change on a release branch.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Tracking history](tracking_history.md)

## Hardening — 2026-10-20

Rebased onto `origin/release_26.1` (`6df388987b4`); old tip `01027324b35`. Only conflict vs release_26.1: `tool_request_raw` kwargs in `populators.py` (kept both `preferred_object_store_id` and `tool_uuid`). The 5-path conflicts in the notes below were measured against `dev`, not the branch's target.

Hardened tip `9894e813cc1` (pushed): fixture fix → Baseline tests → 2 refactor commits → 3 fix commits. Contract suite 46 passed / 4 strict xfail. First-pass debriefs in [earlier_drafts/1](earlier_drafts/1/scope_evaluation.md).

**Re-scope (John, 2026-10-20):** expand to canonical YAML `repeat`/`section` loading + `yaml_origin` in `strictify` section branch. Original scope kept as `yaml_boolean_defaults_alt_original_scope` ([alt](alts/original_scope.md)). Re-hardened tip `58f9664c617` (pushed): repeat/section loading, strictify sections, `__current_case__` stripping; contract suite 64 passed. Second scope evaluation: keep as implemented. STATUS READY; needs CI on new tip.
