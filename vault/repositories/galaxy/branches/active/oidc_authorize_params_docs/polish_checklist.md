# Polish checklist — 2026-10-14

Reviewed the branch diff against `origin/dev` with a fresh checklist subagent and repeated that review after the wording and formatting changes. No blocking findings. Workflow checklist does not apply.

- [ ] Did a human read every test and every comment? Reserved for John.
- [x] What does the user see when it fails? Missing parameters in the IdP redirect; the guide explains prefix verification and IdP policy enforcement.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A — no tests added to this docs-only branch.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.

Evidence: parameter handling and precedence in social-core `OpenIdConnectAuth.auth_params` and `BaseStrategy.setting`; Galaxy `BACKENDS_NAME` and Setter parsing; targeted Sphinx build and XML parsing. The original implementation's Markdown formatting changes are enforced by Prettier, not stale generated output.
