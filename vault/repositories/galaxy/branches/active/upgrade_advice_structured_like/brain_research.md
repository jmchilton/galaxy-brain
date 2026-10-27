```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/upgrade_advice_structured_like/earlier_drafts/1/implementation_debrief.md
    why: First implementation of #23884 (ProfileMigration26_0, code name, tests, rejected scope such as type_source advice, pre-existing advisor bugs, CI crash from a module-level generic alias in linters/_util.py).
    load_when: Planning the redo on current origin/dev; reuse its decisions, not its code (the _util.py resolver and lint.py guard are not needed now).
  - path: vault/repositories/galaxy/issues/wip/23884/proposal.md
    why: The filed proposal (26_0_structured_like_must_be_qualified, reword/drop the 18.01 code) the issue text came from.
    load_when: Deciding the advice code name and wording.
  - path: vault/repositories/galaxy/branches/merged/fix_format_source_docs/polish_debrief.md
    why: #23919 on dev, source of _InputReferences; explains the two runtime paths for structured_like (mapped-over sliced_input_collection_structure vs unmapped collection_prototype via LegacyUnprefixedDict) and why outer|input1 is an error.
    load_when: Deciding which structured_like values the advisor must flag.
  - path: vault/repositories/galaxy/branches/active/issue_23902_qualified_output_references/implementation_debrief.md
    why: Defers a 26_2_* must_fix advice code until the 26.0 migration exists; shows the shared output_references.py resolver that will replace the linter's private _InputReferences.
    load_when: Choosing where the shared resolver lives and avoiding rebase pain with the #23891/#23902 stack.
  - path: vault/repositories/galaxy/branches/active/issue_23891_output_reference_resolver/polish_debrief.md
    why: States structured_like and change_format references are untouched by #23891, and lists structured_like coverage as a follow-up.
    load_when: Scope questions about structured_like at 26.2.
  - path: vault/repositories/galaxy/branches/merged/type_source_nested_inputs/implementation_debrief.md
    why: Why no 26.0 type_source advice (bare type_source rejected at every profile) and the follow-up linter idea.
    load_when: A reviewer asks for type_source advice.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: Mapped-over output structure and where structured_like is resolved; background for the 26.0 break being mapped-over only.
    load_when: Re-checking runtime behaviour.
research_requests:
  - vault/agents/gx_research/todo/tool_profile_versions_and_upgrade_advisor.md
  - vault/agents/gx_research/todo/tool_linters_and_reference_resolution.md
```
