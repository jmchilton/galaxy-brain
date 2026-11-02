Groundwork for 🎯 #23444 - a developer reference for the many ways Galaxy names a nested tool parameter.

Ask "how do I refer to `input1` inside conditional `cond`?" and the answer depends on where you are writing. It's `$cond.input1` in a Cheetah command, `cond|input1` in `format_source`, `cond['sel']` in an output `<filter>`, `cond.sel` in `<actions>`, `inputs.cond.input1` in a YAML tool's JavaScript, nested `{"cond": {...}}` in the tool request API, `cond.a.input1` in that API's validation errors, `#{cond.input1}` in a rename action and `cond|input1` again in a workflow connection. Each one has its own legacy fallbacks and its own blind spots, and several fail **silently** instead of with an error:

- The legacy tool API drops nested dicts unless `input_format` is `21.01`, and drops pipe keys when it is. The parameters fall back to their defaults.
- A gxformat2 `in:` key written `adv/size` connects to nothing.
- `change_format` `<when input="cond|sel">` never matches.
- An output `<filter>` that raises still creates the output.
- A `format_source` legacy alias works at job creation but not when discovered datasets are resolved.
- YAML output attributes such as `format_source` aren't checked against the declared inputs.
- A YAML tool test's section values (`adv: {size: 3}`) are dropped, and the section keeps its defaults.

None of this is written down in one place today. Anyone designing a new parameter reference (#23444, a linter, a YAML tool feature or a workflow API) has to rediscover it from the code. This PR adds `doc/source/dev/tool_parameter_references.md`, a single reference covering tool XML, YAML tools, the APIs and workflows.

***It describes Galaxy as it is today, not as it should be: where an open issue or PR proposes a change, an inline "Open:" note links it next to the behavior it would change.*** Writing this reference turned up most of those issues, and several fixes have already merged (see Context).

<details><summary>What's in it</summary>

- **At a Glance:** the five naming styles (pipe path, nested state, dotted path, Python subscript, bare leaf name), which features use each, how repeats differ across them, and the silent traps listed above.
- **Tool Syntax:**
  - Per-feature tables of syntax and grouping support (sections, conditionals, repeats) for XML and YAML tools.
  - Cheetah's bare-name fallback, the `LegacyUnprefixedDict` alias and where it stops working.
  - The two `structured_like` resolution paths and their profile 26.0 gate, `type_source` lookup, and what the output reference linters check.
  - Output filters and actions, dependent parameters, tool tests.
  - YAML's two dialects (`class` declared vs. classless) and its two load paths (validated API tools vs. disk files), and which features exist in each.
- **API:** the legacy tool API's flat and `21.01` shapes, the tool request API, the tool form, `/build` and rerun, and the names each one uses in error responses.
- **Workflows:** native `.ga`, gxformat2, `when` expressions, the editor, the invocation API and run form, rename post-job actions and the refactor API.
- **Verification:** collapsed notes cite the regression tests behind selected claims and separate tested from source-inspected behavior. A closing table lists the behaviors that are still unverified and the test that would close each gap.

</details>

***It's a reference for Galaxy developers, not a tool-author guide, so it documents legacy behavior, including the parts nobody should start depending on, to show where the edges are.***

## Risks

Risks are minimal - this is documentation only and doesn't lock Galaxy into any behavior (a two-way door). The doc will drift as the linked issues are fixed; each "Open:" note marks a passage to update when its fix lands.

## Context

Builds on 🔀 #23890 (`type_source` in conditionals), 🔀 #23918 and 🔀 #23943 (rename `#{input}` matching), 🔀 #23919 (output reference linters) and 🔀 #24365 (YAML sections and repeats), which fixed problems this reference found; the doc describes the fixed behavior. Open follow-ups it links: 🎯 #23884 (🔀 #24524), 🎯 #23888, 🎯 #23891, 🎯 #23895, 🎯 #23902 and 🎯 #23981. Complements [`tool_state.md`](https://github.com/galaxyproject/galaxy/blob/dev/doc/source/dev/tool_state.md), which covers how parameter *values* are represented. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ Fact-check against dev

<details><summary>Every section re-checked against <code>dev</code> <code>269efa7af5b</code>: 11 stale claims fixed, one new silent trap found.</summary>

- Updated for merged fixes: `type_source` lookup (#23890), output reference linters (#23919), rename segment matching (#23918), YAML class-based dialects and sections (#24365), the editor's parsed `when` expressions.
- New: YAML tool tests silently drop section values (`_flatten_parameter` has no section branch); added to the silent traps and the gaps table.
- Two verification gaps closed by #24365's contract tests; about 25 claims re-confirmed with `file:line` evidence.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_parameter_references/reverification_2026-11/). Run via Opus at low effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>Documentation only; every item passes or is N/A, plus four doc checks.</summary>

- [x] What does the user see when it fails? N/A, docs only.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A, no tests.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A, no tests.
- [x] Are the comments free of excess archeology? N/A, no code comments; version history appears only where it explains which legacy form still resolves.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Each "Open:" note links an issue or PR and frames it as proposed or reported, not current behavior.
- [x] All 22 internal anchor targets match a heading.
- [x] Claims added in the refresh match the fact-check report.
- [x] No leftovers of the removed YAML compatibility warning.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_parameter_references/pr_checklist/). Run via Sonnet at default effort.

</details>

## How to test the changes?
- [x] Instructions for manual testing are as follows:
  1. `make docs` and open `dev/tool_parameter_references.html`. Every internal anchor and cross-page link resolves (checked with `sphinx-build -n`; `user_defined_tools_authoring.md` is generated by `make docs`).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
