# Initial implementation

Base: explicitly requested fresh dev, `0de6cc2d7fef75633ea30717162bad53d583d80e`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y_followups`.

ChatInput now names its icon-only send action “Send message” in empty, ready, busy and disabled states. Classic titled Popper uses a named native type=button close control, retains its icon appearance through hover/active styles, exposes a visible keyboard focus outline, and returns focus to its invoking control when dismissing from within the popup.

Baseline commit `a2166f2c585` adds existing-behavior tests, independently passing 36/36 against unchanged dev. Five regression cases failed at their intended accessible-name assertions before the fixes. Current affected and nearby consumer tests: 4 files / 49 passing. Full client typecheck passed before final focus hardening; final typecheck is still required.

Normal independent review prompted focus restoration and Bootstrap active-style overrides; both were implemented. Hardening and browser checks pending. No production consumer currently supplies Popper title, so the close-control API is exercised through isolated component coverage. Shared GButton/GLink tooltip name pollution is deferred: moving tooltip DOM changes positioning and modal/component-root contracts. Story/play branches are untouched. No PR opened.
