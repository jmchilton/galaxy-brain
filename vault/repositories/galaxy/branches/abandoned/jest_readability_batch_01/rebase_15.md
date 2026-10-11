# Rebase after iteration 15

At the user’s request on 2026-10-09, rebased the existing branch onto freshly fetched `origin/dev` (`df3932ed4baec0da0f496453b45a48333e7603d4`). The PR confirms `dev` as its base. Previous head: `c4442efc78bb1d4a195b48fc9b65758a0b86a805`; rebased head: `ebf196cabbe55f4ce8ee692a439e9eb59d86c647`. All 15 iteration commits remain separate and ordered; fourteen patches replay unchanged.

The sole conflict was `client/src/components/Workflow/Editor/Forms/FormPickValue.test.ts`. Retained upstream’s new “hides actions that require a job” test, FormSection import and datatype prop, alongside iteration14’s typed factory/mount, fresh local Vue and automatic unmounting. The helper’s datatype argument now uses `DatatypesMapperModel["datatypes"]`, matching the production prop. Every existing scenario and assertion is preserved.

[Independent normal review](subagents/rebase_review_15.md) approved the resolution. Shuffled FormPickValue tests pass all 11 cases; upstream FormSection tests pass both cases. Full client types, scoped ESLint, Prettier and branch whitespace checks pass. Vault validation reports zero errors (15 existing warnings). No new readability iteration or inventory counter change was made.

Published to the `jmchilton` fork using a force-with-lease pinned to the previous remote head. The remote matches the rebased head; the source worktree is clean. [PR #24015](https://github.com/galaxyproject/galaxy/pull/24015) remains draft, is mergeable, and has fresh CI queued/running; workflow status remains `ci_wait`. Existing iteration reports retain their historical commit IDs; the mapping below relates those IDs to the current branch.

| Iteration | Previous commit | Rebased commit |
| --- | --- | --- |
| 1 | `93eb9faa3e41fa9f1ec68094d709130cd80b999f` | `3eff4d39445878c6c4eadbf553618ce22309954c` |
| 2 | `df2a57cabf15e27cf0eccd8ec530ac2071c51d28` | `3bb41a83b44b67b91d9abfa1b72ed99892443534` |
| 3 | `eee5b72012e4949bd0d0315b808953c99d0ccadf` | `3f05f24c842897df42bd919528f7986fca64de73` |
| 4 | `fedc9b599bf6440d55f0951f2b7f95e6aa68f579` | `39572491efece4fad6c0fa2e09f516e80be4a54d` |
| 5 | `3c152e26fa9497db908beadd20c37a883ad3f390` | `e8f3ac1f190ad33e103ca7c833463e23c2e2eee6` |
| 6 | `8cd6910a856b15009722e296b69f21fbfaa42e8b` | `af0e7f45a6b2a5c0e070d8d935c4f0556b6af589` |
| 7 | `7c2738f4644b7b0f6923d9a2e6654349210e81b8` | `e99c2fd7cbad9afb2ae3afee3ab1c9a795328a92` |
| 8 | `39c6b40bc2468155924f1fda0f241254b546d249` | `a99a3f106058aa84c71b3a2d122b728c6e1370c6` |
| 9 | `03776948996d3d0450d328d2901475fb83b5a4e0` | `13b5e2683f51fb5a599d2d0a5716ea4a3a3af1cf` |
| 10 | `da55fde9518fddae07a6cf5ab67ee7c6423591c5` | `397c7c842ff459f93416f5dde1706ebd538e4d44` |
| 11 | `61c44ce5a05f0b70021010ba7d937c25690c1558` | `df4c66104fa0bfb26d68db2bba5ed69fec88d97a` |
| 12 | `ba5800a26798382da706088dca0947a769b19641` | `444202674ade0039d5dacde7650444d1f471e1ac` |
| 13 | `983633ff5e3ff4da8364f9222889afde5713b42c` | `21f7775617e44c5315f9bbe817881f5fedef1bd2` |
| 14 | `b8933cdd60dac5572bc156c40a1464ab72e018a2` | `a254261e5635cdac8d2fc0dfa38b706ccccee64b` |
| 15 | `c4442efc78bb1d4a195b48fc9b65758a0b86a805` | `ebf196cabbe55f4ce8ee692a439e9eb59d86c647` |
