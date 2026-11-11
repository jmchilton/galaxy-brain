Run via Claude Opus 5.5 at high effort.

# Strengthen round: `issue_232_workflow_diff`

Reviewed head `a8c6ea89`. New head `433db8de`, pushed to `origin`. Base `origin/main` `7370df1b`.

## Likely misreadings, and the sentence that answers each

- "Foundry already calls this." Answered by the #796 highlight, which now says the planned Foundry change will call `gxwf diff --json` and that nothing calls it yet.
- "This caught the iwc-lab#8 removal." The parity highlight says that run overwrote its draft with the 4-step graph, so it shows agreement, not a caught removal.
- "`--exit-code` fails on unwired inputs." This misreading was **not answered** before this round. A new highlight says `has_changes` ignores `unwired_inputs` and `warnings`, so a consumer has to read `--json`.
- "The parity rests on partial field assertions." The new highlight says the synced cases assert selected fields, and that a scratch run compared full text, ordered JSON and exit status.
- "The divergences can affect Foundry's verdict." The divergence highlight keeps membership out of it and now names exactly which divergences flip `has_changes`, and in which direction.

## Tasks applied

1. **Pinned the example's full text** (`c740c629`). The draft-before → draft-after test in `workflow-diff.test.ts` had two `toContain` checks. It now asserts the exact output. This is a strengthening, not red-to-green. `cmp` against gxformat2 `gxwf-diff` at `729027d` gives byte-identical text and raw `--json`.
2. **Added `readWorkflowFile` tests and a changeset entry** (`433db8de`).
   - New tests: `draft-validate` exits 2 on a missing file, and `lint` exits 1 with exactly one `Failed to read …: ENOENT` stderr line.
   - Red-to-green: the tests failed with an unhandled ENOENT when `workflow-io.ts` was swapped for its `e6000747^` version.
   - The behaviour was left as it is. Read failures now match parse failures, which were already 2 for `diff`/`draft-*` and 1 for the rest.
   - The changeset says so.
3. **Corrected `pr_description.md`.**
   - #796 attribution: the issue body asks for removed steps plus unwired inputs, and the scoping comment asks for "a new `gxwf` command" and the fail rule. The planned Foundry change will call `gxwf diff --json`.
   - Fixture count: 23 cases over the 21 synced `format2/diff/` fixtures plus two existing ones.
   - Parity claim rewritten. It is backed by a scratch run at this head and is labelled as not a test.
   - Exact `has_changes` flip list. Removed the stale "extra keys on an `out` entry" divergence.
   - New highlight on `has_changes` ignoring unwired inputs and warnings.
   - The `readWorkflowFile` bullet now names its tests.

## Evidence

- Scratch parity at `433db8de` against gxformat2 `729027d`, over all 23 `diff.yml` pairs and the two iwc-lab#8 pairs, compared full text, `jq -c` JSON (order kept) and the `--exit-code` status. Everything matched.
- The real pairs both give `steps.removed` empty, `steps.changed` `fastx_single, multiqc, post_fastqc`, and the 5 unwired inputs.
- Probes for `has_changes` flips:
  - Python reports a change and TS doesn't for `state: {x: 1}` → `{x: 1.0}` (Python `--exit-code` 1, TS 0), for `type: subworkflow` → `type: tool` on a `GalaxyUserTool` run, and for `int` input `validators` `{expression}` → `{type: regex, expression}` or `{…, negate: null}`.
  - A list-form input with a string `format` makes Python raise (exit 1) while TS diffs it.
  - Extra `out` keys (`foo: bar`) give no change on either side. gxformat2 `729027d` fixed that, and the synced `synthetic-diff-out-extra-key` case pins it.
- Python `gxwf-diff` on a missing file exits 1 with a traceback; TS exits 2. This isn't part of the contract.

## Not done

- **No iwc-lab#8 test.** The files are small (about 4.6–4.9 KB), but a TS-only snapshot would only pin TS against itself. Pinning parity needs both sides, which means gxformat2's shared `diff.yml`.
- **Stale notes left alone:**
  - `implementation_debrief.md` still lists the extra-`out`-key divergence as "Python should change". It is fixed in `729027d`.
  - The TS unit test "ignores undeclared keys on out entries" now overlaps the synced `diff.yml` case. Removing it needs John's sign-off.

## Gate

At `433db8de`: `make check`, `pnpm lint:unused:ci`, `pnpm build` and `pnpm test` all green. Schema: 5213 passed, 5 expected fail. CLI: 421 passed.

## Questions for John

- Add an iwc-lab#8 draft → final pair to gxformat2's shared diff examples, so parity on a real run is tested on both sides?
- Make every `gxwf` command exit 2 on a read or parse failure? For `lint`, 1 means warnings only.
- Drop the TS "undeclared out keys" unit test, now that the synced case covers it?
