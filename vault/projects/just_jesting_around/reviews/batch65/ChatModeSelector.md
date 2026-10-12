# ChatModeSelector — batch 65

All 24 original cases and 25 assertions remain, covering pressed states, notebook button count, full-view navigation, docking routes and every routed/active/history/null ID precedence case. Existing chat-history factories and nth button lookups remain. The router mock and real store actions retain their original behavior.

Native inferred mounting removes the object cast and installs the owned testing Pinia and existing icon stub through withPlugins/global options. The store lookup explicitly selects that Pinia. Automatic unmount runs before spy restoration, followed by Pinia disposal at test completion. The existing button helper now accepts the inferred wrapper type and accurately describes the notebook's omitted full-view button. Removed an unsupported explanation that setup-store actions cannot be spied by the testing plugin; explicit action observations remain unchanged.

Before/after shuffled seed 650101 passes all 24 cases. Default V8 covered source locations are identical across 36 files/252 locations. Actual external GButton/GButtonGroup/GTooltip coverage retains all 101 original locations across three files and adds two locations from GTooltip's real unmount cleanup removing aria-describedby; zero losses. Evidence: `/private/tmp/readability65-chat-{before,after}` and corresponding `-ui` reports/logs.

File ESLint/Prettier and final explicit absolute-config repository hooks pass (`/private/tmp/readability65-chat-hooks-final.log`). The driver owns integrated types. No production/support/shared helper/documentation changes or useful new guidance gaps. Commit SHA supplied to driver; worker `/private/tmp/galaxy-readability65-chat`.
