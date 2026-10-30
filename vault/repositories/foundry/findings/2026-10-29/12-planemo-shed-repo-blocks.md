# Planemo installs no repository for a Tool Shed step that has a versioned GUID but no `tool_shed_repository` block

- Target: galaxyproject/planemo (`load_shed_repos`). Optional follow-up: galaxyproject/ephemeris for the `.ga` path. Foundry tracking needed: yes. The local Mold fix stays as a convention, but it collides with Foundry PR #727 at revision 12 and has to be rebased.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29, phase 9 (validate-galaxy-workflow rev 5, foundry 88eb241e), 2026-10-29. Steps `min_reads_condition` and `species_regex` (`iuc/compose_text_param/compose_text_param/0.1.1`). Ledger `validate-workflow-no-shed-pin-completeness-check` (foundry-feedback.ledger.yml:502-525).
- Existing issues/PRs: no planemo, ephemeris, gxformat2 or galaxy-tool-util-ts issue covers this. Foundry related: #644 (open; terminal pin-shape gate in validate-galaxy-workflow; the ledger's validate ask fits there), #645 (open; changeset installability), #724 / PR #727 (open; versioned GUID rule, also revision 12 of the same Mold).
- Also seen in atacseq v0 (/home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29): (a) phase 4, ledger `draft-format-identity-pinned-forbids-repo-block-planemo-needs`. `galaxy-workflow-draft-format/index.md:41` says Identity-pinned steps carry no `tool_shed_repository`, which contradicts the block convention this finding keeps. The template pinned 91 steps with a block plus `tool_version: TODO`, and draft-validate accepted it. Fix the tier text along with the Mold fix. (b) phase 9, ledger `validate-mold-omits-toolshed-installability-check` (major): iuc/map_param_value 5ac8a4bf7a8d isn't installable, yet gxwf validate/lint reported 149/149 ok. The driver repaired it to 022a635f2283. This is #645/#644 exactly, so no new issue.

## Symptom
gxwf 1.15.0 `validate --strict --connections` and `gxwf lint` passed the workflow with 68/68 steps OK. Two Tool Shed steps carried full versioned GUIDs but no `tool_shed_repository`. The driver predicted that `planemo test` would not install `compose_text_param` and added the blocks before the first test attempt, so the failure was never observed at runtime. I reproduced it statically (see Evidence).

## Root cause
Planemo resolves the repositories to install only from explicit `tool_shed_repository` blocks. It never derives one from a GUID `tool_id`, even though its own comment says it should. Every other layer treats the block as optional:
- gxformat2 schema: `tool_shed_repository: ToolShedRepository | None = None`. Conversion passes the block through and never derives one.
- Galaxy import resolves a step by `tool_id`. Galaxy writes the block only on export, from the installed tool (`lib/galaxy/managers/workflows.py:1909-1917` on dev).
- Planemo's own `workflow_lint` skips such steps on purpose ("gxformat2 steps without a pinned repository").

So `planemo workflow_lint` and `gxwf validate` accept the workflow, and `planemo test` cannot install it. The gap is in planemo. gxwf should not flag the step as an error, because the format allows it. At most it could raise a best-practice warning. Confidence: high.

## Evidence
- planemo 0.75.47 `planemo/galaxy/workflows.py:350-382`. The non-`.ga` branch reads only `step.get("tool_shed_repository")` (:372). Comment at :363-364: "It'd be better to just infer this from the tool shed ID somehow than require explicit annotation like this... I think?" The code dates from 1ab9341c (2018). It is unchanged on master 2a815808 (2026-10-29), at `workflows.py:447-478`, comment :464.
- The `.ga` path calls ephemeris 0.10.11 `extract_tool_shed_repositories_from_workflow_dict`, which also reads only `tsr = step.get("tool_shed_repository")`.
- planemo `workflow_lint.py:592-596` (0.75.47) and :653-657 (master): `_lint_tool_ids` skips steps without a block, so lint stays green.
- Reproduction: `uvx --from planemo==0.75.47` calling `load_shed_repos` on the phase-8 workflow (run commit 48f78de) returned 55 repositories without `compose_text_param`. The same call on the repaired phase-9 workflow (69dddfe) returned 57 repositories, including it.
- gxformat2 0.29.1 `normalized/_format2.py:121` (optional field). The `@galaxy-tool-util/schema` 1.15.0 normalized models mirror it, and no lint rule mentions the block.

