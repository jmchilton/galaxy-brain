Run via Claude Opus 5.5.

I acted on all six structural findings (F1-F6). I left alone the shared conditional-children helper, the Makefile sync macro, two small nits, and the two items already decided in earlier rounds. Behavior and messages are unchanged. Reviewed at `1c38389a`; the new head is `665cb69e` on `origin/main` `f5470fe5`.

## Not acted on

- **F7, one parameter-tree helper.** The runtime shapes and the label grammar each flatten a conditional with `[test_parameter, ...whens.flatMap(...)]`, and `workflow/walker.ts` and `workflow/param-navigation.ts` use the same idiom. The helper belongs next to `ConditionalParameterModel` in `bundle-types.ts`, and adopting it there means editing workflow code the branch doesn't touch. Candidate follow-up.
- **F8, Makefile sync macro.** `sync-job-runtime-schema` / `verify-job-runtime-schema` are a third copy of the user-tool-source and test-format sync/verify pattern. One Make macro would collapse all three, but that rewrites existing targets, and the `verify-*` targets can't be run under this machine's Node 26. Candidate follow-up.
- **F9, nits.** The `/^\d+$/` index test appears three times in `runtime-shape.ts`, and the "any option resolves" reduction appears in both resolvers. Neither is worth a commit.
- **Already decided (not reopened):** the duplicate Effect `job_runtime` model (a follow-up), sections skipped through `parseEachInput` (the TS parser gap), and label findings being errors.

## Commits

- `53c7273d` Move template member-chain reading into template-chains.ts
- `d440423b` Decide undeclared input roots once, in checkInputPaths
- `69298ab6` Split runtime shapes and label references out of input-paths.ts
- `665cb69e` Route every embedded tool step through validateEmbeddedToolStep

All four are pushed to `origin`. Each commit passed `make lint`, `make format`, `make typecheck`, `pnpm lint:unused:ci`, the schema build, and vitest in `packages/schema` (5206 passed) and `packages/cli` (415 passed). `packages/integration-tests` fails only the 3 tests that also fail on `origin/main`.

<details><summary>Full review</summary>

# Thermo-nuclear review: `issue_212_udt_expression_paths` at `1c38389a`

Scope: `git diff origin/main...HEAD` (20 files, +2038/-11). Generated and synced files (`job-runtime.schema.json`, `*.generated.ts`, `*.sha256`) were read but not reviewed as code.

## Verdict

The core idea is right: a faithful scanner port, a real JS parser, a runtime model derived from Galaxy's own pydantic models, and a separate label grammar. The structure around it had accreted, though. `input-paths.ts` (607 lines) held three unrelated layers: JavaScript AST walking, the job runtime shape model, and the label grammar. A caller policy flag was threaded as a closure through both resolvers. The CLI repeated one four-line sequence in four places, and that repetition is how the json-schema-mode bypass got in. None of this blocks on behavior, but it was a presumptive blocker on structure. All of it was fixable without behavior change, and it is now fixed.

No file crosses 1000 lines. After the split the largest new module is `runtime-shape.ts` at 276 lines.

## F1 (structural): `input-paths.ts` mixed three grammars and the runtime model

The file covered four things:

- acorn parsing and binding analysis (`memberSegment`, `inputsChain`, `patternNames`, `bindsInputs`, `collectChains`, `parseExpression`)
- the runtime shape model built from the synced schema
- chain resolution against that model
- the label reference grammar, plus the entry point

The label grammar shares nothing with the JS side except the parameter tree. The JS side is the only part that needs acorn. A reader had to hold all four in mind to change any one.

**Remedy, done:**

- `template-chains.ts`: `templateChains(template)` returns the `inputs.*` member chains a template reads. It owns acorn, the shadowing skip and the chain walk.
- `runtime-shape.ts`: the shape model, plus `resolveChain`.
- `label-references.ts`: `labelReferences(label)` and `resolveLabelReference`. It now owns `LABEL_REFERENCE_RE` and the match decoding.
- `input-paths.ts`: about 140 lines, only the entry point.

Each module has a single-sentence header, and the entry module's header says how they fit together. (`53c7273d`, `69298ab6`)

## F2 (code judo): the undeclared-roots policy was threaded through the resolvers

`CheckInputPathsOptions.undeclaredRoots` became an `UndeclaredRoots` closure. It was passed through `checkTemplate` → `resolveChain` and `checkLabel` → `resolveLabelReference`, so both resolvers mixed "can this path be read" with "does this caller want undeclared roots reported". It also needed a bespoke `declaredNames` walk over the raw inputs.

