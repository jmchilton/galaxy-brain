# galaxy#23980 — Workflow text params with static allowed values ignore their default in the run form

[Issue](https://github.com/galaxyproject/galaxy/issues/23980) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-08 by Claude for John; assigned jmchilton. Came out of branch `issue_21015_multiple_text_param` (#21015).

`InputParameterModule.get_runtime_inputs` `staticRestrictions` path sets a top-level `selected` kwarg the dict input source ignores; options get no per-option `selected`. Run-form payload: default `b` → `value 'a'`; multiple default `[b, c]` → `None`. Client (`WorkflowRunFormSimple`, `FormSelect`) most likely shows `a` in both; not browser-confirmed.

Next: mark options selected from the default in the static path (share helper with `restrict_options`), drop dead kwarg; red unit test in `test/unit/workflows/test_modules.py`, API test beside `test_value_restriction_selects_*`. Consider sequencing with the 21015 branch.

Open: browser confirmation of the UI effect; swap 🌿 branch link for PR once 21015's PR opens.
