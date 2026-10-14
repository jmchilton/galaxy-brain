# FormInputCollection play conversion review — 2026-10-14

Approved: no concrete fixes required. Reviewed the candidate read-only and wrote this debrief; no code edits, test reruns, or process termination. No findings were left unaddressed.

## Details

Scope: commit `1e12f2a42901352b3c6cdd38935dc0c324ce0f84`, parent `bd1b05362738ec1a989074618650c8dd61c3d8b5`, lane `vitest_story_play`. Pinned lower lane: `28e7b8f77a5eb57132c599d1a910842b564e7d09`; supplied remote lease: `d23c0ad13fe8251bf572f2445b4589c13efab247`. The commit changes only FormInputCollection.stories.ts and FormInputCollection.test.ts. HEAD matches the candidate, the worktree is clean, and FormInputCollection.vue compares byte-identical to `/private/tmp/play-inputcollection-component-original.vue`. Reviewed TO_PLAY_ITERATION.md, STORY_CONVENTIONS.md, PIPELINE_BRANCHES.md, PIPELINE_WORKERS.md, and the shared review/security policies. No worktree AGENTS.md files were found along the inspected ancestry or component paths.

### Original assertion mapping

Compared against `/private/tmp/play-inputcollection-original.test.ts` and the candidate diff. The original three cases contain eight written assertion sites:

| Original case / assertion | Final location and fidelity |
| --- | --- |
| Stored step: FormCollectionType value equals `list` | DatasetList play checks the visible `Collection type` combobox has exact value `list`. This checks the real child’s rendered value; native FormText input has a datalist and therefore the combobox role. The same raw child-prop starting check is also added independently to both retained unit cases. |
| Delayed snapshot: FormColumnDefinitions exists | Retained unchanged in unit after collection-type edit and nextTick. |
| Delayed snapshot: emitted collection_type equals `sample_sheet:paired` | Retained unchanged after the 500 ms fake-timer advance. |
| Delayed snapshot: emitted column_definitions equals CONDITION_COLUMN | Retained unchanged as the exact array/object assertion. |
| Stale echo: child value remains `sample_sheet:paired` | Retained unchanged after setProps on the existing plain mount. |
| Stale echo: optional field is defined | Retained unchanged. |
| Stale echo: one additional emission follows optional input | Retained unchanged as emittedCount + 1. |
| Stale echo: last state matches paired type and optional true | Retained unchanged, including both object fields. |

Thus the two final unit cases contain nine written sites: seven original sites plus two initial `list` checks. Timing, delayed full-payload, live-prop echo, and emitted-count contracts remain unit checks with their original setup and sequencing. Keeping these cases is appropriate because a visible browser field cannot substitute for the payload and live-instance contracts. No original variant, navigation selector, or API contract is lost.

### Browser behavior and synchronization

DatasetList checks visible exact `list` before the negative column-editor check. PairedSampleSheet checks visible exact `sample_sheet:paired`, visible `Column definitions`, and a visible `Name` textbox with exact `Condition`. The stored column fixture and story args are unchanged.

ChangesCollectionType starts at visible `list` with no editor, clears and types through the real input, waits for visible `Column definitions`, checks exact type and visible `Add column.`, then clears/types `list` and checks editor absence after the positive value check. The waitFor checks accommodate Vue’s rendering updates. The component seeds its own ref from parsed tool_state and owns the sample-sheet predicate and conditional editor; these checks therefore cover its behavior rather than only a dependency’s typing behavior. The focused native input’s typed value alone is not a model assertion, but the accompanying conditional-editor transitions prove the owner state changed. No network behavior is claimed.

### Evidence inspected

The original baseline logs report unit 3/3 (best Tests 95 ms), story render checks 2/2 (best 108 ms). Final logs report unit 2/2 (both 79 ms), stories 3/3 (317/304 ms). The supplied actual exit codes are zero; the log summaries agree. Lint output is empty, type-check output contains vue-tsc with no diagnostic, and Prettier reports all files matched. Gate16 log summaries report browser 539/539 across 93 files and unit 502/502 across 83 files. No broad rerun was needed for this read-only review.

Mutation evidence was reviewed separately:

- Hidden owner root: original three unit cases still pass; all three final browser plays fail at inaccessible/hidden collection-type controls. This distinguishes visible rendering from the original raw child-prop assertion.
- Owner column value forced to null: original three unit cases still pass; only PairedSampleSheet fails because `Name` / stored `Condition` is absent. This isolates the new stored-column read.
- Owner sample-sheet predicate forced false: ChangesCollectionType fails at missing `Column definitions` after typing; the other stories are skipped in this isolated run. This proves the interaction checks the owner’s conditional rendering.

The earlier direct-child style experiment is not treated as proof, because FormElement v-show partially overrides it. The final byte comparison confirms restoration of the owner component. No old sibling test remains in the candidate diff or worktree status.
