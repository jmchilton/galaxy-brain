# Batch 54: GenericWizard

Three original cases and all seven assertions remain: links sanitization profile, strong markdown and new-window target; default DIV/card container; requested DIV without card class. The real wizard host still creates useWizard in component setup, so its computed effects belong to the mount.

Named WizardHost, native global/props mounting and required container queries remove compatibility options and the object cast. Existing getLocalVue is shared by the three scenarios. Sanitizer call history clears before every case while retaining the setup pass-through implementation. Automatic unmount owns the component and its effects; no sanitizer implementation is replaced or restored.

Original and final shuffled runs pass all three cases (Node22.20.0, seed540101, one worker). Exact covered source locations are compared using normalized statement/function/branch-arm locations; all 107 covered locations across 15 source files are identical, with no losses/additions. Explicit repository hooks including ESLint and Prettier pass. Artifacts: /private/tmp/readability54-wizard-{before,after}.log, /private/tmp/readability54-wizard-{before,after}/coverage-final.json, /private/tmp/readability54-wizard-hooks.log. Final integrated full-client typing is the driver gate.

Existing README lifecycle and mounting advice covers the changes. No shared/supporting/production/docs/dependency changes, new guidance or E2E/screenshots warranted.
