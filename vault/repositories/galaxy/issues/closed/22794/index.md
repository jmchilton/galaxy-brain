# galaxy#22794 — How to test parameter validators in tool tests?

[Issue](https://github.com/galaxyproject/galaxy/issues/22794)

Branch `expect_failure_invalid_inputs` — Tests meant to exercise a `validator` couldn't use `expect_failure` at profile ≥24.2 (load-time validation errored the test and dropped the flag; below 24.2 they ran and passed via server rejection). Fix: `TestCaseStateAndWarnings.validate` skips value validation for `expect_failure` tests but still rejects unknown parameter names, so loader and linter agree; YAML tools skip their eager test validation for them and may omit `outputs`. Chosen over a dedicated `expect_inputs_invalid` attribute (remote-only branch) because that only caught static validators. Framework tools `expect_failure_invalid_inputs` (XML, legacy API) and `expect_failure_invalid_inputs_y` (YAML, request API) both pass. State: one commit on `dev` `f00b9f059be` (`9802df374fa`), pushed to `jmchilton`, **no PR**. Aside: krakentools also needs qualified `library|input_1` names (tools-iuc).

Closed 2026-09-29.
