**P2 — Keep connected conditional discriminators serializable during extraction.**

At `lib/galaxy/workflow/extract.py:174–177`, returning `ConnectedValue()` also replaces a conditional's select discriminator. `visit_input_values` can no longer match a case and sets `__current_case__` to `-1`; `params_to_strings` then calls `Conditional.value_to_basic`, which recomputes the case from that marker and raises `ValueError: No case matched value`.

I reproduced this with an existing saved workflow connecting `param_value_from_file/text_param` to `output_filter_exception_1/options|options`, with the recorded selector `default`. The connection was imported through the normal API using the pre-September-28 marker-on-import behavior, then invoked at HEAD with `allow_tool_state_corrections=true`; all jobs finished `ok`. Extracting both jobs returns 500 through **both** extraction endpoints at `9008c8cb17c8`, versus 200 through both using the exact parent extraction implementations on the same invocation. This is an extraction regression for saved workflows, separate from the current import limitation.

Please preserve a valid conditional selection when restoring this edge and add coverage where the discriminator itself is connected; the current conditional unit case connects only a child text parameter.
