Title: Stop resolving unqualified `format_source` / `metadata_source` references from a future tool profile

Unqualified `format_source` and `metadata_source` references only resolve through a fragile legacy alias, so they can give an output the wrong format without any error; new tool profiles should require the qualified name.

`format_source_in_conditional.xml` (extended in 🔀 #19330, carried on 🌿 [`fix_format_source_docs`](https://github.com/jmchilton/galaxy/tree/fix_format_source_docs)) runs three references against an input one conditional deep and two conditionals deep. Its tests assert:

| `format_source` | input at `cond\|input1` (tabular) | input at `cond\|inner_cond\|input1` (tsv) |
| --- | --- | --- |
| `cond\|inner_cond\|input1` | `data` (branch not selected, expected) | `tsv` ✅ |
| `cond\|input1` | `tabular` ✅ | `tsv` ⚠️ via legacy alias |
| `input1` | `tabular` ⚠️ via legacy alias | `data` ❌ silent fallback |

⚠️ = resolves only through the legacy alias. ❌ = the reference matches nothing and the output silently gets the default format.

The alias drops only the *innermost* conditional or section, so a bare name that works one level deep stops working one level deeper, and a qualified name can quietly resolve an input in a different branch. On `dev` the alias also fails silently in two other places:

- **Discovered collection elements.** They are resolved against plain dicts keyed by qualified name (`output_collect.py`), where the alias doesn't exist, so a bare reference falls back to the default format.
- **Shadowing.** In 🎯 #23891, a `multiple` data param's internal key `input1` beats the legacy alias for `cond|input1`, so the output takes the wrong input's format.

#23891's branch patches both by rewriting a valid alias to its qualified name at tool load, but it still accepts the alias at every profile.

The alias can't just be removed. Of 555 `format_source` / `metadata_source` references in tools-iuc, bgruening/galaxytools, tools-devteam and Galaxy's test tools, 94 are one-level legacy aliases that resolve correctly today.

<details><summary>Where the alias comes from</summary>

At job creation, `LegacyUnprefixedDict` (`lib/galaxy/tools/parameters/wrapped.py`, filled by `set_legacy_alias` calls in `lib/galaxy/tools/actions/__init__.py`) keys input datasets by their full `|`-qualified path (`cond|input1`). For each one it also records an alias with the innermost conditional or section removed (`input1` for `cond|input1`, `cond|input1` for `cond|inner_cond|input1`); repeat segments are kept. A lookup falls back to the alias only when the key isn't a real one. The XSD documented the rule as "a conditional name is not included", which only holds one level deep.

</details>

## Context

A follow-up to 🌿 [`fix_format_source_docs`](https://github.com/jmchilton/galaxy/tree/fix_format_source_docs) (supersedes 🔀 #19330), which documents qualified references, makes `OutputsFormatSourceReference` warn on a legacy alias with the qualified name and error on a discovered collection, and marks the test tool's `output3` "legacy behavior, remove in future profile version". Related to 🎯 #23891 - its resolver on 🌿 [`issue_23891_output_reference_resolver`](https://github.com/jmchilton/galaxy/tree/issue_23891_output_reference_resolver) checks references at tool load, so this becomes a small change. Related to 🎯 #23444 - settling nested reference syntax. `structured_like` set the precedent: its mapped-over lookup stopped resolving bare names at profile 26.0 (🔀 #22432), with upgrade advice tracked in 🎯 #23884. Rough edges like this one are listed in 🔀 #23877.

## Proposed Approach

From a new tool profile, a `format_source` or `metadata_source` that matches an input only through the legacy alias is a tool load error naming the qualified reference, and runtime looks output references up without the alias. Tools on older profiles keep resolving the alias, and the linter keeps warning them with the qualified name. Document it in the XSD profile changelog and attribute docs, and add profile-upgrade advice as #23884 does for `structured_like` at 26.0.

<details><summary>Details and open questions</summary>

- With #23891's resolver, the load check sits in its profile-gated path: a reference that matched only through the legacy alias is treated as unresolvable. That path already raises `ToolLoadError` from 26.2 for references that match nothing.
- The load check alone misses the `cond|input1` row: it names a real input, so it passes, but at runtime it still reaches `cond|inner_cond|input1` through that input's alias. Hence the runtime change too.
- Keep the alias map itself. `structured_like`, `type_source` and `change_format` `input_dataset` also read it, so only `format_source` / `metadata_source` lookups change.
- Out of scope: `structured_like` (already gated at 26.0) and `change_format` `input_dataset`, which could be a follow-up.
- Open: which profile? 26.2 if it lands with #23891's load-time resolution, otherwise the next one.
- Open: load error, or lint error only, at the new profile?
- Open: #19330's test comment says `cond|input1` "should work for both cases". Keep that cross-branch resolution on purpose, or let it fall back like any other unselected input?

</details>

## Alternative Approaches

We could make it a lint error at the new profile but keep resolving the alias at runtime. That is less strict, but tools that skip linting would keep the silent fallbacks above. We could also remove the alias for every profile, but that would break the 94 references that work today. We prefer a profile-gated load error: it changes nothing for existing tools and makes the failure loud for new ones.

<details><summary>Alternatives In Detail</summary>

### Alternative: Lint-only at the new profile

<details><summary>Description</summary>

#### Details

`OutputsFormatSourceReference` reports the legacy alias as an error instead of a warning for tools at the new profile, and runtime is unchanged.

#### Why the proposed approach is preferred

Lint errors don't stop a tool from loading or running, so the wrong-format cases above still happen silently. A load error matches what #23891's branch already does for references that resolve to nothing.

</details>

### Alternative: Remove the alias for all profiles

<details><summary>Description</summary>

#### Details

Stop resolving unqualified output references at runtime for every tool.

#### Why the proposed approach is preferred

94 references in widely used tool repositories resolve correctly through the alias today. Removing it would change their output formats without the authors opting in.

</details>

</details>
