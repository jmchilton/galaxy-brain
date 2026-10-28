- `kind/bug` — clients staging a job with a multiple-value parameter list get a 400 on invocation (idc#103, planemo#1744); fixed via an opt-in keyword.
- `area/workflows` — workflow parameter inputs on invocation.
- `area/tool-framework` — labeler adds this for `lib/galaxy/tool_util/**`; the change is in `tool_util/cwl/util.py` and `tool_util/client/staging.py`.

Not kept: `area/testing` (populators adoption is incidental).
