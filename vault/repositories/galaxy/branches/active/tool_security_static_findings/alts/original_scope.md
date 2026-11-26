# Alt: original scope

`tool_security_static_findings_alt_original_scope` at `92320a751cb`: the port as hardened before the scope evaluation's expansion. It has the analyser, spec cases, CLI, docs and the review and test-challenge follow-ups, but:

- no rule catalog (finding rule ids are bare strings);
- no pure `classify(report)`;
- the CLI takes only explicit files and always exits 0.

The parent branch adds those on top.
