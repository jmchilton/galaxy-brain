Run via Claude Opus 5.5 at high effort.

# Normal review: `ef1607a8..65f043a4` (fixes at `ccf4a817`)

The branch is sound, including the two-snapshot design. I fixed three issues in one commit (head below). The CLI page and run-workflow-test claimed coverage of steps removed inside subworkflows, which `gxwf diff` can't see. A list-form relabel false-fails the gate, and debug would have "restored" a step that was never lost. A bare-list ledger, which the sibling reader in `build-cli` accepts, was rejected as a check error, and debug read that error as "fix the tooling". I also took three nits: the `yaml` import style, the error prefix, and a tighter CLI assertion.

## Not acted on

- **Upstream contract (for John, gtu-ts #233 / gxformat2 #296).** "A label change on a matched step is reported as `fields.label`" holds only for dict form. A list-form step is keyed by its label, else its id, so adding or changing a label reads as removed plus added. The gate works around this by docs and debug routing. Whether the diff should pair a list-form step by `id` when it has one is upstream's call.
- **Removed steps keyed by `id` in list form.** When a list-form step's `id` differs from its `label`, the diff key and summary carry only the label, so a ledger `step:` naming the id doesn't match. No committed fixture has `id` ≠ `label`. Left alone.
- **Shared ledger reader.** `build-cli`'s `parseOpenRequirements` and `ledgerEntries` here both narrow the same file. `build-cli` already depends on `gxwf-foundry`, so a shared `ledgerEntries` could live here. That's a follow-up refactor, not this branch.
- **Typed diff.** `step-removals.ts` narrows `unknown` by hand. Once the pin bump brings `@galaxy-tool-util/schema` with `workflow-diff.ts`, type the input against it.
- **paper-to-cwl now lists `foundry` as a required tool.** It's implied by run-workflow-test's sidecar, but the gate never fires there because CWL pipelines write no snapshot. This is an assembly artifact and harmless.
- **No ledger file with a snapshot present.** The CLI exits 1, so the run reports a check error. The per-step loop always writes the ledger, so I didn't special-case it.
- **Debug relabel branch has no eval fixture.** The new step-8 clause is LLM-judged prose only.

## Details

### Two snapshots: agreed

The extracted copy is the right gate baseline. Diffing the pre-loop draft would flag every pre-extract removal: drafty steps `draft-extract` drops, repair's removals, and repair's cascade removal of feeders that existed only for a removed step. That cascade never gets its own drop entry ("Remove what existed only to feed a removed step"). Gating on it would fail honest runs. The repair Mold forbids removing realized steps, so post-extract removals come only from the test phase. Update-interview applies change-set removals in phase 3, before extract, so intentional removals stay out of the gate. For #784, I checked with the local #233 build that step identity survives `draft-extract`. A dict-form `fastp` labelled "trim and QC paired reads" stays keyed `fastp`. The list-form brew3r draft against its extract shows only the drafty steps removed and the kept ones under `changed`. So the debrief's `plan_fields_before` advice holds.

Repair fold removals are handled honestly. Because they happen before extract, they're out of the gate by construction, and the debrief says #784 must expect them in the pre-loop diff.

### Findings

1. **Bug: subworkflow coverage overclaimed.** The CLI page said a removal inside a subworkflow "shows up as a change to the subworkflow step". The contract compares an inline `run` as `null`. A scratch diff (nested `first` → `second` with `first` deleted) returned `has_changes: false`. Fixed the gotcha. Qualified run-workflow-test's summary line, step 6, the eval property ("top-level steps only") and its scenario coverage gaps.
2. **Bug: list-form relabel false-fails the gate.** A scratch diff that adds `label: first cat` to a list step `id: first` gave `removed: {first}` and `added: {"first cat"}` with identical tool and connections. Debug step 8 would have treated it as an unrecorded repair and restored a duplicate. Added a CLI gotcha and a step-8 branch: a removed step that reappears in `steps.added` with the same tool and connections was relabelled, so restore the old label.
3. **Bug: bare-list ledger rejected.** `build-cli/src/lib/run-ledgers.ts` accepts "a bare list of entries" as seen in real runs. `checkStepRemovals` threw, so the CLI exited 3, the run reported `step-removal-check-error`, and debug routed that to tooling. Red test first ("reads a ledger written as a bare list of entries" failed with `ledger is not a YAML mapping`), then accepted a list. The rejection case moved from a list to a scalar, so rejection stays covered; this is a behavior change, not a weakened test. Debug step 8 now says a check error can be an unreadable ledger as well as a gxwf without `diff`. The CLI page now describes the exit-3 shapes exactly: a mapping without `entries` is an empty ledger.
4. **Nits, fixed.** `import YAML from "yaml"` as in `run-yaml-validator` and `validate-tests-format`. The `error reading <path>:` prefix from the shared runners. The CLI test now asserts the exact `inputs feeding no step: chr` line instead of `toContain("chr")`.

### Checked and fine

- Matching rule: top-level `step` equal to the key or label, `kind: dropped`, no `source_arg`, any status. Any status is consistent with the ledger's "an entry makes a cut legible, never justified"; a reopened, refuted drop still labels the cut. Gaps, flag records and `decisions` are ignored.
- Exit codes 0/4/3/1 mirror `check-workflow-brief` and the shared validator runners. `gxwf diff` exits 0 on differences unless `--exit-code` is passed, so the Mold's "can't run" reading is right.
- CLI wiring follows the existing pattern: `program.ts`, `meta/index.ts` (parity test), README, library export, CLI page and changeset.
- Gating scope: run only after a green Planemo run and only where the extracted snapshot exists. Maturation and review work on existing workflows with no loop baseline, and CWL targets have no Galaxy snapshot, so `step_removals: null` is right. A red Planemo run goes to debug first.
- Tests run against three real #233 outputs plus the CLI's exit codes and stdin. Imports are at the top of each file, with no buried imports.
