# yaml_boolean_defaults — scope evaluation

**Recommendation: expand modestly. Finish issue #23888's slice 2 (model→loader semantics) on this branch: make `CanonicalYamlInputSource` load canonical `repeat` (`parameters:`) and `section` inputs, turning the 4 strict structural xfails green, and pass `yaml_origin` into `strictify`'s section branch.** Leave the other slices of #23888 (fixture conversion, one construction path, scalar outputs/strict authoring, stored rows, parity/docs) as separate PRs.

Evaluated at `9894e813cc1` against merge-base `6df388987b4` (`origin/release_26.1`).

## Possible Decompositions

Size: 972 changed lines (912+/60-), none generated. Production 136 (`tool_util`, `tools`), test infra 176 (`populators.py`, `conftest.py`), test module 176, hand-written YAML/JSON fixtures 469, docs 10, tool conf 5. That is under 1000, but here are three options anyway. Order matters in all of them: the fixture-scope fix has to land first, because the new function-style module 401s in CI without it.

**Option A — one PR per logical step (4 PRs)**
1. Function-scope API interactor fixtures, plus the docs fix (`eaea0064b80`). This is a standalone CI bug.
2. Baseline tests and both refactors (`798fcac51ca`, `b7a8838e3ff`, `52974cbc957`). No behavior change: the model dump over all tools is byte-identical.
3. Honor YAML Boolean `value` (`1375c2233cf`). This is the issue's headline symptom.
4. Canonical optionality, omitted Boolean default, and null request fill (`a8c11371e6c`, `9894e813cc1`). This changes behavior for on-disk YAML (`configfile`, `simple_constructs`, `gx_user_boolean_conditional` text optionality), so reviewers are most likely to debate it.

**Option B — 3 PRs**
1. Fixture-scope fix.
2. Baseline tests, refactors and the Boolean `value` fix (commits 2–5).
3. Optionality and null-fill convergence (commits 6–7), plus the recommended repeat/section expansion if it is taken.

**Option C — 2 PRs**
1. Test infrastructure only: fixture scope, baseline tests and populator helpers.
2. Refactors and all behavior changes as one #23888 slice-2 PR.

**Option D — as one PR.** The commits are already red/green pairs, so they can be reviewed commit by commit.

## Scope 1 — As implemented

YAML tools (class `GalaxyTool`/`GalaxyUserTool`) follow the authoring model's defaults on every load path: disk, API YAML and API JSON.
- Boolean `value` is honored over legacy `checked`.
- An omitted `optional` means False.
- An omitted Boolean `value` means False.
- An explicit `null` survives request filling.

XML is unchanged. An API contract suite covers this, with 4 strict xfails left for repeat/section.

| Pros | Cons |
|---|---|
| - Fixes the reproduced user-visible bug (a Boolean default of true runs as false)<br>- Clean seam: `CanonicalYaml*Source` subclasses, one `is_yaml_origin()` predicate, XML byte-identical<br>- Strong contract tests across 3 load paths × 3 input formats<br>- Includes a real CI fixture-scope fix | - Leaves the same parser seam half done: canonical `repeat`/`section` still fail with HTTP 500 (strict xfails)<br>- The issue's slice 2 lists repeats, sections, booleans and optionality together. Reviewers will ask why only two of the four are done<br>- The `strictify` section branch hard-codes the XML Boolean policy (`yaml_origin=False`). That is latent now, and becomes a bug the moment sections load |

## Scope 2 — Modest expansion: complete slice 2 (recommended)

Scope 1, plus the following in `CanonicalYamlInputSource`:
- `parse_input_type` returns `"section"`.
- `parse_nested_inputs_source` reads `parameters:` for both repeat and section.
- `yaml_origin` is threaded through `strictify`'s section branch.

The existing `gx_user_repeat`/`gx_user_section` fixtures and the strict xfails become the red half of the pair.

