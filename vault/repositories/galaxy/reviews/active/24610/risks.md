Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: e085821c3565

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a one-character off-by-one fix (`> 0` to `>= 0`) so an unresolved `$tool_directory` volume listed first in a container volumes string is stripped like it already was in any other position, plus unit tests.

<details><summary>Risk Review Advice</summary>

When stripped from the front, the expanded string starts with a leading comma (the new test filters empty entries), so reviewers may confirm downstream volume parsing tolerates empty entries for both Docker and Singularity, as it already must for the stripped-at-end case. Note this targets release_26.1; deployments that had `$tool_directory` first previously got a literal unresolved volume and now get it dropped, which is the intended behavior.

</details>
