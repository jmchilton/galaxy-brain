Fix 🎯 #23896 - an unqualified workflow rename reference like `#{s}` can name an output after the wrong input because it matches mid-word.

Where tool inputs from tools-iuc and bgruening/galaxytools collide (from #23896's scan), and what an unqualified rename reference resolves to. Each row is a unit test case on this branch:

| Tool | Rename reference | `dev` resolves to | This PR resolves to |
| --- | --- | --- | --- |
| velocyto | `#{s}` | `main\|barcodes` 😬 | `main\|s` ✅ |
| ragtag | `#{e}` | `mode_conditional\|reference` 😬 | `mode_conditional\|advanced_options\|e` ✅ |
| cherri train | `#{file}` | `rep_experiment_0\|chrom_len_file` 😬 | `rep_experiment_0\|rep_samples_0\|file` ✅ |
| gatk4 Mutect2 | `#{intervals}` | `optional\|excl_ival_type\|exclude_intervals` 😬 | `optional\|ival_type\|intervals` ✅ |

😬 = Galaxy silently names the output after the wrong dataset, when that input comes first in the job's inputs. ✅ = the input the workflow author meant, whatever the order.

When an unqualified `#{name}` misses the exact lookup, `RenameDatasetAction` falls back to the first nested input whose path *ends with* that text, so `#{s}` matches `barcodes`. This PR makes the fallback match whole path segments: `#{s}` now only matches an input whose last segment is `s`. It's a one-line change in the helper that both ordinary and mapped-over collection outputs use.

***Only references that already miss the exact lookup are affected. Fully qualified references (`#{cond.input}`, what the workflow editor lists) and top-level inputs resolve as before.***

***The table shows where collisions can happen, not reported breakages. None of the 6 rename references in IWC workflows changes resolution.***

***This doesn't change how ambiguous or missing references behave.*** When two inputs share a last segment, the first still wins, and a reference with no match still becomes an empty string. #23896 separates warning about or rejecting those into its own compatibility decision.

<details><summary>Exactly which references change</summary>

- An unqualified `#{leaf}` that used to hit a mid-word match now resolves to the first input whose last segment is `leaf` (the table above).
- If a mid-word match was the *only* match, the reference now renders as `""`, which is what any other unmatched reference already does. If that was the whole new name, the output keeps its default name.
- A partly qualified `#{cond.input}` no longer matches `outer|xcond|input`; it still matches `outer|cond|input`.

</details>

## Risks

Low, but it does change how existing workflows name outputs: a workflow that relied on a mid-word match, by accident or not, will name that output differently.

<details><summary>Risk Details</summary>

- An output that used to be named from a mid-word match now gets the intended input's name, or an empty substitution if no input has that last segment.
- The new unit cases pin the current first-match and empty-string behaviour for ambiguous and missing references. A later change to warn or reject will have to update them on purpose.
- None of IWC's 6 rename references goes through the changed fallback: each is an exact or qualified match, or matches nothing on both `dev` and this branch.
- Rolling back is a one-line revert, so this is a two-way door for Galaxy itself, but output names produced while it's deployed stay as they are.

</details>

<details><summary>Risk Review Advice</summary>

Check the one-line condition in `lib/galaxy/job_execution/actions/post.py` against the unit cases. They cover suffix collisions, one-letter names, ambiguity, exact-match precedence, dot-qualified and partly qualified references, repeats and rename operations.

</details>

## Context

The fallback was added in 🔀 #15978, which started recording job inputs under their full parameter path, so that pre-23.1 unqualified references like `#{input1}` kept working. Found while writing the tool parameter reference docs in 🔀 #23877.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new: an unmatched reference still renders as an empty string and the rest of the name is kept.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check rendered names for 13 templates, including the table's input names, and the API tests run real workflows on both the plain and mapped-collection paths.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior? Only those whose unqualified rename reference relied on a mid-word match. None of IWC's 6 rename references does.
- [x] Who hits this in practice and what is the evidence? Workflows written before 23.1 and hand-typed references. #23896's scan of about 2,650 tool XMLs finds the collisions in the table above.
- [x] Were simpler or existing approaches considered? Yes. Documenting qualified references only would leave existing workflows mislabelling outputs. Failing on ambiguous references now would break workflows that rely on the first match; #23896 compares the options.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/job_execution/test_post_job_actions.py` (new): 13 rename templates rendered against recorded input names, including each row of the table above. Eight fail on `dev` with the wrong substring match.
- `lib/galaxy_test/api/test_workflows.py` `test_run_rename_ignores_partial_input_segments` and `..._on_mapped_collection`: a `mapper2` workflow whose rename template `#{input1}` would match `fastq_input|fastq_input1` mid-word. On `dev` both fail with the input name doubled (`fastq1fastq1 suffix`, and `readsreads.fastq suffix` for the mapped collection's element).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
