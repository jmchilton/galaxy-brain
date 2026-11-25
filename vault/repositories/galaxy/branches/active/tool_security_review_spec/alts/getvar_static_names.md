# Alt: getvar_static_names

Branch `tool_security_review_spec_alt_getvar_static_names` (jmchilton remote, head `54dab33d2be`), on top of
`5530db35200`. An earlier runtime-tracking attempt is `tool_security_review_spec_alt_getvar_names_wip`
(`67a3c924de3`).

Resolves `$getVar(name)` when the name is built from literal text instead of refusing every job:
- `names.NameStrings`: a static, flow-insensitive pass over the compiled template. For each variable it takes the
  union of the literal strings at every binding site (scoped per `#def`, plus `#set global` and the namespace).
- A literal `getattr` name is judged as the attribute it names.
- Output filters are exempt from the reflection rule.
- Static select options count as literals.

On tools-iuc this un-refuses 27 tools that the working branch refuses (only dimet_metabologram stays refused).

The working branch is back at `5530db35200`, which refuses every job of a tool whose rendered template uses
reflection. This alt was parked because a third review still found template forms that the pass does not model.
Each round of fixes has turned up new forms, so the approach is not converging. The user needs to decide between:
- an allow-list of recognised idioms;
- a pass that refuses anything it does not recognise;
- keeping the blanket refusal.
