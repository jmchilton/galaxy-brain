# Polish debrief

Wrote `pr_description.md`, then ran one strengthening round. Every task was applied:
- Description: row 2 of the table is now labelled as a mutated probe (the run's file has `ftype: fasta`), and step ids 53/54 are replaced with the labels `select_convert_inputs`/`convert_annotations`. Added two sentences: one says step 3 is a recipe with no new code, the other explains why the eval property is deterministic for the evaluator but applied by hand by the author. "Not in scope" is now bold.
- Branch (`c1cd15e9`): a non-null subworkflow output still means a collection, but its depth stays unconfirmed until the inner chain is traced. Added to `validate.md`, with the matching caveat in the eval property.

Left for John: should the test-plan Molds (e.g. `nextflow-test-to-galaxy-test-plan`) trace kinds where they write `output_kind`? That would widen the scope.

Links: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md)
