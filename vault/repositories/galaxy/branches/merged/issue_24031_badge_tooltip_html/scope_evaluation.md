Keep the implemented scope. The badge rendering change and shared HTML tooltip accessible-name correction directly match issue [24031](https://github.com/galaxyproject/galaxy/issues/24031), and the localized jsdom test setup supports meaningful regression coverage without widening production behavior. No scope decision is needed from the user; additional full-Galaxy E2E coverage or broader HTML accessibility policy can remain separate work.

## As implemented: badge HTML and shared readable labels

Render the badge stock sentence in an escaped paragraph and retain the administrator’s rendered Markdown in HTML tooltip mode. Derive the shared directive’s HTML accessible name from sanitized DOM text with block/break spacing; preserve text-mode behavior. Two suites explicitly use jsdom, already resolved transitively, to exercise the real sanitizer and directive.

| Pros | Cons |
| --- | --- |
| <ul><li>Addresses both visible tags and screen-reader labels described in the issue.</li><li>Preserves existing Markdown formatting and also repairs the other HTML tooltip caller.</li><li>Keeps the fix in the component and directive that own the respective behavior.</li></ul> | <ul><li>HTML label extraction affects every HTML tooltip caller.</li><li>Adds a direct development dependency and two per-file environment overrides.</li><li>Component captures do not demonstrate a full Galaxy storage workflow.</li></ul> |

<details>
<summary>Evidence and review context</summary>

The issue explicitly proposes this two-layer fix and specifically calls for spacing at paragraph and line-break boundaries. The implementation debrief records 29 passing focused and adjacent tests on repository-pinned Node 22.20.0 and red-before-green reproduction. The quality review recommends no structural changes; its suggestions for nested/table boundaries and HTML-mode named menus are optional additional coverage, not a request to change product scope.

The screenshot review captures the actual changed component and directive with Markdown, stock-only, and HTML paragraph messages. Its debrief accurately identifies the temporary component harness and the absence of a full Galaxy integration run. This is adequate evidence for the scoped presentation change; integration-server provisioning would not change the intended behavior. The separate test-challenge review may strengthen tests without requiring a larger feature scope.

This evaluation assesses scope only. Correctness, sanitizer behavior, and test adequacy remain covered by the normal, code-quality, and test-challenge reviews.

</details>

## Narrower: plain-text badge messages

Convert the rendered administrator message to plain text and leave the badge in text-tooltip mode. This removes literal tags at the affected badge while avoiding a shared directive change, but drops the Markdown presentation that the issue asks to retain.

| Pros | Cons |
| --- | --- |
| <ul><li>Limits production impact to the badge component.</li><li>Avoids additional HTML-tooltip presentation behavior.</li></ul> | <ul><li>Loses emphasis, paragraph presentation, and link styling supported by the sample configuration.</li><li>Leaves the shared HTML accessible-name problem unresolved.</li><li>Requires a separate HTML-to-text interpretation at the badge.</li></ul> |

## Narrower: badge HTML with a local accessible-name workaround

Enable HTML rendering only for the badge and assign a separately computed plain-text accessible label there. This satisfies the visible badge report but leaves the directive’s existing HTML-mode labeling policy in place.

| Pros | Cons |
| --- | --- |
| <ul><li>Restricts the correction to the reported component.</li><li>Retains configured Markdown presentation.</li></ul> | <ul><li>Duplicates label extraction outside the shared owner.</li><li>Leaves JobInformation’s HTML tooltip with literal tags in its label.</li><li>Future HTML-tooltip callers still need individual workarounds.</li></ul> |

## Broader: generalized tooltip accessibility and full workflow coverage

Expand into a comprehensive HTML-to-accessible-text policy, review all tooltip callers, and add full Galaxy object-store integration coverage. This could include nested/table boundaries, named-menu HTML cases, and a hovered custom badge in the existing object-store Selenium scenario.

| Pros | Cons |
| --- | --- |
| <ul><li>Provides wider confidence across shared-directive consumers and full storage workflows.</li><li>Can define behavior for uncommon HTML structures beyond the reported examples.</li></ul> | <ul><li>Adds policy and integration infrastructure decisions unrelated to the reported regression.</li><li>Requires backend fixtures/server provisioning for behavior already exercised directly.</li><li>Delays the small fix without an identified product blocker.</li></ul> |

<details>
<summary>Why this expansion is optional</summary>

The quality review considered and rejected a generic HTML-to-text utility and recursive DOM walker because they introduce abstraction without a present second owner. It mentioned extra boundary/menu tests as useful optional coverage; neither suggestion requires broader production behavior. The screenshot review identifies a relevant existing Selenium object-store test and explains that it checks badge presence rather than custom tooltip text. Adding a focused assertion there may be worthwhile if the test-challenge process finds it feasible, but requiring a new full integration workflow is unnecessary for this scope recommendation.

</details>
