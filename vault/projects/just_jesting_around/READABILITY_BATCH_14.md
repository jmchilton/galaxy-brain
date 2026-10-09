# Readability batch 14

Ten uniterated originators selected with seed `330085416`. [Manifest](readability_batch_14.yml). The same branch/worktree holds one commit for this iteration, starting at `983633ff5e3ff4da8364f9222889afde5713b42c`.

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| PageCard | Fresh mounts, direct selectors and independent action events. [Review](reviews/batch14/PageCard.md). | 4 → 5 |
| SidebarList | Typed props and complete selection event tuples. [Review](reviews/batch14/SidebarList.md). | 20 → 20 |
| MarkdownVitessce | Renderer config assertions and awaited mapping output. [Review](reviews/batch14/MarkdownVitessce.md). | 4 → 4 |
| HistoryPageView | Typed page fixtures and explicit fresh Pinia. [Review](reviews/batch14/HistoryPageView.md). | 23 → 23 |
| useHistoryGraph | Fresh seed refs and meaningful dependency identity checks. [Review](reviews/batch14/useHistoryGraph.md). | 12 → 12 |
| CreateForm | Existing object-store factory and consolidated identical templates. [Review](reviews/batch14/CreateForm.md). | 6 → 6 |
| InvocationsProvider | Exact request query, returned data and callback response. [Review](reviews/batch14/InvocationsProvider.md). | 1 → 1 |
| VisualizationCreate | Public child query prop, consistent mounts and removed DOM leak. [Review](reviews/batch14/VisualizationCreate.md). | 4 → 4 |
| FormPickValue | Direct typed Step fixture and wrapper disposal. [Review](reviews/batch14/FormPickValue.md). | 10 → 10 |
| HeadlessMultiselect | Scoped real teleport queries and awaited keyboard events. [Review](reviews/batch14/HeadlessMultiselect.md). | 12 → 12 |

## Reuse and follow-through

Existing typed page and object-store factories remove duplicated domain defaults and sparse casts. [Shared PageEditor fixture reuse](reviews/batch14/testData.md) follows the canonical page factory into the existing fixture source without changing any original value. Both consumers are validated: selected PageCard and unchanged supporting HistoryPageList (11 cases). HistoryPageView independently reuses the same canonical factories. No new shared helper is needed. Only the ten originators advance counters: 145 of 396 reviewed; the supporting suite remains eligible for its own full review.

Existing README guidance covers the improvements; README, LOOP_ITERATION.md and marginal advice remain unchanged.

## Validation and review

All 108 cases pass across 11 affected suites with shuffled seed `140101`, zero skips. The selected baseline passes 96 cases; splitting the independent PageCard actions produces 97 selected cases. The supporting original-fixture baseline and final suite both pass 11 cases. Full client typechecking, scoped ESLint with zero warnings/errors, Prettier, whitespace checks and source commit hooks pass. The final validation follows fixes to two test-helper type annotations.

[Independent review](reviews/batch14/normal_review.md), [fresh test challenge](reviews/batch14/test_challenges_debrief.md) and [strict code quality review](reviews/batch14/thermo_nuclear_review.md) approve preservation, cleanup, boundaries and reuse. [Scope](reviews/batch14/scope_evaluation.md) retains ten originators and focused fixture reuse. [Screenshots](reviews/batch14/screenshot_debrief.md) are irrelevant to unchanged production rendering.

## Separate finding

The [Markdown review](reviews/batch14/MarkdownVitessce.md) identifies a pre-existing invocation argument mismatch: the component passes a string to an action expecting `{ id }`, leaving the request path placeholder unresolved. Original mapping coverage is preserved; production is unchanged. A separate fix should pass `{ id: invocationId }` and add exact request-ID regression coverage. This is a concrete implementation finding, not marginal best-practices advice.

Galaxy iteration14 commit: `b8933cdd60dac5572bc156c40a1464ab72e018a2`. [Review only this iteration](https://github.com/jmchilton/galaxy/compare/983633ff5e3ff4da8364f9222889afde5713b42c...b8933cdd60dac5572bc156c40a1464ab72e018a2). The existing draft PR is [#24015](https://github.com/galaxyproject/galaxy/pull/24015); CI for this head has not been assessed.
