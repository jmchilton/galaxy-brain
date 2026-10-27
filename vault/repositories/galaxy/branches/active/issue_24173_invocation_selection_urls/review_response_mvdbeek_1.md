# Response plan for mvdbeek — review 1

Review: [2026-10-23](https://github.com/galaxyproject/galaxy/pull/24307#pullrequestreview-5631808810), against `d0b76746d47`. All seven points are accepted. No design contention, pushback, or follow-up issue is needed. John authorized posting on 2026-10-27. All five inline replies and the summary below have been posted; no thread has been resolved.

Attribution updated at John's request to GPT-6.1-Sol, medium effort. CI on `0e46a8984b4` is green (all checks that ran passed). John's final read-through remains pending.

## Inline replies

[Polling fixtures](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4362191050):

> Thanks for tracing this. I added `order_index` to the polling and input fixtures introduced on dev. `useInvocationGraph.test.ts` now passes all 39 tests locally.
>
> ***Posted by model GPT-6.1-Sol at effort medium on jmchilton's behalf***

[Missing decorator](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4362191066):

> Restored `@selenium_test` on `test_mapped_job_selection_urls`, outside `@managed_history`, matching the other tests.
>
> ***Posted by model GPT-6.1-Sol at effort medium on jmchilton's behalf***

[Output scrolling](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4362191077):

> That explanation makes sense. Scrolling now waits until the target's provider has rendered its content, instead of jumping while the output list consists of empty containers. I added delayed-provider tests for datasets and collections and retained the existing browser visibility assertion.
>
> ***Posted by model GPT-6.1-Sol at effort medium on jmchilton's behalf***

[Steps search](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4362191085):

> Agreed. The list now distinguishes local selection from external navigation. Expanding a card, selecting a tab, choosing a job, or expanding an output preserves the current search and scroll position. External navigation still reveals its target, and the search input is bound to `currentQuery`. A regression test covers keeping the filtered card list and clearing it on external navigation.
>
> ***Posted by model GPT-6.1-Sol at effort medium on jmchilton's behalf***

[Multiple expanded outputs](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4362191094):

> Applied your suggestion in both views: the target receives `true`, while other outputs receive `undefined` and keep their local expansion state. Collapsing an output clears the URL only when that specific output is the current target, including the step identity for step outputs. Tests cover preserving local expansion and leaving another output's URL intact.
>
> ***Posted by model GPT-6.1-Sol at effort medium on jmchilton's behalf***

## Review summary reply

> Thanks for the careful review. I addressed the five inline points, converted the feedback view's remaining positional lookup to `order_index`, and added a regression with out-of-order invocation steps and different job summaries. Graph polling, Steps filtering, and feedback filtering now build lookup maps outside their per-step loops.
>
> Pushed as `0e46a8984b4`. The local invocation and selection test scope passes: 148 tests across 17 files. Both `test_mapped_job_selection_urls` and `test_output_urls_expand_outputs` pass with Playwright. CI on the new head is green; all checks that ran passed.
>
> ***Posted by model GPT-6.1-Sol at effort medium on jmchilton's behalf***


## Posted links

- [Reply 1](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4391665668)
- [Reply 2](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4391665956)
- [Reply 3](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4391666220)
- [Reply 4](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4391666510)
- [Reply 5](https://github.com/galaxyproject/galaxy/pull/24307#discussion_r4391666832)
- [Reply 6](https://github.com/galaxyproject/galaxy/pull/24307#issuecomment-6448179712)
