# AWS estimate play review — 2026-10-14

PASS. Independently reviewed candidate `0680ba970bb73c65d70ba4a3b3585b79154b1643` against parent `4b44e54b3b3fe4235f31303f554e5fc246b512d3`. No code fixes requested or applied. Review covered only the two candidate test/story files, with read-only component, composable, Vue lifecycle, navigation, and validation-evidence inspection. No processes stopped and no full browser gate rerun.

No unacted-on recommendations.

## Details

### Original assertions

The original has seven written assertion sites, executing 12 assertions across four cases. All survive directly or through faithful browser-visible equivalents.

| Original assertion site | Runtime cases | Final location and strength |
| --- | --- | --- |
| `#aws-name` does not exist | Invalid/nonpositive resources | Retained verbatim in the unit case, after `$nextTick`. |
| Estimate instance name equals expected name | Small and large jobs | `readEstimate` checks exact text and visibility: `t2.small` and `m5d.12xlarge`. |
| Estimate cost equals expected cost | Small and large jobs | Exact visible `0.00 USD` and `16.32 USD`. |
| Estimate memory equals reference memory | Small and large jobs | Exact visible reference `mem.toString()`. |
| Estimate vCPU count equals reference count | Small and large jobs | Exact visible reference `vCpuCount.toString()`. |
| Estimate CPU models equal joined reference models | Small and large jobs | Exact visible reference CPU-model join using `", "`. |
| Derived estimate equals `{}` | Requirements exceed available instances | Retained verbatim; helper returns the same extracted estimate plus its wrapper. |

The five shared positive assertion sites still execute for both original resource rows. Numeric story args exactly match the original `Number(...)` conversion: `(1, 9, 2048)` and `(40, 18000, 194560)`. The bundled reference data is unchanged. Costs assert that snapshot's calculations, with no claim about current AWS prices. The original reference lookup's defined-instance requirement remains implicit in the dereference and exact expected-name checks.

Both absence cases add root absence and completely empty rendered text: four new sites, six final unit assertion sites across two cases. Root absence makes the section contract explicit; empty text detects unexpected sibling output that the old assertions missed. Invalid-resource rendering is synchronous and the unit waits for its Vue tick; the composed-story case flushes promises. These remain unit edge checks, avoiding asynchronous browser negatives without a visible readiness signal.

### Browser behavior and added checks

Three active plays use heading, button, and exact-text queries, with no class, ID, computed-style, or layout assertions. AWS IDs have no navigation-selector consumers. The reads require heading visibility, expanded state, and all five exact visible details. If persisted state begins collapsed, the helper first verifies cost omission, clicks the accessible expand control, and then checks the full estimate.

The new toggle scenario first reads the complete estimate, clicks the component's actual collapse control, verifies the retained heading and `aria-expanded=false`, waits for cost omission, and checks name omission. It then expands and re-reads every detail. The changed button state provides a positive synchronization point for the collapse negatives; the heading and expand button provide the initial collapsed-state signal. This tests the owner's event wiring rather than a mocked dependency's handler.

### Persistent-toggle cleanup

`useHashedUserId` stores `currentHash` at module scope. A fresh Pinia can therefore still reuse an earlier actor hash, making anonymous/no-storage assumptions incorrect. The decorator snapshots every pre-existing key with the exact `toggle-state-aws-estimate-` prefix before mounting its child. On unmount it removes newly created keys in that namespace and restores every previous value, including a pre-existing collapsed state. It neither clears unrelated storage nor changes/removes `local-storage-salt`.

The installed Vue compat runtime stops the component scope and recursively unmounts its subtree before queuing the parent's unmounted hooks (`client/node_modules/@vue/compat/dist/vue.cjs.js`, `unmountComponent`). Therefore the decorator restoration occurs after child teardown, unlike a parent `onBeforeUnmount` restoration. The component's persistence implementation writes in response to its toggle ref; restoring storage does not mutate that ref or dispatch an application storage event. The cleanup remains appropriately narrow even when the module hash changes during the story. The read helper tolerates preserved collapsed values by expanding through the actual control. No component or composable change is introduced by this commit.

### Evidence checked

Read the project iteration, story, branch, and worker rules and shared review/security policies. Candidate HEAD and parent match the supplied SHAs; the immutable lower base remains an ancestor. Git status is clean, and the candidate changes only `AwsEstimate.test.js` and `AwsEstimate.stories.ts`. The component matches `/private/tmp/play-aws-component-original.vue` byte for byte; the temporary original-test sibling is absent. The `Test-File` trailer parses correctly.

Reviewed the supplied logs rather than rerunning an unrelated gate. Baseline: 4 units and 2 stories, best test times 27 ms and 58 ms. Final cleanup runs: 2/2 units and 3/3 stories twice, best 15 ms and 123 ms. Formatting passes; lint log is empty; type-check log has no diagnostics. The coordinator reports actual exit 0 with failure propagation for final checks. Reused gate17 logs show 504 units across 84 files and 544 browser tests across 94 files; the separate touched BarChart checks and gate reuse authorization are supplied coordinator evidence.

The combined distinguishing mutation logs show the original 4/4 still pass while all three browser plays fail on hidden cost, and both strengthened unit cases fail on unexpected sibling text. The independent no-op owner toggle mutation leaves the original 4/4 and both read plays passing, while the new collapse/expand scenario fails because the expand control never appears. Those are specific failures of the newly added observable contracts. Mutation line positions predate the final cleanup amendment; the amendment changes only storage lifecycle setup and leaves their reads, args, and toggle actions intact. Actual mutation exit statuses (old 0, strengthened 1) are supplied coordinator evidence; log failure messages independently agree.

No blocking correctness, assertion-preservation, scope, or cleanup issue found. Read-only review did not independently execute a prepopulated-storage lifecycle experiment; lifecycle confidence comes from the inspected implementation, installed Vue teardown order, and the final passing touched-suite logs.
