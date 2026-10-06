# galaxy#23917 — Vitest auto-stubs drop `COMPONENT_V_MODEL: false`, so every `modelValue` migration needs per-spec workarounds

[Issue](https://github.com/galaxyproject/galaxy/issues/23917) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Branch `issue_23917_compat_vmodel_stubs` — VTU auto-stubs drop `compatConfig`, so `shallowMount` specs of `modelValue` components (`COMPONENT_V_MODEL: false`) got compat's legacy `value`/`input` v-model; fix: `config.plugins.createStubs` hook in `client/tests/vitest/setup.ts` leaves opted-out components unstubbed, drops #23908's 3 per-spec `GFormInput: false` opt-outs, plus a direct spec `tests/vitest/setup.test.ts`; red→green (25 fail → 68 pass), full vitest 546 files / 4196 pass, vue-tsc clean. State: two commits on `dev` `ab8e9f17f51`, pushed to `jmchilton`, **no PR**.
