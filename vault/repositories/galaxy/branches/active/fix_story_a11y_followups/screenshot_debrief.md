# Screenshots successfully obtained

Validated `fix_story_a11y_followups` at `d843b804a20` in real headless Chromium on 2026-10-19. No blocker and no implementation or test changes were needed.

## Method and scope

Read `GX_PROCESS_SCREENSHOTS.md` and `vault/research/Component - E2E Tests - Writing.md`. Reviewed `lib/galaxy_test/selenium/test_galaxyai.py`: its existing GalaxyAI functional scenarios do not record screenshots. The ChatInput change supplies an accessible name without altering appearance. No production consumer currently supplies classic Popper's built-in title, so no existing application screenshot exposes its changed Close control.

Used a disposable Vite/Vue harness mounting the real `ChatInput.vue`, `Popper.vue`, `GButton.vue`, FontAwesome icons, and production `base.scss` plus `custom_theme_variables.scss`. History stores were replaced with inert empty-store fixtures so the real mention dropdown mounts without a Galaxy backend. The Popper was deliberately placed inside a form, with title, click trigger, interactive content and an inner link. This is an isolated component browser check, not a live-server Galaxy end-to-end run. No story-stack infrastructure was added to dev.

## Browser results

- Tab reaches the actual popup trigger; Enter opens the popup; the next Tab reaches the native Close button.
- Close has the exact accessible name `Close`. Keyboard focus shows a white 2px solid outline. Computed padding is 0, border is 0, background is transparent, and box shadow is none.
- Holding Space preserves transparent background, no border and no shadow under production Bootstrap CSS. Releasing Space closes the popup and restores focus to its trigger.
- Enter on Close also closes and restores trigger focus.
- Escape from the inner popup link closes and restores trigger focus.
- The enclosing form recorded zero submissions throughout these interactions.
- Send has the exact accessible name `Send message` in empty, ready, busy and explicitly disabled states. Empty/busy/disabled states are disabled; ready is enabled.
- Tab from the ready message textarea reaches Send; Enter submits exactly once.
- Chromium reported no page errors. Existing Vue compatibility warnings are unrelated.

## Inspected screenshots

All captures were opened and visually inspected. The Close focus outline is visible against the blue title bar; active styling preserves the intended small icon. ChatInput retains the expected input/send-button layout in ready and busy states.

- [Keyboard-focused Close](screenshots/a11y-popper-close-focus.png)
- [Close while Space is held](screenshots/a11y-popper-close-active.png)
- [Ready Send control after one keyboard submission](screenshots/a11y-chat-send-ready.png)
- [Busy Send control](screenshots/a11y-chat-send-busy.png)

Screenshots are local, gitignored artifacts. Disposable harness files and its server were removed/stopped after validation. Original command output remains at `/private/tmp/a11y-followups-browser-results.log`.
