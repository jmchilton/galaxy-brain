# sanitizeHtml — batch 65

All ten original cases and 43 executed assertions remain (29 assertion source lines, including three calls to the two-check hook helper and the URI/target loops). Default/links/markdown configuration, isolated instance registration, URI allow/deny policy, new-window rel protection, retained rel tokens, same-window/text-node guards, unknown profiles and config ownership all retain their original inputs and expectations.

The narrow DOMPurify stand-in now types addHook's observed name and Node callback. Captured calls infer the callback directly; the helper retains its exact registration-count and hook-name checks and requires a present callback without a type cast or non-null assertion. Its Node boundary intentionally retains the original text-node guard check even though DOMPurify types its attributes hook as Element. No fabricated full DOMPurify instance, production signature change or policy weakening.

The lazy instance/hook registration observations retain their module lifetime and existing sanitizer call-history resets. No components are mounted, no nodes are attached, and no new resource cleanup is needed. Pristine/final shuffled seed 650101 passes all ten cases; V8 matches exactly across four files/45 covered statement/function/branch-arm locations, with zero losses or additions. No shared UI is rendered.

File ESLint/Prettier and explicit absolute-config repository hooks pass. The driver owns integrated types. No supporting/shared/production/documentation edits or evidenced new guidance gaps. Evidence: `/private/tmp/readability65-sanitize-{before,after}` and logs, plus `/private/tmp/readability65-sanitize-hooks.log`. Commit SHA supplied to driver; worker `/private/tmp/galaxy-readability65-sanitize`.
