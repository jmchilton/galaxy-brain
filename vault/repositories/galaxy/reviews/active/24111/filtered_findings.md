# Filtered findings: PR #24111 initial review

- **thermo_review P3 1: the "login stopped" signal is recovered by matching URL strings.** Filtered because it re-litigates a decision called out in the PR description. The "Known limitations" section names this exact check and the backend-interface trade-off. The follow-up refactor issue still carries it as a `dev` item.
- **gx_test_challenger P3 2: the `url_builder` fake is duplicated in `test_deferred_user_creation.py` and `test_oidc_backends.py`.** Filtered as not worth acting on. The fake is a two-line closure, and moving it into a shared module would add more code than it saves.
- **gx_test_challenger P3 3: the host-list parser should be a public util.** Filtered as not actionable, because the PR follows existing convention. The sibling `_parse_allowed_origin_hostnames` is also a private static method on the config class, and `test/unit/webapps/test_webapp_base.py` tests it directly in the same way.
