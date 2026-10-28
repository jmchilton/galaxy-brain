Target repo: galaxyproject/tools-iuc. Status: **confirmed** (source read + Cheetah render with Galaxy's real `SelectToolParameterWrapper`). Duplicate check (2026-10-27): no matching issue/PR. `gh search issues|prs --repo galaxyproject/tools-iuc` for "hamronize", "hamronization", "hAMRonize origin" found only closed #4547 (summarize bug, unrelated) and open autoupdate PR #4822 (touches `macros.xml` version only). Not filed.

Source: Foundry run `prose-wb2g-funcscan-v0-2026-10-26`, ledger entry `hamronize-tool-origin-false-branch-unreachable`.

---

## Title

hamronize_tool: origin "No" branch unreachable, user-supplied analysis_software_version always ignored

## Body

### Problem

For the origin tools (abricate, amrfinderplus, fargene, srst2, staramr), choosing "Input generated within Galaxy on this server without leaving it?" = **No** and entering a version has no effect. The command always passes the report dataset's `tool_version` as `--analysis_software_version`.

Wrapper version: `1.1.4+galaxy0`. The logic came in with #5814 (b49fc1534, 2024-03-05) and is unchanged on `main` at 31dcb54ad821a2205bf5f98e8e07f31e8034c8df.

### Code

[`tools/hamronization/hamronize_tool.xml` L23-L35](https://github.com/galaxyproject/tools-iuc/blob/31dcb54ad821a2205bf5f98e8e07f31e8034c8df/tools/hamronization/hamronize_tool.xml#L23-L35):

```
#if $input.tool not in $no_origin_info_tools
    #if $input.tool in $origin_tools and $input.origin.origin
        #if $input.origin.origin
    --analysis_software_version '$input.report.tool_version'
        #else
    --analysis_software_version '$input.origin.analysis_software_version'
        #end if
    --reference_database_version '$input.reference_database_version'
    #else
    --analysis_software_version '$input.analysis_software_version'
    --reference_database_version '$input.reference_database_version'
    #end if
#end if
```

[`tools/hamronization/macros.xml` L29-L39](https://github.com/galaxyproject/tools-iuc/blob/31dcb54ad821a2205bf5f98e8e07f31e8034c8df/tools/hamronization/macros.xml#L29-L39):

```xml
<conditional name="origin">
    <param name="origin" type="select" label="Input generated within Galaxy on this server without leaving it?">
        <option value="true" selected="true">Yes</option>
        <option value="false">No</option>
    </param>
    <when value="true"/>
    <when value="false">
        <expand macro="analysis_software_version" software="@SOFTWARE@" />
    </when>
</conditional>
```

### Why it's wrong

`origin` is a `select`, so its option values are the strings `"true"`/`"false"`. Galaxy wraps a conditional's test param like any other select ([`evaluation.py` L499](https://github.com/galaxyproject/galaxy/blob/a9a68082414f540fbe4ddb4d561805246fc0da21/lib/galaxy/tools/evaluation.py#L499), [L556](https://github.com/galaxyproject/galaxy/blob/a9a68082414f540fbe4ddb4d561805246fc0da21/lib/galaxy/tools/evaluation.py#L556)) in a `SelectToolParameterWrapper`. That class doesn't override `__bool__`, so it inherits [`ToolParameterValueWrapper.__bool__`](https://github.com/galaxyproject/galaxy/blob/a9a68082414f540fbe4ddb4d561805246fc0da21/lib/galaxy/tools/wrappers.py#L83-L86), which returns `bool(self.value)`. `"false"` is a non-empty string, so it is truthy. Only `__str__` and `__eq__` against a string ([L277-L293](https://github.com/galaxyproject/galaxy/blob/a9a68082414f540fbe4ddb4d561805246fc0da21/lib/galaxy/tools/wrappers.py#L277-L293)) look at the selected value.

So both `#if $input.origin.origin` tests are always true, and the `#else` that uses `$input.origin.analysis_software_version` never runs.

I checked this by rendering the block with Galaxy's `SelectToolParameterWrapper`:

```
origin=true:  --analysis_software_version 'abricate 1.0.1' | bool=True str=true
origin=false: --analysis_software_version 'abricate 1.0.1' | bool=True str=false
```

There's a second problem: the outer `#else` (L32) refers to `$input.analysis_software_version`. Origin tools don't have that param at that level; it lives under `origin`. So if only the outer test is fixed, origin=No falls through to that branch, and the template fails or passes the wrong value.

### Impact

- Users can't set the analysis software version for abricate, amrfinderplus, fargene, srst2 or staramr reports. Reports made outside Galaxy (or uploaded) get whatever `tool_version` the dataset has, which is often empty or the upload tool's version.
- The UI quietly drops the value the user typed.

### Why the tests miss it

The abricate tests set `origin=false` and `analysis_software_version=tool_v_1` ([L182-L223](https://github.com/galaxyproject/tools-iuc/blob/31dcb54ad821a2205bf5f98e8e07f31e8034c8df/tools/hamronization/hamronize_tool.xml#L182-L223)). They assert `db_v_1` but never `tool_v_1`, so they pass with the bug.

### Suggested fix

Compare the value and give each origin case its own branch:

```
#if $input.tool not in $no_origin_info_tools
    #if $input.tool in $origin_tools
        #if str($input.origin.origin) == 'true'
    --analysis_software_version '$input.report.tool_version'
        #else
    --analysis_software_version '$input.origin.analysis_software_version'
        #end if
    #else
    --analysis_software_version '$input.analysis_software_version'
    #end if
    --reference_database_version '$input.reference_database_version'
#end if
```

Another option is a `boolean` test param (`truevalue`/`falsevalue`), whose wrapper is falsy when unchecked. That changes saved workflow state for existing users, so the string comparison is less disruptive.

### Suggested test

In the existing abricate test (origin=false, `analysis_software_version` `tool_v_1`), add:

```xml
<has_text text="tool_v_1"/>
```

It fails on current `main` and passes with the fix. A similar origin=false test for amrfinderplus or fargene would cover another `origin_tools` member.
