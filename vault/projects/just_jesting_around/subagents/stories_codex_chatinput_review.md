# ChatInput story conversion review

Date: 2026-10-14. Immutable baseline: `2482ce2f1a1d59157cd77e59438e81aade9179be`. Pushed conversion: `4e522d66ade7f8896b346aaca27fde50e03ed406`.

Independent read-only reviewer `chatinput_review` approved without blocking findings. The complete describe body is byte-identical after removing only the two added plain-mount flags: 23 original cases and 30 assertion sites. Preserved: exact hello value, default/custom placeholders and label association; both textarea and all five send-button disabled conditions; input existence/exact payload, button/Enter submission, Shift+Enter suppression, real no-match MentionDropdown Enter fallback and Escape style transition; empty initial sizing, prototype-instrumented 96px with restoration, live 120px growth and 140px growth followed by empty-height reset; all spinner/spin/paper-plane class checks.

The 21 composed mounts return actual ChatInput, preserving emitted-event checks. Explicit props override scene defaults; only unasserted implicit busy text becomes a realistic draft. Two live setProps resize/clear cases remain plain mounts with original stubs/instrumentation. Module history/historyItems mocks and two real MentionDropdown cases remain. Flush registers after both unmount hooks, so it runs first under Vitest stack ordering; composed mounts capture their Pinia for onTestFinished disposal.

Five truthful composer scenes use existing withModel and signed user helpers. Harness is exported/excluded, with local MODE 3 to forward submit listeners. The shared helper and parent GalaxyAI stories/downstream plays are untouched. Initial browser callback probes found MODE 2 listener loss; the local compatibility setting corrected it. Final removable Chromium probes passed 5/5: typing/model round-trip, exact one callback on click/Enter, disabled controls and multiline height. Probes removed before committing.

Source and Chromium confirm the icon-only send button has an empty accessible name. Reviewer supports recording it as an existing component bug; BUGS_FOUND has the row, no component fix. Not checked on fetched dev.

Validation passed: focused unit 23/23, types, formatting/lint/normal hooks, complete story-backed unit 786 tests/97 files matching 97 selected files, complete browser 365 tests/96 files with two workers. Fast-forward push succeeded. Test lines 232 to 257; stories 46.

Evidence: `/tmp/stories-chatinput-unit-final.log`, `/tmp/stories-chatinput-types-final.log`, `/tmp/stories-chatinput-probes2.log`, `/tmp/stories-chatinput-full-unit.log`, `/tmp/stories-chatinput-full-browser.log`. No sensitive findings.
