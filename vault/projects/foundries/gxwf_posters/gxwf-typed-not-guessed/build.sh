#!/usr/bin/env bash
# One-command rebuild: data/ -> receipt.json -> PDFs + preview -> audits -> checks/. Offline; ./rerun_gxwf.sh refreshes data/.
set -euo pipefail
cd "$(dirname "$0")"
export POSTER_TMP="${POSTER_TMP:-/private/tmp/claude-503/gxwf-gxwf-typed-not-guessed-deps}"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$POSTER_TMP/uv-cache}"
uv run -q --script extract.py
uvx -q --from typst==0.15.0 python render.py
uv run -q --script audit.py poster.pdf
uv run -q --script audit.py poster-bleed.pdf >/dev/null
uv run -q --script audit.py --words "$POSTER_TMP/poster-count.pdf" | tail -1
if command -v pdftoppm >/dev/null; then
  mkdir -p checks
  pdftoppm -png -singlefile -scale-to 1056 poster.pdf checks/preview-25
  pdftoppm -gray -png -singlefile -scale-to 1500 poster.pdf checks/preview-gray
  pdftoppm -png -singlefile -scale-to 200 poster.pdf checks/thumb-200
fi
