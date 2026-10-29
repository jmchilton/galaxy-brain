Run via Claude Opus 5.5 (claude-opus-5-5) at low effort.

# yaml_tool_model_validation_26.1 — scope evaluation

**Recommendation: expand modestly (Scope 2).** Close the three remaining places where the `GalaxyTool` model accepts a field and the loader silently drops it. Each was reproduced at the branch tip:
- `requirements: [{type: container, …}]` gives the tool no container.
- `citations` gives `parse_citations() == []`, for both classes.
- Collection-output `hidden: true` loads as `False`.

The branch makes the model the load-time contract for every `GalaxyTool` path. A field that the model accepts but the loader ignores is exactly #23888's thesis ("the model accepted it" must mean "the tool behaves that way"), and validation now makes these drops look sanctioned. The expansion is about 25 production lines plus tests, in two files the branch already touches (`tool_util_models/__init__.py` or `tool_outputs.py`, and `parser/yaml.py`), plus a `schema.ts` regen if the container requirement is dropped. That stays inside John's "smaller chunk" preference. Everything else raised in reviews is either a different seam (normalize-on-load, slice 6 parity/docs), contradicts John's 2026-10-28 decisions (stored-row lift, validating `GalaxyUserTool` at construction), or is structural rather than scope.

Evaluated at `1a5b68ca6b2` against merge-base `19281d57645` (`origin/release_26.1`). Issue #23888 has no comments. Prior slice #24365 merged 2026-10-28.

## Possible Decompositions

Size: 896 changed lines (+563/−333). `client/.../schema.ts` (126) is generated, so about 770 are non-generated. Fixtures are counted, as in the `yaml_boolean_defaults` evaluation. Production is about 190 lines, of which about 110 are non-model (`yaml.py`, `managers/tools.py`, `tools/__init__.py`, `interface.py`).

Commits, oldest first:
1. `30f634afe49` Baseline tests (+136, three test areas: YAML source loading, test parsing, parser trust).
2. `3797304f268` Unify YAML tool test output parsing loop (refactor, no behavior change).
3. `c9f1a8ac86e` `create_tool_from_path_raw` populator helper.
4. `e568f7eca97` Verify collection outputs in YAML tool tests (also `metadata`, `attributes.collection_type`).
5. `ecf46dbe1b4` Read `assert_stdout`/`assert_stderr`.
6. `7fc006db273` Convert in-tree GalaxyTool YAML to the model's form.
7. `8f77e3e005b` `extra="forbid"` on admin dataset outputs.
8. `401e011ece6` Drop scalar outputs (carries the `schema.ts` regen, so keep them together for CI).
9. `1a5b68ca6b2` Validate GalaxyTool YAML at parser construction, `from_path` 400, stored-row `ToolMissingException`.

Visible ordering constraints. None of the pieces has been cherry-picked in isolation.
- 9 needs 6, 7 and 8. Fixtures must be valid, and the validation tests assert on output strictness.
- 9's API test needs 3.
- 6 converts `collection_creates_pair_y.yml` to `discover_datasets` and `stdout:` to `assert_stdout`. Its tests only verify anything once 4 and 5 are in, so 4–5 land first.
- 4 needs 2.
- Any split has to split commit 1 by test area.

**Option A — two PRs**
1. YAML tool test-parsing fixes (2, 4, 5 and their baseline tests). YAML tool tests never verified collection outputs, stdout/stderr assertions, test `metadata` or `attributes.collection_type`. This is a standalone bug fix with no authoring-semantics change.
2. Semantics lock-down (3, 6–9 and the rest of the baseline).

**Option B — three PRs**
1. As A.1.
2. Model tightening and fixture conversion (6, 7, 8). Load-time behavior is unchanged apart from the authoring model and the OpenAPI schema.
3. Load-time validation (3, 9). This is the fail-loud change and the one that needs John's stance in the PR body.

**Option C — one PR.** About 110 non-model production lines, and each commit is a red→green step. This is reviewable commit by commit.

If Scope 2 is taken, it adds one commit after 8 (or after 9) and rides with whichever PR holds 7–8.

## Scope 1 — As implemented

