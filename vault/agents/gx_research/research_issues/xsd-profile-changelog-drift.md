# galaxy.xsd "Tool profile" changelog drifts from the code's profile gates

- Area: lib/galaxy/tool_util/xsd/galaxy.xsd (tool element docs, `:13-90`)
- Found while: [[Component - Tool Profile Versions and Upgrade Advisor]]
- Galaxy SHA: 65e6daff
- Severity: low (docs)

## Problem

The changelog under `### Tool profile` is the only list of profile behavior changes written for tool authors. Compared with the `Version(...)` comparisons in `lib/galaxy` at this SHA:

- **Missing versions.** No 26.0 entry, though `tools/execute.py:585` stops resolving bare `structured_like` names inside conditionals and sections from 26.0. The only mention is in the `structured_like` attribute docs (`:6576`). No 26.1 entry, though invalid citations fail tool load from 26.1 (`parser/xml.py:756`) and `value=""` on a multiple-select test param is rejected (`parameters/case.py:167`; documented only at `:1905-1912`). No 23.1 entry, though booleans with equal or inverted `truevalue`/`falsevalue` fail to parse from 23.1 (`parser/util.py:96-106`).
- **Undocumented gate.** Container volumes include `$job_directory/configs:rw` only for profile <= 19.09 (`deps/container_classes.py:397`).
- **Stale bullet.** Under 18.09: "References to other inputs need to be fully qualified by using `|`." Nothing in the code applies that rule at 18.09. The `structured_like` qualification gate is 26.0 (#22432). The advisor's `18_01_consider_structured_like` code repeats the same wrong claim (issue #23884).
- **Entry with no gate.** The 25.1 entry (credentials instead of user preferences) has no matching profile comparison in `lib/galaxy`.
- **Heading levels.** 16.04-20.09 use `####` and 21.09 onward use `###`, so the later versions render as siblings of "Tool profile", not children.

## Evidence / repro

`grep -rnE 'Version\("2[0-9]\.[0-9]+"\)' lib/galaxy` and the float comparisons in `tools/__init__.py:410, 3388, 3515`, checked against `galaxy.xsd:13-90`. The full table is in the note.

## Suggested fix

Add 23.1, 26.0 and 26.1 sections, plus 19.09 if the configs mount counts as author-visible. Fix or drop the 18.09 bullet. Normalize the heading levels. A unit test could check that each `Version("NN.N")` profile literal under `lib/galaxy/tool_util` and `lib/galaxy/tools` has a changelog heading, but it would need an allowlist for gates that aren't user-facing.
