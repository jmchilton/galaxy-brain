# Initial review — PR #24190

PR: https://github.com/galaxyproject/galaxy/pull/24190
Reviewed: `a6d7e445d63003258183c3eae36bdb5430dc8d97` (2026-10-16)
Recommendation: **Request changes**
Delivery: **UNPOSTED**

Nest intentionally adds one list level. The bug is unintended implicit mapping that splits pairs, rather than the existence of the new nesting level. The nonempty `list:paired` execution now preserves whole pairs and produces the previously documented structure. The collection matching test passes. Three compatibility and type issues remain.

## Intended semantics versus existing execution

This intent predates the PR. At base commit `2225e5e573850cd505cb09d20427b4c17ac2d276`, `lib/galaxy/tools/nest_collection.xml` already says: “If the input is already nested (e.g. ``list:paired``), the output gains one more level of nesting (``list:list:paired``), where each inner ``list`` contains a single paired collection.” The existing second test likewise already expects `sample1/sample1/{forward,reverse}` and `sample2/sample2/{forward,reverse}`, with each outer element containing one child. Its `type="list:list"` attribute contradicts that structure; the PR corrects that test attribute.

Use parentheses for indivisible pairs and brackets for lists to avoid the PR description's ambiguous notation:

| Case | Shape | Collection type |
| --- | --- | --- |
| Input | `[(S1a, S1b), (S2a, S2b)]` | `list:paired` |
| Preexisting documented intent, and new direct execution | `[[(S1a, S1b)], [(S2a, S2b)]]` | `list:list:paired` |
| Old implicit-map path: each pair is submitted separately, and Nest wraps its datasets individually | `[[[S1a], [S1b]], [[S2a], [S2b]]]` | `list:list:list` |

The old-path shape follows from the old `list,paired` query selecting the `paired` subcollection and the base `produce_outputs` wrapping each incoming dataset in its own list. It is supported by source and the query reproduction; a full historical server execution was not run locally. The PR's `[[S1a,S1b],[S2a,S2b]]` shorthand omits the distinction between the pair and its singleton list wrapper. Read literally as lists, it does not describe `list:list:paired`.

This is therefore a fix toward prior documented intent, while still changing the behavior experienced by workflows that used the old implicit-map path. Those compatibility implications and the separately removed bare-pair input need explicit consideration.

## Findings

### P2 — Make the declared output type agree with the runtime paired output

Location: `lib/galaxy/tools/__init__.py:4445–4448`; associated declaration `lib/galaxy/tools/nest_collection.xml:19`.

The new runtime override returns `list:list:paired`, but the tool still declares its output as `list:list`. This declaration is consumed outside `produce_outputs`: `ToolModule.get_all_outputs()` in `lib/galaxy/workflow/modules.py:2202` publishes it to workflow terminals, and `tool_output_to_structure()` in `lib/galaxy/model/dataset_collections/structure.py:200` uses it to precompute mapped output collections. The production helper predicts `list:list` for this tool, even when the actual per-job output is `list:list:paired`. Mapping Nest over a `list:list:paired` input therefore predicts an outer `list:list:list` while each job supplies a `list:list:paired` child, requiring `list:list:list:paired` overall. The workflow editor likewise reasons about a two-level list, so downstream tools expecting pairs receive incorrect connection and mapping information.

Please expose the input-dependent output type through the tool/workflow structure machinery too, and cover both workflow connection metadata and mapped nested-pair execution. Changing only the runtime collection creation argument leaves those consumers with conflicting types. This reproduction verifies the production prediction helpers; a full workflow/browser execution was not run locally.

### P2 — Preserve the paired input supported by the existing tool version

Location: `lib/galaxy/tools/nest_collection.xml:16`.

Replacing `list,paired` with `list,list:paired` removes the existing direct `paired` input. A bare pair was accepted before this patch; with the new query it is neither a direct match nor mappable. Existing histories and workflows using Nest to turn a pair into a `list:list` of individually wrapped forward/reverse datasets lose a supported input, although the tool still has version `1.0.0`. Please preserve the prior input behavior while adding whole-list-of-pairs support, or explicitly provide a compatibility/version strategy, with a regression test for bare pairs. The precise accepted-type and mapping changes should be tested together; simply adding another accepted type needs to preserve the intended direct-match behavior.

### P2 — Derive the output type from the input type even when it has no elements

Location: `lib/galaxy/tools/__init__.py:4417–4419,4448`.

For an empty `list:paired`, the loop never assigns `inner_collection_type`, so `create_collection` receives `None` and falls back to the XML `list:list` declaration. The same operation on a nonempty `list:paired` returns `list:list:paired`. Empty lists of pairs are valid, for example after filtering all samples; losing the paired suffix changes downstream collection matching and mapping solely because the list is empty. Derive the type from `hdca.collection.collection_type` before iteration and add an empty-list-of-pairs test.

## Validation

- `PYTHONPATH=lib /Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest test/unit/data/dataset_collections/test_matching.py -q -p no:cacheprovider`: **16 passed**, 71 dependency deprecation warnings. Pytest exited 0; an atexit subprocess cleanup emitted a sandbox `psutil` permission traceback after the test summary.
- [Reproduction script](reproduce.py): executes the actual `NestTool.produce_outputs`, real model collection copies, XML output parsing, collection query matching, and mapped structure prediction. The output sink captures arguments and applies the same explicit-type-or-XML fallback as `OutputCollections.create_collection`; this is a focused reproduction, not a full server test.
- [Reproduction output](reproduction-output.txt).
- `git diff --check`: clean. No production code edits. Worktree remains for the open PR.
- GitHub discussion: no existing comments or reviews at review start. Current head verified unchanged. Available CI checks largely pass; CWL conformance reports a skipped job with no usable failed-job artifacts according to coordinator inventory. No CI failure attributed to this change.

## Risks

This changes collection matching and output shape for a built-in tool without changing its version, so saved workflows and downstream tool connections are a hard-to-reverse compatibility surface.

<details><summary>Risk Details</summary>

- Direct `list:paired` execution intentionally changes the number of tool invocations and collection shape; existing workflows may have connections based on the previous mapped behavior.
- Removing bare `paired` input changes an established tool interface under version `1.0.0`.
- Declared and runtime output types disagree, affecting workflow construction and implicit mapped output types.
- Empty paired lists lose their paired type suffix.
- The code change is small and can be reverted, but artifacts saved against the new behavior may need explicit repair or version handling afterward.

</details>

<details><summary>Risk Review Advice</summary>

Human review should explicitly settle compatibility for existing `paired` and `list:paired` workflow steps and verify that advertised output metadata, mapped execution, and empty-collection behavior all describe the same structure. Exercise a downstream paired-consuming tool and mapping over a nested list of pairs before merging.

</details>