`class: GalaxyTool` YAML validates against its authoring model when `YamlToolSource` is constructed (disk, raw-source factory, stored rows, `from_path`). The legacy dialect is rejected. Admin dataset outputs reject unknown keys. Scalar outputs leave the model. In-tree fixtures are converted, and YAML tool tests now actually verify collections and stdout/stderr. Class-less YAML is untouched, and stored invalid `GalaxyTool` rows raise `ToolMissingException`.

| Pros | Cons |
|---|---|
| - Matches John's 2026-10-28 scope exactly<br>- One seam: validation lives in `YamlToolSource.__init__`, and callers only translate the error<br>- Covers issue slices 3, 5 and the "validate" half of 4<br>- Small production footprint (about 110 non-model lines). Reviews found no open correctness defects | - Three model-accepted fields are still silently dropped (Scope 2), now behind a validator that says they're fine<br>- Removes capabilities John's scope note didn't list: conda `package` requirements and tool-level `credentials` for GalaxyTool YAML. These belong in the PR body<br>- The test model still accepts test-level `credentials`, which no GalaxyTool can now declare at tool level (a dead field)<br>- A historical legacy-dialect GalaxyTool `ToolRequest` now raises a raw `ValidationError` in `_encode_tool_request` (Scope 4) |

## Scope 2 — Modest expansion: close the remaining GalaxyTool model→loader drops (recommended)

Fix the three fields the model accepts and the loader drops:
- **ContainerRequirement.** Either drop `ContainerRequirement` from the `_DynamicToolSourceBase.requirements` union, leaving root `container` as the one spelling, or teach `parse_requirements` to read it. Recommend dropping it.
- **Citations.** Implement `YamlToolSource.parse_citations` from `citations`.
- **Collection `hidden`.** Pass `hidden` through in `_parse_output_collection`.

| Pros | Cons |
|---|---|
| - Same class of bug as the issue table, in the same files, and reproduced at the tip<br>- After this, every `GalaxyTool` root/output field the model accepts is read by the loader. A field sweep of `YamlToolSource`, `IncomingToolOutputDataset` and `IncomingToolOutputCollection` found no other drops<br>- Dropping ContainerRequirement follows the branch's own scalar-output precedent (it couldn't load, so stop advertising it) and John's "UDTs won" stance, since UDTs only have root `container`<br>- About 25 production lines with red→green unit tests | - A second scope change, so the branch parks for John's decision<br>- The `citations` fix also changes `GalaxyUserTool` behavior: UDT citations start appearing<br>- Dropping ContainerRequirement needs a `schema.ts` regen (the OpenAPI lint job already caught this once on the branch) and removes the only advertised singularity spelling. That spelling never worked<br>- Honoring it instead would mean mapping the model's `container_id` onto the parser's `identifier`. That is more code, and it keeps two container spellings |

<details>
<summary>Details</summary>

The fields were reproduced with scratch scripts against the worktree `.venv`, read-only:
- `{class: GalaxyTool, requirements: [{type: container, container: {type: docker, container_id: busybox}}]}` validates. `parse_requirements()` then returns `containers == []`. `parse_requirements` keeps only `package`/`resource`/`javascript` entries and reads only the root `container`/`containers` keys. The root `containers:` form also uses `identifier`, not the model's `container_id`.
- `citations: [{type: doi, content: …}]` gives `parse_citations() == []` for both `GalaxyTool` and `GalaxyUserTool`. `YamlToolSource` doesn't override the `ToolSource` default, which returns `[]`.
- A collection output with `hidden: true` loads as `ToolOutputCollection.hidden == False`, while the dataset output equivalent is `True`. `_parse_output_collection` never passes `hidden`.

