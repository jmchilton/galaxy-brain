# TextEditor author review

Pinned base `27e6eaab10040eec5866dd9614ba44b7547c110d`; only the assigned TextEditor test changes. All12 original cases/20 successful checks remain (18 assertion lines; emitted-presence and highlight helpers each execute twice). Exact dataset/collection/workflow fixtures, IDs/HIDs/names, page/report modes, text and expected directives, event flags and nextTick order remain.

Native inferred public props/global plugins remove the component assertion and duplicated ad hoc prop shape. The two identical Pinia setups become one beforeEach; store selection explicitly uses the instance rendered by the editor. Completion captures and disposes each actual Pinia; automatic unmount precedes mock restoration. Required textarea uses a typed DOM get. The constructed Event remains the same bubbling/cancelable Event, without falsely casting it to DragEvent. Existing emittedArg with index -1 reads the same last update payload after the original explicit presence check, replacing unchecked nested indexing and string assertion. Literal payload expectations remain independently specified.

Pristine/final Node22.20 shuffled720101 pass12cases. V8 covered statement/function/branch-arm locations25files131 exact, zero loss/addition. External shared UI supplement0files0locations both runs: the original shallow/module toolbox/panel boundaries remain and no shared UI component renders. Evidence `/private/tmp/readability72-text-{before,after}` and corresponding -ui JSON/logs.

File ESLint/Prettier and explicit absolute sample-config hooks pass. Driver owns integrated full types. No production, shared helper or later-lane edit; existing native prop, public event and ownership guidance suffices, with no evidenced new guidance gap.
