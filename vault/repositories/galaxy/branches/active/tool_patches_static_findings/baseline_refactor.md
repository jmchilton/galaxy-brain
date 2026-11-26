Run via Claude Opus at high effort.

One in-branch split: the severity-by-name refactor of `--fail-on` (`charsets.at_or_above`, `FailOn.severity` as a name) is now its own commit `3731a0b6c40`, ahead of the refusal work, split out of the old `a8725a60831`. No parent branch was touched. The final tree is identical to the old head `fb189f06a5b`. The coordinator force-pushed it.

Earlier draft: `earlier_drafts/2/baseline_refactor.md`. It covered the patch-review integration commits and stays valid for them. Its two optional parent hoists are restated below.

## The split

- **`3731a0b6c40` Compare severities by name in --fail-on.** It holds the `charsets.py` and `__main__.py` hunks of the old `a8725a60831`:
  - It adds `at_or_above(severity, threshold)` next to `worst`.
  - `FailOn.severity` becomes `str | None`. `parse` takes the `min` by `SEVERITIES.index`, and `met` uses `at_or_above`.
  - It is pure. At the old `a8725a60831^`, only `parse` and `met` read `FailOn.severity`. No later commit in the round touches either file.
  - `test/unit/tool_util/security/` passes at this commit on its own (624 passed).
- **`1186a1d9990` Summarize a tool's static review...** keeps the rest of the old commit: `refusal.py` and `test_refusal.py`. Its message now says it shares `at_or_above` with `--fail-on`.
- The other seven commits were cherry-picked on top unchanged. `git diff a8725a60831 1186a1d9990` is empty, so every replayed commit has the same tree as before and its earlier test results still hold.
- `git diff fb189f06a5b HEAD` is empty. At HEAD, `test/unit/tool_util/security/` plus `test_static_findings_refusal.py` pass (638 passed), and mypy is clean on the three security files.
- The refactor stays at the start of the newest round, not at `a62581cfdd0`. Moving it lower would drag it through the `FailOn` churn in `21f8a1d298a`, `a735d0df210` and `817454ed1e8` for no gain.

### Rewritten SHAs (old → new)

These files cited the old SHAs: `thermo_nuclear_review.md`, `test_challenges_debrief.md`, `codex_review.md`, `implementation_rescope_debrief.md` and `subagents/review_rescope_refusal.md`. The coordinator remapped them to the new ones.

| old | new | subject |
|---|---|---|
| `a8725a60831` | `3731a0b6c40` + `1186a1d9990` | split: refactor, then StaticReview |
| `bc1147fa677` | `87fd7d9d087` | Port the tool security review's refusal codes |
| `63d78adcfd2` | `206c34d1318` | Refuse jobs of tools whose static review keeps findings... |
| `67d756d9ca2` | `a3ad4c935f9` | Validate the refusal severity at startup; review fixes |
| `65194bb4453` | `0ff5cb77dc8` | Challenge static findings refusal tests |
| `e0e05449bfe` | `28b6de0d0ba` | Keep static review state decisions in security_review... |
| `538ef35c060` | `cd9b1e25aa6` | Rewrap static findings refusal docs |
| `fb189f06a5b` | `cab486f13a1` | Pin the refusal severities to the config schema enum |

`817454ed1e8` and everything below it are unchanged.

## Optional parent hoists (report only; parents not touched)

- **`at_or_above` → `tool_security_static_findings`. This is the strongest hoist now.**
  - `3731a0b6c40` does not apply to the parent as it is (`git apply --check` fails on `__main__.py`). The context differs: the parent has no tool_patches imports and no `mismatch`/`uncleared` fields, and the docstring has no "patch states". The port is small: the same change to `parse` and `met`, plus `at_or_above` in `charsets.py`.
  - `tool_security_runtime`'s `FailOn` still compares raw `SEVERITIES.index` values, so it would gain from the hoist too.
  - Other sites that could adopt `at_or_above` as follow-up work (not done here, since that is new refactoring that widens divergence from the parent):
    - the parent's `--min-severity` filter in `__main__.py`;
    - `judge.py:279-283`;
    - this branch's `__main__.py` filters at lines 292 and 306;
    - `patch_review.py:86`.
- **`note_lines` and `report_dict` → the parent's `classify.py`.** This is still optional, with two things changed since the earlier draft:
  - They now live in `patch_review.py`.
  - `note_lines` returns `((kind, key), text)` pairs. The parent's `_print_report` would drop the key and print the same lines.
  - It is still worth doing only if the parent is reopened.
- **`compat_doc` → `tool_patches`' `unittest_utils/tool_patches.py`.** Unchanged since the earlier draft. `_compat_patch` in `test_patch_review.py` still duplicates it.

## Not candidates

None of these can land first in a parent as a pure refactor:

- **`codes.py`, `ToolInputRejected` and the runner except-widening.** Branches 3 (`tool_security_runtime`) and 4 (this one) carry their own copies, written differently:
  - Branch 3's `codes.py` builds its values and descriptions from `Rule`, `Uncheckable` and their `DESCRIPTIONS`. This branch uses string literals copied from `d5f7cb05e91`, plus `STATIC_FINDINGS`.
  - Branch 3 also widens pulsar's `isinstance(e, ParameterValueError)` path. This branch adds to pulsar's `InsufficientPermissionsException` catch.
  - The parent has no caller for any of it, so it is not a baseline refactor (see Unused Infrastructure). Record it for whoever merges branches 3 and 4.
- **One shared tuple of prepare-time rejections in the runners.** `BaseJobRunner` and pulsar handle different exception sets in different ways: pulsar sends `ParameterValueError` through `fail_job` resubmission. Unifying them would change behaviour.
- **`patch_and_review_tool_source` and `with_static_review` at the load sites.** They wrap `apply_tool_patches`, which is already the one call site in `tool_patches`. There is nothing to extract first.
- **Config, plumbing and test fields.** These only exist for the feature:
  - the config severity check and `STATIC_FINDINGS_SEVERITIES`;
  - `ToolSource.static_review`, `Tool.static_review` and `ToolIndexEntry.static_review`;
  - the freshness token;
  - the stub fields in the tests.
- **Tests.** The new tests reuse the existing helpers: `security_patch`, `write_collection`, `populate_config`, `_entry` and `_materializing_box`. There is no helper to pull out ahead of them.
- **`tool_patches` sync.** `git range-diff` of `tool_patches` (`1e92a257548`) against `d4e4f68dd25..a62581cfdd0` shows only rebase context. It is in sync.
