# ToolHelpMarkdown readability iteration 67

Originator `a91edd5deac91161c2a1bb15b9e2927de6d2d550`, pinned base `1aefd1948d079abfc2d179f62c4d07a323b8daa0`.

Preserved the original case and four checks, input markdown, `/galaxy/` app root and popover stub boundary. Native inferred mount options install an owned testing Pinia and retain the same stub. Automatic unmount precedes sanitizer call-history cleanup; Pinia disposal also runs on failed assertions. Existing `nth` guards replace non-null assertions while retaining the first sanitizer-call observation and second rendered-link contract.

Seed 670101 passes. Default V8 coverage is identical: 41 files, 132 covered statement/function/branch-arm locations, zero lost/added. Explicit external shared-UI diagnostic capture is also identical: 23 files, 12 covered locations, zero lost/added. These shared-UI locations are import/setup coverage; the popover remains stubbed, so this is not a rendered shared-UI behavior claim. File ESLint, Prettier and explicit absolute-config pre-commit hooks passed. Integrated full client types are driver-owned.

Evidence: `/private/tmp/readability67-help-{before,after}/coverage-final.json`, corresponding `-ui` captures and logs, `/private/tmp/readability67-help-hooks.log`. Existing ownership and indexed-access guidance covers this change; no new shared helper/documentation is justified.
