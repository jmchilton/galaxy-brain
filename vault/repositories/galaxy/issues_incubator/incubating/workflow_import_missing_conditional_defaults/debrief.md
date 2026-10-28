# Debrief: workflow import missing conditional defaults

- Source draft: agent handoff, model-level checks only (no end-to-end repro); draft itself said so.
- Repro subagent on release_26.1 @ 5a5850702d0: no failure in any variant (details in reject_ file). Proposal not written; review step skipped (only applies to proposals).
- Repro artifacts (scratch, ephemeral): /private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/3dfd070f-a0a6-46ff-aecc-723e0a431622/scratchpad/test_repro_sparse_conditional.py, /private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/3dfd070f-a0a6-46ff-aecc-723e0a431622/scratchpad/test_repro_fastp.py, /private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/3dfd070f-a0a6-46ff-aecc-723e0a431622/scratchpad/repro_section_conditional.xml, /private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/3dfd070f-a0a6-46ff-aecc-723e0a431622/scratchpad/fastp_repro.xml, logs run1–run6. Worktree /private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/3dfd070f-a0a6-46ff-aecc-723e0a431622/scratchpad/galaxy-26.1-repro.
- Note: no existing functional test tool has conditional-in-section; worth adding as regression coverage if this resurfaces.

## Rejection

Not filing. Claimed 500 / `KeyError: 'eval_dups'` in `Conditional.value_to_basic` did not reproduce on `origin/release_26.1` @ `5a5850702d0`.

### Tried (API tests, one at a time)

- `gx_conditional_select`: format2 + native .ga with state `{}`, `conditional_parameter: {}`, child-only, explicit selector → all 200.
- New framework tool (section > conditional with defaulted select + data input): section omitted, `cond: {}`, section w/o cond, explicit non-default → all imported and invoked OK; client-side and server-side format2 conversion; native .ga → 200.
- Real fastp 1.4.0+galaxy0 (tools-iuc main, loaded locally as `fastp`), exact reported YAML → import 200 (both conversion paths); download `editor`/`export`/`format2` and `GET /api/workflows/{id}` → 200. Not invoked (no fastp binary).

### Untested paths that could still explain report

Tool Shed-installed fastp (tool id/version mismatch → upgrade path), invocation, tool form build, `refactor`/`PUT` update, older 26.1 build, client posting non-gxformat2 .ga.

### Next

Ask galaxy-tool-util-ts #202 reporter for full traceback (endpoint + frames above `grouping.py:780`) and Galaxy version. Separately, #207's `--strict-state` blanket rejection now looks unjustified — sparse omission imports fine on 26.1.
