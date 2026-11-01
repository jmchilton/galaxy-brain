BLOCKER: I couldn't take screenshots on this host because a browser couldn't be launched to run the E2E test.

The Chromium, headless-shell and Firefox builds in `~/.cache/ms-playwright` all fail to start, because the system has no `libatk-1.0.so.0` or `libgtk-3.so.0`. As the coordinator directed, I didn't retry.

The screenshots that should be taken are already in the E2E test. `TestPages.test_cell_editor_menus_return_focus_after_keyboard_selection` calls `self.screenshot(...)` on the Enter pass for the open cell actions menu and the open insert-cell menu. Take them with `GALAXY_TEST_SCREENSHOTS_DIRECTORY=<dir>` through `/galaxy-playwright` on a host where a browser launches. That run would also be the first time the E2E test runs at all.

The change is about where focus goes, not about layout. Apart from `data-description`/`data-*` hooks, its only visual effect is which button shows a focus ring after a menu selection.
