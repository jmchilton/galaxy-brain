# unprivilegedToolStore — batch67

Originator commit: `9a620c7df6c8cfb8d73531c59c06cca13d20e9cd`.

All five original cases and 23 intended successful checks remain: three failure/retry rows retain their distinct transport errors and reporting behavior, anonymous users do not fetch, and access loads when a registered user becomes known. Assertion retries inside waitFor can produce additional evaluations; 23 counts the successful contract checks, including the table expansion.

Each case owns its real Pinia, selects both stores explicitly, and registers disposal of the captured instance. The canonical toast module mock replaces a bespoke error-only module implementation; only its error spy is cleared between cases, and exact payload/count assertions remain. Existing canonical user factories and genuine MSW transport handlers remain intact. No production, support or shared edits.

Pinned Node22.20 shuffled670101 pristine and final both pass five cases. V8 JSON source-location comparison is exact: 142 files and 495 covered statement/function/branch-arm locations before and after, zero loss or addition. This store suite renders no shared UI, so these native reports make no claim about rendered external UI coverage. File ESLint, Prettier and explicit absolute-config pre-commit hooks pass; driver owns integrated full types. Worker is clean after the single-originator commit.

Evidence: /private/tmp/readability67-tool-{before,after}/coverage-final.json, matching test logs and -eslint/-prettier/-hooks logs. No new evidenced guidance gap: existing canonical mock reuse and owned-store cleanup guidance applies directly.
