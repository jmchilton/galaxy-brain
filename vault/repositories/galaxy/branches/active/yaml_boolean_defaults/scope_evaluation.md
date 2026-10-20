# yaml_boolean_defaults — scope evaluation (second pass)

**Recommendation: keep as implemented.** No further scope change is clearly warranted. The re-scope finished #23888's slice 2 (model→loader semantics for Boolean `value`, optionality, repeats and sections). The only nearby candidate, undeclared runtime keys reaching `$(inputs)` in the legacy/21.01 `to_cwl` path, is real but low-impact, sits on a deprecated path, and would remove keys existing tools may legitimately read. It is not worth parking the branch for. If John wants it anyway, it is a few-line follow-up that can be folded in at review time (Scope 2). Every remaining #23888 slice is a different seam that the issue itself proposes as a separate PR.

Evaluated at `58f9664c617` against merge-base `6df388987b4` (`origin/release_26.1`). Issue #23888 has no comments.

## Possible Decompositions

Size: 1072 changed lines (1003+/69-). None are generated; hand-written YAML/JSON fixtures count, as in the first evaluation.

| Area | Lines |
|---|---|
| Production (`tool_util`, `tools`, `webapps`) | 182 |
| Test infra (`populators.py`, `conftest.py`) | 183 |
| Contract module | 201 |
| Fixtures and tool conf | 496 |
| Docs | 10 |

Per-commit shortstats add up to about 1148 because of churn, so the per-PR sizes below are approximate.

Commits, oldest first:
1. `eaea0064b80` Function-scope API interactor fixtures (+docs).
2. `923173b9e3e` Send `use_cached_job` only when requested (test helper).
3. `2b351605ed4` Baseline tests.
4. Refactors: `8541fd2a3b3`, `087336e8249`.
5. Boolean `value`: `f3178c7f971`.
6. Optionality and omitted Boolean: `1e2386509f6`.
7. Request null fill: `cdebfcb580d`.
8. Repeat/section loading: `6029ff27032`.
9. Section strictify: `f88b9c28691`.
10. Conditional `__current_case__`: `58f9664c617`.

Ordering constraints that hold for every option:
- The infra commits (1, 2) land first. Without them the new function-style module fails with HTTP 401 in CI.
- `f88b9c28691` needs the `yaml_origin` threading from `cdebfcb580d`.
- `58f9664c617` widens the `remap` visitor that `6029ff27032` adds.
- The baseline's structural strict xfail is valid in any PR that lands before `6029ff27032`.

**Option A — five PRs, one per logical step**
1. Test infra: `eaea0064b80`, `923173b9e3e` (~20 lines). A standalone CI/test-helper fix.
2. Baseline tests plus both refactors (~390 lines). No behavior change; the model dump is byte-identical.
3. Boolean `value` fix: `f3178c7f971` (~250 lines, mostly fixtures). This is the issue's headline symptom.
4. Optionality, omitted Boolean default and request null fill: `1e2386509f6`, `cdebfcb580d` (~320 lines). This changes on-disk YAML text and multi-select optionality, so it is the most debatable piece.
5. Structural: `6029ff27032`, `f88b9c28691`, `58f9664c617` (~160 lines). Repeat/section loading, section strictify, and group-key cleanup in `$(inputs)`.

**Option B — two PRs along the existing alt split**
1. `yaml_boolean_defaults_alt_original_scope` (`9894e813cc1`) as is: the Boolean/optionality slice with 4 strict xfails (~970 lines).
2. The re-scope delta (commits 8–10, ~160 lines). The xfails become passing tests.

This split already exists as a pushed branch, so it is the cheapest one. The alt lacks `923173b9e3e` and the second-pass input-name assertions; rebase it onto the infra commits before opening.

**Option C — three PRs**
1. Test infra (commits 1–2).
2. Boolean slice: baseline, refactors and commits 5–7.
3. Structural slice (commits 8–10).

This is Option B with the CI fix pulled out so it can land quickly on its own.

**Option D — one PR.** Each fix commit is a red→green step over a shared contract suite, so reviewers can go commit by commit.

## Scope 1 — As implemented (recommended)

YAML tools (`GalaxyTool`/`GalaxyUserTool`) follow the authoring models on every load path (disk, API YAML, API JSON):
- Boolean `value` is honored.
- An omitted `optional` or Boolean `value` means False.
- An explicit null survives request fill and section strictify.
- Canonical `repeat`/`section` `parameters:` load.
- Legacy/21.01 jobs no longer leak `__index__`/`__current_case__`.

XML is unchanged. 64 API contract cases pass with no xfails.

| Pros | Cons |
|---|---|
| - Completes all four items in the issue's slice 2 (repeats, sections, booleans, optionality)<br>- One seam, `CanonicalYaml*Source` behind `is_yaml_origin()`. XML and pre-existing YAML model dumps are byte-identical<br>- John already picked this scope after the first evaluation<br>- Reviews found no correctness defects; the one reuse finding was fixed with `remap` | - Already over 1000 lines, mostly fixtures<br>- Keeps a `blocks:` fallback for repeats, which is the second-spelling pattern the issue argues against<br>- The legacy `to_cwl` path still exposes undeclared runtime keys (Scope 2)<br>- 21.01 ignores repeat `min` when the repeat is omitted; the gap is noted in the test |

