Profile gx_risk_assessment, Opus 5.5, low effort, reviewed commit deed873a70a.

Mostly a two-way door, but registering the new `sel` datatype extension is a small one-way door: once 26.2 datasets carry `ext="sel"`, removing or renaming it later strands those datasets.

<details><summary>Risk Details</summary>

- `sel` becomes a public datatype (`display_in_upload="true"`, `galaxy.datatypes.data:Text`); histories, workflows, and tool wrappers will start depending on the name, so it is effectively permanent.
- Registering a niche, BayeScan-specific extension in the sample config to work around 26.2's unknown-extension normalization sets precedent for adding one-off extensions whenever a wrapper's discovered file ext breaks; other unregistered-ext wrappers will still get `data`.
- `IntParameter.marshal` unwrapping singleton lists applies to every int metadata element and every input path (API metadata edits, extended-metadata round trips), not just output metadata actions; `[3]` is now accepted where it was rejected. Easy to revert, but it widens accepted API input.
- On a release branch: behavior change is narrow and test-covered (unit cases plus `metadata_defaults` framework/extended-metadata test), so rollback cost is low.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether `sel` deserves a permanent registered datatype (and whether `display_in_upload="true"` is wanted) versus fixing the output-extension normalization generally; the datatype name is the hard-to-undo part.

The `IntParameter` change is reversible; confirm the singleton-list unwrap belongs in the shared parameter rather than where output metadata action defaults are comma-split.

</details>
