Run via Claude Opus at high effort.

No refactoring of the base branch was performed. Report-only: history is unchanged and HEAD stays `92320a751cb`. Recommended split for the pending squash/reword pass (`subagents/review_port.md`): land mvdbeek's `7ea120eef20` "Move ToolParameterSanitizer to galaxy.tool_util.parser" first and alone, byte-for-byte as it is. It can be its own small dev PR. Nothing else in the branch can land before the feature.

## Candidate: the `ToolParameterSanitizer` move (`7ea120eef20`, mvdbeek)

- **Pure move.** `git diff origin/dev:lib/galaxy/tools/parameters/sanitize.py HEAD:lib/galaxy/tool_util/parser/sanitize.py` shows only one deleted stale TODO. The other edits are the `basic.py` import, the `interface.py` docstring path, the `mypy.ini` section name, and the two `doc/source/lib` stubs.
- **Later commits leave it as is.**
  - `1b7c00452cd` adds `from __future__ import annotations` to `sanitize.py`, and `e9e1d8eb1a5` removes it again. The two hunks cancel exactly.
  - `git diff 7ea120eef20 HEAD` on all six of the move's paths is empty.
  - No later commit touches `basic.py`, `interface.py`, `mypy.ini` or the stubs.
  - Squash instruction, correcting review_port step 1: drop the `sanitize.py` hunks of both `1b7c00452cd` and `e9e1d8eb1a5`, and keep `7ea120eef20` unchanged. There is no future-import removal left to fold in.
- **Applies to dev.** The merge-base is the `origin/dev` tip `ce63095e7a8`, and `git merge-tree` of `7ea120eef20` onto `origin/dev` is clean.
- **Coverage.** The module's doctests and `test/unit/app/tools/test_parameter_parsing.py` pass at HEAD, where these files are identical to `7ea120eef20` (31 passed). No "Baseline tests" commit is needed for a pure move.
- **Shim.** None needed. The only importer is `basic.py`, and review_port's downstream search found no other importer. If a reviewer asks for one, the fallback is a one-line re-export at `lib/galaxy/tools/parameters/sanitize.py`.

### As its own dev PR

- Target: `dev`. It is a module move with no behaviour change, so it is not release-branch material.
- **Rationale to lead with: layering.**
  - `galaxy.tool_util` must not import `galaxy.tools`, and the sanitizer depends only on `galaxy.util`.
  - The parser already owns `parse_sanitize` and `parse_sanitizer_elem`. The `interface.py` docstring already names the sanitizer as a parser concern.
- **Weakness:** on dev the sanitizer has no `tool_util` consumer other than the security review. The commit message justifies the move by the review, which would not be on dev yet.
  - Either reword the message or have the PR body lead with layering, and name the static review as the follow-up consumer.
  - If John doesn't want a PR whose only motivation is a later one, keep the move as the first commit of the feature PR instead. Both options work. A standalone PR mainly shrinks the feature PR's non-security footprint to packaging and docs.
- **Presentation call for John:** this would be mvdbeek's commit opened from John's fork. Decide whether to open it as is, ask mvdbeek to open it, or keep it in the feature PR.
- **Child branch:** `tool_patches_static_findings` inherits the move. If the move lands on dev first, both branches drop the commit on rebase.

## Nothing else can land first

- **Outside `lib/galaxy/tool_util/security` and its tests**, the branch changes only:
  - the move's six paths
  - `packages/tool_util/MANIFEST.in` (spec files)
  - `packages/tool_util/pyproject.toml` (console script)
  - `doc/source/admin/{index.rst,tool_security_review.md}`

  The last three are part of the feature, not refactors.
- **External imports.** Everything the security package imports from outside itself already exists on dev:
  - `galaxy.tool_util.parser`
  - `parser.interface`
  - `galaxy.tool_util_models.parameter_validators`
  - `galaxy.util`
  - `util.tree_dict`
  - `util.xml_macros`

  The branch adds no new helpers to shared modules.
- **Inside `security/` everything is new**, so no restructuring there can be applied to dev first. That includes the thermo review's F1–F7 (the `interp.py` split, call registry, StrEnums, ledger, table dedupe), the `_util.py` test helpers, and the 3.11 lint. Those are analyser follow-ups on top of the feature, not baselines.
- **Baseline tests.** For the same reason, no "Baseline tests" commit is possible: there is nothing on dev for one to pin. The prefixes on `01ee2bd184c` and `516aa1eb122` should be dropped in the squash, as review_port step 4 already says.

## Order in the squash plan

1. `7ea120eef20` sanitizer move: mvdbeek, alone, unchanged. Optionally split off as its own dev PR.
2. The rest follows review_port steps 2–5 unchanged:
   - mvdbeek's analyser squash
   - John's topical analyser commits
   - the spec/docs commit
   - lint/wording

   Also fold in the post-review commits `b970901b002`, `c3c42715fdd`, `5ffe663a487`, `180c8ad7479` and `92320a751cb` by topic: test hunks with the commits they test, framing cleanups with step 4/5.