**Remedy, done:** the entry point builds one `ToolInputs` view: declared names, parsed params, runtime shapes, and `reportUndeclared`. It checks each reference's root before resolving. The resolvers are now pure functions of a reference and the model, and the `UndeclaredRoots` type is gone. (`d440423b`)

## F3 (duplication / boundary): the embedded-step sequence was copied four times

Each of `_validateEmbeddedNativeStep`, `_validateEmbeddedFormat2Step`, `_validateEmbeddedNativeStepJsonSchema` and `_validateEmbeddedFormat2StepJsonSchema` did the same four steps:

1. `resolveEmbeddedTool`
2. `isEmbeddedTool`
3. validate state
4. `withEmbeddedToolChecks`

The earlier json-schema bypass (normal review P2 2) happened because one mode omitted step 4, and the fix added two more copies instead of removing the opportunity.

**Remedy, done:** `validateEmbeddedToolStep(repr, stepLabel, validateState)` runs the whole sequence and takes the mode's state validation as a callback. `resolveEmbeddedTool`, `isEmbeddedTool` and the wrapper are now module-private, so a new mode can't skip the template check. (`665cb69e`)

## F4 (type boundary): loose AST type and cast-heavy schema access

- **AST walking.** It used a hand-rolled `AstNode { type: string; [key: string]: unknown }` with casts at every access (`node.property as AstNode`, `property.name as string`, `pattern.properties as AstNode[]`). acorn 8.16 ships ESTree types (`AnyNode`, `MemberExpression`, `Pattern`). The generic child traversal was also written twice, in `bindsInputs` and `collectChains`. **Done:** typed against acorn's AST, with one `childNodes` helper and no casts left in the walk. (`53c7273d`)
- **Schema access.** `RUNTIME_DEFS` was `jobRuntimeSchema.$defs as unknown as Record<string, …>`, with a runtime `throw` for a missing model. **Done:** model names are typed as `keyof typeof jobRuntimeSchema.$defs`, so a sync that drops a model the check uses fails to compile. The cast and the throw are both gone. (`69298ab6`)

## F5 (canonical helper): declared input names were computed twice

`input-paths.ts`'s `declaredNames` reimplemented the declared-set loop in `semantic.ts`'s mirrored undeclared-input check, and the two must agree on what "declared" means. **Done:** `semantic.ts` exports `declaredInputNames(doc)`, and both checks use it. (`d440423b`)

## F6 (spaghetti): label dispatch re-tested the type inside its cases

`labelParameterProblem` had shared `case` arms that tested `parameter_type` again inside: section vs conditional children, and data vs collection keys plus a `gx_data && multiple` special case. **Done:** each type has its own arm, using three local helpers (nested lookup, allowed-ending check, unreadable list). The messages are unchanged. (`69298ab6`)

## F7 (modularity, not acted on): the conditional-children idiom has no home

`[param.test_parameter, ...param.whens.flatMap((w) => w.parameters)]` appears in `runtime-shape.ts` and `label-references.ts`, and similar code is in `workflow/walker.ts` and `workflow/param-navigation.ts`. A `conditionalParameters()` helper beside `ConditionalParameterModel` would be the canonical home, but adopting it touches pre-existing workflow code. Follow-up.

## F8 (build, not acted on): a third copy of the sync/verify Makefile recipe

`sync-job-runtime-schema` / `verify-job-runtime-schema` copy the user-tool-source and test-format recipes: dump the JSON, write a `.generated.ts` wrapper with `node -e`, write the sha256, verify with `node -e`. A `define`d macro would make the fourth one free. That rewrites existing targets, and the recipes can't be exercised under Node 26 here. Follow-up.

## F9 (nits, not acted on)

- The `/^\d+$/` index test appears three times in `runtime-shape.ts`.
- `problems.includes(null) ? null : problems[0]` is the same "any option resolves" reduction in both resolvers.

## Checked and fine

- The `template-scanner.ts` port is small, direct and tested through the public check.
- The `RuntimeShape` union is a clean typed model. Conditional name collisions as `union`, `keyed` vs `array` for collection elements, and the `paired_or_unpaired` dataset fallback all live in the model, not in resolution.
- `validate.ts` runs the check beside the Galaxy mirror, not inside it, and its header docs say so.
- The report shape and the public exports (`checkInputPaths`, `CheckInputPathsOptions`) are unchanged.

</details>
