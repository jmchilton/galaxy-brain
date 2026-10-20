Recommend a modest expansion: apply the same conditional return-focus policy when a click-triggered Popper is dismissed with Escape, while keeping shared tooltip DOM/positioning changes deferred.

## Possible Decompositions

The full implementation/test delta exceeds 100 non-generated lines. It could land as two independent PRs in either order: (1) ChatInput send-action accessible name with busy/disabled name coverage and the neighboring send-recovery baseline test; (2) classic Popper native close button, focus restoration, style preservation, and titled/untitled/referenceEl tests. This describes a possible split for John to decide; it does not recommend splitting this small coherent follow-up branch.

## As implemented

Name ChatInput's icon-only send action across its normal and unavailable states. Make the optional classic Popper header close control a named native non-submit button, returning focus to the invoking control on close-button activation and preserving its appearance with a visible focus indicator.

| Pros | Cons |
| --- | --- |
| • Fixes two independently observed story accessibility defects. | • Escape still takes a separate dismissal path without returning focus. |
| • Works from a fresh dev branch without importing story infrastructure. | • Keyboard dismissal behavior differs between the newly accessible close action and Escape. |
| • Includes both wrapped reference and external referenceEl behavior. | • Titled header currently has no production consumer, so component/browser fixtures remain important. |

## Recommended modest expansion: consistent Escape dismissal

Reuse the conditional focus-return policy when Escape closes a click-triggered Popper while focus is inside it. This covers the adjacent keyboard dismissal path introduced into view by making its header close control keyboard reachable; it should preserve the existing rule that focus elsewhere is not stolen.

| Pros | Cons |
| --- | --- |
| • Makes both keyboard dismissal choices return users to their point of invocation. | • Touches usePopper's dismissal integration in addition to the header control. |
| • Addresses the same hidden-focus problem with a small related addition. | • Requires focused regression coverage and a fresh validation pass. |
| • Extends naturally to focus inside slotted interactive content. | • Must avoid broad changes to hover opening, outside clicks, or unrelated visibility updates. |

## Narrower scope: send-action name only

Land ChatInput naming and defer the classic Popper close issue entirely.

| Pros | Cons |
| --- | --- |
| • Extremely small, immediately visible app fix. | • Leaves the already identified mouse-only close control unresolved. |
| • No popover focus/style considerations. | • Throws away reviewed and validated closely related accessibility work without a concrete benefit. |

## Broader scope: shared GButton/GLink tooltip name pollution

Repair tooltip descendant text entering the accessible names of shared buttons and links, including root shape, tooltip placement, and modal containment behavior.

| Pros | Cons |
| --- | --- |
| • Resolves another previously identified story tolerance. | • Requires independent component API, positioning, DOM-root, and modal integration analysis. |
| • Benefits multiple consumers. | • Changes a broad shared control boundary and is substantially larger than this local follow-up. |
| • Could ultimately remove more story workarounds. | • Combining it here would obscure the simple action-name/native-close fixes. |

## Further expansion: complete generic Popper keyboard opening/navigation

Add focus-triggered opening and a general focus-management contract for hover and arbitrary slotted references.

| Pros | Cons |
| --- | --- |
| • Could improve keyboard access across more Popper consumers. | • Existing consumers have varied tooltip, menu, and interactive content semantics. |
| • Would support references beyond the current close-button use case. | • Needs a separately designed trigger/interaction policy; a small Escape fix does not require it. |

No code or history changes were made during this scope evaluation. Per the process instruction, review stops here after recommending the Escape expansion for coordinator resolution.
