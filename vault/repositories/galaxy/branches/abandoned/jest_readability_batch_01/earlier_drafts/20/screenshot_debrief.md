Screenshots not relevant for this change.

Read [Component - E2E Tests - Writing](../../../../../../../research/Component%20-%20E2E%20Tests%20-%20Writing.md), including screenshot and snapshot capture guidance. Iteration 15 changes ten selected client unit-test files, the supporting API ownership suite, and their shared history test-data factory module; no Vue component, production script, CSS, E2E test, navigation selector, or screenshot baseline changes. The source diff introduces no new application rendering to record.

The history tests retain real tag controls, icons, link clicks, and the refresh GButton; MarkdownGalaxy keeps its rendered heading interaction, and StateUpgradeModal retains the real dialog close event. These test-harness changes preserve existing user-visible contracts. The extended-history factory adds typed test defaults for ownership and content statistics only; its supporting API consumer retains the original owner scenarios and inputs. Tool Shed service outcomes and upload singleton state are also exercised entirely through unit-test arrangements.

No browser run or screenshot artifact is required. There is no screenshot blocker.