<details>
<summary>Details</summary>

The first pass left an open item: a class-less YAML tool would get canonical parsing but XML request fill. It is now resolved. Canonical page selection (`YamlToolSource.parse_input_pages`) and `Tool.yaml_origin` both go through `is_yaml_origin()`, so they agree by construction. The legacy `to_cwl` branch of `UserToolEvaluator` (selected by `base_command`/`shell_command`) is reached only by YAML tools today, since only `YamlToolSource` parses those fields, so the group-key strip doesn't affect XML or CWL.

</details>

## Scope 2 — Modest expansion: undeclared runtime keys in legacy `$(inputs)`

In `UserToolEvaluator`'s legacy/21.01 branch, pass `to_cwl` only the tool's declared top-level inputs. The branch already strips group keys there. Today `__input_ext`, `chromInfo`, `dbkey` and other runtime keys reach `$(inputs)`, and the contract fixtures pick keys explicitly to work around this.

| Pros | Cons |
|---|---|
| - Same call site, and the same kind of `$(inputs)` cleanup the branch already makes for group keys<br>- Probably a few lines: filter `incoming` by `self.tool.inputs` before the `remap`<br>- Would let fixtures render `$(inputs)` whole | - Second scope change, so the branch parks for John's decision<br>- The path is deprecated (it logs "may work differently in the future"). The request format, via `runtimeify`, already emits only declared inputs<br>- Unlike the group keys, which were never meaningful to tool authors, it removes keys a tool could legitimately read (`$(inputs.dbkey)`, `chromInfo`). That changes the keys every existing legacy-format user tool sees, beyond what #23888 needs<br>- Low impact: only tools that dump the whole `$(inputs)` object see the extra keys |

<details>
<summary>Details</summary>

The re-scope debrief declined this item as "not release-branch material". The scope process says not to count release-branch targeting against a change, so that is not the reason to skip it here. The reasons are impact and cost: it is a cosmetic leak on a deprecated path, the filter could break tools that read those keys, and parking the branch a second time costs more than a small follow-up PR, or a fold-in at review time if a reviewer asks for it.

</details>

## Scope 3 — Modest expansion: honor repeat `min` in 21.01 when the repeat is omitted

Make the 21.01 path create `min` repeat instances when the request omits the repeat. The request format already does this.

| Pros | Cons |
|---|---|
| - Removes a cross-format inconsistency that a test already records | - The fix lives in `populate_state`, which XML tools share, so it changes XML behavior<br>- The gap isn't specific to YAML and isn't part of #23888 |

## Scope 4 — Modest expansion: convert the `simple_constructs.yml` repeat and drop the `blocks:` fallback

Rewrite the in-tree fixture's repeat with `parameters:` and remove the repeat-only `blocks` fallback from `CanonicalYamlInputSource`.

| Pros | Cons |
|---|---|
| - One canonical spelling for groups, as the issue asks<br>- Small diff | - Only a partial slice 3. The same fixture still uses `checked`, `display`, `when` and an untyped output, and `collection_creates_pair_y.yml` also needs converting<br>- Dropping the fallback breaks any stored or third-party disk tool that uses `blocks`. The issue says to decide on reading stored rows separately (slice 4)<br>- The fallback has precedent: the same file reads both `when` and `whens` |

## Scope 5 — Larger expansion: remaining #23888 slices

This covers slice 3 (full fixture conversion), slice 4 (one validate-and-normalize construction path plus a stored-row adapter), slice 5 (strict admin outputs and scalar outputs) and slice 6 (parity proof and docs/schema).

| Pros | Cons |
|---|---|
| - Moves toward the issue's goal: "the model accepted it" means "the tool behaves that way"<br>- Scalar outputs and fixture conversion are concrete, reproduced bugs | - Each slice is a different seam (outputs, construction path, persistence) and shares no code with this branch's parser/fill seam<br>- The issue proposes them as separate reviewable PRs<br>- Slice 4 is architectural and touches stored rows<br>- Would multiply an already >1000-line review |

## Scope 6 — Contract back to the original scope

Ship `yaml_boolean_defaults_alt_original_scope` and drop the repeat/section commits.

| Pros | Cons |
|---|---|
| - Smaller review (~970 lines)<br>- The alt already exists | - Reverses John's re-scope decision from earlier the same day<br>- Brings back 4 strict xfails and the latent `strictify` section bug<br>- Option B above gives the same smaller first PR without dropping the work |

## Scope 7 — Move `meta.py`'s `_remove_internal_state_keys` to `remap` (rejected)

Suggested as a follow-up in the thermo review.

| Pros | Cons |
|---|---|
| - Removes the last hand-rolled state traversal near this code | - Changes base behavior from in-place mutation to copying, on a path where batch `values` lists are aliased<br>- A unit test imports the private name<br>- Has nothing to do with #23888 |

## Review notes on scope

- Re-scope debrief, "Not acted on": repeat `min` in 21.01 → Scope 3. Legacy `to_cwl` key leak → Scope 2. `simple_constructs.yml` `blocks` → Scope 4.
- Thermo review (second pass): `meta.py` → `remap` follow-up → Scope 7. Its other skipped items are structural, not scope.
- Codex review: one reuse finding, fixed; no scope findings.
- Test challenges and baseline refactor: no scope findings. The history is still shaped for Options A–C.
