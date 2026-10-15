# Initial implementation

The shared JobInformation fixture now uses RegexJobMessage objects with the original four descriptions, type, log error level (`StdioErrorLevel.LOG = 1`), and nullable match/stream fields matching the generated API schema. The component test checks both numbering and the complete visible field list against that fixture; the separate inline structured-message case was consolidated. The stream-read diagnostic case stays intact.

Removed CollectionProgress.test.js. Its four scenarios (running, mixed states, updates, queued) remain in the TypeScript suite, with exact bar sets plus terminal-job hiding. ToolSuccessMessage is the fixture’s only other consumer and reads job IDs.

Confirmed red before correcting the fixture: the strengthened assertion received character entries such as `0: t`, `1: e`. Focused green run: 15 tests across three suites passed. Changed-file ESLint/Prettier and full client vue-tsc passed. No application source or browser-visible behavior changed. Existing unrelated readability commits are outside the review range `d49bea20fac..HEAD`.
