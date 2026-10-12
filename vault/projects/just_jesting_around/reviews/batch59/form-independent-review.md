# Independent review: GForm

Approve after the added event check was tightened to strict identity. Compared the original test at base `ee56ad6a3715b5b792d5537e84dc9f2446920d2e` with the final canonical test in `bc3b5f773a059d2a19aa2be333d06ba53eaf246e`, and read both the forwarding client component and actual shared UI GForm source.

The original two scenarios and three assertions remain: one parent callback, prevention of the native submit default with a callback, and prevention with a bare submit.prevent listener. The extra assertion now uses `expect(onSubmit.mock.calls[0]?.[0]).toBe(event)` to require the exact native Event instance; the initial `toHaveBeenCalledWith` argument check would only guarantee deep argument equality. Full mounting retains real native form events and parent modifier behavior, required form lookup uses `get`, synchronous scenarios drop unnecessary async markers, and automatic unmount owns each host.

Independent shuffled seed 590201 passes two cases against the strict final file. No production change, weakened original check, supporting edit, new abstraction, or evidence-backed README gap remains. Existing coverage evidence retains all nine originally covered locations of the actual shared form source.
