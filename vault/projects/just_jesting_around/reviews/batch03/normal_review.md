# Independent review and test challenge — iteration 03

No blocking findings in the frozen iteration-only changes against `51b247553a74e150c898eb9435b9230d10569466`.

Reviewed all eleven source files: the five selected suites (`CleanupResultDialog`, `urlTracker`, `collectionAttributesStore`, URL utilities, and dataset-copy API); the supporting `CleanupOperationSummary`, `ReviewCleanupDialog`, `NotificationCard`, and `NotificationsList` suites; the new cleanup fixture factory; and the notification fixture factory. Read the project goal, loop instructions, selection manifest, per-file reviews, client testing guidance, Galaxy's testing-layer documentation, and the shared review/test-challenge instructions. No production file changes are present.

## Coverage preservation

- **Cleanup result:** all four loading/failure/partial-success/success scenarios remain. The constructor's omitted result has the same zero defaults as the removed explicit failure payload. The real table remains mounted within the shallow parent mount, preserving the two-row check and adding exact item/reason cells. Visible error text replaces HTML inspection; the same error remains required. Assertion statements increase from 16 to 19, adding literal freed-space amounts and cell contents. Both fixture-only supporting migrations retain all seven and eleven assertion statements byte-for-byte, alongside identical IDs, names, sizes, and dataset types.
- **URL tracker:** all thirteen scenarios and 65 assertion statements remain in their original order. Compared assertion expressions after normalizing renamed local variables; matchers and expected values are unchanged. The stateful round trips and intermediate root/history checks remain intact.
- **Collection attributes:** both cache scenarios remain. Eight original conditions are preserved or tightened: loading flags now require booleans, and the request check requires the exact single collection ID. A ninth assertion requires the immediate cache-miss `null` result. Flushing promises before the cache-hit negative request assertion closes a timing gap without changing its input.
- **URL utilities:** independently executed the baseline and final callbacks with recording stubs, expanded every table row, and compared exact ordered function names, arguments, matchers, and expected values. All 37 original combinations match, including the omitted query argument and exact whitespace. Ten grouped cases become 37 independently named cases.
- **Dataset copy:** all three scenarios and seven assertion statements remain. Both requests must now target the expected history; the former assertion inspected only the last request. Ordered IDs/results, the failed seventh item, the concurrency peak of five, and mixed dataset/collection request paths and bodies remain. Inferred request types and `response.untyped(...)` preserve the intentionally minimal response payloads. Responding from each handler's own parsed body avoids relying on the mutable request log.
- **Notifications:** all 35 Card assertion statements and the three List scenarios remain. The shared-item rendering case expands explicitly across all four formerly random item types, taking Card from eleven to fourteen cases. List retains its six original assertions and adds two fixed six-unread checks. Category action tables still exercise both message and sharing notifications with explicit read/unread inputs.

## Shared fixtures and lifecycle

The cleanup factory supplies the complete `CleanableItem` shape used by three concrete consumers; overrides apply last, while meaningful IDs and names remain visible in each suite. Only unused wall-clock timestamps change. Each call returns a fresh object.

The notification factories preserve their discriminated category shapes and merge typed partial content overrides into complete defaults. Independent runtime probes verify fresh content objects and nested requested-tool arrays/objects, valid ISO timestamps, unread defaults, unique generated list IDs, five messages/five shared items, and six unread entries. Both categories include read and unread entries. Searches confirm the removed random-generator exports have no remaining consumers. Each List test now arranges fresh notifications instead of sharing a module-level collection. Awaited clicks, proper Pinia plugins, and automatic unmounting keep consumer behavior and lifetime explicit.

No additional abstraction is warranted for the tracker, URL utilities, collection-attributes payload, or the three dataset-copy handlers: their investigated sibling consumers either use different contracts or do not repeat this setup. Existing README guidance covers these changes; no additional rule is needed.

## Fresh test-layer challenge

These cases test public client behavior: acceptance of upload URLs, navigation state and popped context, cache/loading/request transitions, rendered cleanup results, notification rendering/actions/filtering, and copy-request aggregation/concurrency. They do not require a running Galaxy server. The batching check protects an observable request limit; the sequential tracker checks protect navigation relationships. Neither should be discarded as an implementation-only test.

The reuse work replaces repeated domain fixtures with typed factories and the existing Pinia helper. The remaining HTTP handlers record or vary behavior required by their scenarios. Keeping the cleanup table and notification cards real preserves the rendered features already asserted. No production behavior changes or new browser interactions justify adding backend, integration, Selenium, or Playwright coverage for this iteration. User instructions to preserve tests and assertions take precedence over the generic challenge template's suggestions to remove tests.

Independent review probes and `git diff --check` pass. Driver validation is recorded in the iteration report; this review makes no claim to have rerun its cumulative suite independently.
