# galaxy-brain follow-up: client design tokens (#23964)

## Stale documentation

None found. No note in `vault/research/` covers the client styling layer, galaxy-ui tokens, or `custom_theme_variables.scss`. The only nearby hit is `Component - Window Manager` (`windows.scss`), and this PR doesn't affect it.

## Suggested new research

- `Component - Client Design Tokens`: how `theme.css`, the generated `tokens.css`, the palette / semantic / deprecated layers, admin `themes_conf.yml` inline overrides and `.reset-theme-variables` fit together. A Galaxy developer needs this to pick the right token, and to know why re-theming a palette shade under `#app` doesn't reach the semantic names.
- `Component - Galaxy UI Package`: the internal `@galaxyproject/galaxy-ui` package and its two consumers. The client uses it under `@vue/compat` with Bootstrap; the Tool Shed uses it on plain Vue with Quasar. The note should cover the source-only distribution, the Vite alias, public class names and portability tests. Any change to a G-component has to work in both consumers.

## Post-merge activities

- Once #23964 merges, write `Component - Client Design Tokens`, using `learning_galaxy.md` in this review directory as the starting point.
- Revisit the note when the Tailwind RFC (#23702) lands, since `theme.css` then becomes a real Tailwind input and the semantic names become utilities.
