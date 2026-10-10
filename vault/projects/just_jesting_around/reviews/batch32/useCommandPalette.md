# useCommandPalette

Selected originator: `client/src/composables/useCommandPalette.test.ts`. Baseline and final: **8 tests**.

The local `ANONYMOUS_USER` literal is replaced by the new shared [`getFakeAnonymousUser`](getFakeAnonymousUser.md), and `REGISTERED_USER` by direct `getFakeRegisteredUser()` calls.

Before, the `it.each` title `"is %s for %s user: %s"` produced case names like "is true for a registered user: true". Its rows now read `[enablePalette, expected, who, user]`, and the title "with enable_command_palette %s, paletteEnabled is %s for %s users" gives names like "with enable_command_palette false, paletteEnabled is false for anonymous users". Array rows keep the strings unquoted; `$name` interpolation would quote them.

`setupConfig(config, isLoaded = false)` had a boolean flag. It also ignored its config argument when unloaded, so the not-loaded case passed `{ enable_command_palette: true }` for nothing. The helper is now `loadConfig(config)`, and the not-loaded case sets `useConfigStore().config = null` in plain sight. The "unset" case calls `loadConfig({})` explicitly instead of relying on the `beforeEach` initial state. A comment says why `beforeEach` closes the palette: the open state is module-level and outlives each test's pinia.

Preserved: shared open state across consumers, with every one of its assertions. The 4 enabled/disabled × registered/anonymous combinations. Unset treated as on, for an anonymous user. Disabled before the config loads. Open/toggle refused while disabled.

Strengthened: the not-loaded case now also calls `openPalette()` and asserts the palette stays closed. This is the behavior the composable's doc comment cares about: ctrl/cmd+k must not open on an instance that turned the palette off. Probe: changing `openPalette`'s guard to `config.value?.enable_command_palette === false`, which ignores load state, fails only this case (1 failed, 7 passed). The original suite passes under that mutation.

Validation: 8 tests pass shuffled (seed `320101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none new. The README already covers `it.each` and explicit inputs. The `%s`-versus-`$name` quoting point is a Vitest detail, not Galaxy-specific.