Sweep method: the model field aliases were listed and grepped in the parser. `profile`, `license`, `edam_*`, `xrefs`, `help`, `configfiles`, `description`, and all dataset output keys (`precreate_directory`, `metadata_source`, `format_source`, `discover_datasets`, …) are read. `inherit_format`/`inherit_metadata` (the issue's #23380 note) aren't in the incoming collection model, so there is no drop.

The test model's `credentials` field could be folded in here, either by removing it or by documenting it. It is a cosmetic dead field, so it is left out of the recommendation.

</details>

## Scope 3 — Larger expansion: remaining #23888 slices

This covers two pieces:
- The "normalize" half of slice 4: the parser reads the validated model dump, not the raw dict.
- Slice 6: execute one definition across disk, admin, `from_path` and stored reload. It also updates the authoring docs and #23877, which is still an open WIP against `dev`.

| Pros | Cons |
|---|---|
| - Finishes the issue's target shape | - Normalizing brings back #24365's dump-policy concerns (`exclude_unset` vs full dump changes defaults). The branch deliberately validates and then reads the raw dict<br>- Slice 6 is a test/docs seam, and #23877 targets `dev`, not `release_26.1`<br>- Multiplies the review against John's "smaller chunk" note |

## Scope 4 — Modest expansion: convert `_encode_tool_request` failures

`_encode_tool_request` (`webapps/galaxy/services/base.py`) re-parses `ToolRequest` raw-source snapshots, and the history tool-request listing calls it for every request in the history. A historical legacy-dialect `GalaxyTool` snapshot now raises an uncaught `ValidationError`, which makes the whole listing a 500. The fix would be to catch it, the way `dynamic_tool_to_tool` does, and skip or mark the entry.

| Pros | Cons |
|---|---|
| - The branch creates this failure mode, so the fix belongs in the same story<br>- Small | - Near-zero real impact: John notes there has never been a production non-UDT YAML tool, and such a request also needs the tool-request API path<br>- A different seam (the services layer). Deciding what the listing should show is a product decision<br>- Fail-loud is what John chose. A PR-risk line covers it |

## Scope 5 — Structural: typed parser error instead of pydantic `ValidationError`

Raise a `tool_util` error type (a sibling of `UntrustedToolSourceError`) that carries formatted messages, so `managers/tools.py`, `tools/__init__.py` and (under Scope 4) `services/base.py` stop importing pydantic. Raised in the thermo-nuclear review.

| Pros | Cons |
|---|---|
| - Keeps pydantic inside `tool_util`. Disk loads, the API and lint would get one error surface | - Churns about 30 test assertions that inspect `.errors()` locations<br>- A maintainability change, not scope. Only two call sites today |

## Scope 6 — Rejected: lift stored legacy GalaxyTool rows

Grow `lift_user_tool_source` into a historical-read adapter for `GalaxyTool` rows (issue "Stored rows and job snapshots").

| Pros | Cons |
|---|---|
| - Old rows would keep loading | - John explicitly chose fail-loud with no lift on 2026-10-28<br>- No production `GalaxyTool` rows are known to exist |

## Scope 7 — Rejected: validate `GalaxyUserTool` at parser construction

| Pros | Cons |
|---|---|
| - Symmetric with GalaxyTool | - Tried first. It broke `test_tool_deserialization` on historical user-tool raw-source snapshots<br>- User tools already get the creation model plus `lift_user_tool_source`. The normal review agreed with the exemption |

## Scope 8 — Contract to the test-parsing fixes or the model tightening only

Ship only Option B.1 (test-parsing fixes), or B.1 plus B.2 (no load-time validation).

| Pros | Cons |
|---|---|
| - Smaller review, matching "a smaller chunk proved useful" | - Drops the load-time validation, which is the part of John's decision that locks semantics down in 26.1<br>- The branch is already small. The same effect is available as a PR split (Options A/B) without dropping work |

## Review notes on scope

- Initial debrief, "Noted, not done":
  - `ContainerRequirement` ignored → Scope 2.
  - Test `metadata` and `attributes.collection_type` were since fixed by the Codex review.
  - YAML element `expected_sort_order` is still ignored. It is a test-parsing nicety, left out, and could ride with Option A.1.
  - `_encode_tool_request` on historical snapshots → Scope 4.
- Normal review: PR-body callout for lost `package` requirements and `credentials` → Scope 1 cons. The rest was acted on.
- Codex review: both findings fixed; no scope findings.
- Thermo-nuclear review:
  - Typed parser error → Scope 5.
  - Building the tool source before row creation in `create_tool` is an ordering refactor, not scope. It is left as is.
  - Splitting `test_parsing.py` (1282 lines) is structural. It would matter only for Option A, as a cleaner split point.
- Test challenges and baseline refactor: no scope findings. The history is already shaped for Options A–C.
- Initial debrief decisions: `GalaxyUserTool` construction-time validation → Scope 7. Stored-row lift → Scope 6.
- Issue slices remaining → Scope 3.
