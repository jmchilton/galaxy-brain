# tp_awk_tool always runs with `FS='\t'`; the step author assumed awk's default whitespace FS, and no gate or local smoke test could see it

- Target: galaxyproject/foundry (`content/research/iwc-tabular-operations-survey/index.md` awk section; advance-galaxy-draft-step smoke-test guidance; `galaxy-tool-job-failure-reference` for part (b)). The wrapper behaviour is intended (it's a tabular tool), so it's not a wrapper bug. Optional upstream: bgruening/galaxytools (not tools-iuc) for a help-text fix. Foundry tracking needed: no, the target issue is the tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 5 iteration L12 ("sum distinct k-mers"), failing at planemo attempt 1 (2619 s), and phase 11 (debug), 2026-10-29. Ledger `tabular-survey-silent-on-tp-awk-forced-tab-fs` (major) and `job-failure-ref-silent-on-parameter-provenance` (minor).
- Existing issues/PRs: none in Foundry or bgruening/galaxytools (searched tp_awk, awk field separator). Related: finding [04](04-tool-summary-no-command.md) (a summary command block would have shown `-v FS='\t'`).

## Symptom
`sum distinct k-mers` ran `{ s += $2 } END { printf "%d\n", s }` over jellyfish `histo` output, whose lines are space-separated (`1 11448941`). Under the wrapper `$2` is empty, so the sum printed 0. Then `param_value_from_file` → `pick_value` → MACS2 `--gsize 0`, and all 6 broad MACS2 library jobs died with `ZeroDivisionError` (213 ok / 6 error / 12 paused). The step doc relied on "awk default FS reads it". Every static gate passed. The repair `BEGIN { FS = " " }` made attempt 3 green, with gsize 11622260.

## Root cause
(a) Confirmed. The wrapper hard-codes tab separators: bgruening/galaxytools `tools/text_processing/text_processing/awk.xml:14-22`, `$(which awk) --sandbox -v FS='	' -v OFS='	' --re-interval -f '$awk_script'`. The run's `planemo/attempt1/failed-jobs/job99/tool_script.sh:24` shows the same command. The wrapper help never says FS is tab. Its one separator example, "`{ FS = "," }` can be used to change the field separator" (`awk.xml:124`), is misleading in a main-rule block, because it takes effect only from the next record. Foundry knows about the forced tab FS in two recipe pages (`content/patterns/tabular-prepend-header.md:71`, `tabular-split-taxonomy-string.md:77`), but not in the survey that indexes `tp_awk_tool` (`iwc-tabular-operations-survey/index.md:80,98,202`) or in any Mold. The tool summary has no command (finding 04), so the author couldn't see it there either. The loop's awk "smoke tests" (ledger notes: "awk smoke test on a 3-read fixture", "gawk smoke test ... matched") ran plain `awk`/`gawk` locally without the wrapper's `-v FS=... -v OFS=...`, so they pass where Galaxy fails.

(b) The debug phase found the cause by reasoning, not by guidance. `galaxy-tool-job-failure-reference` traces upstream datasets (`index.md:68`) and paused consumers (`:140`), but not connected parameter values (`param_value_from_file`/`pick_value`/`compose_text_param`) back to a silently wrong `ok` job.

## Evidence
- Ledger evidence, plus `planemo/attempt1/failed-jobs/` (jobs 99, 186, 196). Job 99 is the tp_awk with `state ok`, output `0`. Final step code `BEGIN { FS = " " } { s += $2 } END { printf "%d\n", s }` (`galaxy-workflow.gxwf.yml:680`).
- The final workflow has 24 tp_awk steps. Most read tab-separated inputs, and several set `BEGIN { FS = "\t" }` explicitly, which hides the problem. Only this non-tab input broke. After the repair, the histo step doc records "the tp_awk wrapper forces FS=tab" (`galaxy-workflow.gxwf.yml:652`), which is knowledge the bundle should have supplied.

## Proposed fix
1. Survey awk section: add one sentence. `tp_awk_tool` always passes `-v FS='\t' -v OFS='\t'`, so for space- or whitespace-separated input set `BEGIN { FS = " " }` (default-whitespace semantics) or use `split()`. Link the two recipe pages that already say it.
2. advance-galaxy-draft-step: a local smoke test of a wrapper program must reproduce the wrapper's command line (for tp_awk: `awk --sandbox -v FS='\t' -v OFS='\t' -f prog`). Take it from the wrapper XML until summaries carry the command (finding 04).
3. (b) job-failure reference: add a pitfall. "A failing job's bad parameter value may come from a silently wrong `ok` upstream job. Read the failing command line, then follow connected parameters (`param_value_from_file`, `pick_value`, `compose_text_param`) to the producing job and its output."
4. Optional upstream (bgruening/galaxytools): state the tab FS/OFS in the help and change the example to `BEGIN { FS = "," }`.

## Draft issue
**Title:** tp_awk_tool forces tab FS/OFS; tabular survey and smoke-test guidance don't say so (silent 0 → MACS2 ZeroDivisionError)

In an nf-core/atacseq Workflow Brief → Galaxy run (2026-10-29), a `tp_awk_tool` 9.11+galaxy0 step summed column 2 of jellyfish `histo` output (space-separated) with `{ s += $2 }`, relying on awk's default whitespace FS. The wrapper runs `awk --sandbox -v FS='\t' -v OFS='\t'`, so `$2` was empty and the step returned `0` with state `ok`. That value flowed through `param_value_from_file`/`pick_value` into MACS2 `--gsize 0`, and 6 MACS2 jobs failed with ZeroDivisionError, one 44-minute planemo attempt lost. Every static gate passed, and the loop's local awk smoke tests passed too, because they ran awk without the wrapper's flags.

Foundry already says the wrapper passes tab separators in `tabular-prepend-header` and `tabular-split-taxonomy-string`, but not in `iwc-tabular-operations-survey` (which indexes the tool) or in any Mold.

Proposal: (1) one sentence in the survey's awk section (`BEGIN { FS = " " }` for whitespace input); (2) advance-galaxy-draft-step: smoke tests must reproduce the wrapper command line; (3) a job-failure-reference pitfall about tracing connected parameter values back to a silently wrong `ok` job, which is how the debug phase found this. Related: #553/#648 (summaries carry no command).

Optional upstream text for bgruening/galaxytools (`tools/text_processing/text_processing/awk.xml`):

> **tp_awk_tool help: say that FS/OFS are tab, and fix the `{ FS = "," }` example.** The command passes `-v FS='\t' -v OFS='\t'`, but the help never says so, and its example "`{ FS = "," }` can be used to change the field separator" takes effect only from the second record when used in a main rule. Suggest: "Input and output fields are tab-separated by default. For other separators set it in a BEGIN block, e.g. `BEGIN { FS = "," }`; for whitespace-separated input use `BEGIN { FS = " " }`." A workflow summing column 2 of space-separated output got 0 with no error.
