# Fresh strengthening review

Reviewed the complete two-file diff, branch index, current PR description, checklist evaluation, and shared PR-description guidance. No code changes or design decisions are needed. The existing cross-history API regression and request table make the two server bugs concrete; expanding generators, schemas, input-source matrices, or workflow behavior would exceed this backport.

One small prose task remains under the explicit misunderstanding/highlight guidance:

- **Audience:** a reader could infer this fixes every workflow run or the generated TypeScript client. The ordinary paragraph identifies callers supplying defaulted API fields, but that audience explanation is not highlighted. Highlight a short sentence near the request table, for example: ***This affects invocation API callers that explicitly send these default values; this backport does not change the published client types.*** The existing table already shows the exact triggering payloads and corrected copying/HTTP behavior.
- **Scope:** a reader could infer the 26.2 generator/schema work is included. The existing highlighted sentence explicitly limits the change to two server checks and API regressions and assigns generator/schema changes to the 26.2 sibling. Keep it. The additional audience sentence can replace the existing unhighlighted types paragraph to avoid repetition.

No further strengthening task: current risks disclose the observable false/null copying change and newly accepted legacy fallback, while test claims distinguish API coverage from broader untested input-source variants. Keep final validation/CI wording synchronized with the parent polish results.
