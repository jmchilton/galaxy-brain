Profile: generic_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: 177a083

Risks are low and mostly two-way: the PR tightens the generated `outputs` type, but it also changes lax validation, so workflows that used to pass may now fail.

<details><summary>Risk Details</summary>

- Dropping `| dict[str, Any]` from `outputs` also affects the lax models (`gxformat2.py`, `gxformat2_draft.py`), not just the strict ones. An output mapped to `null` (e.g. `outputs: {out: }`) used to pass lax validation and is now rejected in both lax and strict modes. Verified locally. Any other non-dict, non-string value is rejected the same way.
- Unknown keys on outputs still pass lax validation, because lax `WorkflowOutputParameter` keeps `extra="allow"`. Only strict validation rejects them, as intended.
- Downstream consumers that validate against these models (gxwf-web, Galaxy import paths, and TS tooling if it syncs the schema) may now reject workflows that were previously accepted. The change only removes accepted inputs and has no data migration, so reverting it is easy.
- The generated models and `schema/v19_09/Process.yml` change together. Later regenerations must keep the `pydantic:type` override, or the change will be silently undone.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether the lax behavior change is wanted. If lax mode should stay permissive, only the strict models should drop `dict[str, Any]`. If not, add a lax test showing that `null` and other bare values are now rejected on purpose. Also check whether real workflows (IWC, the Galaxy test corpus) ever use null or empty outputs entries.

Check whether galaxy-tool-util-ts ships a matching effect schema for `outputs`, so Python and TS validation stay in line.

</details>
