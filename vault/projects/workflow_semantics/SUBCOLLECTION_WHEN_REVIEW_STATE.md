# PR #23369 review state

mvdbeek reviewed 2026-08-26 (5 review submissions, 2 issue comments, 8 inline comments,
one of them retracted). Nothing merged. Recorded here 2026-08-26.

## Disposition: the PR was split

#23369 argued two claims as one, and the reviewer's central objection was "I am not sure
what bug this is fixing." Split into two branches off `dev`:

| Branch | Content | Status |
|---|---|---|
| `regenerate_collection_semantics_doc` | regenerate the stale generated doc, nothing else | **merged as #23376** |
| `subworkflow_mapping_per_step_semantics` | all-`None` collapse + framework test + unconditional docs | rebased on dev after #23376, pushed, not opened |
| `subworkflow_mapping_when_alignment` | `is_aligned_with` guard + API tests + unit tests + conditional docs | stacked on the above, pushed, not opened |

`doc/source/dev/collection_semantics.md` on dev has been missing the 102-line Type
Compatibility Algebra section since `39597b3366` (2026-04-25) added it to the YAML without
regenerating. Every PR touching that file inherited those 102 lines of unrelated diff -
which is most of why #23369's doc change read as larger than it was. Regenerating first
takes the first PR's doc diff from 155 lines to its own 53.

Nothing catches this drift: `semantics.py --check` only validates test references (and
`main()` discards `check()`'s return value besides), and the file is excluded from prettier
because prettier fights the generator. Worth a CI guard at some point.

Local verification of the split:

- framework `subworkflow_mapping_per_step` passes on branch 1 alone; reverting only the
  collapse gives `IndexError: list index out of range` at `structure.py:128`
  (`when_value = self.when_values[index]`), invocation `unexpected_failure`
- 9 conditional-subworkflow / inner-collection API tests pass on branch 2
- 80 unit tests (`test_matching.py` + `test_collection_semantics.py`)
- code content of both branches is byte-identical to #23369's for `modules.py`,
  `matching.py` and `collection_semantics.yml`

`#23369` itself still points at the old combined branch. It has to either be force-pushed
down to branch 2's content or closed in favour of two fresh PRs — undecided, and it
matters because force-pushing orphans the inline comments the reviewer spent an hour on.

## Open review items

1. **The premise isn't landing** (4 comments). "`when_values` refers to the jobs produced
   by `module.execute`, not a particular collection" and "`walk_collections` determines the
   map-over order, which seems like the source of truth ... independent of what other
   collections we encounter." He is right that the list is per-job; the answer is that it
   is *produced* by walking one structure and *consumed* by walking another. He explicitly
   asked which test workflow to think through — answer is `subworkflow_mapping_per_step`,
   and the 2-vs-3 element counts are the point.
2. **Error message costs half an hour to decode.** It names neither the step nor the two
   collections. Not yet fixed.
3. **Doubts the test setup is legal** (2 comments, from two different files, after
   retracting the same doubt once). "The inner `independent_collection` input requires a
   list but you're not feeding it one" / "what the inner workflow sees after the map-over
   is a single dataset." It is legal — the child invocation receives whole collections —
   but if a reviewer bounces off it twice the artifact is unclear.
4. **Doc: "All steps inherit that mapping, right?"** The current prose is what the code
   does — `compute_collection_info` ends `return collection_info or
   progress.subworkflow_collection_info`, so a step with its own collection uses its own
   dimensionality and inherits only `when_values`. Answer with the pointer.
5. **Doc: "its outputs match only that collection — in the context of the subworkflow,
   right?"** Stronger than that: the framework test shows the 3-element output stays flat
   at the top level too.
6. **Doc suggestion: say you cannot consume beyond the subworkflow input depth** — a
   `multiple="true"` input connected to a single data input inside a subworkflow mapped
   over a list will not consume the outer list. Already true and already commented in
   `_find_collections_to_match` ("the inner workflow cannot reduce the outer list"). Needs
   an example before it goes in the doc.
7. **Type hints** on `_dataset_collection_key` / `mapped_collection_provenance`. Trivial,
   not yet done.

## Watch for

His "`when_values` maps to jobs" framing is one step from "then store them per job/element
instead of a positional list" — which is what the PR's "Not addressed here" section
declines to do. Much larger change; the split makes it easier to park.

## CI

The two failing checks on #23369 are unrelated: cloud objectstore tee-streaming (bad AWS
creds) and a GalaxyAI selenium test.
