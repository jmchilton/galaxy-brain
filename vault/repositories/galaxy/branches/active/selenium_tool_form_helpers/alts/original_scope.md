# selenium_tool_form_helpers_alt_original_scope

This branch is the original scope after the first hardening pass, at head `9e4a42c6388`. That covers test challenge, E2E polish, Codex fixes, the `galaxy.selenium.tool_form` extraction and the baseline split.

It differs from the parent in two ways:
- It doesn't have `f19d8ec90f8`, which maps a data field over a collection hid.
- It doesn't fix repeat counting and insertion for repeats inside a conditional, inside a section, or nested in another repeat.

The scope evaluation recommended both changes, and the parent adds them.
