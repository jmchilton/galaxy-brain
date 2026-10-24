# Implementation debrief

Closes [gxformat2#202](https://github.com/galaxyproject/gxformat2/issues/202). Commits: `5b6f370`, `3dd0a45` (normal review fixes), `6b375cf` (thermo-nuclear refactor).

**Root cause.** Format2 had no `color` or `directory_uri` input model. The pydantic discriminator sent `color` to `WorkflowTextParameter`, whose `Literal["text", "string"]` rejects it. As a result, native→Format2 and Format2→native both crashed on color inputs. `directory_uri` fell through to `WorkflowDataParameter`, which rejects it, so it crashed the same way.

**Change**
- New SALAD records `WorkflowColorParameter` and `WorkflowDirectoryUriParameter`, plus `GalaxyType` symbols.
- Discriminator maps updated in `Process.yml`, `_input_parameter.py` and the patch script.
- Conversion round-trips both types.
- `directory_uri` carries regex validators (Galaxy passes them to the runtime parameter). `color` carries only a default.
- Semantic validation rejects restrictions/suggestions on both types, validators on color, and multiple on either. This follows Galaxy's editor form.
- Lint now flags non-string defaults. Mermaid draws parameter nodes. Abstract CWL export emits `string`.
- `BaseComment.color` now names `GalaxyType/color` as its JSON-LD predicate, following the `TextComment.text` precedent. Without this, schema-salad fails with a predicate collision. Legacy load/save behavior is unchanged (checked against base).

**Issue's open questions, answered by mirroring Galaxy**
- `color` is its own scalar string type.
- `directory_uri` is a scalar string with regex validators.
- Both are normalized spellings with no alias, and the `GalaxyType` doc lists them.

**Verified**
- Red to green: the new declarative to_native/to_format2/validate/lint/mermaid expectations, a JSON Schema test, a pydantic class test and a cwltool-validated abstract export test.
- Full pytest: 940 passed after hardening. `make lint` passes, including the schema regeneration drift check.
- IWC suite: 1975 passed. IWC has no workflows using either type.

**Follow-ups (not done)**
- TS twin: galaxy-tool-util-ts needs matching models, conversion, validators and lint before it syncs these fixtures. Merge order: gxformat2 first.
- Multiple boolean is also never offered by Galaxy and is still accepted. This predates the branch.
- Mermaid falls back to the data-input shape for `int`/`string` inputs. This predates the branch.
- `java/` and `typescript/` codegen in this repo were already stale and were not regenerated.
