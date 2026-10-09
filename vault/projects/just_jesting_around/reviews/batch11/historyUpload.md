# History upload readability review

Selected originator: `client/src/utils/historyUpload.test.ts`.

The archived and deleted cases become named table rows with their complete input flags visible beside the expected reason. Both retain the exact block-reason assertion and both warning/action-error substring assertions. The active-history scenario stays separate and retains its null block reason and two exact empty messages. All three original cases remain; no new behavior or production code was added.

Reuse: the relevant inputs are two boolean flags, and the production message functions take the resulting reason directly. Importing a full history fixture or extracting these few values would obscure the inputs. No helper or supporting migration was introduced.

Validation: baseline 3/3; final 3/3. Assigned-suite shuffled seed `110071` passes all 33 cases across four files. Scoped current ESLint, Prettier, and diff whitespace checks pass. Evidence: `/private/tmp/jest_readability_batch11_async_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No best-practice addition proposed; the existing named-case and visible-input guidance already covers this small change.
