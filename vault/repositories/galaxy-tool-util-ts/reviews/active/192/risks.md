Review profile: generic_risk_assessment · Opus 5.5 · low effort · reviewed commit fee94b34.

The one-way risk is small: a new error-level `StepLabelNotUnique` rule in the `structural` profile can turn currently-passing workflows into lint failures for downstream consumers (gxwf CLI, gxwf-web, galaxy-workflows-vscode, the IWC CI sweep). Its rule id and message are now public API, and the shared fixtures come from an unmerged gxformat2#268, so they could drift from the final Python behavior.

<details><summary>Risk Details</summary>

- Severity is `error` in `structural`, the profile meant for checks that prevent execution. Any consumer that fails on structural errors (CI gates, IWC sweep, editor diagnostics) will start rejecting workflows with duplicate labels. Galaxy already refuses these on import, so this mostly exposes breakage that was already there. Still, it is a behavior change shipped as a `minor` changeset.
- `StepLabelNotUnique` is exported from `@galaxy-tool-util/schema`, and its id is listed in `lint_profiles.yml`. After release, renaming it or moving it to another profile would break consumers that filter or suppress the rule by id. This is the main hard-to-reverse part.
- The rule id, message text (`Duplicated step label '...' (...)`), json_pointer choice (the second occurrence) and fixture expectations were synced from the gxformat2#268 branch, which is not merged yet. If review there changes the name, the message or the scope (for example, how subworkflows or inputs are handled), the two implementations diverge until someone re-syncs them. Shared declarative expectations would then fail in one repo.
- Format2 lint checks labels derived through `nativeInputLabel` / `nativeStepLabel`, so a Format2 input with id `x` and a step with label `x` collide. Fallback `Input N` labels can also collide with a user step labelled `Input N`. This matches Galaxy, but users may be surprised to see errors about labels they never wrote. Format2 findings also have no json_pointer, so editor diagnostics (VS Code) can't point at a precise location.
- The refactor in `toNative.ts` (`_stepLabel` becomes the exported `nativeStepLabel`, and the inline input label becomes `nativeInputLabel`) leaves conversion output unchanged. `_buildInputStep` still emits `label ?? null`. Both helpers are exported from the workflow module only, not from the package root index.
- The CLI test edits add `offline: true` to existing draft-validate tests. They are unrelated to the rule and are test-only (a two-way door), though they hide whether those tests were hitting the network before.

</details>

<details><summary>Risk Review Advice</summary>

Before merging and releasing, decide whether to wait for gxformat2#268 to merge, or at least for its rule id, message and pointer semantics to settle. The rule id and profile placement are the parts that are expensive to change after publishing. Then re-sync the fixtures from the merged Python branch.

Consider running the new rule over the IWC corpus, or checking that the gxwf-web and vscode consumers handle it, so a wave of new structural errors doesn't arrive unannounced. If such errors are expected, mention them in the changeset/release notes. Also confirm that the absent json_pointer on Format2 findings is acceptable for editor diagnostics.

</details>
