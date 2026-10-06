Title: Workflow rename `#{input}` falls back to raw suffix matching and can name an output after the wrong input

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._


When a workflow rename action uses an unqualified `#{name}`, Galaxy picks the first nested input whose path ends with that text, even mid-word. For example, `#{s}` can resolve to `main|barcodes`.

## The problem

`RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`) first tries an exact lookup. If that fails, it does this:

```python
for input_name, _replacement in input_names.items():
    if "|" in input_name and input_name.endswith(input_file_var):
        # best effort attempt at matching up unqualified input
        replacement = _replacement
        break
```

`endswith` compares text, not path segments, so `cond|xinput1` matches `#{input1}`. When several inputs share the same leaf name, whichever comes first in the job's input associations wins (datasets before collections, otherwise no defined order), without any warning. If nothing matches, the placeholder silently becomes an empty string; e.g. IWC's ivar workflows use `#{input}` on `ivar_variants`, whose input is `input_bam`.

This isn't hypothetical for real tools. Scanning tools-iuc and bgruening/galaxytools (about 2,650 tool XMLs) for nested data inputs that can be supplied in the same run turns up:

| Tool | Rename reference | Resolves to | Intended input |
|---|---|---|---|
| velocyto | `#{s}` | `main\|barcodes` | `main\|s` |
| ragtag | `#{e}` | `mode_conditional\|reference` | `mode_conditional\|advanced_options\|e` |
| cherri train | `#{file}` | `rep_experiment_0\|chrom_len_file` | `rep_experiment_0\|rep_samples_0\|file` |
| gatk4 Mutect2 | `#{intervals}` | `optional\|excl_ival_type\|exclude_intervals` | `optional\|ival_type\|intervals` |
| tooldistillator | `#{orthologs_report_path}` | `…\|seed_orthologs_report_path` | `…\|orthologs_report_path` |

The same scan finds 66 more same-leaf pairs across 33 tools, e.g. the SPAdes wrappers' `singlePaired|input` and `additional_reads|singlePaired|input`. For those, `#{input}` depends on association order.

<details><summary>Reproduction against the real helper</summary>

Run with `dev` @ `3b53c556928`'s `post.py`, in Galaxy's venv:

```python
class Action: pass

def rename(newname, input_names):
    action = Action()
    action.action_arguments = {"newname": newname}
    return RenameDatasetAction._gen_new_name(action, input_names, {})

rename("Renamed #{input1}", {"cond|xinput1": "WRONG"})
# -> 'Renamed WRONG'
rename("#{input}", {"cond|other_input": "A", "cond|input": "B"})
# -> 'A'  (the intended input is 'cond|input')
rename("#{nonexistent}", {"cond|input": "B"})
# -> ''
```

`input_names` is built from `job.input_datasets` / `job.input_dataset_collections` association names. Those hold only the qualified keys (`_record_input_datasets` and `_record_inputs` iterate the `LegacyUnprefixedDict`s' real keys, not their legacy aliases), and the mapped-over path (`execute_on_mapped_over`) gets the same qualified collection keys plus the tool state, so the suffix loop is the only path an unqualified nested reference can take.

This hasn't yet been reproduced as a full workflow invocation.

</details>

<details><summary>How the scan was done</summary>

The scan walked each tool's `<inputs>` after macro expansion, collecting `data`/`data_collection` params with qualified paths. It treated repeats as instance `_0` and ignored pairs that sit in different `<when>` branches of the same conditional, since those inputs never coexist in a job. For each nested input whose leaf name isn't also a top-level input, it reported the first earlier compatible path that ends with that leaf. Declaration order is used as a stand-in for recording order.

</details>

## Context

The fallback was added in 🔀 #15978, which started recording job inputs under their full parameter path (`cond|input1`). It keeps old unqualified references like `#{input1}` working; before that, conditional inputs could only be referenced unqualified (🎯 #11948, where the fallback was described as meant for the unambiguous case). The workflow editor now lists the qualified dot names, so this mainly hits workflows written before 23.1 and hand-typed references. Found while working on 🔀 #23877, the developer docs for tool parameter references.

## Proposed Approach

Match whole path segments only: an unqualified `#{leaf}` should resolve only to inputs whose last segment equals `leaf`. Fixing the partial-segment match on its own is safe, because no one can have intended `#{s}` to mean `barcodes`. Reporting ambiguous or missing references is a separate behaviour change for existing workflows, so it should be handled separately: either log a warning and keep the first-match behaviour, or reject only behind an explicit workflow-level opt-in. A tool profile isn't the right gate, because rename actions belong to the workflow, not the tool.

## Alternative Approaches

We could leave the fallback alone and only document "use qualified references". That leaves existing workflows silently mislabelling outputs. We could also make every ambiguous or missing reference an error straight away, but that would break workflows that rely on the current first match and currently run without trouble. Fixing segment matching now and handling ambiguity separately fixes the clear bug without forcing a compatibility decision.

<details><summary>Alternatives In Detail</summary>

### Alternative: Document qualified references only

<details><summary>Description</summary>

#### Details

Leave `_gen_new_name` unchanged, and recommend `#{cond.input}` in the docs (the editor already lists it). `#{cond|input}` is not an option: `|` separates operations like `basename`, so it renders as an empty string.

#### Why the proposed approach is preferred

Existing workflows keep producing wrongly named outputs without any warning, and hand-typed short references still hit the trap.

</details>

### Alternative: Strict resolution immediately

<details><summary>Description</summary>

#### Details

Raise or flag the job when a reference is ambiguous or missing.

#### Why the proposed approach is preferred

Rename runs as a post-job action, so failing hard there turns a cosmetic naming problem into a failed invocation. Ambiguous references that currently happen to work would also start failing. That needs a deliberate compatibility decision of its own.

</details>

</details>
