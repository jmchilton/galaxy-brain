Implement 🎯 #202 - first-class Format2 `color` and `directory_uri` workflow parameter inputs.

The Galaxy workflow editor offers **Color** and **Directory URI** parameter inputs. gxformat2 can't convert a workflow that uses them in either direction:

```yaml
inputs:
  highlight: {type: color, default: "#ff0000"}
  output_dir: {type: directory_uri}
```

| | `main` | this branch |
|---|---|---|
| Format2 `type: color` (→ native) | `ValidationError`: `Input should be 'text' or 'string'` | `parameter_input`, `parameter_type: color` |
| native `parameter_type: color` → Format2 | same `ValidationError` | `type: color` |
| Format2 `type: directory_uri` (→ native) | `ValidationError`: `Input should be 'data' or 'File'` | `parameter_input`, `parameter_type: directory_uri` |
| native `parameter_type: directory_uri` → Format2 | same `ValidationError` | `type: directory_uri`, regex validators kept |

The input discriminator already routed `color` to `WorkflowTextParameter`, but that model's `type` Literal only allows `text`/`string`. `directory_uri` wasn't modeled at all, so it fell back to `WorkflowDataParameter`, which rejects it too.

**This answers #202's open questions by following Galaxy: `directory_uri` stays a scalar URI string, not a richer file/`Directory` shape. `color` gets its own model instead of reusing text. Both are normalized authoring spellings.** Fields follow Galaxy's `InputParameterModule`:

- **`color`**: `WorkflowColorParameter`, with a default only.
- **`directory_uri`**: `WorkflowDirectoryUriParameter`, with a default and regex `validators`. Galaxy passes stored validators to the runtime parameter.
- **Both**:
  - Normalized spellings, listed in `GalaxyType`, with no aliases.
  - Restrictions, suggestions and `multiple` are rejected, because Galaxy's editor offers them only for text (restrictions and suggestions) or text/integer/float (`multiple`).

<details><summary>Everything else that learned the new types</summary>

- Lint flags non-string defaults on either type, for both Format2 and native.
- Mermaid draws them as parameter nodes.
- Abstract CWL export emits `string` for both; cwltool validates the output.
- The pydantic models and JSON Schema (lax and strict) gain `WorkflowColorParameter` and `WorkflowDirectoryUriParameter`.
- Which input types may carry restrictions, suggestions or validators, and which become native `parameter_input` steps, is now read from the input models (`input_types_declaring`) instead of hand-kept lists, so the next input type doesn't need edits there.
- `BaseComment.color` now uses `GalaxyType/color` as its JSON-LD predicate. Without that, schema-salad fails with a predicate collision against the new enum symbol. This copies how `TextComment.text` already shares `GalaxyType/text`. Legacy `v19_09` load and save of comment colors is unchanged.

</details>

Tests are declarative fixtures and expectations: to_native, to_format2, round trip, validation including rejections, lint and mermaid. They're joined by JSON Schema and model-class tests plus an abstract-export test. The new expectations fail on `main`. Full suite with IWC: 1975 passed, and no IWC workflow uses either type.

## Risks

The one hard-to-reverse part is the schema vocabulary: `color` and `directory_uri` become published `GalaxyType` symbols, and authored workflows will depend on them.

<details><summary>Risk Details</summary>

- Format2 documents gain two input types. Removing or renaming them later would break workflows written against them.
- New rejections (validators on `color`, restrictions on either type, `type: [color]`/`[directory_uri]`) only cover inputs that already failed conversion on `main`.
- `BaseComment.color`'s JSON-LD predicate IRI changes. Only RDF/JSON-LD consumers of comments would notice.
- galaxy-tool-util-ts syncs these declarative fixtures. Its tests go red on that sync until it gains matching models and conversion.

</details>

<details><summary>Risk Review Advice</summary>

Check the field choices against Galaxy's `InputParameterModule` (`lib/galaxy/workflow/modules.py`): `color` takes only a default, and `directory_uri` takes regex validators. Also confirm that a single normalized spelling with no alias is what we want for the authoring vocabulary.

</details>

## Context

Closes #202. The regex validator support reuses the `WorkflowTextValidator` record from 🔀 #265. Merge before re-syncing fixtures into galaxy-tool-util-ts, which needs a companion change.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Hand-kept input-type tables replaced by ones derived from the input models; pre-existing duplication logged as follow-ups.</summary>

- The tables of which types may carry restrictions, suggestions or validators, and which become native `parameter_input` steps, are now built from the generated input models. A native multiple-text-with-validator fixture guards the refactor.
- Not acted on, because it predates this branch:
  - The discriminator map exists in four copies.
  - Mermaid, abstract CWL and lint default tables still need a hand edit per type.
  - `expect_error` cases can't assert on error messages.

</details>

### ✅ Second Frontier Model Review

<details><summary>Independent Codex review found no defects.</summary>

Codex read the full diff, fixtures and tests against Galaxy `InputParameterModule` and found nothing to change.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
