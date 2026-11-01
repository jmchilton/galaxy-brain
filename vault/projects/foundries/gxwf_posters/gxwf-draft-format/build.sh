#!/usr/bin/env bash
# One-command rebuild: replay data -> PDFs + preview -> audits -> distance checks.
set -euo pipefail
export UV_CACHE_DIR="${UV_CACHE_DIR:-/private/tmp/claude-503/gxwf-gxwf-draft-format-deps/uvcache}"
cd "$(dirname "$0")"
DEPS="${POSTER_DEPS:-/private/tmp/claude-503/gxwf-gxwf-draft-format-deps}"
if [ -x "${GXWF:-$DEPS/node_modules/.bin/gxwf}" ] && [ -d "${FOUNDRY_RUNS:-$HOME/projects/foundry-runs}/dengueseq-denv3" ]; then
  uv run -q --script extract.py
else
  echo "gxwf or run dirs not found; using committed receipt.json"
fi
if [ -d "${FOUNDRY_RUNS:-$HOME/projects/foundry-runs}/dengueseq-denv3" ]; then
  uv run -q --script extract_route.py
else
  echo "run dirs not found; using committed route.json"
fi
uvx -q --from typst==0.15.0 python render.py
uv run -q --script audit.py poster.pdf
uv run -q --script audit.py poster-bleed.pdf >/dev/null
if command -v pdftoppm >/dev/null; then
  mkdir -p checks
  pdftoppm -png -singlefile -scale-to 1056 poster.pdf checks/preview-25
  pdftoppm -gray -png -singlefile -scale-to 1500 poster.pdf checks/preview-gray
  pdftoppm -png -singlefile -scale-to 200 poster.pdf checks/thumb-200
fi
