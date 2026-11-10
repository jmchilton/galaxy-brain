Run via gpt-6-sol at medium effort.

Acted on in `15360ffd`: reworded the case-1 doc string (it claimed computed values), cited the `-tests.yml` file for the text row.

Not acted on:
- Computing the values from `reads` inside the fixture: bigger fixture, case 2 still needs a separate input. The README now says both cases pass values as an input.
- Text-row "no assertions": refuted, the assertions are in `map_over_expression.gxwf-tests.yml`.

<details><summary>Full review</summary>

# Codex review: issue-757-meta-driven-parameters

- Reviewed commit: `a9f7a45b`, scope `git diff origin/main...HEAD`.
- Codex CLI 0.166.0, `codex exec -s read-only` with the codex-review findings schema.
- Codex coverage note: read the note, linked patterns, fixture, sibling `derive-parameter-from-file` fixture and Galaxy mapping code/tests. Did not check nf-core or IWC source claims (trees absent) and did not run Planemo. Reported the three cast copies match source byte-for-byte.

## Verdicts

1 needs-decision (minor), 1 refuted.

### 1. Fixture doesn't verify a value computed per element (Codex P2, certain): NEEDS-DECISION, minor

Codex raw:

> `verification/workflows/per-element-parameter-from-file/per-element-parameter.gxwf.yml:7`. Both `reads` and `per_element_count` are independent workflow inputs. The workflow parses supplied count files and pairs the resulting parameters with reads, but has no step that computes values from the reads or carries their alignment through that computation. This leaves the central computed-value route in the note and the test case's "computed integer" claim untested.
>
> Failure scenario: a translation computes per-sample values but emits them in the wrong order. This fixture still passes because it bypasses the computing step and supplies already ordered count files.

Verification: the facts are right. `per_element_count` is a second workflow input (`per-element-parameter.gxwf.yml:7-9`), and nothing computes it from `reads`. Codex's failure scenario is out of scope, though. A fixture can't catch a translation's ordering bug. The fixture checks what the README and evidence table say it checks: mapped `param_value_from_file` gives each element its own `lineNum` (case 1), and the pairing is positional (case 2). Both are tested, and they are the parts specific to this route. Two things are off:

- The case-1 doc says "Each element's own **computed** integer", but the values are supplied, so the doc says more than the test does (`per-element-parameter.gxwf-test.yml:1`).
- The note's "Produce the values with a step mapped over the data collection itself, so they inherit its order" (`index.md:117`) has no fixture behind it. This is ordinary Galaxy map-over behavior, so it isn't a real gap.

Fix options (John's call):
- (a) Cheap: change the doc to "Each element's own integer parameterizes that element's mapped job".
- (b) Stronger: add a step mapped over `reads` that produces the count, e.g. line count, with `b.txt` changed to a different length, in place of the separate input. This tests the full route, but the fixture gets bigger, and case 2 would then need a separate input.

### 2. Cited text-parameter workflow has no assertions (Codex P2, likely): REFUTED

Codex raw:

> `content/research/nextflow-to-galaxy-channel-shape-mapping/index.md:122`. Galaxy's `map_over_expression.gxwf.yml` wires `param_out/text_param` to a tool, but has no test data or assertions. A search of the Galaxy checkout found no test invoking that workflow. It demonstrates a wiring shape, while the table labels per-element text delivery "Verified."
>
> Failure scenario: a reader treats distinct per-element text parameters as runtime-tested based on this row, although the cited workflow would not detect a defect that gives every mapped job the same text value.

Verification: Codex missed the sibling test file. `origin/release_26.1:lib/galaxy_test/workflow/map_over_expression.gxwf-tests.yml` maps over a two-element list with contents `A` and `B` and asserts `has_line: A` on element A and `has_line: B` on element B. `test_framework_workflows.py:149` loads `<base>.gxwf-tests.yml` for each framework workflow. The consuming tool `validation_default` echoes `$input1` into `out_file1` (`test/functional/tools/validation_default.xml`). If every job got the same text, one of the two assertions would fail, so the row's "Verified" holds. An optional nit: the row could cite the `-tests.yml` path too, so readers find the assertions.

## Claude spot-checks (not Codex findings)

- `test_run_workflow_conditional_step_map_over_expression_tool` exists at `lib/galaxy_test/api/test_workflows.py:4394` on `release_26.1`. It asserts exactly one skipped job across two boolean elements, which matches the row.
- IWC `consensus-peaks-atac-cutandrun.ga`: step 18 "split min value" → step 19 "convert min nb of reads to parameter" (`param_value_from_file`) → step 20 "select random reads" (`samtools_view`) through `mode|subsample_config|subsampling_mode|target`, a parameter inside nested conditionals. This matches the "wiring only" row.
- Fixture assertions: each case pairs `has_n_lines` with an element-specific `has_text`, and the values differ (1 vs 3). One parameter applied to the whole collection fails, and so does identifier-based pairing in case 2.

</details>
