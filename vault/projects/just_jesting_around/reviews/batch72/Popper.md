# Popper author review

Pinned base `27e6eaab10040eec5866dd9614ba44b7547c110d`; only the assigned Popper test changes. Eleven original cases/29 checks, every slot/prop/event and hover-delay advance remain. Native mounts were already in use. Required action/content targets now use get, while explicit presence/absence checks remain find/exists. The first title now accurately describes configured title rendering rather than claiming default props.

Each mounted wrapper automatically unmounts before remaining timers/mocks are cleared, real time restored and the exact owned attached host removed. Actual usePopper teardown destroys its Popper instance and removes document/element listeners. Original teardown only removed DOM; leaked document listeners exercised outside-click dismissal incidentally in later tests. Fixing ownership initially lost four covered doCloseDocument locations. Driver approved an explicit public outside-click case: open and observe visible, click document.body, observe hidden. Original checks remain; final12cases31checks.

Pristine/final pinned Node22.20 shuffled720101 pass. Default V8 six files105→113 covered statement/function/branch-arm locations, zero loss; eight gains are actual usePopper unmount cleanup. Supplemental actual external UI23files12 locations exact; this Popper/FontAwesome suite provides shared UI import/setup evidence, not rendered shared GButton/GTooltip behavior.

Bounded mutation disabled only doCloseDocument's visible=false assignment in the isolated worker. All11 original cases pass with the added case excluded; final suite fails only the added hidden assertion. Source restored byte-for-byte, then all12 cases pass. No production change is committed. Evidence `/private/tmp/readability72-popper-{before,after}` and corresponding -ui JSON/logs, `-mutant-original.log`, `-mutant-final.log`, `-restored.log`.

File ESLint/Prettier and explicit absolute sample-config pre-commit hooks pass. Driver owns integrated full types. Existing lifecycle/resource guidance covers this listener leak; no new shared helper or documentation advice is needed.
