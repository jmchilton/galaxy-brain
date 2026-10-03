Title: Tool upgrade advice for `structured_like` names profile 18.01, but bare references break only at 26.0

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

The `18_01_consider_structured_like` upgrade advice says `structured_like` must be fully qualified from profile 18.01, but bare references keep working below profile 26.0.

## The mismatch

The advice in `lib/galaxy/tool_util/upgrade/upgrade_codes.json`:

```json
"18_01_consider_structured_like": {
    "level": "consider",
    "message": "Starting with 18.01 tools, the 'structured_like` attribute must reference inputs in a fully qualified manner - using '|' to describe parent conditionals for instance.",
    "url": "https://github.com/galaxyproject/galaxy/pull/6162"
}
```

The runtime gate in `lib/galaxy/tools/execute.py` (`sliced_input_collection_structure`, used when the tool is mapped over a collection):

```python
unqualified_recurse = Version(str(self.tool.profile)) < Version("26.0") and "|" not in input_name
```

So the advice is wrong in both directions:

- **It names the wrong version.** An author who checks whether an existing 18.01–25.x tool with a bare `structured_like="input1"` is broken will be told it is. It isn't.
- **It's silent where the break actually happens.** Bumping that same tool to profile 26.0 does break it when mapped over, failing with `Failed to find referenced collection in inputs.` (the #22429 error). The advisor has nothing to say about that: its migrations stop at `ProfileMigration24_2`, and it refuses tools or targets above 24.2.

The advice was a release off from the start: #6162 introduced the gate at `< 18.09`, not 18.01.

<details><summary>Where it's emitted</summary>

`ProfileMigration18_01.advise` in `lib/galaxy/tool_util/upgrade/__init__.py` emits the code for any tool matching `.//outputs/collection[@structured_like]`, whether or not the reference is qualified or the referenced input is nested. `test/unit/tool_util/upgrade/test_upgrade_advice.py::test_1801_consider_structured_like` asserts the current behaviour.

Without mapping over, `ToolOutputCollectionStructure.collection_prototype` (`lib/galaxy/tool_util/parser/output_objects.py`) looks the name up in a `LegacyUnprefixedDict`, whose aliases resolve a bare name one conditional/section deep at any profile. So the 26.0 break is specific to mapped-over runs.

`advise_on_upgrade` raises for a tool profile or target above `latest_supported_version = "24.2"`.

Code above checked against `dev` @ `3b53c556928`.

</details>

## Context

A follow-up to 🔀 #22432 (fixing 🎯 #22429). That PR moved the runtime gate from 18.09 to 26.0 but didn't touch the advice text. Related to 🔀 #23877 - its draft docs note the same contradiction.

## Proposed Approach

Add a `ProfileMigration26_0` (raising `latest_supported_version` to 26.0) with a `26_0_structured_like_must_be_qualified` code. Emit it only when a `structured_like` value has no `|` and names an input nested in a conditional or section; the `OutputsStructuredLikeReference` linter added in #22432 already performs that check. Then reword the 18.01 code into plain best-practice advice that doesn't claim a behaviour change, or drop it.

## Alternative Approaches

The smaller fix is to reword only the 18.01 message to say that unqualified names resolve below profile 26.0. That corrects the text but still leaves the advice on a migration where nothing changes, and authors moving to 26.0 would still get no warning. The 26.0 migration puts the advice where the behaviour changes and can target only the tools that are affected.

<details><summary>Alternatives In Detail</summary>

### Alternative: Reword the 18.01 message only

<details><summary>Description</summary>

#### Details

Change the message to something like: "Reference inputs nested in conditionals or sections by their qualified name (`cond|input1`). Unqualified names are resolved only for tools with profile below 26.0." Keep it on `ProfileMigration18_01`.

#### Why the proposed approach is preferred

The advisor skips migrations that end before the tool's current profile, so an author upgrading any tool already at 18.09 or later never sees this message. The 18.01 code also fires for every `structured_like`, including ones that are already qualified or not nested.

</details>

</details>
