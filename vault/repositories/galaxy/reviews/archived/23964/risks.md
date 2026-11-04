Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed: 9b8df5aa76e (PR head b81b32379c4 merged with dev 0073b5e9224)

The one-way risk is the semantic token vocabulary (`--color-background/foreground/card/muted/sidebar-*/accent/selected/primary/...`, Tailwind spellings `gray`/`--text-*`): it is the target name set for the coming Tailwind colour codemod and for `galaxy-ui` consumers, so once call sites and the Tool Shed adopt it, renaming or re-meaning a token gets expensive; the CSS plumbing itself is easy to revert.

<details><summary>Risk Details</summary>

- Semantic names and their meanings (`accent` = hover, `selected` = persistent selection, `secondary` = headers, `inverse`, `highlight`) become a de facto contract the codemod and future components will encode; several values are explicitly provisional ("open to tweaking").
- `galaxy-ui/tokens.css` and `theme.css` become package exports; external consumers (Tool Shed, plugins) may pin to them.
- Old names (`--color-grey-*`, `--font-size-*`, `--background-color`) survive as `var()` aliases with no removal plan; dropping them later is a breaking change for any third-party CSS that uses them.
- Token source of truth moves from the client SCSS to the package; the analysis entry must import `tokens.css` first. Pages only work because `cssCodeSplit: false` folds all entries' CSS into one `base.css`; changing that build setting would strip the palette from pages using the `generic` entry.
- `tokens.css` is generated but committed; drift is caught only by the vitest check, not a build step.
- New devDependency `@galaxyproject/brand-tokens` (test-only, `^0.1.0` range) ties token tests to an external 0.x package.
- Small visible changes possible: new values for `--color-input` (#8992b2) and `--color-info` (#2077b3) where they are adopted; existing palette values unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Humans should mostly review the semantic token list in `client/packages/ui/src/styles/theme.css` as an API: are the names, the Galaxy additions (`selected`, `highlight`, `inverse`) and their mapped values ones the team wants the Tailwind migration to bake in? Deciding now is much cheaper than after the codemod lands.

Secondarily, confirm the single-`base.css` assumption (`cssCodeSplit: false` in `client/vite.config.mjs`) is intended to hold, since the palette now reaches non-analysis pages only through it, and decide whether the deprecated aliases need a documented removal timeline.

</details>
