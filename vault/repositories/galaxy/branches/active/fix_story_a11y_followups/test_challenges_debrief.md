# Final test challenge

Completed a fresh sequential challenge on 2026-10-19 after the approved Escape adjustment. Re-read the full dev-to-working-tree test changes and production handlers, applying GX_PROCESS_CHALLENGE_TESTS.md, Galaxy writing_tests.md, and the client README guidance. No source edits or Git operations were needed in this pass.

## Verification

The fresh targeted run passed **2 suites / 43 tests**, exit 0: `/private/tmp/a11y-followups-final-challenge.log`. The coordinator separately reports the broader final run passed **5 suites / 74 tests** at `/private/tmp/a11y-followups-escape-unit.log`. Browser activation, focus indication, and appearance remain assigned to the subsequent browser/screenshot phase.

## Each added test challenged

The baseline chat recovery test preserves meaningful adjacent behavior: busy sending ignores a click and becomes usable when busy clears. The baseline untitled Popper test preserves the absence of the optional header without preventing the content from opening. Both are appropriately isolated in baseline commit a2166f2c585 and passed on unchanged dev.

Four chat accessible-name cases cover ready/empty/busy/disabled states. They observe the real rendered native button; retaining the real GButton matters because prop-only or stub assertions would miss broken attribute forwarding. Busy swaps the icon, and unavailability must not erase an action's name. These are public UI contracts, not implementation snapshots.

The native close-control test covers the actual span-to-button defect, an explicit non-submit type, close behavior, and actual focus return to the wrapped trigger. The external-reference test covers the separate supported referenceEl boundary and confirms unrelated focus is not stolen. The Escape test exercises real event bubbling from the focused close control, observes hidden state, and checks the same public return-focus contract. It does not call private methods or refs. These tests are complementary, so none was dropped.

No assertions were weakened. No additional mocks were added. The existing Popper positioning stub isolates a layout engine unrelated to the contract under test; extracting new generic mock classes or refactoring components would not improve these tests. MentionDropdown is stubbed for the focused chat cases, avoiding incidental store/API activity.

## Test layer

These rendered-control contracts do not need a server, database, or API. Server-backed tests would obscure the missing-name defect, and the titled header has no current app consumer to exercise through a natural app journey. Local component regression tests plus the planned real-browser keyboard/visual check provide the appropriate coverage. No server E2E code is warranted for this branch.

## Baseline and red/green boundaries

Coordinator evidence establishes baseline 36/36 on unchanged dev and the original five regressions failing at their actual accessible-name assertions (`/private/tmp/a11y-followups-red.log`). The added external-reference case starts with the same missing-name assertion against the original span and therefore fails there on base. The Escape case fails on base because the span cannot receive focus; with only the native-button version it reaches the final focus-return assertion and fails there without Escape routing. These are direct assertions against the defect, not missing fixture/API failures. The fresh challenge executed the final cases green; no source rollback was performed during concurrent final checks.
