# Scope evaluation (second, post-rescope) — issue_23891_output_reference_resolver

**Recommendation: KEEP.** The rescope landed the one clearly warranted expansion (`metadata_source` linting, `886d8ffd327`), so the 26.2 load errors now all have a lint warning ahead of them. The three open items don't justify another rescope. (1) A shadowed legacy alias is the only real candidate: it is profile-gated, behaves the same as dev, and the linter already errors on it. It's a cheap add-on if John wants it, but it isn't needed for this PR. Surface it in the PR as a decision. (2) Keep `any()`. (3) Porting the YAML linters is a separate feature, and YAML tools still get validated at load.

Evaluated at HEAD `bc6d953af2c` on `origin/dev`: 9 commits, 15 files, +764/-193.

## Possible Decompositions

Landing order. These are options, not recommendations.

- **A: 2 PRs**
  1. `0858c00a9e9`: a pure refactor that moves the linter walker into `InputReferences`.
  2. The rest: the fix, `type_source` consolidation, `metadata_source` lint, tests and XSD.
- **B: 3 PRs**
  1. The refactor.
  2. The fix: `63ffa8b0c21`, `dbd80a1dcb7`, `e6fb87e148e`, `51f270617f5`, `f323237f519`, `bc6d953af2c`.
  3. Follow-ups that consolidate and lint: `46962a8e7b1` (`type_source`) and `886d8ffd327` (`metadata_source` lint).
- **C: 1 PR (as is).** The refactor commit comes first, so reviewers can read it commit by commit.

## Scopes considered

### 1. As implemented (recommended)
The shared `ToolSource` resolver is used by the linter, tool load, `output_format` and `type_source`. Invalid `format_source`/`metadata_source` references are dropped with a warning below 26.2 and are a load error from 26.2. Both attributes are linted.

| Pros | Cons |
|---|---|
| Fixes #23891 and the collision case | A shadowed alias on a discovered collection still falls back silently at runtime (same as dev) |
| Every 26.2 load error now has a lint warning beforehand | YAML tools get no lint warning, only the load-time check |
| Removes duplicate walkers, net | |

### 2. Shadowed legacy alias is a 26.2+ load error (optional add-on, not required)
When the qualified target of a reference is another input's legacy alias, `resolve()` keeps the raw key. From profile 26.2, raise `ToolLoadError` for this case instead.

| Pros | Cons |
|---|---|
| Codex flagged it twice (P1). It fails clearly instead of silently using the wrong dataset | Not a regression: dev behaves the same |
| Consistent with "invalid → error at 26.2". The linter already errors | Adds another 26.2 rule, which needs XSD changelog text and a test |
| Small change | Rare in practice: it needs both a `multiple` input named `input` and a nested `input1`. The sweep found none |

<details><summary>Notes</summary>
The first evaluation rated this lower priority, and the rescope left it for John. Re-raising it as EXPAND would park a branch that is otherwise ready over a rare, pre-existing, lint-covered corner. Raise it as a reviewer question instead. If John wants it, it's a small commit layered on top.
</details>

### 3. Require `all()` for mixed-type conditional matches (not recommended)
Mixed-type matches pass if any matching case is a dataset.

| Pros | Cons |
|---|---|
| Stricter typing | Penalizes a legitimate pattern that works at runtime |
| | Nobody has reported it, and the sweep found no case |

### 4. Port the output reference linters to YAML tools (follow-up)
`OutputsFormatSourceReference`, `OutputsStructuredLikeReference` and `OutputsMetadataSourceReference` are XML-only, as they are on dev.

| Pros | Cons |
|---|---|
| Lint parity for YAML tools | The YAML linter infrastructure is separate, so this is a feature, not a fix |
| | Load-time validation already covers YAML tools (error at 26.2, warning below) |
| | Not part of #23891 |

### 5. Resolve `structured_like`/`change_format` at load (follow-up, unchanged from the first evaluation)
Same bug class, but different runtime paths, and it interacts with `type_source_nested_inputs`.

## Contract options
- Drop the 26.2 load error: no. It's documented in the XSD, and #23902 builds on it.
- Drop the `metadata_source` lint: no. It's what keeps the 26.2 error from surprising authors.