| Pros | Cons |
|---|---|
| - Downstream section support already exists in the parameter factory (`factory.py` section branch), `Tool.parse_input_elem` and `convert.py` fill/runtime. The gap looks confined to `YamlInputSource`, so it is likely a handful of override lines<br>- Red tests and fixtures are already on the branch, so it is an easy red→green step<br>- Closes the thermo review's flagged follow-up in the same change that makes it live<br>- Every canonical input construct then loads on all three paths, which matches the issue's "one explicit policy" goal | - `simple_constructs.yml` (class `GalaxyTool`, the only in-tree `blocks:` user) is canonical-parsed. Reading only `parameters:` would break it. Either fall back to `blocks` (precedent: `parse_when_input_sources` already reads both `when` and `whens`) or convert the fixture, which pulls in part of slice 3<br>- Not yet proven that the user-tool `runtimeify`/`$(inputs.group...)` path renders sections and repeats correctly. Job-level asserts may expose more work<br>- Adds roughly 100–150 lines once repeat/section job assertions are included |

<details>
<summary>Details</summary>

- Current failure: `YamlInputSource.parse_input_type` maps everything except `repeat`/`conditional` to `"param"`. A section then hits `UnknownParameterTypeError`. `parse_nested_inputs_source` asserts repeat and reads `self.input_dict["blocks"]`, so a canonical repeat raises `KeyError: 'blocks'`.
- Put both overrides on `CanonicalYamlInputSource` only. Plain `YamlInputSource` (workflow module forms, CWL, internal dicts) should keep its current behavior. This matches how the branch already scoped optionality.
- `blocks` fallback vs. converting the fixture: the issue argues against keeping two spellings permanently. Still, a fallback here costs one line, and the same file already reads `when`/`whens`. Converting `simple_constructs.yml` belongs with slice 3, which also covers `checked`, `display`, `when` and the untyped output. Recommend the fallback and leave conversion to slice 3.
- `strictify` section call: today it passes `yaml_origin=False` explicitly. Once sections load for YAML tools, it needs the tool's predicate. That means `strictify` needs a `yaml_origin` parameter, or the bundle needs to carry the predicate.

</details>

## Scope 3 — Larger expansion: more #23888 slices

Add one or more of the following:
- Slice 3: convert `simple_constructs.yml` and `collection_creates_pair_y.yml` to canonical spelling.
- Slice 5: strict admin dataset outputs, and scalar `text`/`integer`/`float`/`boolean` outputs loadable or no longer advertised.
- Slice 4: one validate-and-normalize construction path for disk, stored rows, admin and user creation, `from_path` and linting.
- The stored-row historical adapter.
- Slice 6: parity proof and docs/schema updates.

| Pros | Cons |
|---|---|
| - Moves toward the issue's actual goal: one representation, so "model accepted it" means "tool behaves that way"<br>- Fixture conversion and scalar outputs are concrete, reproduced bugs | - Each one is a different seam: outputs, the construction path, persistence. They are not the input-parsing seam this branch touches<br>- The issue itself proposes them as separate reviewable PRs<br>- Slice 4 (one construction path) is architectural and touches stored rows and job reproducibility. It is too large for a release-branch bug-fix PR<br>- Would roughly double or triple the review size |

<details>
<summary>Details</summary>

Not rejected for being out of the issue or for targeting a release branch. Rejected for size and seam: none of these share code with `CanonicalYamlInputSource`/`fill_static_defaults`. Slice 5's scalar outputs and admin `format_souce`-style strictness would make a natural next PR. Slice 3's fixture conversion pairs well with whatever `blocks` decision Scope 2 makes.

</details>

## Scope 4 — Contract: Boolean `value` only

Keep only the fixture fix, baseline tests, refactors and `1375c2233cf`. Drop the optionality, omitted-default and null-fill convergence (`a8c11371e6c`, `9894e813cc1`).

| Pros | Cons |
|---|---|
| - Smallest behavior change; it only touches the reported symptom<br>- Avoids changing optionality for existing on-disk YAML text and multi-select inputs | - **Overrides John's recorded decision** that the three load-path divergences are bugs (implementation debrief, "Optionality and default convergence")<br>- Brings back load-path-specific behavior: the same YAML is optional on disk and required as a user tool<br>- Codex found nothing; the thermo review approved the convergence design. There is no review-driven reason to cut it |

## Review notes on scope

- Thermo review: "Scope follow-up: thread `yaml_origin` into `strictify` once sections work." Folded into Scope 2.
- Implementation debrief, "Remaining #23888 contracts": 4 structural repeat/section xfails remain. These are the target of Scope 2. Admin scalar outputs, unknown-field strictness, class-aware normalization, stored rows, workflow default policy and docs/schema are follow-ups (Scope 3).
- Codex review: no scope findings.
- Test challenges / baseline refactor: no scope findings. The history is already shaped for the Option A/B splits.
