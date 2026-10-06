Fix 🎯 #23900 - workflow rename leaves a literal `#{...}` in the output name when an empty placeholder sits right before another.

| Rename template | Input names | `dev` | This PR |
| --- | --- | --- | --- |
| `#{missing}#{input} suffix` | `input`: `reads.fastq` | `#{input} suffix` ❌ | `reads.fastq suffix` ✅ |
| `#{missing}_#{input}` | `input`: `reads.fastq` | `_#{input}` ❌ | `_reads.fastq` ✅ |
| `#{a}-#{b}` | `a`: `""`, `b`: `y` | `-#{b}` ❌ | `-y` ✅ |
| `#{a}#{b}` | `a`: `x`, `b`: `longer` | `x#{b}` ❌ | `xlonger` ✅ |
| `#{a} x` | `a`: `ab#{b}`, `b`: `other` | `abother x` ❌ | `ab#{b} x` ✅ |
| `#{input}#{missing} suffix` | `input`: `reads.fastq` | `reads.fastq suffix` | unchanged |

❌ = a placeholder left in the name, or text inside an input's name expanded as a placeholder.

`RenameDatasetAction._gen_new_name` walked the template with a cursor that indexed into the string from before each replacement. When a value was empty or one character long and the next `#{` followed closely, the cursor jumped past it. The most likely trigger is a reference that doesn't resolve, which silently becomes `""` (🎯 #23896). The same loop also rescanned inserted input names as template text, so an input named `ab#{b}` had its `#{b}` expanded.

The fix replaces the loop with one `re.sub(r"#\{([^}]*)\}", resolve, ...)` pass. `resolve` is the old loop body, unchanged: the lookup, the segment fallback and the `basename`/`upper`/`lower` operations. The removed code already carried `# TODO: Replace all matching code with regex`.

***Only two cases render differently: a placeholder that resolves to an empty or one-character value close before the next `#{`, and an input whose name itself contains `#{...}`. IWC's rename templates each have one placeholder and render the same.***

***It doesn't change what an unresolved reference becomes (still `""`, see #23896) or the `${...}` replacement pass, which runs afterwards as before.***

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23918, which fixed #23896 and added the rename unit tests this PR extends. #23918's API regression test put the valid reference first only because the reverse order hit this bug. Since #23918, a reference that used to match mid-word renders `""`, which is exactly what triggers the skip: with #23918 alone, that test's reversed template names the output `#{fastq_input1 | basename} suffix`. This PR reverses it, so the test covers both fixes. Rename references are documented in 🔀 #23877.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The same as before: an unresolved reference renders as `""`, with no error.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert rendered names for templates, including parity rows for unclosed `#{`, nested braces, whitespace and repeated placeholders.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior? Only rename templates with adjacent placeholders around an empty or one-character value, and inputs named with `#{`.
- [x] Who hits this in practice and what is the evidence? No user report yet, and no IWC rename template has more than one placeholder. #23918 makes the trigger more likely, since references that used to match mid-word now render `""`.
- [x] Were simpler or existing approaches considered? Yes. Fixing the cursor arithmetic also needs the replacement limited to the current occurrence, and keeps the index bookkeeping that broke here. The regex is about as short.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/job_execution/test_post_job_actions.py` adds rows for the issue's cases, values that contain `#{` and parity edge cases, plus a test for the `${...}` pass. On `dev`'s `post.py`, 8 rows fail (6 skip cases, including `#{}#{a}`, and 2 re-expansion cases) and every parity row passes.
- `test_run_rename_ignores_partial_input_segments[_on_mapped_collection]` in `lib/galaxy_test/api/test_workflows.py` now uses `#{input1}#{fastq_input1 | basename} suffix`. Run against `dev`'s `post.py`, a real workflow names the output `#{fastq_input1 | basename} suffix`.
- Old and new were compared on 200k random templates. Every difference was either the skip or an inserted value containing `#` or `}`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
