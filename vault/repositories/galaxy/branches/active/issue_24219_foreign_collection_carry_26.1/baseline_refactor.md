No refactoring of the base branch was performed.

I reviewed range `dbe4f2f7e41..13c7352f165`. The local head is unchanged at `13c7352f165`.

- **The cherry-picks must stay first.** `3311cf2dd1f` and `62058ed38ed` are `-x` picks of #23865 and stay first and intact. So nothing can land directly on `release_26.1`. A refactor could only go between `62058ed38ed` and `7bee3166e32`, which would not make it a base-level split.
- **The production change has nothing to split out.** In `fd4963c2021`, `_carry_selected_hdca` now takes `trans` and `dataset_collection_matcher`. That only matters once the `_classify_hdca` call uses them, so the signature change alone would be dead plumbing.
- **The test-helper changes belong with their callers.** `_build_tool_param` already exists on base. The only new piece in it is the `inputs=` kwarg. `_carried_hdca_option` is new, with three callers, all of them new tests. Moving either one ahead of its callers would add unused code and would not make a separate PR.
- **Review commits stay separate.** `c5f2b4503bd` (review follow-up) and `13c7352f165` (test-challenge cleanup) stay as their own commits, so each one shows what that review changed and the SHAs cited in the existing debriefs still resolve.

Deferred dev refactor (from thermo review, still applies): one shared carried-HDCA helper for `DataToolParameter._carry_unresolved_inputs` and `DataCollectionToolParameter._carry_selected_hdca`, with classification. It belongs on dev, not under this stable-branch fix.

Note: the `index.md` status still says local head `fd4963c2021`. The current head is `13c7352f165`.
