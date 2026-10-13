# DelayedInput author review

Base `3533c26be42734c937d57c3fd4805e14b81da286`; original one case/two checks, exact test query, clear-click and subsequent nextTick remain. The title describes the tested cleared-text behavior rather than claiming an unobserved focus assertion. A single-use arrangement is inline with native inferred component/global/props. Required clear action and typed input value use get; original input presence check remains find/exists. No component object or DOM element assertion remains.

Automatic unmount removes the component's actual document listener before test-scoped timeout timers are discarded and real time restored. Actual DelayedInput onBeforeUnmount removes that listener, but does not itself cancel its raw debounce; no timer-cancellation production claim is made. Selective timeout faking owns pending work on assertion failure and advances no clock before original checks. No Pinia/store fixture or extra default is added.

Pristine/final pinned Node22.20 single-worker shuffled740101 pass. Default covered statement/function/branch-arm source locations15files131→133, zero loss; two gains are real document-listener cleanup. Actual shared UI23files108→110, zero loss, two gains from real button cleanup. Real GFormInput/GButton remain rendered, with imported setup separately qualified. Evidence `/private/tmp/readability74-delayed-{before,after}` and corresponding -ui JSON/logs. File ESLint/Prettier/explicit absolute hooks pass; driver owns integrated types.

Only assigned originator changes; no production/helper/support/later-lane edit. Existing lifecycle and required-target guidance covers the issue, with no evidenced new guidance gap.
