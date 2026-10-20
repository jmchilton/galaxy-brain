Thanks! I took all of jmchilton/galaxy#94. It fast-forwarded onto the branch unchanged, so it's now part of this PR.

- `build_module` → `get_errors()`: this was the follow-up I had deferred. I'd been worried about changing the `errors` shape for every module type, but the editor load path already sends step errors as a string and the node just renders it, so no client change is needed. Your new test fails without the `workflows.py` change.
- `NumericBounds` / cleared bounds, and the test tightening: 👍.
- Description: fixed the wording. Clearing a bounded field now covers required fields too, both in the summary and in the tool-form risk. Live editor feedback is now listed as added, not deferred.

The out-of-range saved default I'm leaving as a follow-up. Fixing it means clamping or warning on mount in `FormNumber`. That component is shared with tool forms, and emitting `input` on load would dirty the editor state and change the submitted value without any user action, which is more behavior change than I want in a 26.0 fix. The server still rejects the value at run time. I've added the slider/box mismatch to the deferred item in the description.
