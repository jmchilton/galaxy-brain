# Scope evaluation — issue_23891_output_reference_resolver

**Recommendation: EXPAND, modestly.** Add `metadata_source` linting through the existing `output_reference_problem()` helper. This is cheap, and it closes a real gap: from 26.2 a bad `metadata_source` fails at load with no lint warning first. Also consider making a shadowed legacy alias on a discovered collection a 26.2+ load error. Keep `any()` for mixed-type conditional matches. The `qualify_legacy_data_input_reference` duplication is already resolved: `46962a8e7b1` deleted the helper and routed `type_source` through `InputReferences`. Leave `structured_like`/`change_format` runtime resolution as a follow-up.

Evaluated at HEAD `f323237f519` on `origin/dev`: 7 commits, about 700 added and 180 removed lines across 15 files.

## Possible Decompositions

Order is the landing order. This is not a recommendation to split.

- **A: 2 PRs**
  1. `0858c00a9e9`: a pure refactor that moves the linter's walker into `tool_util/parser/output_references.py` as `InputReferences`. 142 linter tests pass and behavior is unchanged.
  2. Everything else: the #23891 load-time resolution, the `output_collect` default, `type_source` on the shared resolver, the tests and the XSD.
- **B: 3 PRs**
  1. The refactor, as in A.
  2. The fix: `63ffa8b0c21`, `dbd80a1dcb7`, `e6fb87e148e`, `51f270617f5` and `f323237f519`.
  3. `46962a8e7b1`: `type_source` on the shared resolver, which deletes `qualify_legacy_data_input_reference`. It's a small consolidation that can follow the fix.
- **C: 1 PR (as is).** The refactor commit is first, so reviewers can still read the PR commit by commit.

## Scopes considered

### 1. As implemented
The `ToolSource`-driven resolver is shared by the linter, tool load and `output_format`. At load, `format_source`/`metadata_source` legacy aliases are rewritten to qualified keys. Invalid references are dropped with a warning below 26.2 and raise `ToolLoadError` from 26.2. `type_source` moves onto the same resolver.

| Pros | Cons |
|---|---|
| Fixes #23891 and the collision case | Leaves a 26.2 load error that the linter never warns about (`metadata_source`) |
| Net deletion of two duplicate walkers | A shadowed alias on a discovered collection still falls back silently |
| Sweep: 0 internal-key uses, 22 drops that were already broken | |

### 2. Lint `metadata_source` (recommended)
Run `metadata_source` through the same `output_reference_problem()` check the linter already uses for `format_source`.

| Pros | Cons |
|---|---|
| Lint warns before the 26.2 load error, so authors aren't surprised | A few more linter tests |
| A few lines that reuse the existing helper | Sweep drops (`metadata_source` on select/collection params) would now get lint errors. That's correct, but it's noise for IUC |
| Open since the parent branch's polish | |

### 3. Shadowed legacy alias on a discovered collection is a 26.2+ load error (recommended, lower priority)
`resolve()` keeps the unqualified key when the qualified target is another input's legacy alias. Discovered collections have no legacy fallback, so these references silently get the fallback format or a `KeyError` (`metadata_source`). From profile 26.2, raise `ToolLoadError` for this case.

| Pros | Cons |
|---|---|
| Matches the linter, which already errors here | A new load-time rule, so it needs XSD changelog text and a unit test |
| Consistent with "invalid → load error at 26.2" | Pre-26.2 behavior is unchanged (same as dev), so the benefit is limited to new tools |
| Turns a silent wrong format into a clear failure | |

<details><summary>Notes</summary>
This doesn't regress anything relative to dev. It's gated on profile, so existing tools are unaffected. If John prefers to keep the profile-26.2 rules minimal, dropping this costs little because the linter covers it.
</details>

### 4. Require `all()` for mixed-type conditional matches from 26.2 (not recommended)
`c|same` can be `data` in one case and `text` in another. Today a reference passes if any match is a dataset. From 26.2, every match would have to be a dataset.

| Pros | Cons |
|---|---|
| Stricter typing | Mixed-type cases are a legitimate pattern: the reference works in the dataset case |
| | Even gated on 26.2, it would force authors to rename params for no runtime gain |
| | Nobody has reported it, and the sweep found no such case |

### 5. Consolidate `qualify_legacy_data_input_reference`: already done
`46962a8e7b1` deleted the helper (`tools/parameters/__init__.py`, minus 50 lines) and moved `type_source` onto `InputReferences`. An ambiguous alias now lists every candidate. Nothing remains.

### 6. Resolve `structured_like` and `change_format` `input_dataset` at load (follow-up)
Extend `_resolve_output_references` to those attributes. They still read raw names and can hit the same internal-key and shadowing bugs.

| Pros | Cons |
|---|---|
| Same bug class, same abstraction; reviewers may ask | Different runtime paths (job dicts, `input_collections`), so the change is larger |
| `structured_like` lint already uses `InputReferences` | Interacts with the `type_source_nested_inputs` branch's legacy alias handling in `input_collections` |
| | The issue doesn't claim them, and the sweep wasn't run for them |

## Contract options considered
- **Drop the 26.2 load error and only warn.** Not recommended. The XSD changelog already documents it, and #23902 builds on it.
- **Drop the `type_source` commit.** No reason to. It's small and deletes duplicate code.
