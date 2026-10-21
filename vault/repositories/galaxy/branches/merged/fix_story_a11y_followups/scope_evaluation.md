Recommend the final scope as implemented: ChatInput naming and classic Popper native close semantics, including consistent conditional focus return for both the close button and Escape. No further scope change is recommended.

## Possible Decompositions

The full implementation/test delta exceeds 100 non-generated lines. Two independent PRs could land in either order: (1) ChatInput send-action name and state/recovery coverage; (2) classic Popper close button, click/Escape focus return, style preservation, and titled/untitled/external-reference coverage. This lays out an option for John; it does not recommend splitting the branch.

## As implemented: approved modest expansion

Name the send action across normal and unavailable states. Make the optional Popper header close control keyboard accessible and non-submit, preserve appearance and visible focus, and use one conditional return-focus policy for close-button activation and Escape from popup content. The previously recommended Escape expansion is now included; its earlier scope and rationale remain preserved in the alternate-scope records.

| Pros | Cons |
| --- | --- |
| • Resolves two observed story accessibility defects on fresh dev. | • Titled Popper header currently needs component/browser fixtures because app consumers omit title. |
| • Makes adjacent keyboard dismissal paths consistent without changing the controller API. | • Requires explicit CSS to avoid global Bootstrap styling of native buttons. |
| • Covers wrapped/external invoking controls and preserves unrelated focus. | • Broader hover/focus-opening policy remains a separate design question. |

## Original narrower scope: close-button focus only

Keep the two defect fixes but return focus only when the header close button is activated, leaving Escape on its prior path.

| Pros | Cons |
| --- | --- |
| • Slightly smaller diff, preserved in the alternate branch. | • Hides focused popup content without returning focus when Escape is used. |
| • Avoids a delegated popup event. | • Inconsistent behavior between adjacent keyboard dismissal choices. |

## Further contraction: ChatInput only

Land only the missing send-action name.

| Pros | Cons |
| --- | --- |
| • Minimal visible app repair. | • Leaves the already identified mouse-only close control unresolved. |
| • No popover focus/style integration. | • Removes reviewed and validated related work without a concrete benefit. |

## Further expansion: shared tooltip name pollution

Change GButton/GLink tooltip DOM containment and accessible-name behavior, with the associated positioning and modal integration analysis.

| Pros | Cons |
| --- | --- |
| • Could retire additional story tolerances across many consumers. | • Much broader shared component/API and positioning surface. |
| • Addresses another known accessibility issue. | • Deserves independent root-shape, containment, and modal checks. |

## Further expansion: general keyboard opening/navigation

Introduce focus-triggered opening or a generic keyboard/focus policy across hover, click, and arbitrary reference shapes.

| Pros | Cons |
| --- | --- |
| • Could improve more Popper interactions. | • Consumers mix tooltip, menu, and interactive content semantics. |
| • Would support a wider range of references. | • Requires a separate interaction design, beyond consistent dismissal of the repaired control. |

The final scope already includes the useful modest expansion raised by earlier review. Additional expansions cross a shared interaction/API boundary rather than completing this local fix. No further source/history changes or user scope decision are required by this evaluation.
