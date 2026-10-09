# Notification factory follow-up — iteration 03

Supporting consumers: `NotificationCard.test.ts` and `NotificationsList.test.ts`. The originating full review remains iteration 02's NotificationCard review; neither supporting edit advances an inventory counter.

Resolved the earlier marginal-advice item in `Notifications/test-utils.ts`. The three category factories now use fixed IDs, meaningful content, valid ISO timestamps, and an unread default. Typed overrides accept notification fields and partial category-specific content, so tests can state read status, markdown, requested tools, and workflow IDs when creating fixtures. Each call creates fresh content and tool arrays. Removed random-generator exports after checking that no other file imports them.

The list generator retains ten alternating message/shared notifications in its existing consumer, assigns unique IDs, and gives both categories read and unread entries deterministically. Each List test requests fresh fixtures. The two unread checks still compare against the supplied input and now also assert six unread cards, ensuring the filter exercises a mixed list. Its mount uses the existing `withPlugins` helper and automatic unmount.

Card consumes typed overrides instead of subsequent content mutations or object spreading. Its shared-item rendering test explicitly covers history, workflow, visualization, and page, preserving all four formerly random possibilities. The remaining scenarios and all original assertion statements are unchanged. No new rule is needed in the README: existing typed-factory and scenario-input guidance covers this change.

Baseline: Card 11 cases/35 assertion statements; List 3 cases/6 assertions. Final: Card 14 cases/35 statements; List 3 cases/8 assertions. Both suites pass (17 cases), ESLint and formatting pass, and the combined 21 suites from all iterations pass 359 cases. Logs: `/private/tmp/jest_readability_batch03_notifications_baseline.log`, `/private/tmp/jest_readability_batch03_notifications_final.log`, and `/private/tmp/jest_readability_batch03_combined_tests_final.log`.
