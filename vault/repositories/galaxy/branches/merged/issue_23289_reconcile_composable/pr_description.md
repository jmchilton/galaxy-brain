## What

The three collection creators each reconcile the collection under construction against a
changed `initialElements` by id, in three different shapes, with three copies of the user-facing
wording. #23289 asked for that seam to be a focused shared helper, "possibly integrated with
`useCollectionCreator` if that produces a clean API". This is that.

The issue's other two asks are already on `dev` from the #23269 follow-ups — `hasInitialized` is
gone in favour of `initialize(); watch(() => props.initialElements, reconcileWithInitialElements)`,
and the silent-removal inconsistency is resolved — so this PR is only the structural remainder.

Closes #23289.

## How

New `common/useElementReconciliation.ts` owns the seam:

- `reconcileRetainedElements(retained, candidates)` projects the user's retained choices onto the
  rebuilt candidate pool by id, in the order the user had them, and reports each choice that can't
  come along — one that left the history, and one that is still there but no longer usable.
- `reconcileRetainedSlot(retained, candidates)` is the same for a creator holding single slots
  (a pair's forward/reverse) rather than a list.
- `toastRemovedFromCollection` / `toastNoLongerAvailable` and `invalidElementMessage` are the
  wording, in one place instead of three. The message helper is separate from the toast because the
  *upload* paths need the same sentence under their own title — `PairCollectionCreator` and
  `PairedOrUnpairedListCollectionCreator` were each rebuilding it inline from a local
  `NOT_VALID_ELEMENT_MSG`, and one of them also needs the string for `invalidElements`.

`useCollectionCreator` binds the two reconcilers to the creator's own `isElementInvalid` and returns
them, so the call sites are one line:

- `ListCollectionCreator._elementsSetUp` — 20 lines to 1.
- `PairCollectionCreator._elementsSetUp` — 26 lines to 4, and the `keyof SelectedDatasetPair`
  string-keyed loop goes away with them.

`PairedOrUnpairedListCollectionCreator` keeps its own loop and takes only the wording. Its retained
state is grid rows carrying the user's pairings, not a flat selection: it must not re-project (that
would discard the pairings), it splits a half-vanished pair back to an unpaired survivor, and a
vanished pair has to read as one notification rather than two.

No behavior change.

## Testing

`useElementReconciliation` has 11 unit tests, written before the module existed and verified red
against the missing import. They pin the parts that are easy to lose in a move: retained order beats
candidate order, the returned objects are the rebuilt ones rather than the retained ones, and an
invalid element is described to the user as they last saw it rather than as the rebuilt pool renamed
it.

All three creators now have component tests covering reconciliation — `ListCollectionCreator.test.ts`
and `PairCollectionCreator.test.ts` are new (3 each, driving the real components through a prop
change), and `PairedOrUnpairedListCollectionCreator.test.ts` gains two that pin its distinctive
dispatch: the half of a pair that vanishes under strict pairing gets a *warning* rather than an
error, and a wholly vanished pair produces exactly one notification.

**All eleven pass unmodified against the pre-refactor components**, which is the evidence that this
is a refactor and not a rewrite.

The toast spying those tests need is now a manual mock at `src/composables/__mocks__/toast.ts`,
beside the existing `config` / `filter` / `hashedUserId` / `userLocalStorage` mocks. Tests opt in
with a bare `vi.mock("@/composables/toast")` and assert through the ordinary
`import { Toast } from "@/composables/toast"`.

The last commit moves the client's other sixteen hand-rolled toast mocks onto it — 143 lines of
mock removed for 83 added, most of that the mock itself. Two things those mocks had in common are
worth calling out, because they are the reason to have one:

- Several gave `Toast` and `useToast()` **separate spy objects**, though in production they are one
  singleton. An `expect(...).not.toHaveBeenCalled()` written against such a mock only covers the
  path the component happened not to take. No test was actually relying on that — the suite passes
  unchanged — but every new assertion written against those files inherited the hazard.
- Several defined only the one or two methods their own component called, so a component that later
  reached for `warning` or `clearToasts` would throw rather than fail an assertion. The shared mock
  covers the whole `useToast()` surface.

Three conversions were more than mechanical. `ToolTourGeneratorItem` and `WorkflowInvocationShare`
need the sequence of toasts *across* variants ("a success, then an info"), which they got by
funnelling every method through a wrapper spy; that is now `raisedToasts()`, which reconstructs the
order from the spies' own `invocationCallOrder`, so `vi.clearAllMocks()` empties it and there is no
second thing to reset. `StatelessTags` asserted a toast title by reading its mock's synthetic return
value (`warningMock.mock.results[0].value.title`) and now asserts the argument the component
actually passed.

| Check | Result |
|---|---|
| `src/components/Collections` (vitest) | 7 files, 41 passed |
| the 16 converted toast-mock files (vitest) | 101 passed |
| full client unit suite (vitest) | 420 files, 3054 passed, 1 skipped |
| `pnpm run type-check` (vue-tsc) | clean |
| eslint on every changed file | 0 errors (pre-existing warnings only) |
| prettier | clean |

Note for anyone reproducing locally: these suites need the node pinned in `client/.node_version`
(22.20.0). Under node 25 every component test dies with
`window.localStorage.getItem is not a function` on unmodified `dev`, because node's own
experimental `localStorage` shadows happy-dom's.

## Noticed, not fixed here

- `PairedOrUnpairedListCollectionCreator` never applies `isElementInvalid` to `initialElements` —
  not at `initialize()` and not on reconcile, only to uploads. So a dataset that errors out while
  the creator is open stays in the grid and goes into the collection, where the sibling creators
  would have dropped it with a toast. Consistent within itself, and fixing it is a behavior change
  rather than a refactor, so it is left alone; the comment on `reconcileWithInitialElements` now
  records it.
- `ListCollectionCreator.addUploadedFiles` is the one upload path not routed through
  `invalidElementMessage`, because its wording differs: "is **an invalid** element for this
  collection" against everyone else's "is **not a valid** element", plus a `Dataset ` prefix and a
  different toast title. One of the two is a typo; unifying them is a user-visible string change.
  (Adjacent: that call wraps `localize()` around an already-interpolated string, so it can never
  match a catalog entry.)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
