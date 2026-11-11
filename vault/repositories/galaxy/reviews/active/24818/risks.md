Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: efa3e7bbdaf10581dc1ffb037ec762d879dd8869

This is a one-way door for user-defined tool authors: it adds a `secondary_files: true` input flag and a per-dataset `secondary_files` / `secondaryFiles` list (`path`, `basename`, `nameroot`, `nameext`, `format`). Once saved tools and LLM-generated tools depend on that schema, its naming and suffix rules are hard to change.

<details><summary>Risk Details</summary>

- A new authoring key, `secondary_files` (a boolean on `data` and `data_collection` inputs), joins the user tool YAML schema, `ToolSourceSchema.json`, the authoring help and the agent prompt. Stored tools will keep using it.
- The runtime JSON gains a field that is named `secondary_files` in the Python model but serialized under the alias `secondaryFiles`, while the PR's examples write `$(inputs.bam.secondary_files[0]...)`. Whichever spelling authors can use in expressions becomes the contract. A CWL-style list of secondary files that can later grow is also hard to turn into anything else, such as a dict keyed by index type.
- The boolean opt-in leaves no room for choosing which index you want, or for CWL-style patterns, unless a new key is added later. Changing the flag's type afterwards would break saved tools.
- The `nameext` values (`.bai`, `.csi`, `.crai`, `.tbi`) and the order of the list become things authors rely on, for example `secondary_files[0]` in the description. For `bam`, `.csi` vs `.bai` is decided by reading the index's magic bytes, which puts a file read on the job-building path.
- Each datatype now carries a new class attribute, `secondary_file_suffixes`, which marks a datatype as "indexed". Adding it to a datatype later changes behaviour: a dataset of that type with no index then fails at job build, where it used to get an empty list.
- Failing the job at build time when an indexed dataset has no index is a new rule, and it is visible to users. Datasets whose metadata failed or was skipped (for example deferred datasets, which return an empty list instead) now behave differently depending on how they got there.
- Indexes are staged to Pulsar only through the metadata rewrite of inputs that opt in. This ties a behaviour authors can see to how Pulsar stages files.
- The OpenAPI client schema (`schema.ts`) changes, so it is a small public API addition.

</details>

<details><summary>Risk Review Advice</summary>

Settle the author-facing names before merge: whether expressions use `secondary_files` or `secondaryFiles`, whether a plain boolean is enough, and whether "list, ordered by datatype declaration" is the shape to commit to, since #24797 and later CWL alignment would be constrained by it. Check that what the docs and examples show matches what the runtime JSON actually serializes.

Also look at the policy for a missing index (fail the job vs. give an empty list), and at how `_datasets_with_secondary_files` maps implicitly converted datasets back to the input that opted in. Those rules are the ones users will hit, and the ones other execution paths (workflows, tool requests, Pulsar) have to keep matching.

</details>
