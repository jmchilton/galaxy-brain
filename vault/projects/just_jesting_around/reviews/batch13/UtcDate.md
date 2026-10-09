# UTC date display

Originator: `client/src/components/UtcDate.test.js`. Cases: **1 → 2**.

Named the default ISO display and the reactive mode-switch sequence. A tiny local mount arrangement makes the original date visible in one constant. Auto-unmount wrappers and restore the fake clock.

Preserved the exact microsecond input, ISO output, prop-driven date → elapsed → pretty transitions, and complete pretty-format assertion. The elapsed case now freezes the date at ten years after the input and asserts `about 10 years ago`, which retains the original years-ago expectation without depending on the calendar when this test runs. Pretty output continues to use the real local timezone through date-fns, as before.

Reuse: no complex domain data, so no factory or cross-file helper is useful. Existing scenario and cleanup guidance covers this; no new guidance or marginal advice proposed.

Validation: the five owned suites passed 33/33 cases with no skips under shuffled Vitest seed `130031` (`/private/tmp/jest_readability_batch13_upload_final.json`). Scoped ESLint passed with zero warnings, Prettier passed, and `git diff --check` passed. The root runs authoritative full-client typechecking and final whole-batch validation.
