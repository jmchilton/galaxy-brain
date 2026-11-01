# Brain research: #24375 restriction string round trip

Little prior art in the vault. No note covers `lib/galaxy/workflow/modules.py` or the editor form-state conversion; the closest are format notes and the #24140 branch record.

```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/issue_23980_static_restriction_default/index.md
    why: Parent-adjacent branch (PR #24140) in the same `InputParameterModule` code; this issue came out of its review. It touches run-form option selection, not the editor string.
    load_when: Checking what #24140 already changed so the two branches don't conflict, and for the standing decision that multiple text parameters are strictly typed.
  - path: vault/repositories/galaxy/branches/active/issue_23980_static_restriction_default/scope_evaluation.md
    why: Records why the `_parameter_option_def_to_tool_form_str` editor crash was split out into its own issue (this one).
    load_when: Scoping the fix.
  - path: vault/research/Component - Workflow Format (.ga).md
    why: Persisted `parameter_input` tool_state shape for `restrictions`, `suggestions`, `restrictOnConnections`. Its IWC example uses `""` as a legitimate first option (`["", "--cis-only", "--trans-only"]`), so an empty option can be intentional and the fix must not drop it.
    load_when: Deciding which persisted shapes the round trip must preserve.
  - path: vault/research/Component - Format2 Workflows (gxformat2).md
    why: Shows how `restrictions` / `suggestions` are authored in format2, the source of the plain-string and label-less entries the issue says currently raise or get rewritten.
    load_when: Writing fixtures for gxformat2-authored restrictions.
  - path: vault/research/Component - Workflow Import.md
    why: Import path through which API- and gxformat2-created workflows reach the module and get re-saved.
    load_when: Judging how widely silent rewriting reaches.
  - path: vault/research/Component - Workflow Refactoring API.md
    why: Another route that loads and re-saves modules; check whether it passes through the lossy conversion.
    load_when: Reviewing the blast radius of changing the encoding.
  - path: vault/research/Component - gxformat2 Parsing and Syntax.md
    why: Secondary format2 syntax reference (restrictions examples).
    load_when: Only if format2 specifics matter.
research_requests:
  - vault/agents/gx_research/todo/workflow_modules_editor_state_roundtrip.md
```

## Notes from the code (release_26.1 worktree)

- Persisted to form: `InputParameterModule.step_state_to_tool_state` (about `modules.py:1902`) picks `restrictions.how` and calls `_parameter_option_def_to_tool_form_str` (`:1952`). Form to persisted: `_string_to_parameter_def_option` nested in `_parse_state_into_dict` (about `:1981`). The form field is a `TextToolParameter` in `get_config_form` (about `:1580-1610`); `restrictions` and `suggestions` share the other's value as the default.
- Another bug visible there: `step_state_to_tool_state` sets `how = "staticRestrictions"` when `restrictions` is present, then `if suggestions is not None` / `elif restrictOnConnections` overrides it, so a state with both keys reads as suggestions.
- `FormColumnDefinition.vue` is the only editor form that mentions restrictions on the client side. No test references the conversion functions today (`test/unit/workflows`, API tests), so baseline tests will be new.
