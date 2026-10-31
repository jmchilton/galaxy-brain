# tools-iuc bedtools: the "Count Distinct" operation passes `count_disctinct`, which bedtools rejects

- Target: galaxyproject/tools-iuc (`tools/bedtools/macros.xml`). Wrapper bug; nothing for Foundry beyond a tool-pin caveat. Foundry tracking needed: yes, label `upstream/tools-iuc`, short (the run already worked around it).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31, phase 5 loop iteration L30 ("merged consensus", iuc `bedtools_mergebed` 2.31.1+galaxy2 @ d57471728f7b), 2026-10-31. Ledger `iuc-bedtools-count-distinct-option-misspelled` (major); open-requirements `mergebed-count-distinct-verify`.
- Existing issues/PRs: none (tools-iuc issues/PRs searched for `count_distinct` and `disctinct`; code search finds the typo only in `tools/bedtools/macros.xml`).

## Symptom
The source runs `bedtools merge -c ... -o collapse,...,count_distinct`. Built with the wrapper's "Count Distinct" option, the command gets `-o ...,count_disctinct`. In the bedtools 2.31.1 biocontainer (`quay.io/biocontainers/bedtools:2.31.1--hf5e1c6e_2`) that prints `ERROR: count_disctinct is not a valid operation`, writes no output and exits 0; the correctly spelled `count_distinct` works. The step was rebuilt with `distinct` plus a tp_awk "count distinct samples" helper (byte-identical to the source).

## Root cause
Confirmed on tools-iuc main: `macros.xml:217` is `<option value="count_disctinct">Count Distinct - numeric or text</option>` in the `additional_math_options` macro (`:215-224`). The `@C_AND_O_ARGUMENT@` token (`:172-183`) joins the selected values verbatim into `-o`. The macro is expanded by every wrapper with column operations: `mergeBed.xml`, `mapBed.xml` (both via `c_and_o_argument`) and `groupbyBed.xml:30-31`.

In Galaxy the job would go red, not green: the shared stdio macro (`macros.xml:18-27`) has `<regex match="Error:"/>` on both streams, and Galaxy matches stdio regexes case-insensitively (`lib/galaxy/tool_util/output_checker.py:143`). So the option has never worked; it fails every job that selects it. (The ledger's "may go green" was a guess; this run only smoke-tested the container.)

## Evidence
`.scratch/mergebed/` (biocontainer smoke: `m_distinct.bed`, `m_port.bed`, `m_ref.bed`); `galaxy-tool-summary.merged-consensus.json` (operation options); driver-notes L30.

## Proposed fix
tools-iuc: change the option value to `count_distinct`. Saved workflows that stored `count_disctinct` already fail, but to keep them loading, the token can map the old value: `#silent $op.append('count_distinct' if str($item.operation) == 'count_disctinct' else str($item.operation))`. Add a mergebed test with `count_distinct`. Bump the shared wrapper versions.

Foundry: nothing beyond the tracking issue; optionally a line in the tool-pin notes that bedtools column operations must avoid "Count Distinct" until the fix ships.

## Draft issue
**tools-iuc — Title:** bedtools: "Count Distinct" passes `-o count_disctinct` (typo), bedtools rejects it

`tools/bedtools/macros.xml:217` defines `<option value="count_disctinct">Count Distinct ...</option>` in `additional_math_options`, and `@C_AND_O_ARGUMENT@` passes the value verbatim to `-o`. bedtools 2.31.1 prints `ERROR: count_disctinct is not a valid operation` and writes nothing (exit 0; the stdio regex `Error:` then fails the job). Affects mergebed, map and groupby. Reproduce: `bedtools merge -i in.bed -c 4 -o count_disctinct` vs `-o count_distinct` in `quay.io/biocontainers/bedtools:2.31.1--hf5e1c6e_2`.

Fix: option value `count_distinct` (optionally map the old value in the token so saved workflows keep loading) and a test using it.

**Foundry tracking comment (label `upstream/tools-iuc`):**
> The iuc bedtools "Count Distinct" column operation passes a misspelled `count_disctinct` to bedtools and always fails (upstream: <link>). Workflows needing `count_distinct` should use `distinct` plus a counting step until it's fixed. Seen in the nf-core/cutandrun wb2g run (merged consensus), 2026-10-31.
