**Recommendation: keep the four-commit scope as implemented, in one PR to `release_26.2`.** It fixes one user-visible problem end to end: a request built to the published `InvokeWorkflowPayload` type 400s or silently skips copying inputs. Both server presence-check bugs that type exposes are fixed, and the generator change keeps request-only types from pushing callers into them again. Auditing the other `exclude_unset` presence checks, splitting the shared schemas, and widening the input-source matrix stay follow-ups.

Evaluated `b0385f2c556` against `origin/release_26.2` (9 files, +457/-232). John's decisions are marked **Decided** below. I agree with all four.

## As implemented (recommended)

Four commits. (1) `no_add_to_history` read by value, with a 4-case API test. (2) The schema description corrected. (3) `generate-api-schema.mjs` makes defaulted properties of request-only schemas optional, with both `schema.ts` files regenerated, a vitest fixture and a CI path filter. (4) The `ds_map`/`inputs` conflict check rejects only a non-empty `ds_map`, with a 4-case API test.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the cause (types demand defaults) and both effects (presence checks misread those defaults).</li><li>All ten fields the type made required were checked: only `no_add_to_history` and `ds_map` were read by presence, so the invocation payload is fully covered.</li><li>Server changes are two lines, each with a red-to-green API test.</li><li>Type change is compile-time only and only loosens request types.</li></ul> | <ul><li>A release-branch PR that regenerates `schema.ts` (450 lines) and adds a build script is larger than a typical release bugfix.</li><li>A partial type fix: 80 shared request/response schemas (176 defaulted properties) keep required defaults.</li><li>The Tool Shed `schema.ts` changes too (2 properties), because the Makefile target is shared.</li></ul> |

<details>

**Audit of the ten fields.** On the base, `InvokeWorkflowPayload` requires `allow_tool_state_corrections`, `batch`, `ds_map`, `instance`, `legacy`, `no_add_to_history`, `parameters`, `parameters_normalized`, `require_exact_tool_versions` and `use_cached_job`. In `run_request.py`, `allow_tool_state_corrections`, `use_cached_job`, `legacy` and `parameters_normalized` go through `payload.get(...)` (`:320`, `:321`, `:337`, `:338`), and `parameters` goes through `.get() or {}` (`:339`). The service reads `batch`, `instance` and `require_exact_tool_versions` as model attributes (`services/workflows.py:323`, `:331`, `:335`). Only `ds_map` (`:333`) and `no_add_to_history` (`:336`) were presence checks. A default-filled `ds_map: null` with no `inputs` falls through to `expand_workflow_inputs`, which handles `None` (`tools/parameters/meta.py:97`). The remaining presence check, `"step_parameters" in payload` (`:329`), is on a field outside the schema, so no typed caller sends it.

**Overlap with the source branch.** `issue_20900_invocation_validation` contains the identical `no_add_to_history` line and doesn't touch the `ds_map` check, so reconciling it after this lands stays mechanical.

</details>

## Server fix only; generator in a separate `dev` PR

Ship commits 1, 2 and 4 to `release_26.2` and move the generator and regenerated `schema.ts` to their own PR on `dev`. **Decided: one PR.**

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller release-branch diff; no new build script on a release branch.</li><li>Each PR is reviewed by the right audience (backend vs client tooling).</li></ul> | <ul><li>The 26.2 api-client would still publish types that demand the defaults; callers stay pushed toward the bugs (now harmless, but still noise).</li><li>Splits one root cause and its effects across two PRs and two branches.</li></ul> |

<details>

I agree with keeping one PR. `publish_artifacts.yaml` builds the api-client from Galaxy release tags, so a `dev`-only generator fix would leave 26.2 consumers with the unsatisfiable type for a whole release cycle. The type change can't alter runtime behavior, and CI's `lint_openapi_schema.yml` drift check plus the client typecheck cover it.

</details>

## Original scope: `no_add_to_history` only

Commit 1 alone (optionally with commit 2): the scope of the earlier evaluation. **Decided: `ds_map` fix included; generator included.**

| Pros | Cons |
| --- | --- |
| <ul><li>Smallest server patch; one behavior change to review.</li></ul> | <ul><li>A typed caller still gets a 400 from the `ds_map: {}` default the type demands. Fixing one of two siblings leaves the motivating request still failing.</li><li>The cause (the types) stays unfixed.</li></ul> |

## Split shared request/response schemas

Also loosen the 80 shared schemas (176 defaulted properties, e.g. `WriteStoreToPayload`), via pydantic `json_schema_serialization_defaults_required` plus `--default-non-nullable=false`, or with hand-split input/output models. **Decided: no split; documented as a partial fix.**

| Pros | Cons |
| --- | --- |
| <ul><li>A complete type fix for every request field.</li></ul> | <ul><li>Splits shared models into `*-Input`/`*-Output`, renaming types across the client and api-client: a breaking change for consumers, wrong for a release branch.</li><li>Much larger review and no known server bug behind it.</li></ul> |

## Audit other `exclude_unset` presence checks

Look for the same bug class (a presence check on a `model_dump(exclude_unset=True)` dict, where an explicit default means something else) across other endpoints and fix it. There are 48 `exclude_unset=True` call sites in `services/`, `api/` and `managers/`.

| Pros | Cons |
| --- | --- |
| <ul><li>Catches siblings that typed callers of shared schemas, which still require defaults, could hit.</li></ul> | <ul><li>Open-ended audit across unrelated endpoints; no reported failure behind any of them.</li><li>The generator change already removes the pressure for request-only schemas, which lowers the payoff.</li></ul> |

<details>

Worth a follow-up if a concrete case shows up, best on `dev`. Shared schemas are the likelier place for one, since their types still demand defaults.

</details>

## Widen the input-source test matrix

Add library dataset and HDCA cases to `test_run_no_add_to_history`. The flag covers LDDA/LD imports (`run_request.py:426`, `:441`) and HDA/HDCA copies (`:468`), and only HDA is tested.

| Pros | Cons |
| --- | --- |
| <ul><li>Library inputs change behavior under explicit `false`/`null`; the risk notes say this is untested.</li></ul> | <ul><li>Extra library and collection setup for one shared boolean that's already read once.</li></ul> |

<details>

Still optional, as in the earlier evaluation. If one case is added, it should be a library dataset: that's the changed path the PR description calls out as untested.

</details>

## Fold into #20900 invocation validation

Merge this back into `issue_20900_invocation_validation` (early validation, missing-object handling, no side effects before validation).

| Pros | Cons |
| --- | --- |
| <ul><li>One change covers more of the original issue.</li></ul> | <ul><li>Ties two independent, already-tested fixes to a branch with recorded validation regressions.</li><li>That branch targets `dev`, so it can't carry a 26.2 fix.</li></ul> |

## Backport handling

Target `release_26.1` directly, or include the backport in this PR. **Decided: a separate server-only backport branch to `release_26.1`.**

| Pros | Cons |
| --- | --- |
| <ul><li>Separate backport keeps the generator and `schema.ts` churn off 26.1, where published 26.1.x types already demand the defaults and the server fixes make those values harmless.</li></ul> | <ul><li>Two branches to keep in step; 26.1 types stay strict (acceptable, as the server now accepts what they demand).</li></ul> |