## Proposed fix
In planemo `load_shed_repos`, for each tool step whose `tool_id` contains `/repos/` and that has no `tool_shed_repository` block, including steps inside embedded subworkflows (walked with `iter_workflow_steps`):
1. Parse `<shed>/repos/<owner>/<name>/<tool>/<version>`.
2. Resolve the changeset that provides that exact GUID. `find_repos_from_tool_id` and the `_assert_tool_id_in_changeset` logic in `workflow_lint.py` already query this metadata.
3. Append `{name, owner, tool_shed, changeset_revision, tool_panel_section_label}`. Deduplicate against the explicit blocks.

Apply the same derivation to the `.ga` list after the ephemeris call, or fix it in ephemeris. If the GUID can't be resolved, warn and name the step. Don't skip it silently. Add a test with a gxformat2 workflow that has a GUID and no block.

## Local Mold fix e0aefee0 (keep/trim/drop and why)
**Keep, trimmed and rebased.** An explicit block is still worth writing. It pins the exact changeset, which reproduces better than resolving at install time. It is also what Galaxy exports, IWC workflows carry, and the only thing `planemo workflow_lint` checks changesets against (#645). The current planemo releases also need it. But:
- It collides with PR #727 (head 7b5fad48), which is also revision 12. Both commits rewrite the same step-2 sentence, and both add an eval property asserting `GUID last segment == tool_version`. Rebase onto #727 as revision 13. Drop the duplicated GUID/version clause from the text and from the eval property, so the property checks only the block and that it matches the GUID's owner and name.
- Reword the rationale. The block is how the step pins its install revision. Planemo needing it is a current limitation, with a link to the planemo issue, not the reason for the rule.
- The ledger's validate-side ask (a pin-completeness check) belongs in #644's terminal gate. It needs no new Foundry issue.

## Draft issue
**Repo:** galaxyproject/planemo. **Title:** `planemo test` doesn't install Tool Shed tools whose gxformat2 steps have no `tool_shed_repository` block

gxformat2 makes a step's `tool_shed_repository` optional, and Galaxy resolves the step by its `tool_id` GUID. `load_shed_repos` (`planemo/galaxy/workflows.py`, master :447-478) installs only repositories named in explicit blocks. A step such as `tool_id: toolshed.g2.bx.psu.edu/repos/iuc/compose_text_param/compose_text_param/0.1.1` with no block therefore never gets installed, and the test fails with "required tools are not installed". `planemo workflow_lint` passes the same workflow, because `_lint_tool_ids` deliberately skips steps without a block. The code already anticipates this fix: "It'd be better to just infer this from the tool shed ID somehow".

Repro: a gxformat2 workflow with one such step, then `planemo test --galaxy_branch release_26.1 wf.gxwf.yml`. Calling `load_shed_repos` on it returns no entry for `compose_text_param`.

Proposal: when a tool step has a Tool Shed GUID and no block, derive owner, name and shed from the GUID. Resolve the changeset that provides that exact GUID (`find_repos_from_tool_id` already fetches this metadata) and add it to the install list. Warn when it can't be resolved. Apply the same logic to native `.ga` input, where ephemeris's `extract_tool_shed_repositories_from_workflow_dict` has the same restriction.

**Foundry tracking comment** (label `upstream/planemo`): Planemo installs only repositories named in `tool_shed_repository` blocks, so a Tool Shed step with only a GUID passes `gxwf validate` and `planemo workflow_lint` but fails at test time. Upstream: <planemo issue link>, quoting: "`load_shed_repos` … installs only repositories named in explicit blocks." Until that lands, implement-galaxy-tool-step requires the block on every Tool Shed step (revision 13, after #727), and #644's terminal gate should check for it.
