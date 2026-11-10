Run via gpt-6.1-sol at high effort.

Codex raised one finding, which I confirmed and fixed on both branches (gxformat2 `cdf4ca5`, galaxy-tool-util-ts `7d2edbd2`). Treat this as a limited pass: Codex's shell never worked here, so it reviewed only the text I gave it and ran nothing.

Not acted on:

- Nothing Codex raised. One related gap stays open: step ordering and the extract cascade still resolve refs against step labels only. It's pre-existing, and the [thermo-nuclear review](thermo_nuclear_review.md) reproduced a phantom cycle in ordering on a contrived draft.

How the run differed from the planned brief:

- The first run came back empty because every shell command failed with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`. It read no files, so I discarded its empty result. I kept `-s read-only` and did not disable any sandbox. That first run was also lost for nearly two hours, because my wait loop's `pgrep -f` matched its own command line and never exited.
- The run reported here had the same brief, with the scope section reworded for stdin and `-c model_reasoning_effort=high` for that run only. Its stdin held both `git diff origin/main...HEAD` outputs (`3d85df0`..`7358147` and `b30808fe`..`d447be46`) and full copies of `gxformat2/draft.py` and `packages/schema/src/workflow/draft-checks.ts`.
- Codex says it did not check imported resolver and schema code, unchanged surrounding tests and docs, existing fixtures the diffs reference, or runtime test results.

<details><summary>Full review</summary>

### Finding 1 (P2, correctness, confidence "likely"): consumer sources resolve only against step labels

**Verdict: CONFIRMED.** `_collect_step_consumers` (`gxformat2/draft.py`) and `collectStepConsumers` (`packages/schema/src/workflow/draft-checks.ts`) both received step labels only, while validation's `check_edge_ref` resolves against input and step labels.

Reproduced in Python on Codex's scenario, with a workflow input labelled `a/TODO_out`, a step `a` with out port `TODO_out`, and a step `b` with `input1: a/TODO_out`. `validate_draft` passed with no errors, and `next_draft_step` printed:

```text
TODO[out.TODO_out]: assign the real wrapper output port name (semantic hint: 'out'; referenced by workflow output 'final'; consumed by 'b/input1')
```

Neither edge exists: both refs resolve to the workflow input. An agent following the item would rewrite a ref that has nothing to do with the port.

**Fix.** `_next_draft_step_in` and `nextDraftStepIn` now index both `consumed by` and `referenced by` against step and input labels. Codex named only `consumed by`. `referenced by` predates this branch, but it shares the call site and has the same bug. The same scenario now prints:

```text
TODO[out.TODO_out]: assign the real wrapper output port name (semantic hint: 'out')
```

**Test.** `synthetic-draft-port-edges.gxwf.yml` gains an input labelled `dr/aft/TODO_unused`, plus a workflow output and a step input that reference it. The existing expectation that `TODO_unused` shows no edges now covers the case. With the Python fix reverted, `test_next_draft_step_reports_edges_around_todo_ports` fails.

**Checks after the fix.**

- gxformat2: 954 passed, 8 skipped; `ruff check`, `black --check` and `mypy` on `draft.py` are clean.
- galaxy-tool-util-ts: schema package 5167 passed, 5 expected fail, 79 skipped; `packages/cli/test/draft-validate.test.ts` 27 passed; `make typecheck`, `make lint` and `make format` are clean.

</details>
