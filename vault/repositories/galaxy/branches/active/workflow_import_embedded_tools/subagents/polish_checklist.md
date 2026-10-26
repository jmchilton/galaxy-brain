Checklist passes; no fixes required. Human-read item remains unchecked for John.

- What does the user see when it fails? Import fails with `NOT NULL constraint failed: workflow_step.workflow_id`; recorded regressions reproduce it.
- Is the diff free of unrelated or stale generated changes? Yes!
- Are unit tests not just testing the literal implementation? Yes: API round trips check outputs, renames, annotations, embedded definitions and connections, including stock predecessors and nested workflows.
- Are baseline tests in their own leading commits? Yes: the first commit adds only the two previously passing baseline cases.
- Are comments free of excess archeology? Yes.
- If comments describe previous implementation or bugs, what purpose do they serve? Explain the ordering requirement and resolver commit side effect.
- Which existing workflows change behavior? Affected embedded user/admin imports now succeed; nested user-tool imports are explicitly tested. Permissions and ownership remain shared with standalone construction.
- Who hits this in practice and what is the evidence? Importers in #24471; six user and two admin regressions reproduce the original error.
- Were simpler or existing approaches considered? Deferred output/PJA writes would target individual cascade triggers; transaction redesign adds a broader contract. Reuse the dependency phase and canonical resolver.

<details><summary>Review scope</summary>

Fresh subagent reviewed the complete three-file diff, surrounding dependency/module construction, commit sequence, and implementation/scope/challenge notes. Test evidence came from recorded executions; coordinator reran all ten import variants after the patch-identical rebase. No items changed during rebase, so no further checklist round was required.

</details>
