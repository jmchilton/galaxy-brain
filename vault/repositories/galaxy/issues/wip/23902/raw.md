# Retire unqualified (legacy alias) `format_source` / `metadata_source` references behind a tool profile

Agent-to-agent handoff. Queued from the `fix_format_source_docs` branch (supersedes bernt-matthias's #19330). Not filed yet. Once filed, the branch's test tool comment should link it (see "Where the number goes").

## What the legacy alias is

At job creation `LegacyUnprefixedDict` (`lib/galaxy/tools/actions/__init__.py`, `set_legacy_alias` at ~241-353, `input_collections` at ~562) keys input datasets by their full `|`-qualified path (`cond|input1`). It also records a legacy alias that drops the *innermost* conditional or section (`input1` for `cond|input1`, `cond|input1` for `cond|inner_cond|input1`). A bare or partly qualified `format_source` / `metadata_source` resolves only through that alias.

The alias is a leftover from before references were qualified, and it's fragile:
- **It breaks one level deeper.** Only the innermost group is dropped, so a "bare name" works for one conditional and silently fails for two (`format_source_in_conditional.xml` output2 vs output3 shows this).
- **It doesn't exist for discovered collection elements.** Those resolve against plain dicts keyed by qualified name, so a legacy reference silently falls back to the default format.
- **It can be shadowed.** #23891's collision row: a `multiple` data param's numbered internal key `input1` beats the legacy alias for `cond|input1`, so the output takes the wrong format silently.
- **Docs taught the wrong rule.** The XSD said "a conditional name is not included", which `fix_format_source_docs` replaces with qualified references. The sentence describing the legacy form was dropped at John's request.

## Current and planned state

- **Linter (`fix_format_source_docs`):**
  - `OutputsFormatSourceReference` warns on a legacy alias and suggests the qualified name.
  - On a `<collection>` with `<discover_datasets>` the same reference is an error.
- **Precedent for profile-gating:** `structured_like` already errors on every unqualified name from profile 26.0 (`OutputsStructuredLikeReference`). `format_source` / `metadata_source` have no such gate.
- **Runtime (`issue_23891_output_reference_resolver`, stacked on `fix_format_source_docs`, not yet a PR):**
  - Resolves references against declared inputs at tool load.
  - Rewrites a valid legacy alias to its qualified key.
  - Drops unresolvable references with a warning below profile 26.2 and raises `ToolLoadError` from 26.2.
  - It does **not** retire the legacy alias: a valid alias is still accepted at every profile.
  - With that branch, retiring the alias is a small change: in the profile-gated path, treat "matched only via legacy alias" as unresolvable.

## Usage evidence

Sweep of 555 `format_source` / `metadata_source` references (tools-iuc 2026-07-30, galaxytools 2026-09-24, tools-devteam, Galaxy test tools; from the 23891 branch debrief): **94 are one-level legacy aliases** that resolve correctly today. So retiring the alias without a profile gate would break real tools. Gating by profile only affects tools that opt into the new profile.

## Proposal

- From a future tool profile (26.2 if it lands with #23891's load-time resolution, otherwise the next one), unqualified/legacy-alias `format_source` and `metadata_source` references are a load error (or at least a lint error), matching `structured_like` at 26.0.
- Older profiles keep resolving the alias. The linter keeps warning and suggesting the qualified name, so authors can upgrade first.
- Document it in the XSD profile changelog and in the attribute docs. Also add it to profile-upgrade advice (`lib/galaxy/tool_util/upgrade/`). The `upgrade_advice_structured_like` branch is the model: it moved the `structured_like` advice into a 26.0 migration.
- Out of scope: `structured_like` (already done at 26.0) and `change_format` `input_dataset` (also reads raw names; possible follow-up).

## Open questions for the issue

- Which profile? Tie it to #23891's 26.2 gate, or leave it separate.
- Load error vs. lint-only at the new profile.
- Should runtime also stop *recording* legacy aliases for new-profile tools (so `$input1` in cheetah etc. isn't affected)? Probably not. The alias map is used beyond output references. Limit the change to output reference resolution.

## Related

- #23444: settle nested parameter-reference syntax; centralize resolution.
- #23891: internal keys; the runtime resolver branch.
- #19330 (bernt-matthias, superseded by `fix_format_source_docs`), whose test tool introduced the "remove in future profile version" comment.
- #23877: tool parameter reference docs, which list the legacy alias as a rough edge.

## Where the number goes

`test/functional/tools/format_source_in_conditional.xml:31` on `fix_format_source_docs`:

```xml
<data name="output3" format_source="input1"/><!-- format_source with legacy behavior, remove in future profile version -->
```

Append the filed issue, e.g. `... remove in future profile version (#NNNNN) -->`. The branch agent will do this once the number exists.

## Framing notes

- Not a bug report: it's a deprecation proposal with evidence.
- Lead with the one-level-deeper and discovered-collection failure modes. Those are the silent wrong answers.
- No @-mentions.
