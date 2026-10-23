Profile generic_risk_assessment, Claude Opus 5.5 at low effort, reviewed commit a0adddbc0a025d31d1ec49dafb0975f94f5a4ade.

The one-way risk is that every Format2 dict lacking `class: GalaxyWorkflow`, top-level or an embedded `run:` subworkflow, now fails the core `normalized_format2()` load path rather than only lint/validation, so downstream releases (Galaxy import, planemo, IWC) that pin a new gxformat2 can reject workflows they accept today; the code is easy to revert but a released, consumer-visible rejection is not.

<details><summary>Risk Details</summary>

- `normalized/_format2.py` calls `GalaxyWorkflow.model_validate(workflow)` on plain dicts, so the now-required field breaks loading, conversion (`to_native`, `ensure_native`) and everything built on them, not just `gxwf validate`/lint. Confirmed locally: a minimal top-level dict without `class` raises `ValidationError` ("class Field required").
- Embedded subworkflows (`steps.<x>.run: {inputs, steps, ...}` without `class`) also fail now; confirmed locally on the reviewed commit. Hand-written or older-generated nested workflows commonly omit it.
- Galaxy's Format2 import path (`gxformat2` used via `python_to_workflow`/`ImportOptions`) and planemo `workflow_lint`/test runs would surface this as hard errors for users after a dependency bump; no deprecation warning period.
- `galaxy-tool-util-ts` mirrors the schema and fixtures; if its models still default `class`, Python and TS diverge on the same document until synced. The new `synthetic-missing-class.gxwf.yml` fixture and `Format2MissingClass` rule should propagate there.
- `NormalizedFormat2.class_` still defaults to `"GalaxyWorkflow"` (`normalized/_format2.py:204`), leaving a split: the raw schema requires it, the normalized model doesn't.
- The fix lives in a post-codegen string replace in `scripts/patch_generated_pydantic.py`; if the generator changes its emitted line, the patch silently no-ops and the requirement disappears on regeneration (the new negative fixture should catch it, if run).

</details>

<details><summary>Risk Review Advice</summary>

Decide whether requiring `class` belongs in the load path or only in validation/lint. If the intent is just "lint should flag it" (#186), consider keeping the load path lenient (or warning) and enforcing in strict/lint mode, and explicitly decide whether embedded `run:` subworkflows must carry `class`. Before release, check IWC and Galaxy's test workflows for Format2 files missing `class` and note the break in the changelog.

Reviewers should also confirm the codegen patch is asserted (fail if the target string isn't found) rather than silently skipped, and that `galaxy-tool-util-ts` gets the matching schema/fixture update.

</details>
