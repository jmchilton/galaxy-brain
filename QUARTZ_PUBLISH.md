# Plan: Publish Vault to GitHub Pages via Quartz

## Context

The galaxy-brain vault (research notes on Galaxy development) should be published as a static site on GitHub Pages at `jmchilton.github.io/galaxy-brain`. Quartz v4 is the chosen tool — purpose-built for Obsidian vaults with wiki link resolution, backlinks, graph view, and search.

## Approach

Install Quartz as a subdirectory (`site/`) in the repo. Symlink vault content into it. Add a GitHub Actions workflow to build and deploy on push to `main`.

## Steps

### 1. Clone Quartz into `site/`

```sh
git clone https://github.com/jackyzha0/quartz.git site
rm -rf site/.git
```

Remove Quartz's own git history so it becomes part of this repo.

### 2. Configure Quartz — `site/quartz.config.ts`

Key settings to change:
- `pageTitle`: "Galaxy Brain"
- `baseUrl`: "jmchilton.github.io/galaxy-brain"
- `ignorePatterns`: add `.obsidian`, `templates`
- `analytics`: null (unless wanted)
- `locale`: keep default

### 3. Symlink vault content into Quartz

```sh
rm -rf site/content
ln -s ../../vault site/content
```

Quartz reads from `site/content/` which points to `vault/`. Lets you edit in Obsidian and preview in Quartz without copying.

### 4. Create `site/content/index.md`

Quartz needs an `index.md` for the homepage. Create `vault/index.md` with a landing page (title, brief description, links to research/ and plans/ folders). This file will also appear in Obsidian.

### 5. Handle Dashboard.md dataview queries

Quartz does not support dataview. Options:
- Leave Dashboard.md as-is (will render with raw query blocks)
- Add it to `ignorePatterns` to exclude from published site
- **Recommended**: exclude it via ignorePatterns since index.md replaces it for the web

### 6. Update `.gitignore`

Add:
```
site/node_modules/
site/.quartz-cache/
site/public/
```

### 7. Create GitHub Actions workflow — `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
        working-directory: site
      - run: npx quartz build
        working-directory: site
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site/public
      - uses: actions/deploy-pages@v4
```

Note: the symlink `site/content -> ../../vault` will resolve correctly since checkout includes the full repo.

### 8. Update Makefile

Add targets:
- `make site-preview` — `cd site && npx quartz build --serve` for local preview
- `make site-build` — `cd site && npx quartz build` for local build check

### 9. Enable GitHub Pages

Manual step: Go to repo Settings → Pages → Source → select "GitHub Actions".

### 10. Update `site/` npm dependencies

```sh
cd site && npm i
```

Lock file will be committed for reproducible CI builds.

## Files modified/created

- `site/` — new directory (Quartz clone, minus `.git`)
- `site/content` — symlink to `../../vault`
- `site/quartz.config.ts` — edited
- `vault/index.md` — new (homepage)
- `.github/workflows/deploy.yml` — new
- `.gitignore` — updated
- `Makefile` — updated

## Verification

1. `cd site && npx quartz build --serve` — local preview at localhost:8080
2. Check wiki links resolve (click `[[...]]` links between notes)
3. Check frontmatter renders (tags, dates visible on pages)
4. Check `.obsidian/` and `Dashboard.md` excluded
5. Push to `main`, confirm GitHub Actions succeeds
6. Visit `jmchilton.github.io/galaxy-brain`

## Unresolved questions

- Want custom theme/colors or Quartz defaults fine for now?
- Want `make validate` to run in CI before deploy (fail deploy on invalid frontmatter)?
- Any notes that should be excluded from publishing (draft status, etc.)?
