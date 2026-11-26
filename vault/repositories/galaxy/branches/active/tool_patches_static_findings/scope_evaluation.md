Run via Claude Opus at high effort. **Recommendation: expand, modestly. Add a switch that leaves capability findings out of refusals, and default it to vulnerabilities only.** This is the third scope evaluation, so the branch parks for John and nothing is implemented. Everything else John asked for is covered:
- review at load on the patched source;
- storage with freshness;
- refusal at job prep, naming rule ids;
- the tool still loads;
- opt-in with a threshold;
- uncheckable codes don't refuse;
- lowered findings refuse at their new severity;
- the pin's refusal shape.

The gap is in the threshold. I measured the 171 stock `tools/` tools:

| Threshold | Refused | Refused on vulnerability findings |
|---|---|---|
| `high` (default) | 54 | 5 |
| `medium` | 71 | 21 |
| `low` | 115 | 57 |
| `critical` | 0 | 0 |

At `high`, 49 of the 54 are refused on capability findings only: `template-app-access` (27), `capability-api-key` (17), `capability-privilege` (5), `tool-code-file` (5) and `template-reflection` (1). No severity setting gives an admin "refuse tools with real injection findings" without also refusing about 30% of stock tools, or refusing none.

A tool patch can't fix this either, because capability findings describe what the tool does. Patches are the remedy the feature is built around, so it can't recover these tools. The analyser already separates the two kinds: `report.serious_findings` counts only high and critical vulnerabilities, `judge_report` never sends capabilities to the model, and `rules.VULNERABILITY_RULES` maps each rule to its kind (it matched every finding's `kind` across the 171 tools). Branch 3's rule-named refusal codes are all vulnerability-shaped too.

The change is about 10 library lines, one config option and its regenerated files, a docs rewrite and a few tests. It needs no storage, schema-hash or freshness change, because the stored `StaticReview` already holds rule ids and the filter is applied at prepare. The one thing John must decide is the default. Vulnerabilities only narrows his "static findings" wording, so the option exists either way.

## Possible Decompositions

This branch's own work is `a62581cfdd0..HEAD`: about 550 lines of library code, 880 of tests and 95 of docs and generated config, in two rounds:
- **Patch-review round** (`a62581cfdd0..817454ed1e8`, 12 commits; the rebased equivalent of the alt `_alt_report_only`): `patch_review.py`, `--tool-patch-path`, `--guid`, `--fail-on mismatch|uncleared`, docs, and `test_patch_review.py`. About 250 library lines and 407 test lines.
- **Refusal round** (`817454ed1e8..HEAD`, 9 commits): `refusal.py`, `codes.py`, `tools/security_review.py`, wiring in the toolbox, populator, cached toolbox, freshness, job wrapper and runners, config, docs, and the unit and integration tests. About 300 library lines (77 of them `codes.py`) and 474 test lines.

These constraints apply to every option:
- The 25 carried `tool_patches` commits (`d4e4f68dd25..a62581cfdd0`) land through that branch's own PR. Until it and `tool_security_static_findings` both land, any compare view shows the other parent's commits.
- Seam check: the refusal round does not import `patch_review`. It touches `__main__.py` only in `3731a0b6c40` (the `at_or_above` refactor of `FailOn`), and that commit's context is the patch-review round's `FailOn`.
- `codes.py`, `ToolInputRejected` and the runner catches also exist, written differently, in branch 3 (`tool_security_runtime`). Whichever of branches 3 and 4 lands second has to reconcile them.

**Option A: one PR on both parents.** Patch review and refusal together. It is the simplest to keep in sync with `tool_patches`, and it is one review of about 1,500 lines.

**Option B: patch review, then refusal.**
1. The patch-review round. Its tree is the `_alt_report_only` head, apart from the later `at_or_above` refactor.
2. The refusal round.

This follows the history, and each PR is about 650–800 lines with tests. PR 1 is a CLI-only change and easy to review. PR 2 is the runtime change reviewers will want to look at closely.

**Option C: refusal first, then patch review.**
1. The refusal round, replayed on `tool_patches`. `3731a0b6c40` becomes a two-line port of `FailOn.parse` and `met` onto the parent's `FailOn`, or is dropped, with `at_or_above` kept in `charsets.py`. The docs paragraph is re-anchored.
2. The patch-review CLI.

This puts the requested feature first, but it rewrites one commit and its docs context.

**Option D: Option B or C, with the store half split out of refusal.**
- 2a. Review at load on the eager path. Materialization in the cached toolbox always reviews fresh. Refusal at prepare, plus the config and docs.
- 2b. The index entry keeps the review, together with the carry-forward check, the `tool_confs_token` part and the `INDEX_SCHEMA_HASH` bump.

2b is a pure optimisation with its own tests (`TestStaticReview`, the cached missing and stale cases). The schema-hash bump, which discards deployed indexes even with the option off, is then reviewed on its own. John's design names the populator seam, so 2b should not be dropped, only split.

**Option E: a shared refusal core first.** `codes.py`, `ToolInputRejected` and the runner and Pulsar catches would land as one PR that branches 3 and 4 both build on. It has no caller by itself (see "Unused Infrastructure" in `GX_DEVELOPMENT.md`), so it only makes sense if branches 3 and 4 are both headed upstream.

**Hoist available to any option:** `at_or_above` into `tool_security_static_findings` (`baseline_refactor.md`). It is small but needs a port, because `git apply --check` fails on the parent's context.

## Scopes considered

### As implemented

With `tool_security_refuse_static_findings` on, every tool not under `lib/galaxy` is reviewed at load, after its patches. That covers the eager parse, the store return, the populator and cached materialization. The review is kept as `StaticReview` (worst severity per rule, plus the Galaxy version) on the tool and in the index entry. `JobWrapper.prepare` refuses with `[static-findings] ...` when any rule's severity is at or above `..._severity`, capabilities included. The patch-review CLI from the earlier rounds is unchanged.

| Pros | Cons |
|---|---|
| <ul><li>Every point of John's design is met. The reviews traced every tool-creation path and every prepare caller.</li><li>Severity-free storage: changing the threshold needs no re-review.</li><li>Reuses `at_or_above` (shared with `--fail-on`), `apply_tool_patches`, the `indexed_patch_is_current` pattern and the pin's exception.</li><li>Tested on the eager and the cached toolbox, red-to-green.</li></ul> | <ul><li>At the default `high`, 49 of 54 stock refusals are capability-only, and `critical` refuses nothing. There is no setting for "real vulnerabilities".</li><li>Capability findings can't be patched away, so the feature's remedy doesn't work for most of the tools it refuses.</li><li>Inconsistent with the analyser's own `serious_findings` and `judge_report`, which separate the kinds.</li></ul> |

### Expand (recommended): leave capability findings out of refusals

Add `tool_security_refuse_static_findings_capabilities` (bool, recommended default `false`). With it off, only rules in `rules.VULNERABILITY_RULES` refuse. With it on, behaviour is as implemented.

| Pros | Cons |
|---|---|
| <ul><li>Makes the threshold meaningful. At `high`, vulnerabilities only refuses 5 stock tools, not 54. At `medium` it refuses 21, not 71.</li><li>Reuses `VULNERABILITY_RULES` and matches `serious_findings`, `judge_report` and branch 3's codes.</li><li>No storage, freshness or schema-hash change. Toggling needs no re-review, like the threshold.</li><li>A bool type, so no new validation in `_process_config` (avoids the `galaxy-config` → `tool_util` import problem the severity list hit).</li></ul> | <ul><li>Defaulting it off narrows John's "static findings" wording. He has to pick the default.</li><li>One more option and one more docs sentence.</li><li>A tool that really does run `$__app__` code is no longer refused by default. An admin who wants that turns the switch on.</li></ul> |

<details><summary>What the change involves</summary>

- **`refusal.py`.** `StaticReview.refused_rules(threshold, capabilities: bool)` keeps `rule in VULNERABILITY_RULES or capabilities`. Kind is derived from the rule id, not stored. The derivation matched every finding's `kind` across the 171 stock tools.
- **`tools/security_review.py`.** `_review`'s refused-rules log and `check_static_findings` pass `config.tool_security_refuse_static_findings_capabilities`.
- **Config.**
  - Add a schema entry next to the two existing ones.
  - Regenerate `galaxy.yml.sample`, `galaxy_options.rst` and `_galaxy_config_schema_attributes.py` (`make config-rebuild`).
  - Add the field to the config stubs in `galaxy_mock.py`, `tool_source_support.py` and the test file's `RefusalConfig`.
- **Docs** (`tool_security_review.md` and the schema `desc`). Replace "capability findings count like vulnerabilities, so at `high` a data source tool ... is refused too" with the switch.
- **Tests, red first.**
  - `test_refusal.py`: a capability-only review (`template-app-access: high`) refuses nothing with the switch off, and refuses with it on. A mixed review returns only the vulnerability rule when off.
  - `test_static_findings_refusal.py`: a job of a capability-only tool runs when off and is refused when on.
  - Optional integration case: a synthetic tool with a `<code>` file, refused only with the switch on. It must not use a real tool.
- **Name.** `..._capabilities` matches `CAPABILITY` in `report.py`. Ask John whether he prefers a list form, `..._kinds: [vulnerability]`. The bool needs no validation, and the list is more extensible, but there are only two kinds.
- **Validation still to do:**
  - the red-to-green unit tests above;
  - a re-run of `test_tool_static_findings_refusal.py` under both toolboxes. The awk and `identifier_single` cases are vulnerability rules, so they should still refuse with the default off;
  - `make config-lint` and the docs build.

</details>

### Expand: a per-rule ignore list (`..._ignore_rules`)

Rule ids would be applied at prepare, so admins could copy a rule from the refusal message into config.

| Pros | Cons |
|---|---|
| <ul><li>Finer than kind: an admin can allow `capability-api-key` but keep `template-exec`</li><li>No storage change</li></ul> | <ul><li>Validating it against `Rule` in `_process_config` needs a duplicated list of about 35 rules in `galaxy.config`, or validation in the tools layer, which the thermo review just moved away from</li><li>Expressing vulnerabilities only would mean listing about 26 rules</li><li>Better as a follow-up once the kind switch shows what admins still need</li></ul> |

### Expand: an analyser digest in `REVIEW_VERSION`

Today `REVIEW_VERSION = galaxy.version.VERSION`. Folding in a hash of the `galaxy/tool_util/security` sources would redo stored reviews when the analyser changes between version bumps.

| Pros | Cons |
|---|---|
| <ul><li>Closer to John's "digest includes what it depends on": dev deploys, and deploys from release-branch heads, keep `VERSION` across analyser fixes</li><li>About 8 lines, and the token and carry-forward already read `REVIEW_VERSION`</li></ul> | <ul><li>Every commit that touches the analyser re-reviews all tools on next start (about 4 ms per tool)</li><li>The review recorded this as a John decision, and zero maintenance was chosen</li><li>Not the measured problem; worth folding in only if the branch is reopened anyway</li></ul> |

### Expand: an opt-in to refuse on uncheckable codes or unchecked locations

This would mirror `--fail-on uncheckable|unchecked` and store codes and the unchecked flag on `StaticReview`.

| Pros | Cons |
|---|---|
| <ul><li>Parity with the CLI's `FailOn`. John's "(default not)" can be read as asking for an option</li></ul> | <ul><li>The stock `upload1` carries `uncheckable-template-code`, so turning it on breaks uploads</li><li>A storage shape change</li><li>The branch decided "no option" with a reason, which John asked it to decide</li><li>Branch 3's `when_unsure: refuse` is the runtime home for this</li></ul> |

### Expand: a `log` level (`off | log | refuse`)

Log the tools that would be refused at load without refusing them. Branch 3 has the same `log` level.

| Pros | Cons |
|---|---|
| <ul><li>A way to stage enforcement</li><li>Previews installed shed tools with their real patches, which the CLI can't do across a directory (`--guid` covers one file)</li><li>Config shape closer to branch 3's for a later merge</li></ul> | <ul><li>Changes a bool to a string option</li><li>The load-time log already exists once the option is on</li><li>Less pressing once the kind switch makes the refused set small</li></ul> |

### Expand: show the refused state in the API or the tool form

| Pros | Cons |
|---|---|
| <ul><li>Users would learn the tool is refused before submitting</li></ul> | <ul><li>John: the tool still loads and shows in the panel, and refusal happens at prep</li><li>An API schema change plus a UI change; not modest</li></ul> |

### Expand: refuse at submission, or review lazily at prepare (branch 3's approach)

Both contradict John's given design (compute at load, refuse at job preparation). Rejected. The merge overlap with branch 3 (lazy reviewer, `tool_type_local` exemption vs `lib/galaxy`) is recorded for whoever merges branches 3 and 4.

### Expand: re-review dependents when only a macro changes (Codex P1)

This is a pre-existing gap in the store: it hashes only the tool file, so the stored expanded source is stale too. The review matches what jobs actually run. Rejected for this branch; file it as a store issue.

### Contract: trim `codes.py` to `static-findings`

This branch raises only `RefusalCode.STATIC_FINDINGS`. The other 17 codes and the whole `DESCRIPTIONS` dict have no reader or test here. Their texts name options this branch doesn't have (`tool_security_review_when_unsure`, `enforce_data`).

| Pros | Cons |
|---|---|
| <ul><li>About 60 fewer lines of unused code</li><li>No docs strings for options that don't exist on this branch</li></ul> | <ul><li>John asked to reuse the pin's refusal shape so branches 3 and 4 refuse the same way</li><li>Branch 3 builds its own `codes.py` differently anyway, and a merge needs the full set</li></ul> |

Not recommended, but a reasonable thing to fold in if the branch is reopened for the expansion.

### Contract: back to report-only (`_alt_report_only`)

John's four-branch split makes refusal this branch's purpose. Rejected.

## Left open by John (not scope changes)

- **The `lowered` reporting expansion** (evaluation 2). Refusal raises its value. A patch that lowers a finding below the threshold now silently lets the tool run, and the patch-review CLI prints no `LOWERED` line for it.
- **The `uncleared` flag name.** It sits beside `unchecked` and `uncheckable`. Earlier reviews suggested `clears-nothing`.

## Other decisions for John

- **The default of the recommended switch.** I recommend vulnerabilities only.
- **The `INDEX_SCHEMA_HASH` bump** discards deployed indexes on upgrade even with the option off (see Option D).
- **`REVIEW_VERSION` granularity** (see above).
- **The `lib/galaxy` exemption** vs branch 3's `tool_type_local`, at merge time.

## Parking

STATUS BLOCKED for John's scope decision.

What would change: the capability switch above. That means the `refused_rules` parameter, two call sites, a config entry with its regenerated files, the docs and the tests.

What still applies:
- the refusal review (`subagents/review_rescope_refusal.md`) and its fixes;
- the test challenges and their mutation table;
- the thermo-nuclear review and its fixes;
- the Codex review (nothing to act on);
- the baseline split;
- the 6-test integration run;
- the earlier rounds' reviews of the patch-review CLI.

The switch changes only which stored rule ids refuse, not how reviews are computed, stored or kept fresh.

Validation still to do: the red-to-green unit tests for the switch, a re-run of the integration file under the eager and cached toolboxes, and config lint and the docs build.

Security: none found. The counts above are stock-tool totals by rule, and no tool is named.
