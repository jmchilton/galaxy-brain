# Evidence

## Implemented System

- `@galaxy-tool-util/*` monorepo packages.
- CLI subcommands across `gxwf`, `galaxy-tool-cache`, `galaxy-tool-proxy`, and `gxwf-web`.
- Per-step state validation.
- Per-connection validation including collection semantics.
- Format2/native conversion.
- Tool metadata cache for filesystem and IndexedDB.
- VS Code diagnostics, completions, hover docs, and conversion commands.
- Browser editor using Monaco and the language server.

## Evidence To Gather

- IWC validation and round-trip numbers.
- Example invalid parameter name/value caught statically.
- Example invalid collection connection caught statically.
- Screenshots from VS Code and browser editor.
- CLI output examples for validation and conversion.

## Benchmark/Comparison Ideas

- Small table comparing validation depth across Galaxy/gxwf, Nextflow, Snakemake, and WDL.
- Latency for validating a representative workflow with warm cache.
- Cache population size/time for an IWC corpus subset.

## Risks

- Avoid overstating competitors: they validate real things, just at different layers.
- Keep the VS Code extension as the human-facing highlight while the library remains the technical foundation.
