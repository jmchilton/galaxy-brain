# Upgrade advice `18_01_consider_structured_like` names the wrong profile

_Drafted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

## Summary

The profile upgrade advisor tells authors that from profile 18.01, `structured_like` must use a fully qualified reference. Runtime has never enforced that at 18.01. Today unqualified references resolve for every profile below **26.0**.

`lib/galaxy/tool_util/upgrade/upgrade_codes.json` (`origin/dev` @ `97142590afc`):

```json
"18_01_consider_structured_like": {
    "level": "consider",
    "message": "Starting with 18.01 tools, the 'structured_like` attribute must reference inputs in a fully qualified manner - using '|' to describe parent conditionals for instance.",
    "url": "https://github.com/galaxyproject/galaxy/pull/6162"
}
```

`ProfileMigration18_01` (`lib/galaxy/tool_util/upgrade/__init__.py:145`) emits it for any tool with `.//outputs/collection[@structured_like]`.

The runtime gate, `lib/galaxy/tools/execute.py:579` (`sliced_input_collection_structure`, used when the tool is mapped over a collection), says otherwise:

```python
unqualified_recurse = Version(str(self.tool.profile)) < Version("26.0") and "|" not in input_name
```

## History

- #6162 ("[18.01] Fix structured_like unqualified references + test") added the gate at `< 18.09`, so the advice was a release off from the start.
- `43e000bd808` (#22432, fixing #22429) moved the gate to `< 26.0`, because tools with newer profiles that used bare names were failing with "Failed to find referenced collection in inputs.". The advice text wasn't updated.

## Impact

An author upgrading a tool from 17.09 is told to qualify `structured_like` references, which is good advice, but they're told the wrong reason and the wrong version. An author checking whether an existing ≥18.01 tool with a bare name is broken will conclude it is, when it still resolves up to 26.0. Bumping that tool to 26.0 is what actually breaks it, and nothing in the advisor says so: migrations stop at `ProfileMigration24_2`.

## Suggested fix

Either:

1. **Reword the existing code.** For example: "Reference inputs nested in conditionals or sections by their qualified name (`cond|input1`). Unqualified names are resolved only for tools with profile below 26.0." It stays on the 18.01 migration, where the rule was introduced.
2. **Add a 26.0 migration.** Add `ProfileMigration26_0` with a new `26_0_structured_like_must_be_qualified` code, emitted only when a `structured_like` value has no `|` and names a nested input. Then reword or drop the 18.01 code. This is where the behaviour change actually happens.

Option 2 is more accurate but needs the nested-input check (the `OutputsStructuredLikeReference` linter already has it). Either way `test/unit/tool_util/upgrade/test_upgrade_advice.py::test_1801_consider_structured_like` needs updating.

## Not verified

- Whether other 18.xx advice codes have the same drift.
- No running-Galaxy check; this is from reading the code at `97142590afc`.
